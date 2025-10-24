<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use App\Models\CustomerDocument;

class KycUploadService
{
    /**
     * Handle file and image uploads for each KYC step.
     */
    public function handleUploads(Request $request, $submission, int $step): void
    {
        $uploads = [];

        switch ($step) {
            case 4:
                $uploads['proof_of_address_file'] = $this->storeFile($request, 'proof_of_address_file', $submission);
                break;

            case 5:
                $uploads['id_front_file']  = $this->storeFile($request, 'id_front_file', $submission);
                if ($request->hasFile('id_back_file')) {
                    $uploads['id_back_file'] = $this->storeFile($request, 'id_back_file', $submission);
                }
                $uploads['selfie_image'] = $this->storeBase64Image($request->input('selfie_image'), $submission, 'selfie_image');
                break;

            case 6:
                if ($request->filled('signature_image')) {
                    $uploads['signature_image'] = $this->storeBase64Image($request->input('signature_image'), $submission, 'signature_image');
                }
                break;
        }

        // Save uploads in the customer_documents table
        foreach ($uploads as $type => $path) {
            if ($path) {
                CustomerDocument::create([
                    'customer_submission_id' => $submission->id,
                    'document_type'          => $type,
                    'file_path'              => $path,
                ]);
            }
        }
    }

    /**
     * Store uploaded file in storage.
     */
    protected function storeFile(Request $request, string $key, $submission): ?string
    {
        if (! $request->hasFile($key)) {
            return null;
        }

        $file = $request->file($key);
        $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();

        $path = $file->storeAs(
            "kyc/{$submission->id}/{$key}",
            $fileName,
            ['disk' => config('filesystems.default', 'public')]
        );

        return $path;
    }

    /**
     * Store base64-encoded image in storage.
     */
    protected function storeBase64Image(?string $base64String, $submission, string $type): ?string
    {
        if (! $base64String) {
            return null;
        }

        try {
            $decoded = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64String));

            $fileName = Str::uuid() . ".png";
            $path = "kyc/{$submission->id}/{$type}/{$fileName}";

            Storage::disk(config('filesystems.default', 'public'))->put($path, $decoded);

            return $path;
        } catch (\Throwable $e) {
            Log::error('Base64 image upload failed', [
                'submission_id' => $submission->id,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
