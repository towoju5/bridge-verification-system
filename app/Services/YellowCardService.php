<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YellowCardService
{
    protected $apiKey;
    protected $apiSecret;
    protected $baseUrl;

    public function __construct()
    {
        $this->apiKey    = env('API_KEY');
        $this->apiSecret = env('API_SECRET');
        $this->baseUrl   = 'https://sandbox.api.yellowcard.io';
    }

    /**
     * Generate YellowCard HMAC authentication headers
     */
    public function yellowcardAuth(string $path, string $method, ?array $body = null): array
    {
        // Current timestamp in ISO8601 UTC with Z suffix
        $date = now()->toIso8601String();

        // Start with timestamp + path + method
        $message = $date . $path . strtoupper($method);

        // If body exists and has more than 1 key, hash it and append
        if (!empty($body) && count($body) > 1) {
            $bodyJson = json_encode($body, JSON_UNESCAPED_SLASHES);
            $bodyHash = base64_encode(hash('sha256', $bodyJson, true));
            $message .= $bodyHash;
        }

        // Compute HMAC SHA256 and base64 encode
        $signature = base64_encode(hash_hmac('sha256', $message, $this->apiSecret, true));

        return [
            "X-YC-Timestamp" => $date,
            "Authorization"  => "YcHmacV1 {$this->apiKey}:{$signature}"
        ];
    }

    /**
     * Example GET request
     */
    public function testGetRequest()
    {
        $path = "/business/channels";
        $headers = $this->yellowcardAuth($path, "GET");

        $response = Http::withHeaders($headers)->get($this->baseUrl . $path);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error("YellowCard API error", [
            'status' => $response->status(),
            'body'   => $response->body(),
        ]);

        return [
            'error'   => true,
            'status'  => $response->status(),
            'message' => $response->body(),
        ];
    }
}
