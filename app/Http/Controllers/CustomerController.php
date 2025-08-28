<?php
namespace App\Http\Controllers;

use App\Models\CustomerDocument;
use App\Models\CustomerSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CustomerController extends Controller
{
    protected $bridgeApiKey;
    protected $bridgeApiUrl, $maxSteps;

    public function __construct()
    {
        $this->bridgeApiKey = env('BRIDGE_API_KEY');
        $this->bridgeApiUrl = env('BRIDGE_API_URL');
        $this->maxSteps     = 6;
    }

    public function showAccountTypeSelection()
    {
        return Inertia::render('Customer/AccountTypeSelection');
    }

    public function startBusinessVerification(Request $request)
    {
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid();

        $customerSubmission = CustomerSubmission::create([
            'type'                => 'business',
            'signed_agreement_id' => $signedAgreementId,
        ]);

        session(['customer_submission_id' => $customerSubmission->id]);

        return redirect()->route('business.verify.step', ['step' => 1]);
    }

    public function startIndividualVerification(Request $request)
    {
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid();

        $customerSubmission = CustomerSubmission::create([
            'type'                => 'individual',
            'signed_agreement_id' => $signedAgreementId,
        ]);

        session(['customer_submission_id' => $customerSubmission->id]);

        return redirect()->route('customer.verify.step', ['step' => 1]);
    }

    public function showVerificationStep(Request $request, $step = 1)
    {
        $step     = (int) $step;
        $maxSteps = 6;

        if ($step < 1 || $step > $maxSteps) {
            return redirect()->route('customer.verify.step', ['step' => 1]);
        }

        $submissionId = session('customer_submission_id');
        if (! $submissionId) {
            return redirect()->route('account.type')->with('error', 'Session expired');
        }

        $customerSubmission = CustomerSubmission::find($submissionId);
        if (! $customerSubmission || $customerSubmission->type !== 'individual') {
            session()->forget('customer_submission_id');
            return redirect()->route('account.type');
        }

        $initialData = [
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => config('bridge_data.account_purposes'),
            'sourceOfFunds'                => config('bridge_data.source_of_funds'),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
        ];

        return Inertia::render('Customer/Verify', [
            'initialData'  => $initialData,
            'currentStep'  => $step,
            'maxSteps'     => $maxSteps,
            'customerData' => $customerSubmission,
            'submissionId' => $customerSubmission->id,
        ]);
    }

    public function saveVerificationStep(Request $request, $step)
    {
        $step     = (int) $step;
        $maxSteps = $this->maxSteps;

        if ($step < 1 || $step > $maxSteps) {
            return response()->json(['success' => false, 'message' => 'Invalid step.'], 400);
        }

        $submissionId = session('customer_submission_id');
        if (! $submissionId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $customerSubmission = CustomerSubmission::find($submissionId);
        if (! $customerSubmission) {
            session()->forget('customer_submission_id');
            return response()->json(['success' => false, 'message' => 'Submission not found.'], 404);
        }

        if ($step >= $this->maxSteps) {
            // redirect user to completion page
            session()->forget('customer_submission_id');
            $redirectUrl = session('redirect_url') ?? env('DEFAULT_REDIRECT_URL', 'https://app.yativo.com');

            return response()->json([
                'success'       => true,
                'message'       => "KYC process completed successfully.",
                'next_step'     => null,
                'is_complete'   => true,
                'redirect_url'  => $redirectUrl,
                'customer_data' => $customerSubmission->fresh(),
            ]);
        }

        try {
            // 🔑 Normalize all dot-notated fields before validation
            $request = $this->normalizeRequest($request);
            // Validate the request data for the current step
            $validatedData = $this->validateStepData($request, $step);
            $stepData      = $this->mapStepDataToModel($validatedData, $step);

            Log::debug("Step $step Data Mapped to Model", ['data' => $stepData]);

            // Handle file uploads
            $this->handleFileUploads($request, $customerSubmission);

            // Update model
            $customerSubmission->update($stepData);

            $nextStep   = ($step < $maxSteps) ? $step + 1 : null;
            $isComplete = ($step === $maxSteps);

            return response()->json([
                'success'       => true,
                'message'       => "Step $step saved.",
                'next_step'     => $nextStep,
                'is_complete'   => $isComplete,
                'customer_data' => $customerSubmission->fresh(),
            ]);
        } catch (\Exception $e) {
            Log::error('Customer Step Save Failed', [
                'message'       => $e->getMessage(),
                'step'          => $step,
                'submission_id' => $submissionId,
                'trace'         => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred.',
                'debug'   => $e->getMessage(),
            ], 500);
        }
    }

    private function normalizeRequest(Request $request): Request
    {
        $data       = $request->all();
        $normalized = [];

        foreach ($data as $key => $value) {
            // Case 1: Dot notation (e.g., residential_address.city)
            if (str_contains($key, '.')) {
                \Illuminate\Support\Arr::set($normalized, $key, $value);
                unset($data[$key]);
            }

            // Case 2: Underscore style (e.g., residential_address_city)
            elseif (str_contains($key, 'residential_address_')) {
                $subKey                                     = str_replace('residential_address_', '', $key);
                $normalized['residential_address'][$subKey] = $value;
                unset($data[$key]);
            }

            // Case 3: Handle endorsements_0, endorsements_1 etc.
            elseif (preg_match('/^endorsements_(\d+)$/', $key, $matches)) {
                $index                              = (int) $matches[1];
                $normalized['endorsements'][$index] = $value;
                unset($data[$key]);
            }

            // Case 4: Underscore style for identifying_information (e.g. identifying_information_0_number)
            elseif (preg_match('/^identifying_information_(\d+)_(.+)$/', $key, $matches)) {
                $index                                                 = (int) $matches[1];
                $field                                                 = $matches[2];
                $normalized['identifying_information'][$index][$field] = $value;
                unset($data[$key]);
            }
        }

        // Merge normalized arrays back with remaining data
        $data = array_merge($data, $normalized);

        $request->replace($data);
        Log::info('Normalized Request Data', [
            'original'   => $data,
            'normalized' => $request->all(),
        ]);

        return $request;
    }

    private function validateStepData(Request $request, int $step)
    {
        $rules = [];
        switch ($step) {
            case 1:
                $rules = [
                    'first_name'       => 'required|string|min:1|max:1024',
                    'middle_name'      => 'required|string|max:1024',
                    'last_name'        => 'required|string|min:1|max:1024',
                    'last_name_native' => 'sometimes|string|max:1024',
                    'email'            => 'required|email|max:1024',
                    'phone'            => 'required|string|regex:/^\+\d{1,15}$/',
                    'birth_date'       => 'required|date|before:today',
                    'nationality'      => 'required|string|size:3',
                ];
                break;
            case 2:
                $rules = [
                    'residential_address.street_line_1'         => 'required|string|max:256',
                    'residential_address.street_line_2'         => 'nullable|string|max:256',
                    'residential_address.city'                  => 'required|string|max:256',
                    'residential_address.state'                 => 'required|string|max:256',
                    'residential_address.postal_code'           => 'required|string|max:256',
                    'residential_address.country'               => 'required|string|max:256',
                    'residential_address.proof_of_address_file' => 'required|file|mimes:pdf,jpg,jpeg,png,heic,tif|max:10240',
                ];
                break;
            case 3:
                $rules = [
                    'identifying_information'                    => 'array|required',
                    'identifying_information.*.type'             => 'required_with:identifying_information|string',
                    'identifying_information.*.issuing_country'  => 'required_with:identifying_information|string|size:3',
                    'identifying_information.*.number'           => 'required|string',
                    'identifying_information.*.expiration_date'  => 'required|date|after:today',
                    'identifying_information.*.image_front_file' => 'required_with:identifying_information|file|mimes:pdf,jpg,jpeg,png|max:10240',
                    'identifying_information.*.image_back_file'  => 'sometimes:identifying_information|file|mimes:pdf,jpg,jpeg,png|max:10240',
                ];
                break;
            case 4:
                $request->merge(['acting_as_intermediary' => (bool) $request->input('acting_as_intermediary')]);
                $rules = [
                    'employment_status'             => ['required', Rule::in(config('bridge_data.employment_status'))],
                    'most_recent_occupation_code'   => 'required|string',
                    'expected_monthly_payments_usd' => ['required', Rule::in(config('bridge_data.expected_monthly_payments_usd'))],
                    'source_of_funds'               => ['required', Rule::in(config('bridge_data.source_of_funds'))],
                    'account_purpose'               => ['required', Rule::in(config('bridge_data.account_purposes'))],
                    'account_purpose_other'         => 'required_if:account_purpose,other',
                    'acting_as_intermediary'        => 'sometimes|boolean',
                ];
                break;
            case 5:
                Log::info('Validating step 5 data', ['request_keys' => array_keys($request->all())]);
                $rules = [
                    'uploaded_documents'        => 'array|required',
                    'uploaded_documents.*.type' => 'required_with:uploaded_documents|string',
                    'uploaded_documents.*.file' => 'required_with:uploaded_documents|file|mimes:pdf,jpg,jpeg,png|max:10240',
                ];
                break;
        }

        return $request->validate($rules);
    }

    private function mapStepDataToModel(array $validatedData, int $step)
    {
        $modelData      = [];
        $transliterated = app(\App\Services\TransliterationService::class);

        switch ($step) {
            case 1:
                $modelData                 = Arr::only($validatedData, ['first_name', 'middle_name', 'last_name', 'last_name_native', 'email', 'phone', 'birth_date', 'nationality']);
                $modelData['endorsements'] = ['spei', 'base', 'sepa'];

                foreach (['first_name', 'middle_name', 'last_name'] as $field) {
                    $val                                  = $validatedData[$field] ?? null;
                    $modelData["transliterated_{$field}"] = $val ? $transliterated->needsTransliteration($val)['transliterated'] ?? null : null;
                }
                break;

            case 2:
                if (isset($validatedData['residential_address'])) {
                    $addr                             = Arr::except($validatedData['residential_address'], ['proof_of_address_file']);
                    $modelData['residential_address'] = array_filter($addr, fn($v) => ! empty($v));

                    $fileUrl = $this->uploadFileIfExists('residential_address.proof_of_address_file',
                        'customer_documents/' . request()->signed_agreement_id);

                    $modelData['residential_address']['proof_of_address_file'] = $fileUrl;

                    if (empty($modelData['residential_address'])) {
                        $modelData['residential_address'] = null;
                    }
                }

                break;

            case 3:
                // if (! empty($validatedData['identifying_information'])) {
                //     $modelData['identifying_information'] = collect($validatedData['identifying_information'])->map(function ($doc) {
                //         return array_filter($doc, fn($v) => ! is_file($v) && $v !== null && $v !== '');
                //     })->toArray();
                // }
                if (! empty($validatedData['identifying_information'])) {
                    $modelData['identifying_information'] = collect($validatedData['identifying_information'])->map(function ($doc, $index) {
                        $cleaned = array_filter($doc, fn($v) => ! is_file($v) && $v !== null && $v !== '');

                        // Attach file URLs
                        foreach (['image_front_file', 'image_back_file'] as $fileField) {
                            $fileUrl = $this->uploadFileIfExists("identifying_information.$index.$fileField",
                                'customer_documents/' . request()->signed_agreement_id);
                            $cleaned[$fileField] = $fileUrl;
                        }

                        return $cleaned;
                    })->toArray();
                }

                break;

            case 4:
                $modelData = Arr::only($validatedData, [
                    'employment_status',
                    'most_recent_occupation_code',
                    'expected_monthly_payments_usd',
                    'source_of_funds',
                    'account_purpose',
                    'account_purpose_other',
                    'acting_as_intermediary',
                ]);
                break;
            case 5:
                if (isset($validatedData['uploaded_documents'])) {
                    $modelData['uploaded_documents'] = collect($validatedData['uploaded_documents'])->map(function ($doc, $index) {
                        $cleaned = Arr::only($doc, ['type']); // keep metadata like type

                        $fileUrl = $this->uploadFileIfExists("uploaded_documents.$index.file",
                            'customer_documents/' . request()->signed_agreement_id);

                        $cleaned['file'] = $fileUrl;

                        return $cleaned;
                    })->toArray();
                } else {
                    Log::info('No uploaded_documents found in validated data for step 5', ['validatedData' => $validatedData]);
                }

                if (! empty($validatedData['uploaded_documents'])) {
                    $modelData['documents'] = collect($validatedData['uploaded_documents'])->map(function ($doc, $index) {
                        $cleaned = Arr::only($doc, ['type']); // keep metadata like type

                        $fileUrl = $this->uploadFileIfExists("uploaded_documents.$index.file",
                            'customer_documents/' . request()->signed_agreement_id);

                        $cleaned['file'] = $fileUrl;

                        return $cleaned;
                    })->toArray();
                }
                break;

                break;
            default:
                Log::warning('Unknown step in customer verification', ['step' => $step, 'submission_id' => session('customer_submission_id')]);
                return response()->json(['success' => false, 'message' => 'Unknown step.'], 400);

        }

        return $modelData;
    }

    private function handleFileUploads(Request $request, CustomerSubmission $submission)
    {
        $this->uploadProofOfAddress($request, $submission);
        $this->uploadIdDocuments($request, $submission);
        $this->uploadAdditionalDocuments($request, $submission);
    }

    private function uploadProofOfAddress(Request $request, CustomerSubmission $submission)
    {
        if ($file = $request->file('residential_address.proof_of_address_file')) {
            $path = $file->store('customer_documents/' . $submission->id, 'public');
            $url  = Storage::url($path);

            $addr                            = $submission->residential_address ?? [];
            $addr['proof_of_address_url']    = $url;
            $submission->residential_address = $addr;
            $submission->save();

            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => 'proof_of_address',
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        }
    }

    private function uploadIdDocuments(Request $request, CustomerSubmission $submission)
    {
        foreach ($request->file('identifying_information', []) as $idx => $docFiles) {
            foreach (['image_front_file', 'image_back_file'] as $sideKey) {
                if (isset($docFiles[$sideKey]) && $file = $docFiles[$sideKey]) {
                    $path = $file->store("customer_documents/{$submission->id}/ids", 'public');
                    $url  = Storage::url($path);

                    $info                                      = $submission->identifying_information[$idx] ?? [];
                    $info[str_replace('_file', '', $sideKey)]  = $url;
                    $submission->identifying_information[$idx] = $info;
                    $submission->save();

                    CustomerDocument::create([
                        'customer_submission_id' => $submission->id,
                        'document_type'          => 'identification',
                        'side'                   => str_replace('image_', '', $sideKey),
                        'reference_field'        => "identifying_information.{$idx}.{$sideKey}",
                        'file_path'              => $path,
                        'file_name'              => $file->getClientOriginalName(),
                        'mime_type'              => $file->getMimeType(),
                        'file_size'              => $file->getSize(),
                        'issuing_country'        => $info['issuing_country'] ?? null,
                    ]);
                }
            }
        }
    }

    private function uploadAdditionalDocuments(Request $request, CustomerSubmission $submission)
    {
        $documents = $submission->documents ?? [];

        foreach ($request->file('uploaded_documents', []) as $idx => $doc) {
            if (! isset($doc['file'])) {
                continue;
            }

            $file = $doc['file']; // this is the actual UploadedFile
            $type = $request->input("uploaded_documents.{$idx}.type");

            $path = $file->store("customer_documents/{$submission->id}/additional", 'public');
            $url  = Storage::url($path);

            // Save in documents column
            $documents[] = [
                'type' => $type ?: 'other',
                'file' => $url,
            ];

            // Save in CustomerDocument table
            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => $type ?: 'other',
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        }

        // 🔑 Update the main submission's documents JSON column
        $submission->documents = $documents;
        $submission->save();
    }


    private function uploadFileIfExists(string $key, string $folder): ?string
    {
        $file = null;

        // Dot notation style
        if (request()->hasFile($key)) {
            $file = request()->file($key);
        }
        // Underscore style (convert dot → underscore)
        elseif (request()->hasFile(str_replace('.', '_', $key))) {
            $file = request()->file(str_replace('.', '_', $key));
        }

        if ($file) {
            $path = $file->store($folder, 'public');
            return asset(Storage::url($path));
        }

        return null;
    }

    /**
     * Convert dot-notation keys into nested arrays.
     * Example: ['residential_address.city' => 'NYC'] → ['residential_address' => ['city' => 'NYC']]
     */
    private function dotToNestedArray(array $data): array
    {
        $result = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                // Recursively handle array values (e.g., uploaded_documents)
                $value = $this->dotToNestedArray($value);
            }

            // Skip file objects — don't convert them
            if ($value instanceof \Illuminate\Http\UploadedFile  || $value === null) {
                data_set($result, $key, $value);
                continue;
            }

            data_set($result, $key, $value);
        }

        return $result;
    }

    // API Endpoints
    public function getOccupations()
    {
        return response()->json(config('bridge_data.occupations'));
    }
    public function getAccountPurposes()
    {
        return response()->json(config('bridge_data.account_purposes'));
    }
    public function getSourceOfFunds()
    {
        return response()->json(config('bridge_data.source_of_funds'));
    }
    public function getCountries()
    {
        return response()->json(config('bridge_data.countries'));
    }
    public function getSubdivisions($countryCode)
    { /* ... */
    }
    public function getIdentificationTypesByCountry($countryCode)
    { /* ... */
    }
}
