<?php

namespace App\Services;

use App\Models\Endorsement;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class NoahService
{
    protected string $baseUrl;
    protected NoahRequestSigner $signer;
    protected string $apiKey;

    public const NOAH_GATEWAY_ID = 99999999;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('noah.base_url', 'https://api.noah.com/v1'), " \t\n\r\0\x0B");
        $this->apiKey = config('noah.api_key');

        if (empty($this->apiKey)) {
            throw new \RuntimeException('NOAH_API_KEY is not configured.');
        }

        $this->signer = new NoahRequestSigner();
    }

    protected function buildClient(string $method, string $path, ?array $queryParams = null, ?string $body = null)
    {
        $fullUrl = normalizeNoahApiUrl($this->baseUrl . ltrim($path, '/'));

        $signature = $this->signer->signRequest($method, $fullUrl, $queryParams, $body);

        $headers = [
            'X-Api-Key' => $this->apiKey,
            'Api-Signature' => $signature,
            'Accept' => 'application/json',
        ];

        if ($body !== null) {
            $headers['Content-Type'] = 'application/json';
        }

        $client = Http::withHeaders($headers)
            ->timeout(30)
            ->withOptions(['http_errors' => false]);

        if ($queryParams && !empty($queryParams)) {
            $client = $client->withQueryParameters($queryParams);
        }

        return [$client, $fullUrl, $body];
    }

    public function get(string $path, array $queryParams = [])
    {
        [$client, $url] = $this->buildClient('GET', $path, $queryParams);
        return $client->get($url);
    }

    public function post(string $path, array $data)
    {
        $body = NoahRequestSigner::prepareJsonBody($data);
        [$client, $url] = $this->buildClient('POST', $path, null, $body);
        return $client->withBody($body, 'application/json')->post($url);
    }

    public function put(string $path, array $data)
    {
        $body = NoahRequestSigner::prepareJsonBody($data);
        [$client, $url] = $this->buildClient('PUT', $path, null, $body);
        return $client->withBody($body, 'application/json')->put($url);
    }

    public function noahOnboardingInit($customerId)
    {
        $response = $this->processOnboarding($customerId);
        if ($response->successful()) {
            $hostedUrl = $body['HostedURL'] ?? null;
            foreach (['base', 'sepa', 'spei'] as $service) {
                update_endorsement($customerId, $service, "submitted", $hostedUrl);
            }

            Log::info('Noah onboarding initiated', [
                'customer_id' => $customerId,
                'hosted_kyc_url' => $hostedUrl,
            ]);

            Log::info('Noah onboarding initiated', ['customer_id' => $customerId, 'response' => $body]);
        } else {
            logger('Failed to initiate Noah onboarding: ' . $response->body());
        }
    }

    public function processOnboarding($customerId)
    {
        $noah = new NoahService();
        // Onboarding initiation may require an empty body or minimal payload
        $returnUrl = session()->get('return_url', 'https://google.com');
        $payload = [
            "Metadata" => [
                "CustomerId" => $customerId
            ],
            "ReturnURL" => $returnUrl,
            "FiatOptions" => [
                ["FiatCurrencyCode" => "USD"],
                ["FiatCurrencyCode" => "EUR"],
            ]
        ];

        logger('Noah Onboarding Payload:', ['payload' => $payload]);

        $noah = new NoahService();
        $response = $noah->post("/onboarding/{$customerId}", $payload);
        $body = $response->json();

        logger('Noah Onboarding Response:', [
            'status' => $response->status(),
            'body' => $body,
            'hosted_kyc_url' => $body['HostedURL'] ?? null,
        ]);

        if ($response->successful()) {
            $hostedUrl = $body['HostedURL'] ?? null;
            foreach (['base', 'sepa', 'spei'] as $service) {
                update_endorsement($customerId, $service, "submitted", $hostedUrl);
            }
        }
        return $response;
    }
}
