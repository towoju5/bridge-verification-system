<?php

namespace App\Services;

use App\Models\Customer;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AveniaService
{
    protected string $baseUrl, $avenia_username, $avenia_password;
    protected string $accessToken;

    public function __construct()
    {
        $this->baseUrl = env('AVENIA_BASE_URL');
        $this->avenia_username = env('AVENIA_USERNAME');
        $this->avenia_password = env('AVENIA_PASSWORD');
    }
    public function createSubAccount($customer, $accessToken = null)
    {
        if (!$accessToken) {
            $accessToken = $this->auth();
            if (isset($accessToken['error'])) {
                logger("accessToken generation failed", ['error' => $accessToken['error']]);
                return false;
            }

            $token = $accessToken['accessToken'];
        }

        $baseUrl = "{$this->baseUrl}/account/sub-accounts";
        $name = $customer['first_name'] . " " . $customer['last_name'];
        $payload = [
            "accountTye" => $customer['customer_type'],
            "name" => $name
        ];

        $response = Http::timeout(20)->post($baseUrl, $payload);

        if ($response->successful()) {
            // add customer sub account ID
            add_customer_meta($customer->customer_id, 'avenia_customer_id', $response->json()['id']);
            return true;
        }

        logger("Avenia sub account creation failed", []);
        return false;
    }

    public function avenia(Customer $customer, array $data = [])
    {
        try {
            $baseUrl = $this->baseUrl;
            $accessToken = $this->auth();
            if (isset($accessToken['error'])) {
                logger("accessToken generation failed", ['error' => $accessToken['error']]);
                return false;
            }

            $token = $accessToken['accessToken'];
            $addr = $data['residential_address'] ?? [];
            $full_name = $data['first_name'] . " " . $data['middle_name'] . " " . $data['last_name'];

            if (!$this->createSubAccount($full_name, $accessToken)) {
                return false;
            }

            //===================================
            // STEP 1: Request Upload URLs
            //===================================

            $idInfo = $data['identity_information'][0];
            $isDoubleSided = !empty($idInfo['back_image_url']);

            // --- Upload Document (e.g., Driver's License) ---
            $docResponse = Http::withToken($token)
                ->post("{$baseUrl}/documents/", [
                    'documentType' => 'DRIVERS-LICENSE',
                    'isDoubleSided' => $isDoubleSided,
                ]);

            if (!$docResponse->successful()) {
                logger('Failed to request document upload URI',  ['response' => $docResponse->body()]);
            }

            $docData = $docResponse->json();
            $uploadedDocumentId = $docData['id'];

            // --- Upload Selfie ---
            $selfieResponse = Http::withToken($token)
                ->post("{$baseUrl}/documents/", [
                    'documentType' => 'SELFIE',
                ]);

            if (!$selfieResponse->successful()) {
                logger('Failed to request selfie upload URI: ',  ['response' =>  $selfieResponse->body()]);
            }

            $selfieData = $selfieResponse->json();
            $uploadedSelfieId = $selfieData['id'];
            $selfieUploadUrl = $selfieData['uploadURLFront'];

            //===================================
            // STEP 2: Upload Files
            //===================================

            // Helper to get image binary from URL or path
            $getImageBinary = function ($imageUrl) {
                if (filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                    return Http::get($imageUrl)->body();
                } else {
                    return file_get_contents($imageUrl);
                }
            };

            // Upload front of document
            $frontImageBinary = $getImageBinary($idInfo['front_image_url']);
            $frontUploadResponse = Http::withHeaders([
                'Content-Type' => 'image/jpeg', // adjust if PNG
                'If-None-Match' => '*',
            ])->put($docData['uploadURLFront'], (array)$frontImageBinary);

            if (!$frontUploadResponse->successful()) {
                logger('Failed to upload front document: ',  ['response' => $frontUploadResponse->status()]);
            }

            // Upload back if double-sided
            if ($isDoubleSided) {
                $backImageBinary = $getImageBinary($idInfo['back_image_url']);
                $backUploadResponse = Http::withHeaders([
                    'Content-Type' => 'image/jpeg',
                    'If-None-Match' => '*',
                ])->put($docData['uploadURLBack'], (array)$backImageBinary);

                if (!$backUploadResponse->successful()) {
                    logger('Failed to upload back document: ',  ['response' => $backUploadResponse->status()]);
                }
            }

            // Upload selfie
            $selfieImageBinary = $getImageBinary($idInfo['selfie_image_url']);
            $selfieUploadResponse = Http::withHeaders([
                'Content-Type' => 'image/jpeg',
                'If-None-Match' => '*',
            ])->put($selfieUploadUrl, (array)$selfieImageBinary);

            if (!$selfieUploadResponse->successful()) {
                logger('Failed to upload selfie: ', ['response' => $selfieUploadResponse->status()]);
            }

            //===================================
            // STEP 3: Submit KYC Request
            //===================================

            // Map customer data (adjust based on your Customer model)
            $payload = [
                "fullName" => $full_name,
                "dateOfBirth" => date('Y-m-d', strtotime($data['birth_date'])),
                "countryOfTaxId" => $idInfo['number'],
                "taxIdNumber" => $idInfo['number'],
                "email" => $data['email'],
                "phone" => $data['phone'],
                "country" => $addr['country'],
                "state" => $addr['state'],
                "city" => $addr['city'],
                "zipCode" => $addr['postal_code'],
                "streetAddress" => $addr['street_line_1'],
                "uploadedSelfieId" => $uploadedSelfieId,
                "uploadedDocumentId" => $uploadedDocumentId,
            ];

            $kycResponse = Http::withToken($token)
                ->post("{$baseUrl}/kyc/new-level-1/api", $payload);

            if (!$kycResponse->successful()) {
                logger('KYC submission failed: ', ['response' => $kycResponse->body()]);
            }

            $kycResult = $kycResponse->json();
            update_endorsement($customer->customer_id, 'brazil', 'pending');
            // Success! You can now store $kycResult['id'] or trigger next steps
            return $kycResult;
        } catch (Throwable $th) {
            Log::error('Avenia KYC Error: ' . $th->getMessage(), ['trace' => $th->getTraceAsString()]);
            throw $th; // or return error response as needed
        }
    }

    public function auth()
    {
        try {
            $endpoint = "{$this->baseUrl}/auth/login";
            $response = Http::timeout(20)->post($endpoint, [
                "email" =>  env('AVENIA_EMAIL'),
                "password" =>  env('AVENIA_PASSWORD ')
            ]);

            return $response->json();
        } catch (Throwable $th) {
            return [
                'error' => $th->getMessage()
            ];
        }
    }

    /**
     * Summary of aveniaRequest
     * @param string $method
     * @param string $endpoint
     * @param string $requestUri
     * @param array $body
     * @throws \Exception
     * 
     * @return array{body: mixed, headers: mixed, json: mixed, signed_string: string, status: mixed}
     */
    public function aveniaRequest(string $method, string $endpoint, string $requestUri, array $body = null)
    {
        $apiKey = env("AVENIA_API_KEY");

        // Normalize method to uppercase
        $method = strtoupper($method);

        // Convert body to JSON or empty string
        $jsonBody = $body ? json_encode($body, JSON_UNESCAPED_SLASHES) : "";

        // Timestamp in milliseconds
        $timestamp = (string) round(microtime(true) * 1000);

        // Build string to sign
        // Must match Python version: timestamp + method + uri + body (if body exists)
        $stringToSign = $timestamp . $method . $requestUri . $jsonBody;

        // Load private key
        $privateKeyPath = storage_path('app/avenia_private_key.pem');
        $privateKey = openssl_pkey_get_private(file_get_contents($privateKeyPath));

        if (!$privateKey) {
            throw new Exception("Unable to load private key");
        }

        // Sign with RSA SHA256
        openssl_sign($stringToSign, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $signatureBase64 = base64_encode($signature);

        // Prepare headers
        $headers = [
            "X-API-Key" => $apiKey,
            "X-API-Timestamp" => $timestamp,
            "X-API-Signature" => $signatureBase64,
            "Content-Type" => "application/json"
        ];

        // Choose HTTP method dynamically
        $client = Http::withHeaders($headers);

        switch ($method) {
            case "GET":
            case "DELETE":
                $response = $client->{$method === "GET" ? "get" : "delete"}($endpoint);
                break;

            case "POST":
            case "PUT":
            case "PATCH":
                $response = $client->{$method === "POST" ? "post" : ($method === "PUT" ? "put" : "patch")}($endpoint, $body ?? []);
                break;

            default:
                throw new Exception("Unsupported HTTP method: $method");
        }

        return [
            "status" => $response->status(),
            "headers" => $response->headers(),
            "body" => $response->body(),
            "json" => $response->json(),
            "signed_string" => $stringToSign   // helpful for debugging
        ];
    }
}
