<?php
namespace App\Services;

use App\Models\Customer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use InvalidArgumentException;
use Illuminate\Support\Str;


class BorderlessService
{
    protected string $baseUrl;
    protected string $clientId;
    protected string $clientSecret;

    public const DEFAULT_ASSET = 'USDT_SOLANA';

    public function __construct(
        $baseUrl = null,
        $clientId = null,
        $clientSecret = null
    ) {
        $this->baseUrl      = $baseUrl ?? config('services.borderless.base_url');
        $this->clientId     = $clientId ?? config('services.borderless.client_id');
        $this->clientSecret = $clientSecret ?? config('services.borderless.client_secret');
    }

    /**
     * Generate and cache API access token for 23 hours
     */
    public function generateAccessToken(): ?array
    {
        if (Cache::has('borderless_access_token')) {
            return ['accessToken' => Cache::get('borderless_access_token')];
        }

        $url     = 'auth/m2m/token';
        $payload = [
            'clientId'     => $this->clientId,
            'clientSecret' => $this->clientSecret,
        ];

        $response = Http::post($this->baseUrl . $url, $payload);

        if ($response->successful()) {
            $result = $response->json();
            if (! isset($result['accessToken'])) {
                Log::error('Borderless token response missing accessToken', ['body' => $result]);
                return ['error' => 'Invalid token response'];
            }

            $token = $result['accessToken'];

            Cache::put('borderless_access_token', $token, now()->addHours(12));

            return ['accessToken' => $token];
        }

        Log::error('Failed to generate Borderless API token', [
            'status' => $response->status(),
            'body'   => $response->body(),
        ]);

        return ['error' => 'Failed to generate access token'];
    }

    /**
     * Create or KYC new customers
     */
    public function createIdentities(array $payload): array
    {
        $customer = Customer::where('customer_id', request('customer_id'))->first();
        if (! $customer) {
            return ['error' => 'Customer not found'];
        }

        $endpoint = isset($payload['type']) && strtolower($payload['type']) === 'business'
            ? "identities/business"
            : "identities/personal";

        unset($payload['type'], $payload['customer_id']);

        logger("Creating Borderless identity", ['payload' => $payload]);

        $response = $this->sendRequest($endpoint, "POST", $payload);

        if (! $response || ! isset($response['id'])) {
            Log::error("Failed to create Borderless identity", ['customer_id' => request('customer_id'), 'response' => $response]);
            return ['error' => 'Failed to create identity, contact support.'];
        }

        $customer->update([
            'borderless_identity_id' => $response['id'],
        ]);

        // Generate wallet address
        $asset          = $payload['asset'] ?? self::DEFAULT_ASSET;
        $wallet_address = $this->generateSolanaAddress(request('customer_id'), $asset);

        if (! $wallet_address) {
            return ['error' => 'Failed to generate account asset for customer, contact support.'];
        }

        $accountPayload = [
            "identityId" => $response['id'],
            "name"       => $customer->customer_name,
            "assets"     => [
                "asset"   => $asset,
                "address" => $wallet_address,
            ],
        ];

        $account = $this->sendRequest("accounts", "POST", $accountPayload);

        if ($account && isset($account['id'])) {
            $customer->update([
                'borderless_account_id' => $account['id'],
            ]);
            return [
                'identity' => $response,
                'account'  => $account,
            ];
        }

        return ['error' => 'Failed to create account for customer, contact support.'];
    }

    public function deposit(array $data): array
    {
        $this->validateDeposit($data);

        $payload = [
            'fiat'          => $data['fiat'],
            'country'       => $data['country'],
            'asset'         => $data['asset'],
            'amount'        => $data['amount'],
            'accountId'     => $data['accountId'],
            'paymentMethod' => $data['paymentMethod'],
        ];

        if (isset($data['developerFee'])) {
            $payload['developerFee'] = $data['developerFee'];
        }
        if (isset($data['counterPartyIdentityId'])) {
            $payload['counterPartyIdentityId'] = $data['counterPartyIdentityId'];
        }
        if (isset($data['source'])) {
            $this->validateSource($data['source'], $data['paymentMethod']);
            $payload['source'] = $data['source'];
        }
        if (isset($data['redirectUrl'])) {
            $payload['redirectUrl'] = $data['redirectUrl'];
        }

        return $this->sendRequest("deposits", "POST", $payload) ?? ['error' => 'Deposit failed'];
    }

    public function makePayout(array $payload): array
    {
        $response = $this->sendRequest("withdrawals", "POST", $payload);
        if (! $response || ! isset($response['id'])) {
            return ['error' => 'Failed to create payout, try again later.', 'details' => $response];
        }
        return $response;
    }

    public function retrievePayout(string $payoutId): array
    {
        try {
            return $this->sendRequest("transactions/{$payoutId}", "GET", []) ?? ['error' => 'No payout found'];
        } catch (\Throwable $th) {
            return ['error' => 'Failed to retrieve payout, try again later.', 'details' => $th->getMessage()];
        }
    }

    public function submitKyCDocuments(string $identityId, array $data): array
    {
        return $this->sendRequest("identities/{$identityId}/documents", "POST", $data) ?? ['error' => 'KYC submission failed'];
    }

    public function virtualAccount(string $id, array $payload): array
    {
        return $this->sendRequest("accounts/{$id}/virtual-accounts", "POST", $payload) ?? ['error' => 'Virtual account creation failed'];
    }

    public function sendRequest(string $url, string $method, array $payload = [], array $params = []): ?array
    {
        $endpoint = $this->baseUrl . $url;
        if (! empty($params)) {
            $endpoint .= '?' . http_build_query($params);
        }

        logger("Borderless API Request", ['url' => $url, 'method' => $method, 'payload' => $payload]);

        $token = $this->generateAccessToken();
        if (isset($token['error'])) {
            return ['error' => 'Authentication failed', 'details' => $token];
        }

        $response = Http::withHeaders([
            'Content-Type'    => 'application/json',
            'Idempotency-Key' => Str::uuid(),
        ])->withToken($token['accessToken'])->send(strtolower($method), $endpoint, ['json' => $payload]);

        if ($response->successful()) {
            return $response->json();
        }

        Log::error('Borderless API request failed', [
            'body' => $response->body(),
        ]);

        return null;
    }

    /** Deposit validation */
    protected function validateDeposit(array $data): void
    {
        $validator = Validator::make($data, [
            'fiat'                   => ['required', 'string', 'in:' . implode(',', self::SUPPORTED_FIATS)],
            'country'                => ['required', 'string', 'in:' . implode(',', self::SUPPORTED_COUNTRIES)],
            'asset'                  => ['required', 'string', 'in:' . implode(',', self::SUPPORTED_ASSETS)],
            'amount'                 => ['required', 'string', 'regex:/^\d+(\.\d+)?$/'],
            'accountId'              => ['required', 'string'],
            'paymentMethod'          => ['required', 'string', 'in:' . implode(',', self::SUPPORTED_PAYMENT_METHODS)],
            'developerFee'           => ['nullable', 'string', 'regex:/^\d+(\.\d+)?$/'],
            'counterPartyIdentityId' => ['nullable', 'string'],
            'redirectUrl'            => ['nullable', 'url'],
        ]);

        if ($validator->fails()) {
            throw new InvalidArgumentException('Validation failed: ' . implode(', ', $validator->errors()->all()));
        }
    }

    /** Source validation */
    protected function validateSource(array $source, string $paymentMethod): void
    {
        if ($paymentMethod === 'MobileMoney') {
            $validator = Validator::make($source, [
                'phone'             => ['required', 'string', 'min:7', 'max:20', 'regex:/^\+?[0-9]+$/'],
                'networkSlug'       => ['required', 'string'],
                'accountHolderName' => ['required', 'string', 'min:1', 'max:255'],
            ]);

            if ($validator->fails()) {
                throw new InvalidArgumentException('MobileMoney source validation failed: ' . implode(', ', $validator->errors()->all()));
            }
        }
    }

    /** Supported FIATs */
    public const SUPPORTED_FIATS = [
        'USD', 'EUR', 'BRL', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'PYG', 'DOP',
        'UYU', 'BOB', 'CRC', 'GTQ', 'BWP', 'CDF', 'GHS', 'KES', 'MWK', 'NGN',
        'RWF', 'ZAR', 'TZS', 'UGX', 'ZMW', 'XOF', 'XAF', 'AUD', 'BDT', 'CAD',
        'INR', 'JPY', 'NPR', 'PKR', 'PHP', 'SGD', 'GBP',
    ];

    /** Supported countries */
    public const SUPPORTED_COUNTRIES = [
        'AF', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW',
        'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM',
        'BT', 'BO', 'BQ', 'BA', 'BW', 'BV', 'BR', 'IO', 'BN', 'BG', 'BF', 'BI',
        'CV', 'KH', 'CM', 'CA', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO',
        'KM', 'CD', 'CG', 'CK', 'CR', 'HR', 'CU', 'CW', 'CY', 'CZ', 'CI', 'DK',
        'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK',
        'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH',
        'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT',
        'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM',
        'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW',
        'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MG',
        'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM',
        'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL',
        'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MP', 'NO', 'OM', 'PK', 'PW',
        'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'MK',
        'RO', 'RU', 'RW', 'RE', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'WS',
        'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB',
        'SO', 'ZA', 'GS', 'SS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY',
        'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM',
        'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'UM', 'US', 'UY', 'UZ', 'VU', 'VE',
        'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW', 'AX',
    ];

    /** Supported assets */
    public const SUPPORTED_ASSETS = [
        'POL', 'USDT_POLYGON', 'USDC_POLYGON', 'USDM_POLYGON',
        'ETH', 'USDT_ETHEREUM', 'USDC_ETHEREUM', 'USDM_ETHEREUM',
        'TRX', 'USDT_TRON', 'ETH_BASE', 'USDC_BASE', 'USDM_BASE',
        'USDB_BASE', 'ETH_OPTIMISM', 'USDT_OPTIMISM', 'USDC_OPTIMISM',
        'USDM_OPTIMISM', 'BTC', 'CELO', 'CUSD_CELO', 'USDC_CELO',
        'SOL', 'USDC_SOLANA', 'USDT_SOLANA',
    ];

    /** Supported payment methods */
    protected const SUPPORTED_PAYMENT_METHODS = [
        'ACH', 'Wire', 'Sepa', 'Swift', 'Card', 'MobileMoney', 'PIX', 'PSE',
        'SPEI', 'COELSA', 'Transfers30', 'SPAV', 'CCE', 'SPI', 'LBTR', 'SINPE',
        'Transfer365', 'NIP', 'GhIPSS', 'BankTransfer', 'EFT', 'RTP',
    ];

    /** Allowed payout purposes */
    public const ALLOWED_PAYMENT_PURPOSE = [
        'salary payment', 'personal remittance', 'rent payment', 'property purchase', 'owned account abroad', 'advertising expenses', 'advisory fees',
        'business insurance', 'construction', 'delivery fees', 'education', 'exports', 'donation', 'hotel', 'loan payment', 'maintenance expenses',
        'medical expense', 'office expenses', 'royalty fees', 'service charge', 'shares investment', 'tax payment', 'transportation fees', 'travel',
        'utility bills', 'other',
    ];
}
