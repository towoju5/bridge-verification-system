<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

class SubmitUBODocumentsToBorderless implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $identityId,
        public array $businessData
    ) {}

    public function handle(): void
    {
        $identifyingInfo = json_decode($this->businessData['identifying_information'], true);
        if (empty($identifyingInfo)) {
            return;
        }

        $doc = $identifyingInfo[0]; // assume one UBO doc for now

        // Read file as base64
        $frontPath = storage_path('app/public/' . $doc['image_front']);
        $backPath  = storage_path('app/public/' . ($doc['image_back'] ?? ''));

        $frontData = 'data:image/png;base64,' . base64_encode(file_get_contents($frontPath));
        $backData  = file_exists($backPath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($backPath)) : null;

        $payload = [
            'issuingCountry' => $doc['issuing_country'],
            'type'           => ucfirst(str_replace('_', '', $doc['type'])), // e.g., "drivers_license" → "DriverLicense"
            'idNumber'       => $doc['number'],
            'issuedDate'     => null,
            'expiryDate'     => $doc['expiration'] ?? null,
            'imageFront'     => $frontData,
        ];

        if ($backData) {
            $payload['imageBack'] = $backData;
        }

        $response = Http::withToken(config('services.borderless.secret'))
            ->put("https://sandbox-api.borderless.xyz/v1/identities/{$this->identityId}/documents", $payload);

        if (! $response->successful()) {
            \Log::error('Borderless doc upload failed', [
                'identity_id' => $this->identityId,
                'status'      => $response->status(),
                'body'        => $response->body(),
            ]);
        }
    }
}
