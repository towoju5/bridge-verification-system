<?php

namespace App\Services;

use App\Models\Country;
use App\Models\Customer;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

use function Illuminate\Log\log;

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

    public function createSubAccount($customerId, $payload)
    {
        $response = $this->post("/account/sub-accounts", $payload);
        logger("Response from creating avenia sub account", ['response' => $response->json()]);
        $result = $response->json();
        if ($result['error'] ?? false) {
            Log::error('Avenia sub-account creation failed', $result);
            return false;
        }

        add_customer_meta(
            $customerId,
            'avenia_customer_id',
            $result['id']
        );

        update_endorsement(
            $customerId,
            'brazil',
            'under_review'
        );

        return $result;
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

            $idInfo  = $data['identifying_information'][0];
            $address = $data['residential_address'] ?? [];

            $requiredAddressFields = [
                'country',
                'state',
                'city',
                'postal_code',
                'street_line_1'
            ];

            foreach ($requiredAddressFields as $field) {
                if (empty($address[$field])) {
                    // throw new Exception("Missing required address field: {$field}");
                }
            }

            $fullName = trim(
                ($data['first_name'] ?? '') . ' ' .
                    ($data['middle_name'] ?? '') . ' ' .
                    ($data['last_name'] ?? '')
            );

            /* -------------------------------------------------
            | STEP 0.5: CREATE / FETCH SUBACCOUNT
            * ------------------------------------------------- */
            $aveniaCustomerIdExists = get_customer_meta(
                $customer->customer_id,
                'avenia_customer_id'
            );

            if (!$aveniaCustomerIdExists) {
                $payload = [
                    'accountType' => 'INDIVIDUAL',
                    'name' => $fullName,
                ];

                $result = $this->createSubAccount($customer->customer_id, $payload);

                if (!$result || empty($result['id'])) {
                    Log::error('Sub-account creation failed', [
                        'customer_id' => $customer->customer_id,
                        'response' => $result,
                    ]);
                    throw new Exception('Sub-account creation failed');
                }

                $aveniaCustomerId = $result['id'];
            } else {
                $aveniaCustomerId = $aveniaCustomerIdExists->value[0];
            }

            Log::info('Using Avenia sub-account', [
                'subAccountId' => $aveniaCustomerId,
            ]);

            /* -------------------------------------------------
            | STEP 1: REQUEST DOCUMENT UPLOAD URL
            * ------------------------------------------------- */
            $docType = strtoupper($idInfo['type'] ?? 'ID');
            if (!in_array($docType, ['ID', 'DRIVERS-LICENSE', 'PASSPORT'])) {
                $docType = 'ID';
            }

            $docData = $this->post("/documents?subAccountId=$aveniaCustomerId", [
                'documentType' => $docType,
                'isDoubleSided' => !empty($idInfo['image_back_file']),
                'subAccountId' => $aveniaCustomerId,
            ]);

            if ($docData['error'] ?? false) {
                throw new Exception('Failed to request document upload');
            }

            $selfieData = $this->post("/documents?subAccountId=$aveniaCustomerId", [
                'documentType' => 'SELFIE',
                'subAccountId' => $aveniaCustomerId,
            ]);

            if ($selfieData['error'] ?? false) {
                throw new Exception('Failed to request selfie upload');
            }

            /* -------------------------------------------------
            | STEP 2: FILE UPLOADS
            * ------------------------------------------------- */
            $getBinary = function (string $path): array {
                $binary = filter_var($path, FILTER_VALIDATE_URL)
                    ? Http::get($path)->body()
                    : file_get_contents($path);

                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime  = finfo_buffer($finfo, $binary);

                return [$binary, $mime ?: 'image/jpeg'];
            };

            $upload = function (string $url, string $binary, string $mime, string $label) {
                $res = Http::withHeaders([
                    'Content-Type' => $mime,
                    'If-None-Match' => '*',
                ])->withBody($binary, $mime)->put($url);

                if (!$res->successful()) {
                    throw new Exception("Upload failed: {$label}");
                }
            };

            [$frontBinary, $frontMime] = $getBinary($idInfo['image_front_file']);
            $upload($docData['uploadURLFront'], $frontBinary, $frontMime, 'document_front');

            if (!empty($idInfo['image_back_file'])) {
                [$backBinary, $backMime] = $getBinary($idInfo['image_back_file']);
                $upload($docData['uploadURLBack'], $backBinary, $backMime, 'document_back');
            }

            [$selfieBinary, $selfieMime] = $getBinary($data['selfie_image']);
            $upload($selfieData['uploadURLFront'], $selfieBinary, $selfieMime, 'selfie');

            /* -------------------------------------------------
            | STEP 3: SUBMIT KYC
            * ------------------------------------------------- */
            $kycResponse = $this->post("/kyc/new-level-1/api?subAccountId=$aveniaCustomerId", [
                'subAccountId'        => $aveniaCustomerId,
                'fullName'            => $fullName,
                'dateOfBirth'         => date('Y-m-d', strtotime($data['birth_date'])),
                'countryOfTaxId'      => $this->get_iso3(strtoupper($idInfo['issuing_country'])), // ISO-3166-1 alpha-3
                'taxIdNumber'         => $data['taxId'],
                'email'               => $data['email'],
                'phone'               => preg_replace('/\s+/', '', $data['phone']),
                'country'             => strtoupper($address['country']),
                'state'               => strtoupper($address['state']),
                'city'                => $address['city'],
                'zipCode'             => $address['postal_code'],
                'streetAddress'       => $address['street_line_1'],
                'uploadedSelfieId'    => $selfieData['id'],
                'uploadedDocumentId'  => $docData['id'],
            ]);

            logger("Final avenia kyc response is: ", ['error' => $kycResponse]);

            if ($kycResponse['error'] ?? false) {
                // throw new Exception('KYC submission failed');
                return [];
            }

            update_endorsement($customer->customer_id, 'brazil', 'submitted');

            Log::info('Avenia KYC submitted successfully', [
                'customer_id' => $customer->customer_id,
                'attempt_id' => $kycResponse['id'] ?? null,
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

    public function createQuote(array $payload, $aveniaCustomerId = "af55224d-f4ea-4335-898f-15d3a1659bc9")
    {
        return $this->get("/account/quote/fixed-rate?subAccountId=$aveniaCustomerId", $payload);
    }

    public function login()
    {
        $endpoint = "/account/sub-accounts";
        $result = $this->get($endpoint);
        return response()->json($result);
    }

    public function deposit(array $payload, $aveniaCustomerId = "af55224d-f4ea-4335-898f-15d3a1659bc9")
    {
        $response = $this->post("/account/tickets?subAccountId=$aveniaCustomerId", $payload);
        return $response;
    }

    public function getAccountInfo()
    {
        try {
            return $this->get('/account/sub-accounts');
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

            $aveniaCustomerId = "af55224d-f4ea-4335-898f-15d3a1659bc9";

            $avenia = new AveniaService();
            $quote = $avenia->createQuote($quote_payload, $aveniaCustomerId);
            logger("quote generation respoonse", ['quote_generation' => $quote]);
            if (isset($quote['quoteToken'])) {
                // make a post request to generate the deposit
                $payload = [
                    "quoteToken" => $quote['quoteToken'],
                    "externalId" => 'Yativo-'.microtime(),
                    "ticketBlockchainOutput" => [
                        "walletChain" => "POLYGON",
                        "walletAddress" => "0x316363Fd9B3e7E9e1ea4cC8503681a15A0cc5ECb",
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
            $payload = $payload ?? [];
            $method  = strtoupper($method);

            // Normalize base path
            $basePath = '/v2/' . ltrim($url, '/');

            // Parse existing query params from URL
            $parsed = parse_url($basePath);

            $path = $parsed['path'] ?? '';
            $existingQuery = [];

            if (!empty($parsed['query'])) {
                parse_str($parsed['query'], $existingQuery);
            }

            // Final URI
            $uri = $path;

            // Merge query params safely
            if ($method === 'GET') {
                $query = array_merge($existingQuery, $payload);
            } else {
                // POST: keep existing query only (payload stays body)
                $query = $existingQuery;
            }

            if (!empty($query)) {
                ksort($query);
                $uri .= '?' . http_build_query($query);
            }

            $timestamp = (string) round(microtime(true) * 1000);

            // POST body only
            $body = $method === 'POST'
                ? json_encode($payload, JSON_UNESCAPED_SLASHES)
                : '';

            // EXACT string to sign
            $stringToSign = $timestamp . $method . $uri . $body;

            $privateKey = openssl_pkey_get_private(
                file_get_contents($this->privateKeyPath)
            );

            if (!$privateKey) {
                throw new Exception('Invalid private key');
            }

            openssl_sign(
                $stringToSign,
                $signature,
                $privateKey,
                OPENSSL_ALGO_SHA256
            );

            $headers = [
                'X-API-Key'       => $this->apiKey,
                'X-API-Timestamp' => $timestamp,
                'X-API-Signature' => base64_encode($signature),
                'Content-Type'    => 'application/json',
            ];

            Log::info('Avenia request debug', [
                'method' => $method,
                'uri'    => $uri,
                'query'  => $query ?? [],
                'body'   => $payload,
            ]);

            $request = Http::withHeaders($headers);

            $response = match ($method) {
                'GET'  => $request->get($this->baseUrl . $uri),
                'POST' => $request->post($this->baseUrl . $uri, $payload),
                default => throw new Exception("Unsupported method {$method}")
            };

            logger("Avenia request response", [
                'status'   => $response->status(),
                'response' => $response->json(),
            ]);

            return $response;
        } catch (Throwable $th) {
            Log::error('Avenia request failed', [
                'error' => $th->getMessage(),
            ]);

            // return $response->json();
        }
    }


    public function get_iso3($iso2): ?string
    {
        $country = Country::where('iso2', $iso2)->first();
        return $country->iso3;
    }
}
