<?php
namespace App\Jobs;

use App\Models\Customer;
use App\Models\Endorsement;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ThirdPartyKycSubmission implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries   = 3;
    public int $backoff = 15;

    protected array $submissionData;

    public $noah_api_key;

    public function __construct(array $submissionData)
    {
        $this->submissionData = $submissionData;
        $this->noah_api_key   = config('services.noah.api_key');
    }

    public function handle(): void
    {
        $customerId = $this->submissionData['customer_id'] ?? null;
        if (! $customerId) {
            Log::error('KYC job failed: missing customer_id', $this->submissionData);
            return;
        }

        $customer = $this->getCustomer($customerId);
        if (! $customer) {
            Log::error("KYC job failed: customer not found", ['customer_id' => $customerId]);
            return;
        }

        if (empty($this->submissionData['identifying_information'])) {
            Log::warning('KYC job skipped: missing identifying info', ['customer_id' => $customerId]);
            return;
        }

        $docs = collect($this->submissionData['documents'] ?? []);

        $hasIdFront = $docs->contains('type', 'id_front');
        $hasSelfie  = $docs->contains('type', 'selfie');

        // Submit to all applicable providers
        $this->borderless($customer, $this->submissionData);
        $this->noah($customer, $this->submissionData);

        if ($hasIdFront && $hasSelfie) {
            $this->transFi($customer, $this->submissionData, $docs);
            $this->bitnob($customer, $this->submissionData, $docs);
        } else {
            Log::info('TransFi & Bitnob skipped: missing id_front or selfie', ['customer_id' => $customerId]);
        }
    }

    private function borderless(Customer $customer, array $data): void
    {
        try {
            if (! $customer->borderless_identity_id) {
                Log::info('Borderless skipped: not enrolled', ['customer_id' => $customer->customer_id]);
                return;
            }

            $addr = $data['residential_address'] ?? [];

            $customerData = [
                "firstName"      => $data['first_name'] ?? '',
                "lastName"       => $data['last_name'] ?? '',
                "secondLastName" => $data['second_last_name'] ?? null,
                "middleName"     => $data['middle_name'] ?? '',
                "taxId"          => $data['taxId'] ?? '', // ✅ Correct field name
                "dateOfBirth"    => substr($data['birth_date'], 0, 10) ?? '',
                "email"          => $data['email'] ?? '',
                "phone"          => $data['phone'] ?? '',
                "activity"       => $data['employment_status'] ?? 'Not Specified',
                "sex"            => ucfirst(strtolower($data['gender'] ?? 'male')),
                "address"        => [
                    "street1"    => $addr['street_line_1'] ?? '',
                    "city"       => $addr['city'] ?? '',
                    "state"      => $addr['state'] ?? '',
                    "postalCode" => $addr['postal_code'] ?? '',
                    "country"    => $addr['country'] ?? 'NG',
                ],
            ];

            $baseUrl  = rtrim(config('services.borderless.base_url', 'https://sandbox-api.borderless.xyz/v1'), '/');
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . config('services.borderless.api_key'),
                    'Accept'        => 'application/json',
                ])
                ->post("{$baseUrl}/identities/personal", $customerData);

            if ($response->successful()) {
                Log::info('Borderless KYC submitted', ['customer_id' => $customer->customer_id]);
                // No endorsement for Borderless (per requirement)
            } else {
                Log::error('Borderless KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status'      => $response->status(),
                    'body'        => $response->body(),
                ]);
            }
        } catch (Throwable $e) {
            Log::error('Borderless KYC exception', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    private function transFi(Customer $customer, array $data, $docs): void
    {
        try {
            if (! $customer->transfi_user_id) {
                Log::info('TransFi skipped: no transfi_user_id', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? [];

            $imageFront = $this->downloadAndEncode($docs->firstWhere('type', 'id_front')['file'] ?? null);
            $imageBack  = $this->downloadAndEncode($docs->firstWhere('type', 'id_back')['file'] ?? null) ?: $imageFront;
            $selfie     = $this->downloadAndEncode($docs->firstWhere('type', 'selfie')['file'] ?? null);

            if (! $imageFront || ! $selfie) {
                Log::warning('TransFi skipped: failed to fetch/encode docs', ['customer_id' => $customer->customer_id]);
                return;
            }

            $addr = $data['residential_address'] ?? [];

            $payload = [
                'email'              => $data['email'] ?? '',
                'idDocExpiryDate'    => $idInfo['expiration_date'] ?? null,
                'idDocUserName'      => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                'idDocType'          => $idInfo['type'] ?? 'id_card',
                'idDocFrontSide'     => $imageFront,
                'idDocBackSide'      => $imageBack,
                'selfie'             => $selfie,
                'gender'             => $data['gender'] ?? null,
                'phoneNo'            => $data['phone'] ?? '',
                'idDocIssuerCountry' => $idInfo['issuing_country'] ?? ($addr['country'] ?? 'NG'),
                'street'             => $addr['street_line_1'] ?? '',
                'city'               => $addr['city'] ?? '',
                'state'              => $addr['state'] ?? '',
                'country'            => $addr['country'] ?? 'NG',
                'dob'                => substr($data['birth_date'], 0, 10) ?? null,
                'postalCode'         => $addr['postal_code'] ?? '',
                'firstName'          => $data['first_name'] ?? '',
                'lastName'           => $data['last_name'] ?? '',
                'userId'             => $customer->transfi_user_id,
                'nationality'        => $addr['country'] ?? 'NG',
            ];

            $baseUrl  = rtrim(env('TRANSFI_API_URL', 'https://api.transfi.com'), '/');
            $response = Http::asMultipart()
                ->timeout(20)
                ->withHeaders([
                    'Accept'        => 'application/json',
                    'MID'           => env('TRANSFI_MERCHANT_ID'),
                    'Authorization' => 'Basic ' . base64_encode(env('TRANSFI_API_KEY') . ':' . env('TRANSFI_API_SECRET')),
                ])
                ->post("{$baseUrl}/kyc/share/third-vendor", $payload);

            if ($response->successful()) {
                Log::info('TransFi KYC submitted', ['customer_id' => $customer->customer_id]);
                Endorsement::updateOrCreate(
                    ['customer_id' => $customer->customer_id, 'service' => 'asian'],
                    ['status' => 'approved']
                );
            } else {
                Log::error('TransFi KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status'      => $response->status(),
                    'body'        => $response->body(),
                ]);
            }
        } catch (Throwable $e) {
            Log::error('TransFi KYC error', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    private function bitnob(Customer $customer, array $data, $docs): void
    {
        try {
            $userPhoto = $this->downloadAndEncode($docs->firstWhere('type', 'selfie')['file'] ?? null);
            $idImage   = $this->downloadAndEncode($docs->firstWhere('type', 'id_front')['file'] ?? null);

            if (! $userPhoto || ! $idImage) {
                Log::warning('Bitnob skipped: missing/failed ID or selfie', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? [];
            $addr   = $data['residential_address'] ?? [];

            $nameParts = array_values(array_filter([
                $data['first_name'] ?? '',
                $data['middle_name'] ?? '',
                $data['last_name'] ?? '',
            ]));

            $idType = $idInfo['type'] ?? 'NATIONAL_ID';
            if (strtolower($addr['country'] ?? 'NG') === 'nigeria') {
                $allowed = ['NATIONAL_ID', 'BVN_NG', 'Passport', 'DriverLicense'];
                if (! in_array($idType, $allowed, true)) {
                    Log::warning('Bitnob skipped: invalid ID type for Nigeria', ['customer_id' => $customer->customer_id, 'idType' => $idType]);
                    return;
                }
            }

            $validatedData = [
                'date_of_birth' => substr($data['birth_date'], 0, 10) ?? null,
                'dateOfBirth'   => substr($data['birth_date'], 0, 10) ?? null,
                'firstName'     => $nameParts[0] ?? '',
                'lastName'      => $nameParts[1] ?? ($nameParts[0] ?? 'Unknown'),
                'customerEmail' => $data['email'] ?? '',
                'phoneNumber'   => $data['phone'] ?? '',
                'idImage'       => $idImage,
                'userPhoto'     => $userPhoto,
                'country'       => $addr['country'] ?? 'NG',
                'city'          => $addr['city'] ?? '',
                'state'         => $addr['state'] ?? '',
                'zipCode'       => $addr['postal_code'] ?? '',
                'line1'         => $addr['street_line_1'] ?? '',
                'houseNumber'   => '',
                'idType'        => $idType,
                'idNumber'      => $idInfo['number'] ?? null, // ✅ Correct field: 'number'
            ];

            $baseUrl = rtrim(env('BITNOB_BASE_URL', 'https://api.bitnob.co/api/v1'), '/');
            $token   = env('BITNOB_API_KEY');

            $response = Http::timeout(20)
                ->withToken($token)
                ->post("{$baseUrl}/customers", $validatedData)
                ->json();

            if (isset($response['status']) && $response['status'] === true) {
                $customer->update([
                    'can_create_vc'  => true,
                    'vc_customer_id' => $response['data']['id'] ?? null,
                ]);
                Endorsement::updateOrCreate(
                    ['customer_id' => $customer->customer_id, 'service' => 'virtual_card'],
                    ['status' => 'approved']
                );
                Log::info('Bitnob KYC success', ['customer_id' => $customer->customer_id]);
            } else {
                Log::error('Bitnob KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'response'    => $response,
                ]);
            }
        } catch (Throwable $e) {
            Log::error('Bitnob KYC error', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    private function noah(Customer $customer, array $data): void
    {
        try {
            if ($customer->is_noah_registered) {
                Log::info('Noah skipped: already registered', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? [];
            $addr   = $data['residential_address'] ?? [];

            $nameParts = array_values(array_filter([
                $data['first_name'] ?? '',
                $data['middle_name'] ?? '',
                $data['last_name'] ?? '',
            ]));

            $internalIdType = strtolower($idInfo['type'] ?? 'national_id');
            $noahIdType     = $this->mapIdTypeToNoah($internalIdType);

            $supportedIdTypes = ["DrivingLicense", "NationalIDCard", "Passport", "AddressProof", "ResidencePermit", "TaxID"];
            if (! in_array($noahIdType, $supportedIdTypes, true)) {
                $noahIdType = 'NationalIDCard';
            }

            $customerData = [
                "Type"             => "Individual",
                "FullName"         => [
                    "FirstName" => $nameParts[0] ?? '',
                    "LastName"  => $nameParts[1] ?? ($nameParts[0] ?? ''),
                ],
                "DateOfBirth"      => substr($data['birth_date'], 0, 10) ?? '1990-01-01',
                "Email"            => $data['email'] ?? '',
                "PhoneNumber"      => $data['phone'] ?? '',
                "PrimaryResidence" => [
                    "Street"   => $addr['street_line_1'] ?? '',
                    "City"     => $addr['city'] ?? '',
                    "PostCode" => $addr['postal_code'] ?? '',
                    "State"    => $addr['state'] ?? '',
                    "Country"  => $addr['country'] ?? 'NG',
                ],
                "Identities"       => [
                    [
                        'IssuingCountry' => $idInfo['issuing_country'] ?? 'NG',
                        'IDNumber'       => $idInfo['number'] ?? '',
                        'IssuedDate'     => $idInfo['date_issued'] ?? '',
                        'ExpiryDate'     => $idInfo['expiration_date'] ?? '',
                        'IDType'         => $noahIdType,
                    ],
                ],
            ];

            $baseUrl = rtrim(config('services.noah.base_url', 'https://api.sandbox.noah.com/v1'), '/');

            if (empty($this->noah_api_key)) {
                throw new \RuntimeException('NOAH_API_KEY not configured in config/services.php');
            }

            $response = Http::timeout(20)
                ->withHeaders([
                    'X-Api-Key'    => $this->noah_api_key,
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->put("{$baseUrl}/customers/{$customer->customer_id}", $customerData);

            if ($response->successful()) {
                $customer->update(['is_noah_registered' => true]);
                Log::info('Noah KYC submitted', ['customer_id' => $customer->customer_id]);

                // ✅ Add required endorsements: base + sepa
                foreach (['base', 'sepa'] as $service) {
                    Endorsement::updateOrCreate(
                        ['customer_id' => $customer->customer_id, 'service' => $service],
                        ['status' => 'approved']
                    );
                }
            } else {
                Log::error('Noah KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status'      => $response->status(),
                    'body'        => $response->body(),
                ]);
            }
        } catch (Throwable $e) {
            Log::error('Noah KYC error', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    /**
     * Full mapping from internal ID types to Noah-supported types.
     * Preserves all original mappings from your initial implementation.
     */
    private function mapIdTypeToNoah(string $internalType): string
    {
        $noahIdTypeMap = [
            // Passports
            'passport'    => 'Passport',

            // National IDs
            'national_id' => 'NationalIDCard',
            'bvn'         => 'NationalIDCard',
            'nin'         => 'NationalIDCard',
            'emirates_id' => 'NationalIDCard',
            'qatar_id'    => 'NationalIDCard',
            'hkid'        => 'NationalIDCard',
            'nric'        => 'NationalIDCard',
            'fin'         => 'NationalIDCard',
            'rrn'         => 'NationalIDCard',
            'jmbg'        => 'NationalIDCard',
            'oib'         => 'NationalIDCard',
            'cnp'         => 'NationalIDCard',
            'idnp'        => 'NationalIDCard',
            'nic'         => 'NationalIDCard',
            'nicn'        => 'NationalIDCard',
            'tckn'        => 'NationalIDCard',
            'mn'          => 'NationalIDCard',
            'hetu'        => 'NationalIDCard',
            'pesel'       => 'NationalIDCard',
            'ppsn'        => 'NationalIDCard',
            'nino'        => 'NationalIDCard',
            'cpr'         => 'NationalIDCard',
            'nrn'         => 'NationalIDCard',
            'ucn'         => 'NationalIDCard',
            'cdi'         => 'NationalIDCard',
            'curp'        => 'NationalIDCard',
            'ine'         => 'NationalIDCard',
            'ak'          => 'NationalIDCard',
            'pk'          => 'NationalIDCard',
            'rc'          => 'NationalIDCard',
            'ik'          => 'NationalIDCard',
            'aom'         => 'NationalIDCard',
            'matricule'   => 'NationalIDCard',
            'embg'        => 'NationalIDCard',
            'fn'          => 'NationalIDCard',
            'bsn'         => 'NationalIDCard',

            // Tax IDs
            'tin'         => 'TaxID',
            'nif'         => 'TaxID',
            'nit'         => 'TaxID',
            'cpf'         => 'TaxID',
            'pan'         => 'TaxID',
            'ssn'         => 'TaxID',
            'itin'        => 'TaxID',
            'ruc'         => 'TaxID',
            'rif'         => 'TaxID',
            'mst'         => 'TaxID',
            'voen'        => 'TaxID',
            'npwp'        => 'TaxID',
            'nuit'        => 'TaxID',
            'tpin'        => 'TaxID',
            'itr'         => 'TaxID',
            'ird'         => 'TaxID',
            'steuer_id'   => 'TaxID',
            'cf'          => 'TaxID',
            'rut'         => 'TaxID',
            'rfc'         => 'TaxID',
            'rnokpp'      => 'TaxID',
            'iin'         => 'TaxID',
            'inn'         => 'TaxID',
            'si'          => 'TaxID',
            'avs'         => 'TaxID',
            'ahv'         => 'TaxID',
            'tfn'         => 'TaxID',
            'sin'         => 'TaxID',
            'utr'         => 'TaxID',
            'crib'        => 'TaxID',
            'crc'         => 'TaxID',
            'bir'         => 'TaxID',
            'mf'          => 'TaxID',
            'ntn'         => 'TaxID',
            'trn'         => 'TaxID',
            'rtn'         => 'TaxID',
            'pin'         => 'TaxID',
        ];

        return $noahIdTypeMap[$internalType] ?? 'NationalIDCard';
    }

    private function downloadAndEncode(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        try {
            // Note: Consider enabling SSL verification in production
            $response = Http::timeout(10)->withOptions(['verify' => false])->get($url);
            if ($response->successful() && $response->body()) {
                return base64_encode($response->body());
            }
        } catch (Throwable $e) {
            Log::warning('Failed to download KYC file', ['url' => $url, 'error' => $e->getMessage()]);
        }
        return null;
    }

    private function getCustomer(string $customerId): ?Customer
    {
        return Customer::where('customer_id', $customerId)->first();
    }
}
