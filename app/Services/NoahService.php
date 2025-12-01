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
     * Create hosted fiat → crypto payin session (checkout).
     *
     * @param array $payload Must include: FiatCurrency, CryptoCurrency, FiatAmount, ReturnURL, CustomerID
     * @return array
     */
    public function createFiatPayinSession(array $payload): array
    {
        $required = ['FiatCurrency', 'CryptoCurrency', 'FiatAmount', 'ReturnURL', 'CustomerID'];
        foreach ($required as $field) {
            if (! isset($payload[$field])) {
                throw new HttpResponseException(get_error_response(['error' => "Missing required field: {$field}"]));
            }
        }

        $response = $this->post('/checkout/payin/fiat', $payload);
        return $this->handleResponse($response);
    }

    /**
     * Get transaction by ID.
     *
     * @param string $transactionId
     * @return array
     */
    public function getTransaction(string $transactionId): array
    {
        $response = $this->get("/transactions/{$transactionId}");
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

    /**
     * Handle FiatDeposit webhook event (from /workflows/bank-deposit-to-onchain-address).
     *
     * Expected EventType: "FiatDeposit", Status: "settled"
     */
    public function handleFiatDeposit(array $payload)
    {
        try {
            $data      = $payload['Data'] ?? null;
            $eventType = $payload['EventType'] ?? null;

            if (! $data || $eventType !== 'FiatDeposit') {
                Log::info('Ignoring unsupported/no-data webhook', [
                    'event_type' => $eventType,
                    'has_data'   => (bool) $data,
                ]);
                return response()->noContent(200);
            }

            // Extract core data
            $depositId     = $data['ID'] ?? null;
            $customerId    = $data['CustomerID'] ?? null;
            $depositAmount = floatval($data['FiatAmount'] ?? 0);
            $currency      = strtoupper($data['FiatCurrency'] ?? 'USD');
            $status        = strtolower($data['Status'] ?? 'pending');
            $senderName    = $data['Sender']['FullName'] ?? null;
            $accountNumber = $data['Sender']['Details']['AccountNumber'] ?? null;

            if (! $depositId || ! $customerId || $depositAmount <= 0 || ! $currency) {
                Log::error('Missing critical fields in Noah FiatDeposit webhook', [
                    'deposit_id' => $depositId,
                    'customer_id' => $customerId,
                    'amount' => $depositAmount,
                    'currency' => $currency,
                    'payload' => $payload,
                ]);
                return response()->noContent(200);
            }

            // Only process settled deposits
            if ($status !== 'settled') {
                Log::info('Ignoring non-settled deposit', [
                    'deposit_id' => $depositId,
                    'status'     => $status,
                ]);
                return response()->noContent(200);
            }

            // 🔒 Idempotency
            $cacheKey = "deposit_webhook_noah_{$depositId}";
            if (Cache::has($cacheKey)) {
                Log::info('Duplicate webhook ignored (idempotency)', ['deposit_id' => $depositId]);
                return response()->noContent(200);
            }
            Cache::put($cacheKey, true, 86400); // 24h

            // Parse VA number from PaymentMethodID (e.g., "bank/usd/1234567890" → "1234567890")
            $paymentMethodID = $data['PaymentMethodID'] ?? '';
            $virtualAccountNumber = null;

            if ($paymentMethodID && str_contains($paymentMethodID, '/')) {
                $parts = explode('/', $paymentMethodID);
                $virtualAccountNumber = end($parts);
            } else {
                $virtualAccountNumber = $paymentMethodID;
            }

            if (! $virtualAccountNumber) {
                Log::error('Could not extract virtual account number', [
                    'payment_method_id' => $paymentMethodID,
                    'deposit_id' => $depositId,
                ]);
                return response()->noContent(200);
            }

            // Find Virtual Account
            $vc = VirtualAccount::where('account_number', $virtualAccountNumber)->first();
            if (! $vc) {
                Log::warning('Virtual account not found', [
                    'virtual_account_number' => $virtualAccountNumber,
                    'deposit_id' => $depositId,
                ]);
                return response()->noContent(200);
            }

            $user = User::find($vc->user_id);
            if (! $user) {
                Log::error('User not found for virtual account', [
                    'virtual_account_number' => $virtualAccountNumber,
                    'user_id' => $vc->user_id,
                ]);
                return response()->noContent(200);
            }

            // Fee calculation
            $gc         = new VirtualAccountDepositService();
            $feeDetails = $gc::calculateFees($depositAmount, strtolower($currency), $data, 'noah', $vc->user_id);
            $floatFee   = floatval($feeDetails['float_fee'] ?? 0);   // percent
            $fixedFee   = floatval($feeDetails['fixed_fee'] ?? 0);   // fixed amount

            $calculatedFloatFee = $depositAmount * ($floatFee / 100);
            $transactionFee     = round($calculatedFloatFee + $fixedFee, 2);
            $creditedAmount     = max(0, $depositAmount - $transactionFee);

            // Create or update Deposit
            $deposit = Deposit::updateOrCreate(
                ['gateway_deposit_id' => $depositId],
                [
                    'user_id'          => $user->id,
                    'amount'           => $depositAmount,
                    'currency'         => $currency,
                    'deposit_currency' => $currency,
                    'gateway'          => self::NOAH_GATEWAY_ID,
                    'status'           => SendMoneyController::SUCCESS,
                    'receive_amount'   => $creditedAmount,
                    'meta'             => $payload,
                ]
            );

            // Create or update VirtualAccountDeposit
            VirtualAccountDeposit::updateOrCreate(
                [
                    'user_id'    => $deposit->user_id,
                    'deposit_id' => $deposit->id,
                ],
                [
                    'currency'       => $currency,
                    'amount'         => $creditedAmount,
                    'account_number' => $vc->account_number,
                    'status'         => SendMoneyController::SUCCESS,
                ]
            );

            // Create Transaction Record
            TransactionRecord::updateOrCreate(
                ['transaction_id' => $depositId],
                [
                    'user_id'                    => $user->id,
                    'transaction_beneficiary_id' => $user->id,
                    'transaction_amount'         => $creditedAmount,
                    'gateway_id'                 => self::NOAH_GATEWAY_ID,
                    'transaction_status'         => SendMoneyController::SUCCESS,
                    'transaction_type'           => 'virtual_account',
                    'transaction_memo'           => 'payin',
                    'transaction_currency'       => $currency,
                    'base_currency'              => $currency,
                    'secondary_currency'         => $currency,
                    'transaction_purpose'        => 'VIRTUAL_ACCOUNT_DEPOSIT',
                    'transaction_payin_details'  => [
                        'account_number'      => $accountNumber,
                        'sender_name'         => $senderName,
                        'trace_number'        => null,
                        'bank_routing_number' => null,
                        'description'         => null,
                        'transaction_fees'    => $transactionFee,
                        'amount_received'     => $depositAmount,
                        'credited_amount'     => $creditedAmount,
                    ],
                    'transaction_payout_details' => null,
                    'deposit_id'                 => $deposit->id,
                ]
            );

            // Deposit to wallet (⚠️ units: assume wallet uses major units, e.g., USD, not cents)
            if ($creditedAmount > 0) {
                $wallet = $user->getWallet(strtolower($currency));
                if ($wallet) {
                    $existingTransaction = $wallet->transactions()
                        ->where('meta->deposit_id', $deposit->id)
                        ->first();

                    if (! $existingTransaction) {
                        $wallet->deposit($creditedAmount, [ // ✅ NOT * 100
                            'deposit_id'         => $deposit->id,
                            'gateway_deposit_id' => $deposit->gateway_deposit_id,
                            'sender'             => [
                                'account_number' => $accountNumber,
                                'sender_name'    => $senderName,
                            ],
                        ]);
                    }
                }
            }

            // Dispatch webhook
            $customer = Customer::where('customer_id', $vc->customer_id)->first();
            $webhookData = [
                'event.type' => 'virtual_account.deposit',
                'payload'    => [
                    'amount'           => $depositAmount,
                    'currency'         => $currency,
                    'status'           => 'completed',
                    'credited_amount'  => $creditedAmount,
                    'transaction_type' => 'virtual_account_topup',
                    'transaction_id'   => $deposit->gateway_deposit_id,
                    'customer'         => $customer ? $customer->toArray() : null,
                    'source'           => [
                        'account_number' => $accountNumber,
                        'sender_name'    => $senderName,
                    ],
                    'account_details'  => $vc ? $vc->toArray() : null,
                ],
            ];

            dispatch(function () use ($user, $webhookData) {
                $webhook = Webhook::whereUserId($user->id)->first();
                if ($webhook) {
                    WebhookCall::create()
                        ->meta(['_uid' => $webhook->user_id])
                        ->url($webhook->url)
                        ->useSecret($webhook->secret)
                        ->payload($webhookData)
                        ->dispatch();
                }
            })->afterResponse();

            Log::info('✅ Noah fiat deposit processed', [
                'deposit_id' => $deposit->id,
                'gateway_deposit_id' => $depositId,
                'user_id' => $user->id,
                'credited_amount' => $creditedAmount,
            ]);
        } catch (\Throwable $e) {
            Log::error('🚨 Failed to process Noah fiat deposit webhook', [
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
                'payload' => $payload,
            ]);
        }

        return response()->noContent(200);
    }

    /**
     * Map fiat currency to Noah-supported crypto/network config.
     *
     * @param string $customerId
     * @param string $currency   e.g., 'USD', 'USD_BASE', 'N_USD'
     * @return array [currency, crypto, crypto_currency, network, wallet_address]
     */
    public static function mapCurrency(string $customerId, string $currency): array
    {
        $currency = strtoupper(trim($currency));

        $baseCurrency = match ($currency) {
            'USD', 'USDBASE', 'USD_BASE', 'N_USD' => 'USD',
            'EUR', 'EURBASE', 'EUR_BASE', 'N_EUR' => 'EUR',
            default => throw new \InvalidArgumentException("Unsupported currency: {$currency}"),
        };

        $isTest = str_starts_with($currency, 'N_') || in_array($currency, ['USDBASE', 'EURBASE', 'USD_BASE', 'EUR_BASE'], true);

        $key = "{$baseCurrency}_" . ($isTest ? 'test' : 'prod');
        if (! isset(self::$currencyMap[$key])) {
            $network        = $isTest ? 'SolanaDevnet' : 'Solana';
            $cryptoCurrency = $isTest ? 'USDC_TEST' : 'USDC';
            $crypto         = $baseCurrency === 'USD' ? 'USDC_SOL' : 'EURC_SOL';

            self::$currencyMap[$key] = [
                'currency'        => $baseCurrency,
                'crypto'          => $crypto,
                'crypto_currency' => $cryptoCurrency,
                'network'         => $network,
            ];
        }

        $config = self::$currencyMap[$key];
        $wallet = self::generateWalletAddress($customerId, $config['crypto']);

        return array_merge($config, ['wallet_address' => $wallet]);
    }

    /**
     * Generate wallet address via internal controller.
     */
    public static function generateWalletAddress(string $customerId, string $currency)
    {
        return app(CryptoYativoController::class)->generateCustomerWallet($customerId, $currency);
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
