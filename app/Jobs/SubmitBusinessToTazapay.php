<?php

namespace App\Jobs;

use App\Models\Endorsement;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SubmitBusinessToTazapay implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public array $businessData
    ) {}

    public function handle(): void
    {
        $registrationAddress = $this->businessData['registered_address'] ?? [];
        $physicalAddress     = $this->businessData['physical_address'] ?? [];
        $associatedPersons   = $this->businessData['associated_persons'] ?? [];
        $businessDocuments   = $this->businessData['documents'] ?? [];
        $identifyingInfo     = $this->businessData['identifying_information'] ?? [];

        // Clean website
        $website = !empty($this->businessData['primary_website'])
            ? trim($this->businessData['primary_website'])
            : null;

        // Phone (optional)
        $phone = null;
        if (!empty($this->businessData['phone_number']) && !empty($this->businessData['phone_calling_code'])) {
            $phone = [
                'calling_code' => $this->businessData['phone_calling_code'],
                'number'       => preg_replace('/[^0-9]/', '', $this->businessData['phone_number']),
            ];
        }

        // Representatives
        $representatives = [];
        foreach ($associatedPersons as $person) {
            // Determine roles
            $roles = [];
            if (!empty($person['is_signer'])) {
                $roles[] = 'signer';
            }
            if (!empty($person['has_control'])) {
                $roles[] = 'controller';
            }
            if (!empty($person['has_ownership'])) {
                $roles[] = 'owner';
            }

            // If no role provided, fallback:
            if (empty($roles)) {
                // You have is_director = true in your DB
                if (!empty($person['is_director'])) {
                    $roles[] = 'director';
                } else {
                    $roles[] = 'other';
                }
            }

            // Representative phone
            $repPhone = null;
            if (!empty($person['phone'])) {
                $num = preg_replace('/[^0-9+]/', '', $person['phone']);

                if (Str::startsWith($num, '+')) {
                    $callingCode = substr($num, 0, 3);
                    $number      = substr(preg_replace('/[^0-9]/', '', $num), 1);
                    $repPhone    = [
                        'calling_code' => $callingCode,
                        'number'       => $number
                    ];
                }
            }

            // Representative documents (YOUR MODEL HAS NO FILES)
            $repDoc = [];
            if (!empty($identifyingInfo)) {
                $idDoc = $identifyingInfo[0];

                // Your DB has NO image_front or file paths
                // So we just send minimal ID doc or skip entirely

                $repDoc[] = [
                    'type'        => 'identity',
                    'sub_type'    => $idDoc['type'] ?? 'passport',
                    'tag'         => 'identityDoc',
                    'description' => $idDoc['description'] ?? '',
                    'number'      => $idDoc['number'],
                    'issuing_country' => $idDoc['issuing_country'],
                    'expiration'       => $idDoc['expiration'],
                ];
            }

            $representatives[] = [
                'first_name'           => $person['first_name'],
                'last_name'            => $person['last_name'],
                'date_of_birth'        => $person['birth_date'],
                'nationality'          => $person['nationality'],
                'ownership_percentage' => (float) ($person['ownership_percentage'] ?? 0),
                'roles'                => $roles,
                'phone'                => $repPhone,
                'address'              => [
                    'line1'       => $person['residential_address']['street_line_1'] ?? null,
                    'city'        => $person['residential_address']['city'] ?? null,
                    'state'       => null,
                    'country'     => $person['residential_address']['country'] ?? null,
                    'postal_code' => null,
                ],
                'documents'            => $repDoc,
            ];
        }

        // Business documents (your DB HAS NO file paths)
        $businessDocs = [];
        foreach ($businessDocuments as $doc) {
            foreach ($doc['purposes'] as $purpose) {
                $businessDocs[] = [
                    'type'        => 'business',
                    'sub_type'    => $purpose,
                    'tag'         => match ($purpose) {
                        'proof_of_address'      => 'registrationProofDoc',
                        'ownership_information' => 'ownershipProofDoc',
                        default                 => 'otherDoc',
                    },
                    'description' => $doc['description'] ?? '',
                ];
            }
        }

        $payload = [
            'type'                 => $this->businessData['business_type'] ?? 'other',
            'name'                 => $this->businessData['business_legal_name'],
            'email'                => $this->businessData['email'],
            'description'          => $this->businessData['business_description'],
            'website'              => $website,
            'vertical'             => $this->businessData['business_industry'],
            'registration_number'  => $this->businessData['registration_number'],
            'registration_date'    => $this->businessData['incorporation_date'],
            'tax_id'               => $this->businessData['tax_id'],
            'statement_descriptor' => $this->businessData['statement_descriptor'],
            'submit'               => true,
            'relationship'         => 'customer',
            'reference_id'         => $this->businessData['customer_id'],
            'registration_address' => [
                'line1'       => $registrationAddress['street_line_1'] ?? null,
                'line2'       => null,
                'city'        => $registrationAddress['city'] ?? null,
                'state'       => null,
                'country'     => $registrationAddress['country'] ?? null,
                'postal_code' => null,
            ],
            'operating_address'    => [
                'line1'       => $physicalAddress['street_line_1'] ?? null,
                'line2'       => null,
                'city'        => $physicalAddress['city'] ?? null,
                'state'       => null,
                'country'     => $physicalAddress['country'] ?? null,
                'postal_code' => null,
            ],
            'phone'                => $phone,
            'representatives'      => $representatives,
            'documents'            => $businessDocs,
            'purpose_of_use'       => $this->businessData['high_risk_activities'] ?: ['none_of_the_above'],
        ];

        $response = Http::withToken(config('services.tazapay.secret'))
            ->withHeaders(['Accept' => 'application/json'])
            ->post('https://service.tazapay.com/v3/entity', $payload);

        if (!$response->successful()) {
            update_endorsement($this->businessData['customer_id'], "cobo_pobo", 'submitted');
            Log::error('Tazapay submission failed', [
                'session_id' => $this->businessData['session_id'],
                'status'     => $response->status(),
                'body'       => $response->body(),
            ]);
        }
    }

    public function handleAveniaKyb()
    {
        try {
            $baseUrl = "https://api.avenia.io:10952/v2/kyc/new-level-1/web-sdk";
            $payload = [
                "redirectUrl" => "https://kyc.yativo.com/kyb-complete"
            ];
            $customerId = $this->businessData['customer_id'];
            $response = Http::timeout(30)->post($baseUrl, $payload);

            $result = $response->json();
            if ($response->successful()) {
                logger(
                    'avenia kyc successful, now we update the attempt ID to complete the verification',
                    [
                        "customer_email" => $this->businessData['email'],
                        'customer_id' => $this->businessData['customer_id'],
                        'attempt_id' => $result['attemptId']
                    ]
                );
            }

            // update my Endorsement
            update_endorsement($customerId, 'brazil', 'submitted',  [
                "authorizedRepresentativeUrl" => $result["authorizedRepresentativeUrl"],
                "basicCompanyDataUrl" => $result["basicCompanyDataUrl"]
            ]);
        } catch (\Throwable $th) {
            logger("Error generating avenia KYB link", ['error' => $th->getMessage()]);
        }
    }
}
