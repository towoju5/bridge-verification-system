<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
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
        $registrationAddress = json_decode($this->businessData['registered_address'], true);
        $physicalAddress     = json_decode($this->businessData['physical_address'], true);
        $associatedPersons   = json_decode($this->businessData['associated_persons'], true);
        $businessDocuments   = json_decode($this->businessData['documents'], true);
        $identifyingInfo     = json_decode($this->businessData['identifying_information'], true);

        // Clean website
        $website = trim($this->businessData['primary_website']);

        // Phone (optional)
        $phone = null;
        if (! empty($this->businessData['phone_number']) && ! empty($this->businessData['phone_calling_code'])) {
            $phone = [
                'calling_code' => $this->businessData['phone_calling_code'],
                'number'       => preg_replace('/[^0-9]/', '', $this->businessData['phone_number']),
            ];
        }

        // Representatives
        $representatives = [];
        foreach ($associatedPersons as $person) {
            $roles = [];
            if ($person['is_signer'] ?? false) {
                $roles[] = 'signer';
            }

            if ($person['has_control'] ?? false) {
                $roles[] = 'controller';
            }

            if ($person['has_ownership'] ?? false) {
                $roles[] = 'owner';
            }

            if (empty($roles)) {
                $roles = ['other'];
            }

            // Clean rep phone (US-centric parsing as example)
            $repPhone = null;
            if (! empty($person['phone'])) {
                $num = preg_replace('/[^0-9+]/', '', $person['phone']);
                if (Str::startsWith($num, '+')) {
                    $parts       = explode(' ', $num, 2);
                    $callingCode = substr($num, 0, 3); // naive; improve if needed
                    $number      = substr(preg_replace('/[^0-9]/', '', $num), 1);
                    $repPhone    = ['calling_code' => $callingCode, 'number' => $number];
                }
            }

            $repDoc = [];
            if (! empty($identifyingInfo)) {
                $idDoc     = $identifyingInfo[0];
                $frontFile = $idDoc['image_front'];
                $repDoc[]  = [
                    'type'        => 'identity',
                    'sub_type'    => $idDoc['type'] ?? 'drivers_license',
                    'tag'         => 'AddressProofDoc',
                    'description' => $idDoc['description'] ?? '',
                    'file_name'   => basename($frontFile),
                    'url'         => Storage::url($frontFile),
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
                    'line2'       => $person['residential_address']['street_line_2'] ?? null,
                    'city'        => $person['residential_address']['city'] ?? null,
                    'state'       => $person['residential_address']['subdivision'] ?? null,
                    'country'     => $person['residential_address']['country'] ?? null,
                    'postal_code' => $person['residential_address']['postal_code'] ?? null,
                ],
                'documents'            => $repDoc,
            ];
        }

        // Business documents
        $businessDocs = [];
        foreach ($businessDocuments as $doc) {
            foreach ($doc['purposes'] as $purpose) {
                $businessDocs[] = [
                    'type'        => 'business',
                    'sub_type'    => $purpose,
                    'tag'         => match ($purpose) {
                        'proof_of_address'      => 'registrationProofDoc',
                        'ownership_information' => 'ownershipProofDoc',
                        default                 => 'otherDoc'
                    },
                    'file_name'   => basename($doc['file']),
                    'description' => $doc['description'],
                    'url'         => Storage::url($doc['file']),
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
            'reference_id'         => $this->businessData['session_id'],
            'registration_address' => [
                'line1'       => $registrationAddress['street_line_1'] ?? null,
                'line2'       => null,
                'city'        => $registrationAddress['city'] ?? null,
                'state'       => null,
                'country'     => $registrationAddress['country'] ?? null,
                'postal_code' => $registrationAddress['postal_code'] ?? null,
            ],
            'operating_address'    => [
                'line1'       => $physicalAddress['street_line_1'] ?? null,
                'line2'       => null,
                'city'        => $physicalAddress['city'] ?? null,
                'state'       => $physicalAddress['subdivision'] ?? null,
                'country'     => $physicalAddress['country'] ?? null,
                'postal_code' => $physicalAddress['postal_code'] ?? null,
            ],
            'phone'                => $phone,
            'representatives'      => $representatives,
            'documents'            => $businessDocs,
            'purpose_of_use'       => json_decode($this->businessData['high_risk_activities'], true) ?: ['none_of_the_above'],
        ];

        $response = Http::withToken(config('services.tazapay.secret'))
            ->withHeaders(['Accept' => 'application/json'])
            ->post('https://service-sandbox.tazapay.com/v3/entity', $payload);

        if (! $response->successful()) {
            \Log::error('Tazapay submission failed', [
                'session_id' => $this->businessData['session_id'],
                'status'     => $response->status(),
                'body'       => $response->body(),
            ]);
            throw new \Exception('Tazapay submission failed');
        }
    }
}
