<?php
namespace App\Jobs;

use App\Models\Customer;
use App\Models\Endorsement;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ThirdPartyKycSubmission implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries   = 3;
    public int $backoff = 15;
    public $borderlessBaseUrl;

    protected array $submissionData;

    public $noah_api_key, $clientId, $clientSecret;

    public function __construct(array $submissionData)
    {
        $this->submissionData    = $submissionData;
        $this->noah_api_key      = config('services.noah.api_key');
        $this->borderlessBaseUrl = env('BORDERLESS_BASE_URL', "https://sandbox-api.borderless.xyz/v1");
        $this->clientId          = env('BORDERLESS_CLIENT_ID');     //config('services.borderless.client_id');
        $this->clientSecret      = env('BORDERLESS_CLIENT_SECRET'); //config('services.borderless.client_secret');
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

        $hasIdFront = $docs->contains('type', 'image_front_file');
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

    /**
     * Generate and cache API access token for borderless
     */
    public function generateAccessToken(): ?array
    {
        if (Cache::has('borderless_access_token')) {
            return ['accessToken' => Cache::get('borderless_access_token')];
        }

        $baseUrl  = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
        $endpoint = 'auth/m2m/token';

        $payload = [
            'clientId'     => $this->clientId,
            'clientSecret' => $this->clientSecret,
        ];

        $fullUrl = "{$baseUrl}/{$endpoint}";
        logger("full access token URL is {$fullUrl}, base url is: {$baseUrl}, and the endpoint is {$endpoint}");
        $response = Http::post("https://sandbox-api.borderless.xyz/v1/auth/m2m/token", $payload);

        if ($response->successful()) {
            $result = $response->json();
            if (! isset($result['accessToken'])) {
                Log::error('Borderless token response missing accessToken', ['body' => $result]);
                return ['error' => 'Invalid token response'];
            }

            $token = $result['accessToken'];

            Cache::put('borderless_access_token', $token, now()->addHours(23));

            return ['accessToken' => $token];
        }

        Log::error('Failed to generate Borderless API token', [
            'status' => $response->status(),
            'body'   => $response->body(),
        ]);

        return ['error' => 'Failed to generate access token'];
    }

    private function borderless(Customer $customer, array $data): void
    {
        try {
            if ($customer->borderless_identity_id) {
                Log::info('Borderless skipped: customer already enrolled', ['customer_id' => $customer->customer_id]);
                return;
            }

            $addr   = $data['residential_address'] ?? [];
            $idInfo = $data['identifying_information'][0] ?? null;

            // --- Step 1: Submit base KYC ---
            $customerData = [
                "firstName"      => $data['first_name'] ?? '',
                "lastName"       => $data['last_name'] ?? '',
                "secondLastName" => $data['second_last_name'] ?? null,
                "middleName"     => $data['middle_name'] ?? '',
                "taxId"          => $data['taxId'] ?? '',
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

            $baseUrl  = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
            $endpoint = "identities/personal";

            $token_arr = $this->generateAccessToken();
            if (! is_array($token_arr) || ! isset($token_arr['accessToken'])) {
                logger('Error generating access token', ['result' => $token_arr]);
            }
            $token = $token_arr['accessToken'];

            Log::info("The generated accesstoken is: ", ['token' => $token]);
            $response = Http::timeout(15)
                ->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json',
                ])
                ->post("{$baseUrl}/{$endpoint}", $customerData);

            if (! $response->successful()) {
                Log::error('Borderless KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status'      => $response->status(),
                    'body'        => $response->body(),
                ]);
                Endorsement::updateOrCreate(
                    ['customer_id' => $customer->customer_id, 'service' => 'pending'],
                    ['status' => 'approved']
                );
                return;
            }

            $responseData = $response->json();
            $identityId   = $responseData['id'] ?? null;

            if (! $identityId) {
                Log::error('Borderless: identity_id not returned', ['customer_id' => $customer->customer_id]);
                return;
            }

            Log::info('Borderless KYC submitted', ['customer_id' => $customer->customer_id, 'identity_id' => $identityId]);

            // --- Step 2: Upload Documents ---
            $this->uploadBorderlessDocuments($identityId, $idInfo, $addr, $data['customer_id']);
        } catch (Throwable $e) {
            Log::error('Borderless KYC exception', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);
        }
    }

    private function uploadBorderlessDocuments(string $identityId, ?array $idInfo, array $address, string $customerId): void
    {
        $token_arr = $this->generateAccessToken();
        if (! is_array($token_arr) || ! isset($token_arr['accessToken'])) {
            logger('Error generating access token', ['result' => $token_arr]);
        }
        $token = $token_arr['accessToken'];

        Log::info("The generated accesstoken is: ", ['token' => $token]);

        $baseUrl = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
        $headers = [
            'Authorization' => "Bearer {$token}",
            'Accept'       => 'application/json',
            'Content-Type' => 'application/json',
        ];

        // 1. Handle PRIMARY ID (NationalId/Passport/etc.)
        $primaryDocUploaded = false;
        if ($idInfo && ! empty($idInfo['image_front_file'])) {
            // Map internal type to Borderless-supported type
            $internalType      = strtolower($idInfo['type'] ?? '');
            $borderlessDocType = match ($internalType) {
                'passport' => 'Passport',
                'driver_license', 'drivers_license', 'driverlicense' => 'DriverLicense',
                'residence_permit', 'residencepermit' => 'ResidencePermit',
                default    => 'NationalId',
            };

            $imageFront = $this->downloadAndEncodeForBorderless($idInfo['image_front_file']);
            $imageBack  = null; // You don't have image_back_file in your DB

            if ($imageFront) {
                $docPayload = [
                    "issuingCountry" => $idInfo['issuing_country'] ?? 'NG',
                    "type"           => $borderlessDocType,
                    "idNumber"       => $idInfo['number'] ?? '',
                    "issuedDate"     => $idInfo['date_issued'] ?? '',
                    "expiryDate"     => $idInfo['expiration_date'] ?? '',
                    "imageFront"     => $imageFront,
                ];

                // Only include imageBack if present (not in your current data)
                if ($imageBack) {
                    $docPayload['imageBack'] = $imageBack;
                }

                // remove null data
                $docPayload = array_filter($docPayload);

                $response = Http::timeout(20)
                    ->withHeaders($headers)
                    ->put("{$baseUrl}/identities/{$identityId}/documents", $docPayload);

                if ($response->successful()) {
                    Log::info('Borderless primary ID uploaded', [
                        'customer_id' => $customerId,
                        'type'        => $borderlessDocType,
                    ]);
                    $primaryDocUploaded = true;
                } else {
                    Log::error('Borderless primary ID upload failed', [
                        'customer_id' => $customerId,
                        'status'      => $response->status(),
                        'body'        => $response->body(),
                    ]);
                }
            }
        }

        // 2. Handle PROOF OF ADDRESS (mandatory)
        $proofOfAddressUrl = $address['proof_of_address_file'] ?? null;
        if ($proofOfAddressUrl) {
            $proofImage = $this->downloadAndEncodeForBorderless($proofOfAddressUrl);
            if ($proofImage) {
                $proofPayload = [
                    "issuingCountry" => $address['country'] ?? 'NG',
                    "type"           => "ProofOfAddress",
                    "idNumber"       => "", // Not required for PoA
                    "issuedDate"     => now()->format('Y-m-d'),
                    "expiryDate"     => "", // Optional
                    "imageFront"     => $proofImage,
                ];

                $response = Http::timeout(20)
                    ->withHeaders($headers)
                    ->put("{$baseUrl}/identities/{$identityId}/documents", $proofPayload);

                if ($response->successful()) {
                    Log::info('Borderless ProofOfAddress uploaded', ['customer_id' => $customerId]);
                } else {
                    Log::error('Borderless ProofOfAddress upload failed', [
                        'customer_id' => $customerId,
                        'status'      => $response->status(),
                        'body'        => $response->body(),
                    ]);
                }
            } else {
                Log::warning('Borderless: failed to encode ProofOfAddress', ['customer_id' => $customerId]);
            }
        } else {
            Log::warning('Borderless: ProofOfAddress file missing', ['customer_id' => $customerId]);
        }
    }

    private function downloadAndEncodeForBorderless(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        try {
            $response = Http::timeout(10)->withOptions(['verify' => false])->get($url);
            if ($response->successful()) {
                $mimeType = $response->header('Content-Type') ?? 'image/png';
                // Normalize common MIME types
                $mimeMap = [
                    'image/jpg'       => 'image/jpeg',
                    'image/heic'      => 'image/heic',
                    'image/tiff'      => 'image/tiff',
                    'application/pdf' => 'application/pdf',
                ];

                $baseMime = match (true) {
                    str_starts_with($mimeType, 'image/jpeg')      => 'image/jpeg',
                    str_starts_with($mimeType, 'image/png')       => 'image/png',
                    str_starts_with($mimeType, 'image/heic')      => 'image/heic',
                    str_starts_with($mimeType, 'image/tiff')      => 'image/tiff',
                    str_starts_with($mimeType, 'application/pdf') => 'application/pdf',
                    default                                       => 'image/jpeg',
                };

                return "data:{$baseMime};base64," . base64_encode($response->body());
            }
        } catch (Throwable $e) {
            Log::warning('Failed to download/encode Borderless doc', ['url' => $url, 'error' => $e->getMessage()]);
        }
        return null;
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

                $documents = $data['identifying_information']; // ['identifying_information' => $data['identifying_information']];
                $this->submitNoahDocument($customer->customer_id, $documents);
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

    private function submitNoahDocument(string $customerId, array $documents): void
    {
        foreach ($documents as $doc) {

            $documentType = $doc['type'] ?? $doc['document_type'] ?? null; // e.g. NationalIDCard, Passport
            $countryCode  = $doc['country_code'] ?? 'NG';
            $associateId  = $doc['number'] ?? $doc['associate_id'] ?? null;
            $frontPath    = $doc['image_front_file'] ?? null; // full file path
            $backPath     = $doc['image_back_file'] ?? null;

            if (! $documentType || ! $frontPath) {
                Log::warning('Document skipped (missing required fields)', [
                    'customer_id' => $customerId,
                    'doc'         => $doc,
                ]);
                continue;
            }

            // Upload FRONT side
            $this->uploadSingleSide(
                customerId: $customerId,
                documentType: $documentType,
                countryCode: $countryCode,
                side: 'Front',
                filePath: $frontPath,
                associateId: $associateId
            );

            // Upload BACK side if available
            if ($backPath) {
                $this->uploadSingleSide(
                    customerId: $customerId,
                    documentType: $documentType,
                    countryCode: $countryCode,
                    side: 'Back',
                    filePath: $backPath,
                    associateId: $associateId
                );
            }
        }
    }

    private function uploadSingleSide(
        string $customerId,
        string $documentType,
        string $countryCode,
        string $side,
        string $filePath,
        ?string $associateId = null
    ): void {
        if (! file_exists($filePath)) {
            Log::error('Noah Document file missing', ['path' => $filePath]);
            return;
        }

        // Step 1: Get Upload URL
        $query = [
            'Type'        => $documentType,
            'CountryCode' => $countryCode,
            'Side'        => $side,
        ];

        if ($associateId) {
            $query['AssociateID'] = $associateId;
        }

        $baseUrl  = rtrim(config('services.noah.base_url', 'https://api.sandbox.noah.com/v1'), '/');
        $response = Http::withHeaders([
            'Accept'    => 'application/json',
            'X-Api-Key' => $this->noah_api_key,
        ])->get("{$baseUrl}/onboarding/{$customerId}/prefill/documents/upload-url", $query);

        if (! $response->successful()) {
            Log::error('Noah Upload URL request failed', [
                'customer_id' => $customerId,
                'status'      => $response->status(),
                'body'        => $response->body(),
            ]);
            return;
        }

        $payload = $response->json();
        $url     = $payload['PresignedURL'] ?? null;

        if (! $url) {
            Log::error('Noah Upload URL missing', ['response' => $payload]);
            return;
        }

        // Step 2: Upload file using PUT
        $uploadResponse = Http::withHeaders([
            'Content-Type' => 'image/png',
        ])->withBody(
            file_get_contents($filePath),
            'image/png'
        )->put($url);

        if ($uploadResponse->successful()) {
            Log::info('Noah document upload completed', [
                'customer_id' => $customerId,
                'document'    => $documentType,
                'side'        => $side,
            ]);
        } else {
            Log::error('Noah document upload failed', [
                'customer_id' => $customerId,
                'status'      => $uploadResponse->status(),
                'body'        => $uploadResponse->body(),
            ]);
        }
    }
}
