<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AveniaBusinessService
{
    protected string $baseUrl;
    protected string $accessToken;

    public function __construct()
    {
        $this->baseUrl = config('services.avenia.base_url');
        $this->accessToken = config('services.avenia.access_token');
    }

    /**
     * Step 1: Create Subaccount for Business (COMPANY)
     */
    public function businessCreateSubaccount(string $name): ?string
    {
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/account/sub-accounts", [
                'accountType' => 'COMPANY',
                'name' => $name,
            ]);

        return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Step 2: Get Account Information
     */
    public function businessGetAccountInfo(string $subAccountId): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/account-info", [
                'subAccountId' => $subAccountId,
            ]);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 3: Check Account Balance
     */
    public function businessGetBalances(string $subAccountId): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/balances", [
                'subAccountId' => $subAccountId,
            ]);

        return $response->successful() ? $response->json('balances') : null;
    }

    /**
     * Step 4: Get Account Limits
     */
    public function businessGetLimits(string $subAccountId): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/limits", [
                'subAccountId' => $subAccountId,
            ]);

        return $response->successful() ? $response->json('limitInfo') : null;
    }

    /**
     * Step 5: Get Account Statement
     */
    public function businessGetStatement(string $subAccountId, ?string $cursor = null): ?array
    {
        $queryParams = ['subAccountId' => $subAccountId];
        if ($cursor) {
            $queryParams['cursor'] = $cursor;
        }

        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/statement", $queryParams);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 6: Business Verification (KYB Level 1 via Web SDK)
     */
    public function businessInitiateKybWebSdk(string $subAccountId): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/v2/kyc/new-level-1/web-sdk", [
                'subAccountId' => $subAccountId,
            ]);

        if ($response->successful()) {
            return [
                'attemptId' => $response->json('attemptId'),
                'authorizedRepresentativeUrl' => trim($response->json('authorizedRepresentativeUrl')),
                'basicCompanyDataUrl' => trim($response->json('basicCompanyDataUrl')),
            ];
        }

        return null;
    }

    /**
     * Step 7: Create BRL Bank Account / PIX Key
     */
    public function businessCreateBrlBankAccount(array $bankData): ?string
    {
        // Required: alias, description, userName, bankCode, branchCode,
        // accountNumber, accountType
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/account/beneficiaries/bank-accounts/brl/", $bankData);

        return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Step 8: Get Quote for Deposit → Fiat → Avenia Account
     */
    public function businessGetDepositQuote(array $params): ?array
    {
        // Required: inputCurrency, inputPaymentMethod, outputCurrency, outputPaymentMethod,
        // inputAmount, inputThirdParty, outputThirdParty, blockchainSendMethod
        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/quote/fixed-rate", $params);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 9: Create Ticket for Deposit
     */
    public function businessCreateDepositTicket(array $ticketData): ?array
    {
        // ticketData must include: quoteToken,
        // ticketBrlPixInput (optional additionalData),
        // ticketBlockchainOutput (beneficiaryWalletId)
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/account/tickets/", $ticketData);

        return $response->successful() ? $response->json() : null;
    }
}
