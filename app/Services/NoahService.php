<?php

namespace App\Services;

use App\Http\Controllers\CryptoYativoController;
use App\Models\Business\VirtualAccount;
use App\Models\Deposit;
use App\Models\TransactionRecord;
use App\Models\User;
use App\Models\VirtualAccountDeposit;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Psr7\Response as GuzzleResponse;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use App\Models\Customer;
use Modules\SendMoney\app\Http\Controllers\SendMoneyController;
use Modules\Webhook\app\Models\Webhook;
use Spatie\WebhookServer\WebhookCall;


class NoahService
{
    public Client $httpClient;
    public string $baseUrl;
    public NoahRequestSigner $signer;

    public const NOAH_GATEWAY_ID = 99999999;

    private static array $currencyMap = [];

    public function __construct()
    {
        $this->baseUrl = rtrim(config('noah.base_url', 'https://api.noah.com/v1'), " \t\n\r\0\x0B");

        $apiKey = config('noah.api_key');
        if (empty($apiKey)) {
            throw new \RuntimeException('NOAH_API_KEY is not configured in environment.');
        }

        $this->httpClient = new Client([
            'base_uri' => $this->baseUrl,
            'timeout'  => 30,
            'headers'  => [
                'X-Api-Key'    => $apiKey,
                'Content-Type' => 'application/json',
                'Accept'       => 'application/json',
            ],
        ]);

        $this->signer = new NoahRequestSigner();
    }

    /**
     * Create or update a customer.
     *
     * @param string $customerId  Existing customer ID in your system (will be used as Noah's CustomerID)
     * @param array  $customerData
     *
     * @return array API response
     */
    public function upsertCustomer(string $customerId, array $customerData): array
    {
        $response = $this->put("/customers/{$customerId}", $customerData);
        return $this->handleResponse($response);
    }

    /**
     * Get balances for your Noah account.
     *
     * @return array
     */
    public function getBalances(): array
    {
        $response = $this->get('/balances');
        return $this->handleResponse($response);
    }


    /**
     * Create bank deposit → on-chain workflow (VA → wallet).
     *
     * @param array $workflowData Must include: CustomerID, FiatCurrency, CryptoCurrency, Network, DestinationAddress
     * @return array
     */
    public function createBankDepositWorkflow(array $workflowData): array
    {
        $customerId = request('customer_id') ?? null;
        if (! $customerId) {
            return ['error' => 'customer_id is required'];
        }

        $customer = Customer::where('customer_id', $customerId)->first();
        if (! $customer) {
            return ['error' => 'Customer not found'];
        }

        if (! $customer->is_noah_registered) {
            return ['error' => 'Customer KYC not completed or due for migration'];
        }

        Log::info("Noah workflow data", ['data' => $workflowData]);

        $required = ['CustomerID', 'FiatCurrency', 'CryptoCurrency', 'Network', 'DestinationAddress'];
        foreach ($required as $field) {
            if (! isset($workflowData[$field])) {
                throw new InvalidArgumentException("Missing required field: {$field}");
            }
        }
        Log::info("Noah workflow data after validation", ['data' => $workflowData]);
        $response = $this->post('/workflows/bank-deposit-to-onchain-address', $workflowData);
        $body = (string) $response->getBody();
        dd($response->getStatusCode(), (string) $response->getBody());
        Log::info("Noah workflow response", ['status' => $response->getStatusCode(), 'response' => $body]);

        return $this->handleResponse($response);
    }

    /**
     * Create virtual card for customer.
     *
     * @param array $cardData Must include: CustomerID, FiatCurrency, CardType, CardholderName, BillingAddress
     * @return array
     */
    public function createVirtualCard(array $cardData): array
    {
        $required = ['CustomerID', 'FiatCurrency', 'CardType', 'CardholderName', 'BillingAddress'];
        foreach ($required as $field) {
            if (! isset($cardData[$field])) {
                throw new InvalidArgumentException("Missing required field: {$field}");
            }
        }

        $response = $this->post('/virtual-cards', $cardData);
        return $this->handleResponse($response);
    }


    // --- HTTP Helpers ---

    public function get(string $path, array $queryParams = []): GuzzleResponse
    {
        $signature = $this->signer->signRequest('GET', $path, $queryParams);

        try {
            return $this->httpClient->request('GET', $path, [
                'headers' => ['Api-Signature' => $signature],
                'query'   => $queryParams,
            ]);
        } catch (RequestException $e) {
            Log::error('Noah GET request failed', [
                'path' => $path,
                'query' => $queryParams,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function post(string $path, array $data): GuzzleResponse
    {
        $body      = NoahRequestSigner::prepareJsonBody($data);
        $signature = $this->signer->signRequest('POST', $path, null, $body);

        try {
            $response = $this->httpClient->request('POST', $path, [
                'headers' => ['Api-Signature' => $signature],
                'body'    => $body,
            ]);

            $bodyStr = (string) $response->getBody();
            Log::debug('Noah POST response', [
                'path'   => $path,
                'status' => $response->getStatusCode(),
                'body'   => $bodyStr,
            ]);

            // Re-wrap body (since consumed)
            $response = new GuzzleResponse(
                $response->getStatusCode(),
                $response->getHeaders(),
                $bodyStr
            );

            return $response;
        } catch (RequestException $e) {
            Log::error('Noah POST request failed', [
                'path' => $path,
                'body' => $body,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function put(string $path, array $data): GuzzleResponse
    {
        $body      = NoahRequestSigner::prepareJsonBody($data);
        $signature = $this->signer->signRequest('PUT', $path, null, $body);

        try {
            return $this->httpClient->request('PUT', $path, [
                'headers' => ['Api-Signature' => $signature],
                'body'    => $body,
            ]);
        } catch (RequestException $e) {
            Log::error('Noah PUT request failed', [
                'path' => $path,
                'body' => $body,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    public function handleResponse(GuzzleResponse $response): array
    {
        $statusCode = $response->getStatusCode();
        $bodyStr    = (string) $response->getBody();

        if ($statusCode < 200 || $statusCode >= 300) {
            Log::error('Noah API Error', [
                'status' => $statusCode,
                'body'   => $bodyStr,
                'url'    => (string) $response->getHeaderLine('X-Request-URL'),
            ]);

            throw new \Exception("Noah API request failed: {$statusCode} - " . $bodyStr);
        }

        $json = json_decode($bodyStr, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \RuntimeException("Invalid JSON from Noah API: " . json_last_error_msg());
        }

        return $json;
    }

    // For local dev only
    public function test()
    {
        $data = [
            "CustomerID" => "550e8400-e29b-41d4-a716-446655440000",
            "FiatCurrency" => "USD",
            "CryptoCurrency" => "BTC_TEST",
            "Network" => "BitcoinTest",
            "DestinationAddress" => [
                "Address" => "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
            ],
        ];

        try {
            $result = $this->post('/v1/workflows/bank-deposit-to-onchain-address', $data);
            // $result = $this->get('/v1/customers');
            logger()->info('Noah test result', ['result' => (string) $result->getBody()]);
            return response()->json($result);
        } catch (\Exception $e) {
            logger()->error('Noah test request failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
