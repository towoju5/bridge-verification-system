<?php

namespace App\Jobs;

use App\Models\BusinessCustomer;
use App\Models\Customer;
use App\Models\Endorsement;
use App\Services\AveniaBusinessService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SubmitBusinessKycToPlatforms implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries   = 3;
    public $backoff = [10, 30, 60];
    public $timeout = 120;

    public function __construct(
        public BusinessCustomer $business
    ) {}

    public function handle()
    {
        $results = [
            'tazapay'    => null,
            'borderless' => null,
            'noah'       => null,
            'transfi'    => null,
            'avenia'     => null,
        ];

        logger("submitting business KYB");

        // Submit to each platform
        $results['noah']        = $this->submitToNoah();
        $results['avenia']      = $this->avenia();
        $results['tazapay']     = $this->submitToTazapay();
        $results['borderless']  = $this->submitToBorderless();
        $results['transfi']     = $this->submitToTransfi();
        // $results['bitnob']      = $this->bitnob();

        // Log final status
        Log::info("KYB submission results for business {$this->business->id}", $results);

        // Optional: Update business record with submission status
        $this->business->update([
            'kyc_submitted_at'       => now(),
            'kyc_submission_results' => json_encode($results),
        ]);
    }

    protected function submitToTazapay()
    {
        try {
            $data = [
                "name"                 => $this->business->business_legal_name,
                "type"                 => $this->mapBusinessTypeToTazapay($this->business->business_type),
                "email"                => $this->business->email,
                "description"          => $this->business->business_description,
                "registration_address" => $this->formatAddress($this->business->registered_address),
                "operating_address"    => $this->formatAddress($this->business->physical_address),
                "phone"                => [
                    "calling_code" => $this->business->phone_calling_code,
                    "number"       => $this->business->phone_number,
                ],
                "tax_id"               => $this->business->tax_id,
                "vertical"             => $this->business->business_industry, // NAICS code
                "website"              => $this->business->primary_website,
                "registration_number"  => $this->business->registration_number,
                "registration_date"    => $this->formatDate($this->business->incorporation_date),
                "statement_descriptor" => $this->business->statement_descriptor,
                "representatives"      => $this->mapRepresentativesToTazapay(),
                "documents"            => $this->mapDocumentsToTazapay(),
                "reference_id"         => $this->business->signed_agreement_id,
                "relationship"         => "customer",
                "purpose_of_use"       => [$this->business->account_purpose],
            ];

            $response = Http::withToken(config('services.tazapay.secret_key'))
                ->post(config('services.tazapay.base_url') . '/kyb', $data);

            if ($response->successful()) {
                Log::info("KYC to Tazapay submitted successfully");
                $result = $response->json();
                return ['status' => 'success', 'provider_id' => $result['id'] ?? null];
            } else {
                throw new \Exception("HTTP {$response->status()}: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("Tazapay KYB submission failed for business {$this->business->id}", [
                'error'     => $e->getMessage(),
                'data_sent' => $data ?? null,
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function submitToBorderless()
    {
        try {
            // Step 1: Create personal identities for each associated person
            $uboIds = [];
            foreach ($this->business->associated_persons as $person) {
                $personalData = [
                    "firstName"   => $person['first_name'],
                    "lastName"    => $person['last_name'],
                    "dateOfBirth" => $person['birth_date'],
                    "email"       => $person['email'],
                    "phone"       => $person['phone'] ?? null,
                    "address"     => $this->formatAddress($person['residential_address']),
                    "nationality" => $person['nationality'],
                    "taxId"       => $person['tax_id'] ?? null,
                ];

                $resp = Http::withToken(config('services.borderless.api_key'))
                    ->post(config('services.borderless.base_url') . '/identity/personal', $personalData);

                if (! $resp->successful()) {
                    throw new \Exception("Failed to create personal identity: " . $resp->body());
                }
                $identity = $resp->json();
                $uboIds[] = $identity['identityId'];

                // TO DO: Upload ID documents for this person if needed
            }

            // Step 2: Create business identity
            $businessData = [
                "email"                            => $this->business->email,
                "name"                             => $this->business->business_legal_name,
                "businessTradeName"                => $this->business->business_trade_name,
                "dateOfIncorporation"              => $this->formatDate($this->business->incorporation_date),
                "description"                      => $this->business->business_description,
                "sourceOfFunds"                    => $this->business->source_of_funds,
                "businessIndustryCode"             => $this->business->business_industry,
                "website"                          => $this->business->primary_website,
                "businessType"                     => $this->mapBusinessTypeToBorderless($this->business->business_type),
                "isDao"                            => $this->business->is_dao,
                "hasMaterialIntermediaryOwnership" => $this->business->has_material_intermediary_ownership,
                "accountPurpose"                   => $this->business->account_purpose,
                "address"                          => $this->formatAddress($this->business->registered_address),
                "ultimateBeneficialOwners"         => array_map(function ($person, $id) {
                    return [
                        "personalIdentityId"        => $id,
                        "hasOwnership"              => $person['has_ownership'] ?? false,
                        "hasControl"                => $person['has_control'] ?? false,
                        "isSigner"                  => $person['is_signer'] ?? false,
                        "ownershipPercentage"       => $person['ownership_percentage'],
                        "relationshipEstablishedAt" => $this->formatDate($person['relationship_established_at']),
                        "controlPersonTitle"        => $person['title'] ?? 'Director',
                    ];
                }, $this->business->associated_persons, $uboIds),
            ];

            $resp = Http::withToken(config('services.borderless.api_key'))
                ->post(config('services.borderless.base_url') . '/identity/business', $businessData);

            if ($resp->successful()) {
                $result = $resp->json();
                return ['status' => 'success', 'provider_id' => $result['identityId'] ?? null];
            } else {
                throw new \Exception("HTTP {$resp->status()}: " . $resp->body());
            }
        } catch (\Exception $e) {
            Log::error("Borderless KYB submission failed for business {$this->business->id}", [
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function submitToNoah()
    {
        try {
            $noah = new SubmitBusinessToNoah($this->business->toArray());
            $noah->handle();
        } catch (\Exception $e) {
            Log::error("Noah KYB submission failed for business {$this->business->id}", [
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function avenia()
    {
        // firstly create sub account
        $avenia = new AveniaBusinessService();
        $response = $avenia->businessCreateSubaccount($this->business->business_legal_name);
        return $response;
    }

    protected function bitnob()
    {
        try {
            $data = $this->business;
            $customer = Customer::whereCustomerId($this->business->customer_id)->first();
            $idInfo = $data['identifying_information'][0] ?? [];
            $idFront = ($idInfo['image_front_file'] ?? null);
            $selfie = ($data['selfie_image'] ?? null);

            if (!$idFront || !$selfie) {
                Log::warning('Bitnob skipped: missing id_front or selfie', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? [];
            $addr = $data['residential_address'] ?? [];

            $nameParts = array_values(array_filter([
                $data['first_name'] ?? '',
                $data['middle_name'] ?? '',
                $data['last_name'] ?? '',
            ]));

            $idType = $idInfo['type'] ?? 'NATIONAL_ID';
            if (strtolower($addr['country'] ?? 'NG') === 'nigeria') {
                $allowed = ['NATIONAL_ID', 'BVN_NG', 'Passport', 'DriverLicense'];
                if (!in_array($idType, $allowed, true)) {
                    Log::warning('Bitnob skipped: invalid ID type for Nigeria', ['customer_id' => $customer->customer_id, 'idType' => $idType]);
                    return;
                }
            }

            $country = $addr['country'] ?? 'NG';
            if ($addr['country'] == "NG" || $addr['country'] ?? 'NG' == "NGA" || strtoupper($addr['country']) ?? 'NIGERIA') {
                $country = "GH";
            }

            $validatedData = [
                'date_of_birth' => substr($data['birth_date'], 0, 10) ?? null,
                'dateOfBirth' => substr($data['birth_date'], 0, 10) ?? null,
                'firstName' => $nameParts[0] ?? '',
                'lastName' => $nameParts[1] ?? ($nameParts[0] ?? 'Unknown'),
                'email' => $data['email'] ?? '',
                'phoneNumber' => $data['phone'] ?? '',
                'idImage' => $idFront,
                'userPhoto' => $selfie,
                'country' => $country,
                'city' => $addr['city'] ?? '',
                'state' => $addr['state'] ?? '',
                'zipCode' => $addr['postal_code'] ?? '',
                'line1' => $addr['street_line_1'] ?? '',
                'houseNumber' => '',
                'idType' => $idType,
                'idNumber' => $idInfo['number'] ?? null,
            ];

            $baseUrl = rtrim(env('BITNOB_BASE_URL', 'https://api.bitnob.co/api/v1'), '/');
            $token = env('BITNOB_API_KEY');

            $response = Http::timeout(20)->withToken($token)->post("{$baseUrl}/customers", $validatedData)->json();

            if (isset($response['status']) && $response['status'] === true) {
                $customer->update([
                    'can_create_vc' => true,
                    'vc_customer_id' => $response['data']['id'] ?? null,
                ]);
                Endorsement::updateOrCreate(
                    ['customer_id' => $customer->customer_id, 'service' => 'virtual_card'],
                    ['status' => 'approved']
                );
                update_endorsement($customer->customer_id, 'virtual_card', 'submitted', null);
                add_customer_meta($customer->customer_id, 'bitnob_customer_id', $response['data']['id']);
                Log::info('Bitnob KYC success', ['customer_id' => $customer->customer_id]);
            } else {
                Log::error('Bitnob KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'response' => $response,
                ]);
            }
        } catch (Throwable $e) {
            Log::error('Bitnob KYC error', [
                'customer_id' => $customer->customer_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function submitToTransfi()
    {
        try {
            logger("initiating Transfi business submission");
            logger("transfi incoming payload", ['data' => $this->business]);
            $customer = Customer::whereCustomerId($this->business->customer_id);
            if (!$customer) {
                logger("Customer not found");
            }
            if (!$this->business->incorporation_date) {
                Log::warning('Transfi skipped: incorporation date missing', [
                    'business_id' => $this->business->id,
                ]);
            } else {
                $addr = $this->business->registered_address;
                $data = [
                    "businessName" => $this->business->business_legal_name,
                    "email"        => $this->business->email,
                    "regNo"        => $this->business->registration_number,
                    "date"         => $this->business->incorporation_date,
                    "country"      => $addr['country'] ?? 'NG',
                    "phone"        => $this->business->phone_number,
                    "phoneCode"        => $this->business->phone_calling_code,
                    "address"      => [
                        "street"     => $addr['street_line_1'] ?? '',
                        "city"       => $addr['city'] ?? '',
                        "state"      => $addr['subdivision'] ?? '',
                        "postalCode" => $addr['postal_code'] ?? '',
                    ],
                ];

                $customerId = $customer->customer_id;
                $baseUrl = rtrim(env('TRANSFI_API_URL', 'https://api.transfi.com/v2/'), '/');
                $response = Http::timeout(20)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'MID' => env('TRANSFI_MERCHANT_ID'),
                        'Authorization' => 'Basic ' . base64_encode(env('TRANSFI_USERNAME') . ':' . env('TRANSFI_PASSWORD')),
                    ])
                    ->post("{$baseUrl}/users/individual", $data);


                if ($response->successful()) {
                    $transfiUserId = $response->json()['userId'] ?? null;
                    if ($transfiUserId) {
                        // send request to generate KYB URI
                        $kybPayload = ["email" => $this->business->email];
                        $res = Http::timeout(20)
                            ->withHeaders([
                                'Accept' => 'application/json',
                                'MID' => env('TRANSFI_MERCHANT_ID'),
                                'Authorization' => 'Basic ' . base64_encode(env('TRANSFI_USERNAME') . ':' . env('TRANSFI_PASSWORD')),
                            ])
                            ->post("{$baseUrl}/users/individual", $data);
                        if ($res->successful() && isset($res->json()['link'])) {
                            $link = $res->json()['link'];
                            // update the Endorsement
                            update_endorsement($customerId, 'asian', 'pending', $link);
                        }
                    }
                    // since it's successful let generate a KYB url
                    return ['status' => 'success', 'provider_id' => $response->json()['reference'] ?? null];
                }
            }
            logger("Transfi business submitted", ['response' => $response->json()]);
        } catch (\Exception $e) {
            Log::error("Transfi KYB submission failed for business {$this->business->id}", [
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    // ===== HELPERS =====
    protected function formatAddress($addr)
    {
        if (! $addr) {
            return [];
        }

        return [
            "line1"       => $addr['street_line_1'] ?? '',
            "line2"       => $addr['street_line_2'] ?? '',
            "city"        => $addr['city'] ?? '',
            "state"       => $addr['subdivision'] ?? '',
            "country"     => $addr['country'] ?? 'NG',
            "postal_code" => $addr['postal_code'] ?? '',
        ];
    }

    protected function mapBusinessTypeToTazapay(string $type): string
    {
        $map = [
            'sole_prop'   => 'sole_proprietorship',
            'llc'         => 'limited_liability_company',
            'corporation' => 'corporation',
            'partnership' => 'partnership',
            'trust'       => 'trust',
            'cooperative' => 'cooperative',
            'other'       => 'other',
        ];
        return $map[$type] ?? 'other';
    }

    protected function mapBusinessTypeToBorderless(string $type): string
    {
        // Borderless uses same values as your frontend
        return $type;
    }

    protected function mapRepresentativesToTazapay(): array
    {
        if (empty($this->business->associated_persons)) {
            return [];
        }

        return array_map(function ($p) {
            return [
                "first_name"           => $p['first_name'],
                "last_name"            => $p['last_name'],
                "date_of_birth"        => $p['birth_date'],
                "address"              => $this->formatAddress($p['residential_address']),
                "nationality"          => $p['nationality'],
                "phone"                => [
                    "calling_code" => $this->business->phone_calling_code,
                    "number"       => $p['phone'] ?? $this->business->phone_number,
                ],
                "ownership_percentage" => $p['ownership_percentage'],
                "roles"                => $this->extractRoles($p),
                // TODO: Add document URLs if stored
                "documents"            => [],
            ];
        }, $this->business->associated_persons);
    }

    protected function extractRoles(array $person): array
    {
        $roles = [];
        if ($person['has_ownership'] ?? false) {
            $roles[] = 'owner';
        }

        if ($person['has_control'] ?? false) {
            $roles[] = 'controller';
        }

        if ($person['is_signer'] ?? false) {
            $roles[] = 'signer';
        }

        if ($person['is_director'] ?? false) {
            $roles[] = 'director';
        }

        return $roles ?: ['other'];
    }

    protected function mapDocumentsToTazapay(): array
    {
        // You’d need to store document URLs (e.g., on S3) during upload
        // For now, return empty
        return [];
        /*
        Example:
        return [
            [
                "type" => "business",
                "sub_type" => "formation",
                "tag" => "registrationProofDoc",
                "description" => "Certificate of Incorporation",
                "file_name" => "incorp.pdf",
                "url" => "https://your-bucket.s3.amazonaws.com/incorp.pdf"
            ]
        ];
        */
    }

    protected function formatDate($date, string $format = 'Y-m-d'): ?string
    {
        if (!$date) {
            return null;
        }

        return \Carbon\Carbon::parse($date)->format($format);
    }
}
