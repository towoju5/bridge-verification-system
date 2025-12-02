<?php

namespace App\Services;

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
}
