<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AveniaIndividualService
{
    protected string $baseUrl;
    protected string $accessToken;

    public function __construct()
    {
        $this->baseUrl = config('services.avenia.base_url');
        $this->accessToken = config('services.avenia.access_token');
    }

    /**
     * Step 1: Create Subaccount for Individual
     */
    public function individualCreateSubaccount(string $name): ?string
    {
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/account/sub-accounts", [
                'accountType' => 'INDIVIDUAL',
                'name' => $name,
            ]);

        if ($response->successful()) {
            return $response->json('id');
        }

        return null;
    }

    /**
     * Step 2: Get Account Information
     */
    public function individualGetAccountInfo(string $subAccountId): ?array
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
    public function individualGetBalances(string $subAccountId): ?array
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
    public function individualGetLimits(string $subAccountId): ?array
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
    public function individualGetStatement(string $subAccountId, ?string $cursor = null): ?array
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
     * Step 6: Request Document Upload URLs
     */
    public function individualRequestDocumentUploadUrls(string $documentType, bool $isDoubleSided = false): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/documents/", [
                'documentType' => $documentType,
                'isDoubleSided' => $isDoubleSided,
            ]);

        if ($response->successful()) {
            return [
                'id' => $response->json('id'),
                'uploadURLFront' => $response->json('uploadURLFront'),
                'uploadURLBack' => $response->json('uploadURLBack'),
            ];
        }

        return null;
    }

    /**
     * Step 7: Upload Document Files (Front & Back)
     */
    public function individualUploadDocumentFile(string $uploadUrl, string $filePath): bool
    {
        $fileContents = file_get_contents($filePath);
        if ($fileContents === false) {
            return false;
        }

        $response = Http::withHeaders([
            'Content-Type' => 'image/jpeg',
            'If-None-Match' => '*',
        ])->put(trim($uploadUrl), $fileContents);

        return $response->successful();
    }

    /**
     * Step 8: Request Selfie Upload URL
     */
    public function individualRequestSelfieUploadUrl(): ?array
    {
        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/documents/", [
                'documentType' => 'SELFIE',
            ]);

        if ($response->successful()) {
            return [
                'id' => $response->json('id'),
                'uploadURLFront' => $response->json('uploadURLFront'),
            ];
        }

        return null;
    }

    /**
     * Step 9: Upload Selfie File
     */
    public function individualUploadSelfie(string $uploadUrl, string $filePath): bool
    {
        return $this->individualUploadDocumentFile($uploadUrl, $filePath);
    }

    /**
     * Step 10: Submit KYC Level 1 Request
     */
    public function individualSubmitKycLevel1(array $data): ?string
    {
        // Required keys: fullName, dateOfBirth, countryOfTaxId, taxIdNumber, email,
        // country, state, city, zipCode, streetAddress, uploadedSelfieId, uploadedDocumentId

        // $response = Http::withToken($this->accessToken)
        //     ->withHeaders(['Content-Type' => 'application/json'])
        //     ->post("{$this->baseUrl}/v2/kyc/new-level-1/api", $data);

        // return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Step 11: Create BRL Bank Account / PIX Key
     */
    public function individualCreateBrlBankAccount(array $bankData): ?string
    {
        // bankData must include: alias, description, userName, bankCode, branchCode,
        // accountNumber, accountType

        $response = Http::withToken($this->accessToken)
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post("{$this->baseUrl}/v2/account/beneficiaries/bank-accounts/brl/", $bankData);

        return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Step 12: Get Quote for Deposit → Fiat → Avenia Account
     */
    public function individualGetDepositQuote(array $params): ?array
    {
        // Required: inputCurrency, inputPaymentMethod, outputCurrency, outputPaymentMethod,
        // inputAmount, inputThirdParty, outputThirdParty, blockchainSendMethod

        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/v2/account/quote/fixed-rate", $params);

        return $response->successful() ? $response->json() : null;
    }

    /**
     * Step 13: Create Ticket for Deposit
     */
    public function individualCreateDepositTicket(array $ticketData): ?array
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
