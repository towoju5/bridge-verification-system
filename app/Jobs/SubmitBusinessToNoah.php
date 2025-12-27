<?php

namespace App\Jobs;

use App\Models\Endorsement;
use App\Services\NoahService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SubmitBusinessToNoah implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $baseUrl;

    public function __construct(
        public array $businessData
    ) {
        $baseUrl = 'https://api.noah.com/v1/';
    }

    public function handle(): void
    {
        try {
            // Parse registered address (required)
            $business = $this->businessData;
            logger("business data passed: ", ['kyc_payload' => $business]);
            $customerId = $business['customer_id'];

            $noah = new NoahService();
            $noah->processOnboarding($customerId);
            
            // Decode JSON fields safely
            $registeredAddress = $business['registered_address'];
            $associatedPersons = $business['associated_persons'];

            // Build associates array
            $associates = [];
            foreach ($associatedPersons as $person) {
                $associates[] = [
                    "ID" => $person['id'] ?? null,
                    "RelationshipTypes" => array_filter([
                        $person['has_ownership'] ? "UBO" : null,
                        $person['is_director'] ? "Director" : null,
                        $person['is_signer'] ? "Representative" : null,
                    ]),
                    "FullName" => [
                        "FirstName" => $person['first_name'] ?? null,
                        "LastName"  => $person['last_name'] ?? null,
                    ],
                    "DateOfBirth" => $person['birth_date'] ?? null,
                ];
            }

            // Remove null ID fields
            $associates = array_map(function ($a) {
                return array_filter($a, fn($v) => $v !== null);
            }, $associates);

            logger("Noah KYB Associates: ", ['associates' => $associates]);

            $payload = [
                "Type" => "BusinessCustomerPrefill",
                "RegistrationCountry" => $registeredAddress['country'] ?? "US",
                "CompanyName" => $business['business_legal_name'],
                "RegistrationNumber" => $business['registration_number'],
                "LegalAddress" => array_filter([
                    "Street" => $registeredAddress['street_line_1'] ?? null,
                    "City"   => $registeredAddress['city'] ?? null,
                    "PostCode" => $registeredAddress['postcode'] ?? null,
                    "State" => $registeredAddress['state'] ?? null,
                    "Country" => $registeredAddress['country'] ?? null,
                ]),
                "IncorporationDate" => $business['incorporation_date'] ? date("Y-m-d", strtotime($business['incorporation_date'])) : null,
                "EntityType" => $business['business_type'],   // mapped from 'llc'
                "TaxID" => $business['tax_id'],
                "PrimaryWebsite" => $business['primary_website'],
                "Associates" => $associates,
            ];

            logger("Noah KYB Payload: ", ['payload' => $payload]);

            // Remove null / empty fields from top-level payload
            $payload = array_filter($payload, function ($v) {
                return !($v === null || $v === "" || $v === []);
            });
            // submitting prefil kyb data
            $response = $noah->post("/onboarding/{$customerId}/prefill", $payload);


            if ($response->successful()) {
                // generate the onboarding url
                logger("generating onboarding session url for business", ['business' => $business]);
                $noahService = new NoahService();
                $noahService->noahOnboardingInit($customerId);

                // Step 3: Submit documents
                $this->submitNoahDocument($customerId, $data['identifying_information'] ?? []);
            }
            logger("Noah KYB submission response", ['response' => $response->json()]);
        } catch (\Throwable $th) {
            logger("Error submitting business KYC to Noah: " . $th->getMessage(), ['business_data' => $this->businessData]);
        }
    }

    public function submitNoahDocument(string $customerId, array $data)
    {
        //
    }
}
