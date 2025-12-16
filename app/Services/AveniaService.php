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

    public function createSubAccount(Customer $customer): bool
    {
        logger("incoming customer is: ", ['customer' => $customer]);
        $response = $this->post('/account/sub-accounts', [
            'accountType' => $customer->customer_type,
            'name'        => trim($customer->first_name . ' ' . $customer->last_name),
        ]);

        if ($response['error'] ?? false) {
            Log::error('Avenia sub-account creation failed', $response);
            return false;
        }

        add_customer_meta(
            $customer->customer_id,
            'avenia_customer_id',
            $response['id']
        );

        return true;
    }

    /* ---------------------------------------------------------
     | KYC FLOW (FULLY SIGNED)
     * --------------------------------------------------------- */

    public function avenia(Customer $customer, array $data): array
    {
        try {
            if (empty($data['identity_information'][0])) {
                throw new Exception('Identity information missing');
            }

            $idInfo   = $data['identity_information'][0];
            $address  = $data['residential_address'] ?? [];
            $fullName = trim(
                ($data['first_name'] ?? '') . ' ' .
                    ($data['middle_name'] ?? '') . ' ' .
                    ($data['last_name'] ?? '')
            );

            if (!$this->createSubAccount($customer)) {
                throw new Exception('Sub-account creation failed');
            }

            /* -------------------------------------------------
             | STEP 1: REQUEST DOCUMENT UPLOAD (SIGNED)
             * ------------------------------------------------- */

            $docData = $this->post('/documents', [
                'documentType'  => 'DRIVERS-LICENSE',
                'isDoubleSided' => !empty($idInfo['back_image_url']),
            ]);

            if ($docData['error'] ?? false) {
                throw new Exception('Failed to request document upload');
            }

            /* -------------------------------------------------
             | STEP 2: REQUEST SELFIE UPLOAD (SIGNED)
             * ------------------------------------------------- */

            $selfieData = $this->post('/documents', [
                'documentType' => 'SELFIE',
            ]);

            if ($selfieData['error'] ?? false) {
                throw new Exception('Failed to request selfie upload');
            }

            /* -------------------------------------------------
             | STEP 3: UPLOAD FILES (UNSIGNED – PRESIGNED URLs)
             * ------------------------------------------------- */

            $getBinary = function (string $path) {
                if (filter_var($path, FILTER_VALIDATE_URL)) {
                    return Http::get($path)->body();
                }
                return file_get_contents($path);
            };

            $upload = function (string $url, string $binary) {
                $res = Http::withHeaders([
                    'Content-Type'  => 'image/jpeg',
                    'If-None-Match' => '*',
                ])->withBody($binary, 'image/jpeg')->put($url);

                if (!$res->successful()) {
                    throw new Exception('File upload failed');
                }
            };

            // Front document
            $upload(
                $docData['uploadURLFront'],
                $getBinary($idInfo['front_image_url'])
            );

            // Back document
            if (!empty($idInfo['back_image_url'])) {
                $upload(
                    $docData['uploadURLBack'],
                    $getBinary($idInfo['back_image_url'])
                );
            }

            // Selfie
            $upload(
                $selfieData['uploadURLFront'],
                $getBinary($idInfo['selfie_image_url'])
            );

            /* -------------------------------------------------
             | STEP 4: SUBMIT KYC (SIGNED)
             * ------------------------------------------------- */

            $kycResponse = $this->post('/kyc/new-level-1/api', [
                'fullName'           => $fullName,
                'dateOfBirth'        => date('Y-m-d', strtotime($data['birth_date'])),
                'countryOfTaxId'     => $idInfo['country'] ?? 'BR',
                'taxIdNumber'        => $idInfo['number'],
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
                throw new Exception('KYC submission failed');
            }

            update_endorsement($customer->customer_id, 'brazil', 'submitted');

            return $kycResponse;
        } catch (Throwable $e) {
            Log::error('Avenia KYC flow failed', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
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

    public function deposit(array $payload)
    {
        $response = $this->post('/account/tickets/', $payload);
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

    protected function get(string $uri, $payload = null)
    {
        return $this->aveniaRequest('GET', $uri, $payload);
    }

    protected function post(string $uri, array $payload)
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
            ]);

            $request = Http::withHeaders($headers);

            $response = match ($method) {
                'GET'  => $request->get($this->baseUrl . $uri),
                'POST' => $request->post($this->baseUrl . $uri, $payload),
                default => throw new Exception("Unsupported method {$method}")
            };

            Log::info("Hello", ['result' => $response->json(), 'uri' => $uri]);

            return $response;

            // if ($response->successful()) {
            //     return $response->json();
            // }

            // Log::warning('Avenia API error', [
            //     'status' => $response->status(),
            //     'body'   => $response->body(),
            // ]);

            // return [
            //     'error'  => true,
            //     'status' => $response->status(),
            //     'body'   => $response->json(),
            // ];
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
