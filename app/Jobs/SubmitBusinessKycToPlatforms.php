<?php
namespace App\Jobs;

use App\Models\BusinessCustomer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
        ];

        // Submit to each platform
        $results['tazapay']    = $this->submitToTazapay();
        $results['borderless'] = $this->submitToBorderless();
        $results['noah']       = $this->submitToNoah();
        $results['transfi']    = $this->submitToTransfi();

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
                "registration_date"    => $this->business->incorporation_date->format('Y-m-d'),
                "statement_descriptor" => $this->business->statement_descriptor,
                "representatives"      => $this->mapRepresentativesToTazapay(),
                "documents"            => $this->mapDocumentsToTazapay(),
                "reference_id"         => $this->business->signed_agreement_id,
                "relationship"         => "customer",
                "purpose_of_use"       => [$this->business->account_purpose],
            ];

            $response = Http::withToken(config('services.tazapay.secret_key'))
                ->post(config('services.tazapay.base_url') . '/v1/kyb', $data);

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
                    ->post(config('services.borderless.base_url') . '/v1/identity/personal', $personalData);

                if (! $resp->successful()) {
                    throw new \Exception("Failed to create personal identity: " . $resp->body());
                }
                $identity = $resp->json();
                $uboIds[] = $identity['identityId'];

                // TODO: Upload ID documents for this person if needed
            }

            // Step 2: Create business identity
            $businessData = [
                "email"                            => $this->business->email,
                "name"                             => $this->business->business_legal_name,
                "businessTradeName"                => $this->business->business_trade_name,
                "dateOfIncorporation"              => $this->business->incorporation_date->format('Y-m-d'),
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
                        "relationshipEstablishedAt" => $person['relationship_established_at'] ?? now()->format('Y-m-d'),
                        "controlPersonTitle"        => $person['title'] ?? 'Director',
                    ];
                }, $this->business->associated_persons, $uboIds),
            ];

            $resp = Http::withToken(config('services.borderless.api_key'))
                ->post(config('services.borderless.base_url') . '/v1/identity/business', $businessData);

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
            $addr = $this->business->registered_address;
            $data = [
                "Type"                => "Business",
                "RegisteredName"      => $this->business->business_legal_name,
                "Email"               => $this->business->email,
                "RegistrationNumber"  => $this->business->registration_number,
                "RegistrationCountry" => $addr['country'] ?? 'NG',
                "RegisteredAddress"   => [
                    "Street"   => $addr['street_line_1'] ?? '',
                    "Street2"  => $addr['street_line_2'] ?? '',
                    "City"     => $addr['city'] ?? '',
                    "PostCode" => $addr['postal_code'] ?? '',
                    "State"    => $addr['subdivision'] ?? '',
                    "Country"  => $addr['country'] ?? 'NG',
                ],
                "IncorporationDate"   => $this->business->incorporation_date->format('Y-m-d'),
            ];

            $response = Http::withToken(config('services.noah.api_key'))
                ->post(config('services.noah.base_url') . '/v1/kyc/submit', $data);

            if ($response->successful()) {
                return ['status' => 'success', 'provider_id' => $response->json()['id'] ?? null];
            } else {
                throw new \Exception("HTTP {$response->status()}: " . $response->body());
            }
        } catch (\Exception $e) {
            Log::error("Noah KYB submission failed for business {$this->business->id}", [
                'error' => $e->getMessage(),
            ]);
            return ['status' => 'failed', 'error' => $e->getMessage()];
        }
    }

    protected function submitToTransfi()
    {
        try {
            $addr = $this->business->registered_address;
            $data = [
                "businessName" => $this->business->business_legal_name,
                "email"        => $this->business->email,
                "regNo"        => $this->business->registration_number,
                "date"         => $this->business->incorporation_date->format('d-m-Y'), // Transfi uses DD-MM-YYYY
                "country"      => $addr['country'] ?? 'NG',
                "phone"        => $this->business->phone_number,
                "address"      => [
                    "street"     => $addr['street_line_1'] ?? '',
                    "city"       => $addr['city'] ?? '',
                    "state"      => $addr['subdivision'] ?? '',
                    "postalCode" => $addr['postal_code'] ?? '',
                ],
            ];

            $response = Http::withToken(config('services.transfi.api_key'))
                ->post(config('services.transfi.base_url') . '/api/v1/kyc/business', $data);

            if ($response->successful()) {
                return ['status' => 'success', 'provider_id' => $response->json()['reference'] ?? null];
            } else {
                throw new \Exception("HTTP {$response->status()}: " . $response->body());
            }
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
}
