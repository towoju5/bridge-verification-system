<?php

namespace App\Services;

use App\Models\Customer;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AveniaService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $privateKeyPath;

    public function __construct()
    {
        $this->baseUrl        = rtrim(config('services.avenia.base_url'), '/');
        $this->apiKey         = config('services.avenia.access_token');
        $this->privateKeyPath = storage_path('app/keys/avenia/private_key.pem');

        if (!file_exists($this->privateKeyPath)) {
            throw new Exception('Avenia private key not found');
        }
    }

    /* ---------------------------------------------------------
     | SUB ACCOUNT
     * --------------------------------------------------------- */

    public function createSubAccount($payload): bool
    {
        $response = $this->post('/account/sub-accounts', $payload);
        logger("Response from creating avenia sub account", ['response' => $response->json()]);
        $result = $response->json();
        if ($result['error'] ?? false) {
            Log::error('Avenia sub-account creation failed', $result);
            return false;
        }

        // add_customer_meta(
        //     $customerId,
        //     'avenia_customer_id',
        //     $result['id']
        // );

        return true;
    }

    /* ---------------------------------------------------------
     | KYC FLOW (FULLY SIGNED)
     * --------------------------------------------------------- */

    public function avenia(Customer $customer, array $data): array
    {
        Log::info('Avenia KYC flow started', [
            'customer_id' => $customer->customer_id,
        ]);

        try {
            /* -------------------------------------------------
            | STEP 0: VALIDATION
            * ------------------------------------------------- */
            if (
                empty($data['identifying_information']) ||
                empty($data['identifying_information'][0])
            ) {
                Log::error('Identity information missing', [
                    'customer_id' => $customer->customer_id,
                    'data_keys' => array_keys($data),
                ]);

                throw new Exception('Identity information missing');
            }

            $idInfo   = $data['identifying_information'][0];
            $address  = $data['residential_address'] ?? [];

            $fullName = trim(
                ($data['first_name'] ?? '') . ' ' .
                    ($data['middle_name'] ?? '') . ' ' .
                    ($data['last_name'] ?? '')
            );

            Log::info('KYC payload prepared', [
                'customer_id' => $customer->customer_id,
                'full_name' => $fullName,
                'document_country' => $idInfo['issuing_country'] ?? null,
            ]);

            /* -------------------------------------------------
            | STEP 0.5: CREATE SUB ACCOUNT
            * ------------------------------------------------- */
            Log::info('Creating Avenia sub-account', [
                'customer_id' => $customer->customer_id,
            ]);
            $payload = [
                "accountType" => "INDIVIDUAL",
                "name" => "jane doe"
            ];
            $result = $this->createSubAccount($payload);

            if (!$result) {
                Log::error('Sub-account creation failed', [
                    'customer_id' => $customer->customer_id,
                    'result' => $result,
                ]);

                throw new Exception('Sub-account creation failed');
            }

            Log::info('Sub-account created successfully', [
                'customer_id' => $customer->customer_id,
                'result' => $result,
            ]);

            /* -------------------------------------------------
            | STEP 1: REQUEST DOCUMENT UPLOAD (SIGNED)
            * ------------------------------------------------- */
            Log::info('Requesting document upload slot', [
                'customer_id' => $customer->customer_id,
                'document_type' => strtoupper($idInfo['type'] ?? 'PASSPORT'),
                'double_sided' => !empty($idInfo['image_back_file']),
            ]);

            $docData = $this->post('/documents', [
                'documentType'  => strtoupper($idInfo['type'] ?? 'PASSPORT'),
                'isDoubleSided' => !empty($idInfo['image_back_file']),
            ]);

            if ($docData['error'] ?? false) {
                Log::error('Document upload slot request failed', [
                    'customer_id' => $customer->customer_id,
                    'response' => $docData,
                ]);

                throw new Exception('Failed to request document upload');
            }

            Log::info('Document upload slot received', [
                'customer_id' => $customer->customer_id,
                'document_id' => $docData['id'] ?? null,
            ]);

            /* -------------------------------------------------
            | STEP 2: REQUEST SELFIE UPLOAD (SIGNED)
            * ------------------------------------------------- */
            Log::info('Requesting selfie upload slot', [
                'customer_id' => $customer->customer_id,
            ]);

            $selfieData = $this->post('/documents', [
                'documentType' => 'SELFIE',
            ]);

            if ($selfieData['error'] ?? false) {
                Log::error('Selfie upload slot request failed', [
                    'customer_id' => $customer->customer_id,
                    'response' => $selfieData,
                ]);

                throw new Exception('Failed to request selfie upload');
            }

            Log::info('Selfie upload slot received', [
                'customer_id' => $customer->customer_id,
                'selfie_document_id' => $selfieData['id'] ?? null,
            ]);

            /* -------------------------------------------------
            | STEP 3: UPLOAD FILES (UNSIGNED)
            * ------------------------------------------------- */
            $getBinary = function (string $path) use ($customer) {
                Log::debug('Fetching file binary', [
                    'customer_id' => $customer->customer_id,
                    'path_type' => filter_var($path, FILTER_VALIDATE_URL) ? 'url' : 'local',
                ]);

                if (filter_var($path, FILTER_VALIDATE_URL)) {
                    return Http::get($path)->body();
                }

                return file_get_contents($path);
            };

            $upload = function (string $url, string $binary, string $label) use ($customer) {
                Log::info("Uploading {$label}", [
                    'customer_id' => $customer->customer_id,
                    'upload_url' => substr($url, 0, 40) . '...',
                ]);

                $res = Http::withHeaders([
                    'Content-Type'  => 'image/jpeg',
                    'If-None-Match' => '*',
                ])->withBody($binary, 'image/jpeg')->put($url);

                if (!$res->successful()) {
                    Log::error("Upload failed for {$label}", [
                        'customer_id' => $customer->customer_id,
                        'status' => $res->status(),
                        'response' => $res->body(),
                    ]);

                    throw new Exception("File upload failed: {$label}");
                }
            };

            // Document front
            $upload(
                $docData['uploadURLFront'],
                $getBinary($idInfo['image_front_file']),
                'document_front'
            );

            // Document back (optional)
            if (!empty($idInfo['image_back_file'])) {
                $upload(
                    $docData['uploadURLBack'],
                    $getBinary($idInfo['image_back_file']),
                    'document_back'
                );
            }

            // Selfie
            $upload(
                $selfieData['uploadURLFront'],
                $getBinary($data['selfie_image']),
                'selfie'
            );

            Log::info('All files uploaded successfully', [
                'customer_id' => $customer->customer_id,
            ]);

            /* -------------------------------------------------
            | STEP 4: SUBMIT KYC (SIGNED)
            * ------------------------------------------------- */
            Log::info('Submitting KYC', [
                'customer_id' => $customer->customer_id,
            ]);

            $kycResponse = $this->post('/kyc/new-level-1/api', [
                'fullName'           => $fullName,
                'dateOfBirth'        => $data['birth_date'] instanceof \Carbon\Carbon
                    ? $data['birth_date']->format('Y-m-d')
                    : date('Y-m-d', strtotime($data['birth_date'])),

                'countryOfTaxId'     => $idInfo['issuing_country'],
                'taxIdNumber'        => $data['taxId'],
                'email'              => $data['email'],
                'phone'              => $data['phone'],

                'country'            => $address['country'] ?? null,
                'state'              => $address['state'] ?? null,
                'city'               => $address['city'] ?? null,
                'zipCode'            => $address['postal_code'] ?? null,
                'streetAddress'      => $address['street_line_1'] ?? null,

                'uploadedSelfieId'   => $selfieData['id'],
                'uploadedDocumentId' => $docData['id'],
            ]);

            if ($kycResponse['error'] ?? false) {
                Log::error('KYC submission failed', [
                    'customer_id' => $customer->customer_id,
                    'response' => $kycResponse,
                ]);

                throw new Exception('KYC submission failed');
            }

            update_endorsement($customer->customer_id, 'brazil', 'submitted');

            Log::info('Avenia KYC submitted successfully', [
                'customer_id' => $customer->customer_id,
            ]);

            return $kycResponse;
        } catch (Throwable $e) {
            Log::error('Avenia KYC flow failed', [
                'customer_id' => $customer->customer_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }


    /* ---------------------------------------------------------
     | Public API methods
     * --------------------------------------------------------- */

    public function createQuote(array $payload)
    {
        return $this->get('/account/quote/fixed-rate', $payload);
    }

    public function login()
    {
        $endpoint = "/account/sub-accounts";
        $result = $this->get($endpoint);
        return response()->json($result);
    }

    public function deposit(array $payload)
    {
        $response = $this->post('/account/tickets/', $payload);
        return $response;
    }

    public function getAccountInfo()
    {
        try {
            return $this->get('/account/sub-accounts/5beccf54-29d7-4b59-98d8-9b8f7fbba961');
        } catch (Throwable $th) {
            Log::info($th);
        }
    }

    public function test()
    {
        try {
            $quote_payload = [
                "inputCurrency" => strtoupper("brl"),
                "inputPaymentMethod" => "PIX",
                "outputCurrency" => "BRLA",
                "outputPaymentMethod" => "INTERNAL",
                "inputAmount" => 500,
                "inputThirdParty" => false,
                "outputThirdParty" => false,
            ];

            $avenia = new AveniaService();
            $quote = $avenia->createQuote($quote_payload);
            logger("quote generation respoonse", ['quote_generation' => $quote]);
            if (isset($quote['quoteToken'])) {
                // make a post request to generate the deposit
                $payload = [
                    "quoteToken" => $quote['quoteToken'],
                    "externalId" => 'Yativo-234',
                    "ticketBlockchainOutput" => [
                        "walletChain" => "solana",
                        "walletAddress" => "CyuXhQVaNrku3K44HdCfxkEPNr7i8GnRu3irKrRc6YpC",
                        "walletMemo" => "optional memo"
                    ]
                ];
                $deposit = $avenia->deposit($payload);
                logger(
                    "response testing quote",
                    ['response' => $deposit]
                );
                return response()->json($deposit);
            }
        } catch (Throwable $th) {
            return response()->json($th);
        }
    }

    /* ---------------------------------------------------------
     | Core request handlers
     * --------------------------------------------------------- */

    public function get(string $uri, $payload = null)
    {
        return $this->aveniaRequest('GET', $uri, $payload);
    }

    public function post(string $uri, array $payload)
    {
        return $this->aveniaRequest('POST', $uri, $payload);
    }

    protected function aveniaRequest(string $method, string $url, ?array $payload = null)
    {
        try {
            // Normalize payload
            $payload = $payload ?? [];

            // Normalize URI
            $uri = str_replace('//', '/', "/v2/{$url}");

            // Handle GET query parameters
            if ($method === 'GET' && ! empty($payload)) {
                // (optional but recommended) ensure stable signing
                ksort($payload);

                $queryString = http_build_query($payload);
                $uri .= '?' . $queryString;
            }

            $timestamp = (string) round(microtime(true) * 1000);

            // Body is ONLY for POST
            $body = $method === 'POST'
                ? json_encode($payload, JSON_UNESCAPED_SLASHES)
                : '';

            // EXACT string to sign
            $stringToSign = $timestamp . $method . $uri . $body;

            $privateKey = openssl_pkey_get_private(
                file_get_contents($this->privateKeyPath)
            );

            if (! $privateKey) {
                throw new Exception('Invalid private key');
            }

            openssl_sign(
                $stringToSign,
                $signature,
                $privateKey,
                OPENSSL_ALGO_SHA256
            );

            $signatureBase64 = base64_encode($signature);

            $headers = [
                'X-API-Key'       => $this->apiKey,
                'X-API-Timestamp' => $timestamp,
                'X-API-Signature' => $signatureBase64,
                'Content-Type'    => 'application/json',
            ];

            Log::info('Avenia signing debug', [
                'method' => $method,
                'uri'    => $uri,
                'base_url' => $this->baseUrl
            ]);

            $request = Http::withHeaders($headers);

            $response = match ($method) {
                'GET'  => $request->get($this->baseUrl . $uri),
                'POST' => $request->post($this->baseUrl . $uri, $payload),
                default => throw new Exception("Unsupported method {$method}")
            };

            Log::info("Hello", ['result' => $response->json(), 'uri' => $uri]);

            return $response;
        } catch (Throwable $th) {
            Log::error('Avenia request failed', [
                'error' => $th->getMessage(),
            ]);

            return [
                'error'   => true,
                'message' => 'Avenia request failed',
            ];
        }
    }
}
