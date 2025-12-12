<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SubmitBusinessToBorderless implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public array $businessData
    ) {}

    public function handle(): void
    {
        $address = json_decode($this->businessData['registered_address'], true);
        $ubos    = json_decode($this->businessData['associated_persons'], true);

        $ultimateBeneficialOwners = [];
        foreach ($ubos as $ubo) {
            $ultimateBeneficialOwners[] = [
                'hasOwnership'              => (bool) ($ubo['has_ownership'] ?? false),
                'hasControl'                => (bool) ($ubo['has_control'] ?? false),
                'controlPersonTitle'        => $ubo['title'] ?? null,
                'ownershipPercentage'       => (float) ($ubo['ownership_percentage'] ?? 0),
                'isSigner'                  => (bool) ($ubo['is_signer'] ?? false),
                'relationshipEstablishedAt' => $ubo['relationship_established_at'],
                'personalIdentity'          => [
                    'firstName'      => $ubo['first_name'],
                    'lastName'       => $ubo['last_name'],
                    'dateOfBirth'    => $ubo['birth_date'],
                    'email'          => $ubo['email'],
                    'phone'          => preg_replace('/[^+0-9]/', '', $ubo['phone']),
                    'address'        => [
                        'street1'    => $ubo['residential_address']['street_line_1'] ?? null,
                        'street2'    => $ubo['residential_address']['street_line_2'] ?? null,
                        'city'       => $ubo['residential_address']['city'] ?? null,
                        'state'      => $ubo['residential_address']['subdivision'] ?? null,
                        'country'    => $ubo['residential_address']['country'] ?? null,
                        'postalCode' => $ubo['residential_address']['postal_code'] ?? null,
                    ],
                    'sourceOfFunds'  => 'inter_company_funds',
                    'accountPurpose' => 'investment_purposes',
                ],
            ];
        }

        $payload = [
            'email'                            => $this->businessData['email'],
            'phone'                            => $this->businessData['phone_number'],
            'taxId'                            => $this->businessData['tax_id'],
            'name'                             => $this->businessData['business_legal_name'],
            'dateOfIncorporation'              => $this->businessData['incorporation_date'],
            'address'                          => [
                'street1'    => $address['street_line_1'] ?? null,
                'street2'    => null,
                'city'       => $address['city'] ?? null,
                'state'      => null,
                'country'    => $address['country'] ?? null,
                'postalCode' => $address['postal_code'] ?? null,
            ],
            'description'                      => $this->businessData['business_description'],
            'sourceOfFunds'                    => 'inter_company_funds',
            'businessIndustryCode'             => $this->businessData['business_industry'],
            'website'                          => trim($this->businessData['primary_website']),
            'businessType'                     => ucfirst($this->businessData['business_type'] ?? 'other'),
            'isDao'                            => (bool) $this->businessData['is_dao'],
            'hasMaterialIntermediaryOwnership' => (bool) $this->businessData['has_material_intermediary_ownership'],
            'businessTradeName'                => $this->businessData['business_trade_name'],
            'accountPurpose'                   => 'investment_purposes',
            'ultimateBeneficialOwners'         => $ultimateBeneficialOwners,
        ];

        $response = Http::withToken(config('services.borderless.secret'))
            ->withHeaders(['Accept' => 'application/json'])
            ->post('https://api.borderless.xyz/v1/identities/business', $payload);

        if (! $response->successful()) {
            Log::error('Borderless submission failed', [
                'session_id' => $this->businessData['session_id'],
                'status'     => $response->status(),
                'body'       => $response->body(),
            ]);
            throw new \Exception('Borderless submission failed');
        }

        // Store identity_id for doc upload later if needed
        $identityId = $response->json('id');
        if ($identityId) {
            // Dispatch document upload job
            update_endorsement($this->businessData['customer_id'], 'native', 'submitted');
            add_customer_meta($this->businessData['customer_id'], 'borderless_identity_id', $identityId);
            SubmitUBODocumentsToBorderless::dispatch($identityId, $this->businessData);
        }
    }
}
