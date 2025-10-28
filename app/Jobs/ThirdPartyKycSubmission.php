<?php
namespace App\Jobs;

use App\Models\Customer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ThirdPartyKycSubmission implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries   = 3;
    public int $backoff = 15; // seconds

    protected array $submissionData;

    public function __construct(array $submissionData)
    {
        $this->submissionData = $submissionData;
    }

    public function handle(): void
    {
        $customerId = $this->submissionData['customer_id'] ?? null;
        if (! $customerId) {
            Log::error('KYC job failed: missing customer_id', $this->submissionData);
            return;
        }

        $customer = Customer::where('customer_id', $customerId)->first();
        if (! $customer) {
            Log::error("KYC job failed: customer not found", ['customer_id' => $customerId]);
            return;
        }

        // Ensure we have identifying info and documents
        $hasIdInfo = ! empty($this->submissionData['identifying_information']);
        $hasDocs   = ! empty($this->submissionData['documents']);

        if (! $hasIdInfo || ! $hasDocs) {
            Log::warning('KYC job skipped: incomplete data', [
                'customer_id'          => $customerId,
                'has_identifying_info' => $hasIdInfo,
                'has_documents'        => $hasDocs,
            ]);
            return;
        }

        // Submit to all providers
        $this->noah($customer, $this->submissionData);
        // $this->transFi($customer, $this->submissionData);
        // $this->bitnob($customer, $this->submissionData);
        // $this->borderless($customer, $this->submissionData);
    }

    private function borderless(Customer $customer, array $data): void
    {
        try {
            if (! $customer->borderless_identity_id) {
                Log::info('Borderless skipped: customer not enrolled', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? null;
            if (! $idInfo) {
                Log::warning('Borderless skipped: missing identifying info', ['customer_id' => $customer->customer_id]);
                return;
            }

            $docs       = collect($data['documents'] ?? []);
            $imageFront = $docs->firstWhere('type', 'id_front')['data'] ?? null;
            $imageBack  = $docs->firstWhere('type', 'id_back')['data'] ?? $imageFront;

            if (! $imageFront) {
                Log::warning('Borderless skipped: missing ID front image', ['customer_id' => $customer->customer_id]);
                return;
            }

            $rules = [
                'issuingCountry' => ['required', 'string', 'size:2', Rule::in($this->allowedCountries())],
                'type'           => ['required', 'string', Rule::in(['Passport', 'DriverLicense', 'NationalId', 'ResidencePermit', 'Formation', 'Ownership', 'ProofOfAddress', 'SourceOfFunds', 'IndividualHolding', 'BVN_NG'])],
                'idNumber'       => ['required', 'string', 'min:4', 'max:50'],
                'issuedDate'     => ['required', 'date', 'before_or_equal:today'],
                'expiryDate'     => ['required', 'date', 'after:issuedDate'],
                'imageFront'     => ['required', 'string'],
                'imageBack'      => ['required', 'string'],
            ];

            $payload = Validator::make(array_merge($idInfo, [
                'imageFront' => $imageFront,
                'imageBack'  => $imageBack,
            ]), $rules)->validate();

            // Validate base64 format
            if (! Str::startsWith($payload['imageFront'], 'data:image/') ||
                ! Str::startsWith($payload['imageBack'], 'data:image/')) {
                Log::warning('Borderless skipped: invalid image format', ['customer_id' => $customer->customer_id]);
                return;
            }

            // Check size (5MB max)
            $frontSize = strlen(base64_decode(Str::after($payload['imageFront'], 'base64,')));
            $backSize  = strlen(base64_decode(Str::after($payload['imageBack'], 'base64,')));

            if ($frontSize > 5 * 1024 * 1024 || $backSize > 5 * 1024 * 1024) {
                Log::warning('Borderless skipped: image too large (>5MB)', ['customer_id' => $customer->customer_id]);
                return;
            }

            // Call Borderless API (replace with your actual service)
            $borderlessService = app(\App\Services\BorderlessService::class);
            $response          = $borderlessService->submitKyCDocuments($customer->borderless_identity_id, $payload);

            Log::info('Borderless KYC submitted', [
                'customer_id' => $customer->customer_id,
                'response'    => $response,
            ]);

        } catch (Throwable $e) {
            Log::error('Borderless KYC failed', [
                'customer_id' => $customer->customer_id,
                'error'       => $e->getMessage(),
                'trace'       => $e->getTraceAsString(),
            ]);
        }
    }

    private function transFi(Customer $customer, array $data): void
    {
        try {
            $transfiUserId = $customer->transfi_user_id;
            if (! $transfiUserId) {
                Log::info('TransFi skipped: no transfi_user_id', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo = $data['identifying_information'][0] ?? [];
            $docs   = collect($data['documents'] ?? []);

            $imageFront = $docs->firstWhere('type', 'id_front')['data'] ?? null;
            $imageBack  = $docs->firstWhere('type', 'id_back')['data'] ?? $imageFront;
            $selfie     = $docs->firstWhere('type', 'selfie')['data'] ?? null;

            if (! $imageFront || ! $selfie) {
                Log::warning('TransFi skipped: missing ID or selfie', ['customer_id' => $customer->customer_id]);
                return;
            }

            $address = $customer->customer_address ?? [];

            $payload = [
                'email'           => $data['email'] ?? $customer->customer_email,
                'idDocExpiryDate' => $idInfo['expiryDate'] ?? null,
                'idDocUserName'   => trim("{$data['first_name']} {$data['last_name']}"),
                'idDocType'          => $idInfo['type'] ?? 'id_card',
                'idDocFrontSide'     => $imageFront,
                'idDocBackSide'      => $imageBack,
                'selfie'             => $selfie,
                'gender'             => $data['gender'] ?? null,
                'phoneNo'            => $data['phone'] ?? $customer->customer_phone,
                'idDocIssuerCountry' => $idInfo['issuingCountry'] ?? $address['country'] ?? 'NG',
                'street'             => $address['street'] ?? '',
                'city'               => $address['city'] ?? '',
                'state'              => $address['state'] ?? '',
                'country'            => $address['country'] ?? $customer->customer_country ?? 'NG',
                'dob'                => $data['birth_date'] ? substr($data['birth_date'], 0, 10) : null,
                'postalCode'         => $address['zipcode'] ?? '',
                'firstName'          => $data['first_name'] ?? '',
                'lastName'           => $data['last_name'] ?? '',
                'userId'             => $transfiUserId,
                'nationality'        => $address['country'] ?? $customer->customer_country ?? 'NG',
            ];

            $response = Http::asMultipart()
                ->withHeaders([
                    'Accept'        => 'application/json',
                    'MID'           => env('TRANSFI_MERCHANT_ID'),
                    'Authorization' => 'Basic ' . base64_encode(env('TRANSFI_API_KEY') . ':' . env('TRANSFI_API_SECRET')),
                ])
                ->post(env('TRANSFI_API_URL', 'https://api.transfi.com') . '/kyc/share/third-vendor', $payload);

            if ($response->successful()) {
                Log::info('TransFi KYC submitted', [
                    'customer_id' => $customer->customer_id,
                    'response'    => $response->json(),
                ]);
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

    private function bitnob(Customer $customer, array $data): void
    {
        try {
            $docs      = collect($data['documents'] ?? []);
            $userPhoto = $docs->firstWhere('type', 'selfie')['data'] ?? null;
            if (! $userPhoto) {
                Log::warning('Bitnob skipped: missing selfie', ['customer_id' => $customer->customer_id]);
                return;
            }

            $idInfo  = $data['identifying_information'][0] ?? [];
            $address = $customer->customer_address ?? [];

            // For Nigeria, ID type is required
            $idType = $idInfo['type'] ?? 'NATIONAL_ID';
            if (strtolower($customer->customer_country) === 'nigeria' && ! in_array($idType, ['NATIONAL_ID', 'BVN_NG', 'Passport', 'DriverLicense'])) {
                Log::warning('Bitnob skipped: invalid ID type for Nigeria', ['customer_id' => $customer->customer_id, 'idType' => $idType]);
                return;
            }

            $nameParts = array_values(array_filter([
                $data['first_name'] ?? '',
                $data['middle_name'] ?? '',
                $data['last_name'] ?? '',
            ]));

            $validatedData = [
                'date_of_birth' => $data['birth_date'] ? substr($data['birth_date'], 0, 10) : null,
                'dateOfBirth'   => $data['birth_date'] ? substr($data['birth_date'], 0, 10) : null,
                'firstName'     => $nameParts[0] ?? '',
                'lastName'      => $nameParts[1] ?? $nameParts[0] ?? 'Unknown',
                'customerEmail' => $customer->customer_email,
                'phoneNumber'   => $customer->customer_phone,
                'idImage'       => $docs->firstWhere('type', 'id_front')['data'] ?? null,
                'userPhoto'     => $userPhoto,
                'country'       => $address['country'] ?? $customer->customer_country ?? 'NG',
                'city'          => $address['city'] ?? '',
                'state'         => $address['state'] ?? '',
                'zipCode'       => $address['zipcode'] ?? '',
                'line1'         => $address['street'] ?? '',
                'houseNumber'   => $address['number'] ?? '',
                'idType'        => $idType,
                'idNumber'      => $idInfo['idNumber'] ?? $customer->customer_idNumber ?? null,
            ];

            if (! $validatedData['idImage']) {
                Log::warning('Bitnob skipped: missing ID front', ['customer_id' => $customer->customer_id]);
                return;
            }

            // Use Bitnob service
            $bitnobService = app(\App\Services\BitnobService::class);
            $response      = $bitnobService->registerUser($validatedData);

            if (isset($response['status']) && $response['status'] === true) {
                $customer->update([
                    'can_create_vc'  => true,
                    'vc_customer_id' => $response['data']['id'] ?? null,
                ]);
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

            $idInfo  = $data['identifying_information'][0] ?? [];
            $address = $customer->customer_address ?? [];

            $nameParts = array_values(array_filter([
                $data['first_name'] ?? '',
                $data['middle_name'] ?? '',
                $data['last_name'] ?? '',
            ]));

            $customerData = [
                "Type"             => "individual",
                "FullName"         => [
                    "FirstName" => $nameParts[0] ?? '',
                    "LastName"  => $nameParts[1] ?? $nameParts[0] ?? '',
                ],
                "DateOfBirth"      => $data['birth_date'] ? substr($data['birth_date'], 0, 10) : '1990-01-01',
                "Email"            => $customer->customer_kyc_email ?? $customer->customer_email,
                "PhoneNumber"      => $customer->customer_phone,
                "PrimaryResidence" => [
                    "Street"   => $address['street'] ?? '',
                    "City"     => $address['city'] ?? '',
                    "PostCode" => $address['zipcode'] ?? '',
                    "State"    => $address['state'] ?? '',
                    "Country"  => $address['country'] ?? $customer->customer_country ?? '',
                ],
                "Identities"       => [
                    [
                        'IssuingCountry' => $idInfo['issuingCountry'] ?? 'NG',
                        'IDNumber'       => $idInfo['idNumber'] ?? 'N/A',
                        'IssuedDate'     => $idInfo['issuedDate'] ?? '2020-01-01',
                        'ExpiryDate'     => $idInfo['expiryDate'] ?? '2030-01-01',
                        'IDType'         => $idInfo['type'] ?? 'NationalId',
                    ],
                ],
            ];

            $apiKey  = config('services.noah.api_key');
            $baseUrl = rtrim(config('services.noah.base_url', 'https://api.sandbox.noah.com/v1'), '/');

            if (empty($apiKey)) {
                throw new \RuntimeException('NOAH_API_KEY not configured in config/services.php');
            }

            $response = Http::withHeaders([
                'X-Api-Key'    => $apiKey,
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
            ])->put("{$baseUrl}/customers/{$customer->customer_id}", $customerData);

            if ($response->successful()) {
                $customer->update(['is_noah_registered' => true]);
                // proceed to submit KYC documents for customer
                Log::info('Noah KYC submitted', [
                    'customer_id' => $customer->customer_id,
                    'response'    => $response->json(),
                ]);
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

    private function allowedCountries(): array
    {
        return ['US', 'NG', 'GB', 'CA', 'KE', 'GH', 'ZA'];
    }

    private function submitNoahKycDocuments(Customer $customer, array $data): void
    {
        // This function can be implemented to submit KYC documents to Noah
        // after the customer has been registered successfully.
    }
}
