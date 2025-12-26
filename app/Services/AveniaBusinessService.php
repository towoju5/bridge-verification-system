<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AveniaBusinessService
{
    protected string $baseUrl;
    protected $avenia;
    protected string $accessToken;

    public function __construct()
    {
        $this->baseUrl = config('services.avenia.base_url');
        $this->accessToken = config('services.avenia.access_token');
        $this->avenia = new AveniaService();
    }

    /**
     * Step 1: Create Subaccount for Business (COMPANY)
     */
    public function businessCreateSubaccount(string $name, string $customerId): mixed
    {
        $response = $this->avenia->post("/account/sub-accounts", [
            'accountType' => 'COMPANY',
            'name' => $name,
        ]);
        if ($response->successful()) {
            $subAccountId = $response->json()['id'];
            if($subAccountId) {
                $hostedUrl = $this->businessInitiateKybWebSdk($subAccountId);
                if($hostedUrl && is_array($hostedUrl)) {
                    add_customer_meta($customerId, 'avenia_sub_account_id', $subAccountId);
                    update_endorsement($customerId, 'brazil', 'under_review', $hostedUrl);
                }
            }

            logger("Avenia sub-account created successfully", ['subAccountId' => $subAccountId, 'hostedUrl' => $hostedUrl]);
        }

        logger("Avenia sub-account creation response", ['response' => $response->json()]);
        return ['error' => $response->json()];
    }

    /**
     * Step 2: Get Account Information
     */
    public function businessGetAccountInfo(string $subAccountId): ?array
    {
        $response = $this->avenia->get("/account/account-info", [
            'subAccountId' => $subAccountId,
        ]);

        if ($response->successful()) {
            return $response->json()['id'];
        }

        return ['error' => $response->json()];
    }

    /**
     * Step 3: Check Account Balance
     */
    public function businessGetBalances(string $subAccountId): ?array
    {
        $response = $this->avenia->get("/account/balances", [
            'subAccountId' => $subAccountId,
        ]);

        

        if ($response->successful()) {
            return $response->json()['balances'];
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json('balances') : null;
    }

    /**
     * Step 4: Get Account Limits
     */
    public function businessGetLimits(string $subAccountId): ?array
    {
        $response = $this->avenia->get("/account/limits", [
            'subAccountId' => $subAccountId,
        ]);

        

        if ($response->successful()) {
            return $response->json()['limitInfo'];
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json('limitInfo') : null;
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

        $response = $this->avenia->get("/account/statement", $queryParams);

        

        if ($response->successful()) {
            return $response->json();
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 6: Business Verification (KYB Level 1 via Web SDK)
     */
    public function businessInitiateKybWebSdk(string $subAccountId): ?array
    {
        $response = $this->avenia->post("/kyc/new-level-1/web-sdk", [
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
    public function businessCreateBrlBankAccount(array $bankData)
    {
        // Required: alias, description, userName, bankCode, branchCode,
        // accountNumber, accountType
        $response = $this->avenia->post("/account/beneficiaries/bank-accounts/brl/", $bankData);

        

        if ($response->successful()) {
            return $response->json()['id'];
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Step 8: Get Quote for Deposit → Fiat → Avenia Account
     */
    public function businessGetDepositQuote(array $params): ?array
    {
        // Required: inputCurrency, inputPaymentMethod, outputCurrency, outputPaymentMethod,
        // inputAmount, inputThirdParty, outputThirdParty, blockchainSendMethod
        $response = $this->avenia->get("/account/quote/fixed-rate", $params);

        

        if ($response->successful()) {
            return $response->json()['id'];
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 9: Create Ticket for Deposit
     */
    public function businessCreateDepositTicket(array $ticketData): ?array
    {
        // ticketData must include: quoteToken,
        // ticketBrlPixInput (optional additionalData),
        // ticketBlockchainOutput (beneficiaryWalletId)
        $response = $this->avenia->post("/account/tickets/", $ticketData);

        

        if ($response->successful()) {
            return $response->json()['id'];
        }

        return ['error' => $response->json()];
        // return $response->successful() ? $response->json() : null;
    }
}
