<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class KycValidationService
{
    /**
     * Validate KYC data for a given step.
     */
    public function validateStep(Request $request, int $step): array
    {
        $rules = match ($step) {
            1 => [
                'first_name'   => 'required|string|max:100',
                'last_name'    => 'required|string|max:100',
                'middle_name'  => 'nullable|string|max:100',
                'birth_date'   => 'required|date|before:-13 years',
                'gender'       => 'required|in:male,female,other',
            ],
            2 => [
                'country'         => 'required|string|max:100',
                'state'           => 'required|string|max:100',
                'city'            => 'required|string|max:100',
                'residential_address' => 'required|string|max:255',
                'postal_code'     => 'nullable|string|max:20',
            ],
            3 => [
                'occupation'        => 'required|string|max:100',
                'source_of_funds'   => 'required|string|max:100',
                'account_purpose'   => 'required|string|max:100',
            ],
            4 => [
                'proof_of_address_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ],
            5 => [
                'id_type'             => 'required|string|max:100',
                'id_number'           => 'required|string|max:100',
                'id_front_file'       => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
                'id_back_file'        => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
                'selfie_image'        => 'required|string', // base64
            ],
            6 => [
                'signature_image' => 'nullable|string', // base64
                'agree_terms'     => 'required|boolean|accepted',
            ],
            default => [],
        };

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        return $validator->validated();
    }

    /**
     * Map validated step data to database fields for CustomerSubmission.
     */
    public function mapStepData(array $validated, int $step, $submission): array
    {
        return match ($step) {
            1 => [
                'first_name'   => $validated['first_name'],
                'last_name'    => $validated['last_name'],
                'middle_name'  => $validated['middle_name'] ?? null,
                'birth_date'   => $validated['birth_date'],
                'gender'       => $validated['gender'],
            ],
            2 => [
                'country'              => $validated['country'],
                'state'                => $validated['state'],
                'city'                 => $validated['city'],
                'residential_address'  => $validated['residential_address'],
                'postal_code'          => $validated['postal_code'] ?? null,
            ],
            3 => [
                'occupation'        => $validated['occupation'],
                'source_of_funds'   => $validated['source_of_funds'],
                'account_purpose'   => $validated['account_purpose'],
            ],
            6 => [
                'agree_terms'     => $validated['agree_terms'],
                'signature_image' => $validated['signature_image'] ?? null,
            ],
            default => [],
        };
    }
}
