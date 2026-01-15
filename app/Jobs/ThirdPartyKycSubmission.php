<?php

namespace App\Jobs;

use App\Models\Customer;
use App\Models\Endorsement;
use App\Services\AveniaIndividualService;
use App\Services\NoahService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;
use App\Models\Country;
use App\Models\CustomerMeta;
use App\Services\AveniaBusinessService;
use App\Services\AveniaService;
use Illuminate\Support\Str;
use Carbon\Carbon;



class ThirdPartyKycSubmission implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries = 3;
    public int $backoff = 15;
    public $borderlessBaseUrl;

    protected array $submissionData;

    public $noah_api_key, $clientId, $clientSecret;

    public function __construct(array $submissionData)
    {
        $this->submissionData = $submissionData;
        $this->noah_api_key = config('services.noah.api_key');
        $this->borderlessBaseUrl = env('BORDERLESS_BASE_URL', "https://api.borderless.xyz/v1");
        $this->clientId = env('BORDERLESS_CLIENT_ID');     //config('services.borderless.client_id');
        $this->clientSecret = env('BORDERLESS_CLIENT_SECRET'); //config('services.borderless.client_secret');
    }

    public function handle(): void
    {
        $customerId = $this->submissionData['customer_id'] ?? null;
        if (!$customerId) {
            Log::error('KYC job failed: missing customer_id', $this->submissionData);
            return;
        }

        $customer = $this->getCustomer($customerId);
        if (!$customer) {
            Log::error("KYC job failed: customer not found", ['customer_id' => $customerId]);
            return;
        }

        if (empty($this->submissionData['identifying_information'])) {
            Log::warning('KYC job skipped: missing identifying info', ['customer_id' => $customerId]);
            return;
        }

        // Pull ID front from identifying_information
        $idInfo = $this->submissionData['identifying_information'][0] ?? null;
        $idFront = $idInfo['image_front_file'] ?? null;

        // Selfie is directly selfie_image
        $selfie = $this->submissionData['selfie_image'] ?? null;

        $hasIdFront = !empty($idFront);
        $hasSelfie = !empty($selfie);

        // // Submit to mandatory providers always
        $this->avenia($customer, $this->submissionData);
        $this->noah($customer, $this->submissionData);

        // Submit to TransFi + Bitnob only if both docs exist
        if ($hasIdFront && $hasSelfie) {
            $this->transFi($customer, $this->submissionData);
            $this->bitnob($customer, $this->submissionData);
        } else {
            Log::info('TransFi & Bitnob skipped: missing id_front or selfie', [
                'customer_id' => $customerId,
                'has_id_front' => $hasIdFront,
                'has_selfie' => $hasSelfie,
            ]);
        }
        $this->borderless($customer, $this->submissionData);
        $this->tazapay($customer, $this->submissionData);
    }

    public function tazapay(Customer $customer, $data)
    {
        try {
            $user = $data;
            $metaExists = get_customer_meta($user['customer_id'], 'tazapay_entity_id');

            if ($metaExists) {
                return response()->json(['message' => "User already enrolled for Tazapay"]);
            }

            // Decode JSON fields stored as strings
            $residentialAddress = $user['residential_address'];
            $identifyingInfo = $user['identifying_information'];
            $uploadedDocuments = $user['uploaded_documents']; // array of user files

            // Extract ID document (take first if multiple)
            $idDoc = $identifyingInfo[0] ?? null;

            // Extract proof of address file if available
            $proofOfAddressFile = $residentialAddress['proof_of_address_file'] ?? null;

            // Build Tazapay-compatible documents array
            $documents = [];

            /* ========= 1. Proof of Address Document ========= */
            if ($proofOfAddressFile) {
                $documents[] = [
                    "type"        => "address",
                    "sub_type"    => "other",
                    "tag"         => "AddressProofDoc",
                    "file_name"   => "proof_of_address",
                    "description" => "Proof of Address",
                    "url"         => $proofOfAddressFile
                ];
            }

            /* ========= 2. Identification Document ========= */
            if ($idDoc && isset($idDoc['image_front_file'])) {
                $documents[] = [
                    "type"        => "id_document",
                    "sub_type"    => $idDoc['type'] ?? "other",
                    "tag"         => "IdentityDocument",
                    "file_name"   => "id_front",
                    "description" => "Front of Identification Document",
                    "url"         => $idDoc['image_front_file']
                ];
            }

            // If passport or national ID has back image
            if ($idDoc && isset($idDoc['image_back_file']) && $idDoc['image_back_file']) {
                $documents[] = [
                    "type"        => "id_document",
                    "sub_type"    => $idDoc['type'] ?? "other",
                    "tag"         => "IdentityDocumentBack",
                    "file_name"   => "id_back",
                    "description" => "Back of Identification Document",
                    "url"         => $idDoc['image_back_file']
                ];
            }

            /* ========= 3. Proof of Funds Document ========= */
            if (!empty($uploadedDocuments)) {
                foreach ($uploadedDocuments as $doc) {
                    $documents[] = [
                        "type"        => $doc['type'] ?? "other",
                        "sub_type"    => "other",
                        "tag"         => "AdditionalDoc",
                        "file_name"   => $doc['type'] ?? "document",
                        "description" => ucfirst(str_replace('_', ' ', $doc['type'])),
                        "url"         => $doc['file']
                    ];
                }
            }

            /* ========= 4. Selfie ========= */
            if ($user['selfie_image']) {
                $documents[] = [
                    "type"        => "identity_verification",
                    "sub_type"    => "selfie",
                    "tag"         => "SelfieImage",
                    "file_name"   => "selfie",
                    "description" => "Selfie for identity verification",
                    "url"         => $user['selfie_image']
                ];
            }

            /* ========= BUILD FINAL PAYLOAD ========= */
            $payload = [
                "name"   => trim("{$user['first_name']} {$user['middle_name']} {$user['last_name']}"),
                "type"   => "individual",
                "email"  => $user['email'],

                "registration_address" => [
                    "line1"       => $residentialAddress['street_line_1'] ?? '',
                    "line2"       => $residentialAddress['street_line_2'] ?? '',
                    "city"        => $residentialAddress['city'] ?? '',
                    "state"       => $residentialAddress['state'] ?? '',
                    "country"     => $residentialAddress['country'] ?? '',
                    "postal_code" => $residentialAddress['postal_code'] ?? '',
                ],

                "phone" => [
                    "calling_code" => $user['calling_code'] ?? ltrim($this->extractCallingCode($user['phone']), '+'),
                    "number"       => $user['phone'],
                ],

                "individual" => [
                    "national_identification_number" => [
                        "type"   => $idDoc['type'] ?? "other",
                        "number" => $idDoc['number'] ?? null,
                    ],
                    "date_of_birth" => substr($user['birth_date'], 0, 10),
                    "nationality"   => $user['nationality'],
                ],

                "documents" => $documents,

                "submit"       => true,
                "reference_id" => $user['customer_id'],
            ];

            $endpoint = "https://service.tazapay.com/v3/entity";
            $response = Http::withToken(config('services.tazapay.secret'))
                ->withHeaders(['Accept' => 'application/json'])
                ->post($endpoint, $payload);


            if ($response->successful()) {
                $response = $apiResponse['data'] ?? [];
                $entityId = $response['id'] ?? null;
                $approvalStatus = $response['approval_status'] ?? null;
                add_customer_meta($user['customer_id'], 'tazapay_entity_id', $entityId);
                update_endorsement($user['customer_id'], 'cobo_pobo', $approvalStatus ?? "under_review");
            }

            return $payload;
        } catch (Throwable $th) {
            report($th);
            return [];
        }
    }

    /**
     * Extract calling code and number from phone formats like +2349010031860
     */
    private function extractCallingCode($phone)
    {
        if (preg_match('/^\+?(\d{1,3})/', $phone, $m)) {
            return $m[1];
        }
        return '';
    }

    private function extractPhoneNumber($phone)
    {
        return preg_replace('/^\+?\d{1,3}/', '', $phone); // strip calling code
    }


    public function noah(Customer $customer, array $data): void
    {
        try {
            if ($customer->is_noah_registered) {
                Log::info('Noah skipped: already registered', ['customer_id' => $customer->customer_id]);
                return;
            }

            // Step 1: Prefill customer data
            $this->prefillNoahOnboarding($customer, $data);

            // Step 2: Initiate onboarding flow
            $this->initiateNoahOnboarding($customer->customer_id);

            // Step 3: Submit documents
            $this->submitNoahDocument($customer->customer_id, $data['identifying_information'] ?? []);

            // Mark as registered and create endorsements
            $customer->update(['is_noah_registered' => true]);
            add_customer_meta($customer->customer_id, 'noah_customer_id', $customer->customer_id);
            Log::info('Noah KYC completed successfully', ['customer_id' => $customer->customer_id]);
        } catch (Throwable $e) {
            Log::error('Noah KYC error', [
                'customer_id' => $customer->customer_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    protected function prefillNoahOnboarding(Customer $customer, array $data): void
    {
        $idInfo = $data['identifying_information'][0] ?? [];
        $addr = $data['residential_address'] ?? [];

        $nameParts = array_values(array_filter([
            $data['first_name'] ?? '',
            $data['middle_name'] ?? '',
            $data['last_name'] ?? '',
        ]));

        $internalIdType = strtolower($idInfo['type'] ?? 'national_id');
        $noahIdType = $this->mapIdTypeToNoah($internalIdType);

        $supportedIdTypes = ["DrivingLicense", "NationalIDCard", "Passport", "AddressProof", "ResidencePermit", "TaxID"];
        if (!in_array($noahIdType, $supportedIdTypes, true)) {
            $noahIdType = 'NationalIDCard';
        }

        $idType = $idInfop['type'] ?? 'NationalIDCard';
        if (!in_array(strtolower($idType), ["DrivingLicense", "NationalIDCard", "Passport", "AddressProof", "ResidencePermit"])) {
            $idType = 'NationalIDCard';
        }

        $customerData = [
            "Type" => "IndividualCustomerPrefill",
            "FullName" => [
                "FirstName" => $data['first_name'],
                "MiddleName" => $data['middle_name'],
                "LastName" => $data['last_name'],
                "TransliteratedFirstName" => $data['transliterated_first_name'] ?? $data['first_name'],
                "TransliteratedMiddleName" => $data['transliterated_middle_name'] ?? $data['middle_name'],
                "TransliteratedLastName" => $data['transliterated_last_name'] ?? $data['last_name'],
            ],
            "DateOfBirth" => date('Y-m-d', strtotime($data['birth_date'])),
            "Identities" => [
                [
                    "IDType" => ucfirst($idType),
                    "IssuingCountry" => $idInfo['issuing_country'],
                    "IDNumber" => $idInfo['number'],
                    "IssuedDate" => $idInfo['date_issued'],
                    "ExpiryDate" => $idInfo['expiration_date']
                ]
            ],
            "PrimaryResidence" => [
                "Street" => $addr['street_line_1'] ?? null,
                "Street2" => $addr['street_line_2'] ?? null,
                "City" => $addr['city'] ?? null,
                "PostCode" => $addr['postal_code'] ?? null,
                "State" => $addr['state'] ?? null,
                "Country" => $addr['country'] ?? null,
            ],
            "Email" => $data['email'],
        ];

        // Remove nulls to avoid API errors
        $customerData = array_filter_recursive($customerData);

        Log::info('Noah KYC payload (prefill)', $customerData);

        $noah = new NoahService();
        $response = $noah->post("/onboarding/{$customer->customer_id}/prefill", $customerData);

        if (!$response->successful()) {
            throw new \RuntimeException('Noah prefill failed: ' . $response->status() . ' - ' . $response->body());
        }

        Log::info('Noah prefill successful', ['customer_id' => $customer->customer_id]);
    }

    public function initiateNoahOnboarding(string $customerId): void
    {
        Log::info('Initiating Noah onboarding', ['customer_id' => $customerId]);

        $noahService = new NoahService();
        $noahService->noahOnboardingInit($customerId);
    }

    /**
     * Generate and cache API access token for 
     * Borderless
     */
    public function generateAccessToken(): ?array
    {
        if (Cache::has('borderless_access_token')) {
            return ['accessToken' => Cache::get('borderless_access_token')];
        }

        $baseUrl = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
        $endpoint = 'auth/m2m/token';

        $payload = [
            'clientId' => $this->clientId,
            'clientSecret' => $this->clientSecret,
        ];

        $fullUrl = "{$baseUrl}/{$endpoint}";
        logger("full access token URL is {$fullUrl}, base url is: {$baseUrl}, and the endpoint is {$endpoint}");
        $response = Http::post("https://sandbox-api.borderless.xyz/v1/auth/m2m/token", $payload);

        if ($response->successful()) {
            $result = $response->json();
            if (!isset($result['accessToken'])) {
                Log::error('Borderless token response missing accessToken', ['body' => $result]);
                return ['error' => 'Invalid token response'];
            }

            $token = $result['accessToken'];

            Cache::put('borderless_access_token', $token, now()->addHours(23));

            return ['accessToken' => $token];
        }

        Log::error('Failed to generate Borderless API token', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        return ['error' => 'Failed to generate access token'];
    }

    private function borderless(Customer $customer, array $data): void
    {
        try {
            $meta_exists = get_customer_meta($customer->customer_id, 'borderless_customer_id');

            if ($meta_exists) {
                Log::info('Borderless skipped: customer already enrolled', ['customer_id' => $customer->customer_id]);
                return;
            }

            $addr = $data['residential_address'] ?? [];
            $idInfo = $data['identifying_information'][0] ?? null;

            // --- Step 1: Submit base KYC ---
            $customerData = [
                "firstName" => $data['first_name'] ?? '',
                "lastName" => $data['last_name'] ?? '',
                "secondLastName" => $data['second_last_name'] ?? null,
                "middleName" => $data['middle_name'] ?? '',
                "taxId" => $data['taxId'] ?? '',
                "dateOfBirth" => substr($data['birth_date'], 0, 10) ?? '',
                "email" => $data['email'] ?? '',
                "phone" => $data['phone'] ?? '',
                "activity" => $data['employment_status'] ?? 'Not Specified',
                "sex" => ucfirst(strtolower($data['gender'] ?? 'male')),
                "address" => [
                    "street1" => $addr['street_line_1'] ?? '',
                    "city" => $addr['city'] ?? '',
                    "state" => $addr['state'] ?? '',
                    "postalCode" => $addr['postal_code'] ?? '',
                    "country" => $addr['country'] ?? 'NG',
                ],
            ];

            $baseUrl = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
            $endpoint = "identities/personal";

            $token_arr = $this->generateAccessToken();
            if (!is_array($token_arr) || !isset($token_arr['accessToken'])) {
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

            if (!$response->successful()) {
                Log::error('Borderless KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                update_endorsement($customer->customer_id, 'native', 'under_review');
                return;
            }

            $responseData = $response->json();
            $identityId = $responseData['id'] ?? null;

            if (!$identityId) {
                Log::error('Borderless: identity_id not returned', ['customer_id' => $customer->customer_id]);
                return;
            }

            Log::info('Borderless KYC submitted', ['customer_id' => $customer->customer_id, 'identity_id' => $identityId]);
            add_customer_meta($customer->customer_id, 'borderless_customer_id', $identityId);

            // --- Step 2: Upload Documents ---
            $this->uploadBorderlessDocuments($identityId, $idInfo, $addr, $data['customer_id']);
        } catch (Throwable $e) {
            Log::error('Borderless KYC exception', [
                'customer_id' => $customer->customer_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    private function uploadBorderlessDocuments(string $identityId, ?array $idInfo, array $address, string $customerId): void
    {
        $token_arr = $this->generateAccessToken();
        if (!is_array($token_arr) || !isset($token_arr['accessToken'])) {
            logger('Error generating access token', ['result' => $token_arr]);
        }
        $token = $token_arr['accessToken'];

        Log::info("The generated accesstoken is: ", ['token' => $token]);

        $baseUrl = rtrim(config('services.borderless.base_url', $this->borderlessBaseUrl), '/');
        $headers = [
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        // 1. Handle PRIMARY ID (NationalId/Passport/etc.)
        $primaryDocUploaded = false;
        if ($idInfo && !empty($idInfo['image_front_file'])) {
            // Map internal type to Borderless-supported type
            $internalType = strtolower($idInfo['type'] ?? '');
            $borderlessDocType = match ($internalType) {
                'passport' => 'Passport',
                'driver_license', 'drivers_license', 'driverlicense' => 'DriverLicense',
                'residence_permit', 'residencepermit' => 'ResidencePermit',
                default => 'NationalId',
            };

            $imageFront = $this->downloadAndEncodeForBorderless($idInfo['image_front_file']);
            $imageBack = null; // You don't have image_back_file in your DB

            if ($imageFront) {
                $docPayload = [
                    "issuingCountry" => $idInfo['issuing_country'] ?? 'NG',
                    "type" => $borderlessDocType,
                    "idNumber" => $idInfo['number'] ?? '',
                    "issuedDate" => $idInfo['date_issued'] ?? '',
                    "expiryDate" => $idInfo['expiration_date'] ?? '',
                    "imageFront" => $imageFront,
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
                        'type' => $borderlessDocType,
                    ]);
                    $primaryDocUploaded = true;
                } else {
                    Log::error('Borderless primary ID upload failed', [
                        'customer_id' => $customerId,
                        'status' => $response->status(),
                        'body' => $response->body(),
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
                    "type" => "ProofOfAddress",
                    "issuedDate" => (string) now()->toDateString(),
                    "imageFront" => $proofImage,
                ];

                Log::info('Issued Date Sent:', ['issuedDate' => (string) now()->toDateString()]);

                $response = Http::timeout(20)
                    ->withHeaders($headers)
                    ->put("{$baseUrl}/identities/{$identityId}/documents", $proofPayload);

                if ($response->successful()) {
                    Log::info('Borderless ProofOfAddress uploaded', ['customer_id' => $customerId]);
                } else {
                    Log::error('Borderless ProofOfAddress upload failed', [
                        'customer_id' => $customerId,
                        'status' => $response->status(),
                        'body' => $response->body(),
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
        if (!$url) {
            return null;
        }

        try {
            $response = Http::timeout(10)->withOptions(['verify' => false])->get($url);
            if ($response->successful()) {
                $mimeType = $response->header('Content-Type') ?? 'image/png';
                // Normalize common MIME types
                $mimeMap = [
                    'image/jpg' => 'image/jpeg',
                    'image/heic' => 'image/heic',
                    'image/tiff' => 'image/tiff',
                    'application/pdf' => 'application/pdf',
                ];

                $baseMime = match (true) {
                    str_starts_with($mimeType, 'image/jpeg') => 'image/jpeg',
                    str_starts_with($mimeType, 'image/png') => 'image/png',
                    str_starts_with($mimeType, 'image/heic') => 'image/heic',
                    str_starts_with($mimeType, 'image/tiff') => 'image/tiff',
                    str_starts_with($mimeType, 'application/pdf') => 'application/pdf',
                    default => 'image/jpeg',
                };

                return "data:{$baseMime};base64," . base64_encode($response->body());
            }
        } catch (Throwable $e) {
            Log::warning('Failed to download/encode Borderless doc', ['url' => $url, 'error' => $e->getMessage()]);
        }
        return null;
    }

    private function transFi(Customer $customer, array $data): void
    {
        try {
            $baseUrl = rtrim(env('TRANSFI_API_URL', 'https://api.transfi.com/v2/'), '/');

            /* -------------------------------------------------
         | COUNTRY ISO2 RESOLUTION
         * ------------------------------------------------- */
            $countryCache = [];

            $resolveCountryToIso2 = function ($input) use (&$countryCache) {
                $key = strtolower(trim($input ?? ''));
                if (isset($countryCache[$key])) {
                    return $countryCache[$key];
                }

                $input = trim($input);

                if (strlen($input) === 2 && ctype_alpha($input)) {
                    return strtoupper($input);
                }

                $country = Country::whereRaw('LOWER(name) = ?', [Str::lower($input)])
                    ->orWhere('iso3', strtoupper($input))
                    ->orWhere('iso2', strtoupper($input))
                    ->first();

                $iso2 = $country?->iso2 ?? 'NG';
                $countryCache[$key] = $iso2;

                return $iso2;
            };

            /* -------------------------------------------------
            | PHONE NORMALIZATION (E.164)
            * ------------------------------------------------- */
            if (!isset($data['calling_code'])) {
                $normalizePhone = function (?string $phone, string $countryIso2) {
                    if (empty($phone)) {
                        return null;
                    }

                    // Keep digits and +
                    $raw = preg_replace('/[^\d+]/', '', trim($phone));

                    // Case 1: Already international
                    if (Str::startsWith($raw, '+')) {
                        $digits = preg_replace('/\D+/', '', $raw);

                        if (strlen($digits) < 8 || strlen($digits) > 15) {
                            Log::error('Invalid international phone length', [
                                'phone' => $phone,
                                'digits' => strlen($digits),
                            ]);
                            return null;
                        }

                        return '+' . $digits;
                    }

                    // Case 2: Local number
                    $local = ltrim(preg_replace('/\D+/', '', $raw), '0');

                    $country = Country::where('iso2', strtoupper($countryIso2))->first();
                    if (!$country || empty($country->dial_code)) {
                        Log::error('Missing country dial code for phone normalization', [
                            'phone' => $phone,
                            'country' => $countryIso2,
                        ]);
                        return null;
                    }

                    $dialCode = ltrim($country->dial_code, '+');
                    $full = $dialCode . $local;

                    if (strlen($full) < 8 || strlen($full) > 15) {
                        Log::error('Phone failed length validation after normalization', [
                            'original_phone' => $phone,
                            'normalized' => '+' . $full,
                            'digits' => strlen($full),
                            'country' => $countryIso2,
                        ]);
                        return null;
                    }

                    return '+' . $full;
                };
            }

            /* -------------------------------------------------
            | ID & MEDIA
            * ------------------------------------------------- */
            $idInfo  = $data['identifying_information'][0] ?? [];
            $idFront = $idInfo['image_front_file'] ?? null;
            $idBack  = $idInfo['image_back_file'] ?? $idFront;
            $selfie  = $data['selfie_image'] ?? null;

            if (!$idBack) {
                Log::warning('Using front image as back for TransFi KYC', [
                    'customer_id' => $customer->customer_id,
                ]);
            }

            if (!$idFront || !$selfie) {
                Log::warning('TransFi skipped: missing ID front or selfie', [
                    'customer_id' => $customer->customer_id,
                ]);
                return;
            }

            /* -------------------------------------------------
            | BASIC NORMALIZATION
            * ------------------------------------------------- */
            $addr = $data['residential_address'] ?? [];

            $gender = strtolower(trim($data['gender'] ?? 'male'));
            if (!in_array($gender, ['male', 'female'])) {
                $gender = 'male';
            }

            $dob = null;
            if (!empty($data['birth_date'])) {
                try {
                    $dob = Carbon::parse($data['birth_date'])->format('d-m-Y');
                } catch (\Exception $e) {
                    Log::info('Invalid DOB supplied', [
                        'customer_id' => $customer->customer_id,
                    ]);
                }
            }

            $idType = strtolower($idInfo['type'] ?? 'id_card');
            if (!in_array($idType, ['passport', 'id_card', 'drivers'])) {
                $idType = 'id_card';
            }

            /* -------------------------------------------------
         | COUNTRY ISO2
         * ------------------------------------------------- */
            $nationalityIso2 = $resolveCountryToIso2($data['nationality'] ?? 'NG');
            $issuerCountryIso2 = $resolveCountryToIso2($idInfo['issuing_country'] ?? $nationalityIso2);
            $residenceCountryIso2 = $resolveCountryToIso2($addr['country'] ?? $nationalityIso2);

            /* -------------------------------------------------
         | PHONE FINAL
         * ------------------------------------------------- */
            $phoneNumber = $normalizePhone(
                $data['phone'] ?? null,
                $nationalityIso2
            );

            if (!$phoneNumber) {
                Log::error('Phone normalization failed', [
                    'customer_id' => $customer->customer_id,
                    'input_phone' => $data['phone'] ?? null,
                ]);
                return;
            }

            /* -------------------------------------------------
         | ADDRESS
         * ------------------------------------------------- */
            $addressPayload = [
                'street' => $addr['street_line_1'] ?? '',
                'city' => $addr['city'] ?? '',
                'state' => $addr['state'] ?? '',
                'country' => $residenceCountryIso2,
                'postalCode' => $addr['postal_code'] ?? '',
            ];

            /* -------------------------------------------------
         | CREATE TRANSFI USER
         * ------------------------------------------------- */
            if (!$customer->transfi_user_id) {
                $userPayload = [
                    'firstName' => $data['first_name'] ?? '',
                    'lastName' => $data['last_name'] ?? '',
                    'date' => $dob,
                    'email' => $data['email'] ?? '',
                    'gender' => $gender,
                    'phone' => $phoneNumber,
                    'country' => $nationalityIso2,
                    'address' => $addressPayload,
                ];

                $res = Http::timeout(20)
                    ->withHeaders([
                        'Accept' => 'application/json',
                        'MID' => env('TRANSFI_MERCHANT_ID'),
                        'Authorization' => 'Basic ' . base64_encode(
                            env('TRANSFI_USERNAME') . ':' . env('TRANSFI_PASSWORD')
                        ),
                    ])
                    ->post("{$baseUrl}/users/individual", $userPayload);

                if ($res->failed()) {
                    Log::error('TransFi user registration failed', [
                        'customer_id' => $customer->customer_id,
                        'response' => $res->body(),
                        'payload' => $userPayload,
                    ]);
                    return;
                }

                $transfiUserId = $res->json()['userId'] ?? null;
                if (!$transfiUserId) {
                    Log::error('TransFi userId missing in response', [
                        'customer_id' => $customer->customer_id,
                    ]);
                    return;
                }

                add_customer_meta($customer->customer_id, 'transfi_user_id', $transfiUserId);
            }

            /* -------------------------------------------------
         | FINAL KYC PAYLOAD
         * ------------------------------------------------- */
            $transfiUserId = get_customer_meta($customer->customer_id, 'transfi_user_id');

            $payload = [
                'firstName' => $data['first_name'] ?? '',
                'lastName' => $data['last_name'] ?? '',
                'dob' => Carbon::parse($data['birth_date'])->format('Y-m-d'),
                'email' => $data['email'] ?? '',
                'gender' => $gender,
                'phoneNo' => $phoneNumber,
                'nationality' => $nationalityIso2,
                'street' => $addressPayload['street'],
                'city' => $addressPayload['city'],
                'state' => $addressPayload['state'],
                'country' => $addressPayload['country'],
                'postalCode' => $addressPayload['postalCode'],
                'idDocType' => $idType,
                'idDocUserName' => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                'idDocIssuerCountry' => $issuerCountryIso2,
                'idDocExpiryDate' => $idInfo['expiration_date'] ?? null,
                'idDocFrontSide' => $idFront,
                'idDocBackSide' => $idBack,
                'selfie' => $selfie,
                'userId' => $transfiUserId->value[0],
            ];

            /* -------------------------------------------------
         | SUBMIT KYC
         * ------------------------------------------------- */
            $response = Http::asMultipart()
                ->timeout(20)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'MID' => env('TRANSFI_MERCHANT_ID'),
                    'Authorization' => 'Basic ' . base64_encode(
                        env('TRANSFI_USERNAME') . ':' . env('TRANSFI_PASSWORD')
                    ),
                ])
                ->post("{$baseUrl}/kyc/share/third-vendor", $payload);

            if ($response->successful()) {
                Log::info('TransFi KYC submitted successfully', [
                    'customer_id' => $customer->customer_id,
                ]);
                update_endorsement($customer->customer_id, 'asian', 'under_review', null);
            } else {
                Log::error('TransFi KYC failed', [
                    'customer_id' => $customer->customer_id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (Throwable $e) {
            Log::error('TransFi KYC error', [
                'customer_id' => $customer->customer_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }


    private function bitnob(Customer $customer, array $data): void
    {
        try {
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

    public function avenia(Customer $customer, array $data)
    {
        try {

            $exists = get_customer_meta($customer->customer_id, 'avenia_sub_account_id');
            if ($exists) {
                logger("Avenia sub-account already exists for customer {$customer->customer_id}, skipping creation.");
                return;
            }
            // firstly create sub account
            $avenia = new AveniaBusinessService();
            $response = $avenia->businessCreateSubaccount($customer->customerName ?? $customer->customer_name, $customer->customer_id, 'INDIVIDUAL');
           

            // 



            logger("initiating avenia for individual");
            $avenia = new AveniaService();
            // generate avenia kyc url
            $kyc = $avenia->post("/kyc/new-level-1/web-sdk", [
                "redirectUrl" => "https://google.com"
            ]);

            if (is_array($kyc)) {
                $kycUrl = $kyc["kycUrl"];
            } else if ($kyc->successful()) {
                $result = $kyc->json();
                $kycUrl = $result["kycUrl"];
            }

            if (isset($kycUrl)) {
                update_endorsement($customer->customer_id, "brazil", "pending", $result["kycUrl"]);
            }

            logger("avenia service lass initiated!");
            $kyc = $avenia->avenia($customer, $data);
            logger("avenia kyc response", ['response' => $kyc]);
        } catch (Throwable $th) {
            logger("Avenia Error: ", ['error' => $th->getMessage(), "trace" => $th->getTrace()]);
            return ['error' => $th->getMessage()];
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
            'passport' => 'Passport',

            // National IDs
            'national_id' => 'NationalIDCard',
            'bvn' => 'NationalIDCard',
            'nin' => 'NationalIDCard',
            'emirates_id' => 'NationalIDCard',
            'qatar_id' => 'NationalIDCard',
            'hkid' => 'NationalIDCard',
            'nric' => 'NationalIDCard',
            'fin' => 'NationalIDCard',
            'rrn' => 'NationalIDCard',
            'jmbg' => 'NationalIDCard',
            'oib' => 'NationalIDCard',
            'cnp' => 'NationalIDCard',
            'idnp' => 'NationalIDCard',
            'nic' => 'NationalIDCard',
            'nicn' => 'NationalIDCard',
            'tckn' => 'NationalIDCard',
            'mn' => 'NationalIDCard',
            'hetu' => 'NationalIDCard',
            'pesel' => 'NationalIDCard',
            'ppsn' => 'NationalIDCard',
            'nino' => 'NationalIDCard',
            'cpr' => 'NationalIDCard',
            'nrn' => 'NationalIDCard',
            'ucn' => 'NationalIDCard',
            'cdi' => 'NationalIDCard',
            'curp' => 'NationalIDCard',
            'ine' => 'NationalIDCard',
            'ak' => 'NationalIDCard',
            'pk' => 'NationalIDCard',
            'rc' => 'NationalIDCard',
            'ik' => 'NationalIDCard',
            'aom' => 'NationalIDCard',
            'matricule' => 'NationalIDCard',
            'embg' => 'NationalIDCard',
            'fn' => 'NationalIDCard',
            'bsn' => 'NationalIDCard',

            // Tax IDs
            'tin' => 'TaxID',
            'nif' => 'TaxID',
            'nit' => 'TaxID',
            'cpf' => 'TaxID',
            'pan' => 'TaxID',
            'ssn' => 'TaxID',
            'itin' => 'TaxID',
            'ruc' => 'TaxID',
            'rif' => 'TaxID',
            'mst' => 'TaxID',
            'voen' => 'TaxID',
            'npwp' => 'TaxID',
            'nuit' => 'TaxID',
            'tpin' => 'TaxID',
            'itr' => 'TaxID',
            'ird' => 'TaxID',
            'steuer_id' => 'TaxID',
            'cf' => 'TaxID',
            'rut' => 'TaxID',
            'rfc' => 'TaxID',
            'rnokpp' => 'TaxID',
            'iin' => 'TaxID',
            'inn' => 'TaxID',
            'si' => 'TaxID',
            'avs' => 'TaxID',
            'ahv' => 'TaxID',
            'tfn' => 'TaxID',
            'sin' => 'TaxID',
            'utr' => 'TaxID',
            'crib' => 'TaxID',
            'crc' => 'TaxID',
            'bir' => 'TaxID',
            'mf' => 'TaxID',
            'ntn' => 'TaxID',
            'trn' => 'TaxID',
            'rtn' => 'TaxID',
            'pin' => 'TaxID',
        ];

        return $noahIdTypeMap[$internalType] ?? 'NationalIDCard';
    }

    private function downloadAndEncode(?string $url): ?string
    {
        if (!$url) {
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

    public function getCustomer(string $customerId): ?Customer
    {
        return Customer::where('customer_id', $customerId)->first();
    }

    private function submitNoahDocument(string $customerId, array $documents): void
    {
        foreach ($documents as $doc) {

            $documentType = $doc['type'] ?? $doc['document_type'] ?? null; // e.g. NationalIDCard, Passport
            $countryCode = $doc['country_code'] ?? 'NG';
            $associateId = $doc['number'] ?? $doc['associate_id'] ?? null;
            $frontPath = $doc['image_front_file'] ?? null; // full file path
            $backPath = $doc['image_back_file'] ?? null;

            if (!$documentType || !$frontPath) {
                Log::warning('Document skipped (missing required fields)', [
                    'customer_id' => $customerId,
                    'doc' => $doc,
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
        if (!file_exists($filePath)) {
            Log::error('Noah Document file missing', ['path' => $filePath]);
            return;
        }

        // Step 1: Get Upload URL
        $query = [
            'Type' => $documentType,
            'CountryCode' => $countryCode,
            'Side' => $side,
        ];

        if ($associateId) {
            $query['AssociateID'] = $associateId;
        }

        $baseUrl = rtrim(config('services.noah.base_url', 'https://api.noah.com/v1'), '/');
        $response = Http::withHeaders([
            'Accept' => 'application/json',
            'X-Api-Key' => $this->noah_api_key,
        ])->get("{$baseUrl}/onboarding/{$customerId}/prefill/documents/upload-url", $query);

        if (!$response->successful()) {
            Log::error('Noah Upload URL request failed', [
                'customer_id' => $customerId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return;
        }

        $payload = $response->json();
        $url = $payload['PresignedURL'] ?? null;

        if (!$url) {
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
                'document' => $documentType,
                'side' => $side,
            ]);
        } else {
            Log::error('Noah document upload failed', [
                'customer_id' => $customerId,
                'status' => $uploadResponse->status(),
                'body' => $uploadResponse->body(),
            ]);
        }
    }
}
