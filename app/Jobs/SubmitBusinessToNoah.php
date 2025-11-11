<?php
namespace App\Jobs;

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

    public function __construct(
        public array $businessData
    ) {}

    public function handle(): void
    {
        // Parse registered address (required)
        $registeredAddressRaw = $this->businessData['registered_address'] ?? null;
        if (! $registeredAddressRaw) {
            throw new \Exception('Registered address is missing');
        }

        $addr = json_decode($registeredAddressRaw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \Exception('Invalid registered_address JSON');
        }

        // Ensure required fields exist
        $requiredFields = ['street_line_1', 'city', 'postal_code', 'country'];
        foreach ($requiredFields as $field) {
            if (empty(Arr::get($addr, $field))) {
                throw new \Exception("Missing required address field: {$field}");
            }
        }

        // Noah requires RegistrationNumber and IncorporationDate
        if (empty($this->businessData['registration_number'])) {
            throw new \Exception('RegistrationNumber is required by Noah but missing');
        }
        
        if (empty($this->businessData['incorporation_date'])) {
            throw new \Exception('IncorporationDate is required by Noah but missing');
        }

        // Map state: use subdivision if available, otherwise fallback
        $state = Arr::get($addr, 'subdivision') ?: Arr::get($addr, 'state', '');

        $noahPayload = [
            'RegisteredName'      => $this->businessData['business_legal_name'],
            'Email'               => $this->businessData['email'],
            'RegistrationNumber'  => $this->businessData['registration_number'],
            'RegistrationCountry' => Arr::get($addr, 'country'),
            'RegisteredAddress'   => [
                'Street'   => Arr::get($addr, 'street_line_1'), // >=2 chars enforced by Noah
                'Street2'  => Arr::get($addr, 'street_line_2', ''),
                'City'     => Arr::get($addr, 'city'),
                'PostCode' => Arr::get($addr, 'postal_code'),
                'State'    => $state,
                'Country'  => Arr::get($addr, 'country'),
            ],
            'IncorporationDate'   => $this->businessData['incorporation_date'], // format: YYYY-MM-DD
        ];

        // Validate Noah-specific constraints (optional but safe)
        if (strlen($noahPayload['RegisteredAddress']['Street']) < 2) {
            throw new \Exception('Street must be at least 2 characters');
        }

        $response = Http::withToken(config('services.noah.secret'))
            ->acceptJson()
            ->post('https://api.noah.com/v1/businesses', $noahPayload);

        if (! $response->successful()) {
            Log::error('Noah submission failed', [
                'session_id' => $this->businessData['session_id'],
                'status'     => $response->status(),
                'errors'     => $response->json('errors', []),
                'payload'    => $noahPayload,
            ]);
            throw new \Exception('Noah API submission failed: ' . $response->body());
        }

        // Optionally store Noah business ID
        $noahBusinessId = $response->json('id');
        if ($noahBusinessId) {
            // E.g., BusinessSubmission::where('session_id', $this->businessData['session_id'])
            //     ->update(['noah_business_id' => $noahBusinessId]);
        }
    }
}
