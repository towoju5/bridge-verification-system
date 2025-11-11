<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Jobs\ThirdPartyKycSubmission;
use App\Models\BusinessCustomer;
use App\Models\Customer;
use App\Models\CustomerDocument;
use App\Models\CustomerSubmission;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CustomerController extends Controller
{
    private const MAX_STEPS = 6;

    protected string $bridgeApiKey;
    protected string $bridgeApiUrl;
    protected int $maxSteps;

    public function __construct()
    {
        // 🚫 DO NOT run schema changes in controller constructor in production.
        // ✅ Instead, create a migration:

        $this->bridgeApiKey = env('BRIDGE_API_KEY');
        $this->bridgeApiUrl = env('BRIDGE_API_URL');
        // var_dump('Bridge API Key:', env('BRIDGE_API_KEY')); exit;
        $this->maxSteps = self::MAX_STEPS;

        if (! Schema::hasColumn('customer_submissions', 'uploaded_documents')) {
            Schema::table('customer_submissions', function ($table) {
                $table->json('uploaded_documents')->nullable()->after('documents');
            });
        }
    }

    public function debugShowAccountTypeSelection()
    {
        return Inertia::render('Customer/AccountTypeSelection');
    }

    public function showAccountTypeSelection($accountType = null, $customerId = null)
    {
        try {
            $submissionId = session('customer_submission_id', $customerId);

            $customer = Customer::whereCustomerId($customerId);

            if (! $customer->exists()) {
                abort(404, "Customer with provided ID {$customerId} not found.");
            }

            if (! $submissionId) {
                $returnUrl = $this->sanitizeRedirectUrl(request()->input('return_url'));
                return redirect()->away($returnUrl);
            }

            $returnUrl = $this->sanitizeRedirectUrl(request()->input('return_url'));
            session(['return_url' => $returnUrl]);
            session(['customer_id' => $customerId]);

            $customer_type = $accountType ?? request()->input('customer_type');
            $customer_id   = $customerId ?? request()->input('customer_id');

            if ($customer_type == 'individual') {
                $url = $this->startIndividualVerification(request()->merge(['customer_id' => $customer_id]));
                // if a valid url was returned then redirect customer to the URI
                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return redirect()->to($url);
                }
            }

            if ($customer_type == 'business') {
                $url = $this->startBusinessVerification(request()->merge(['customer_id' => $customer_id]));
                // if a valid url was returned then redirect customer to the URI

                session([
                    'type'                   => 'business',
                    'signed_agreement_id'    => $customer_id,
                    'user_agent'             => request()->userAgent(),
                    'ip_address'             => request()->ip(),
                    'customer_id'            => $customerId,
                    'customer_submission_id' => $customerId,
                    'business_customer_session_id' => $customerId,
                ]);

                BusinessCustomer::firstOrCreate([
                    'session_id' => $customer_id,
                    'customer_id' => $customer_id
                ]);

                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return redirect()->to($url);
                }
            }

            // Removed: var_dump($customer_type);

            abort(400, "Invalid customer type. {$customer_type} provided.");
        } catch (\Throwable $th) {
            return view('errors', [
                'message' => "Error Encountered, Please contact support",
                'code'    => $th->getCode(),
            ]);
        }
    }

    public function startBusinessVerification(Request $request)
    {
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid();
        $customerId        = $request->customer_id;
        $customer          = Customer::whereCustomerId($customerId);

        if (! $customer->exists()) {
            abort(404, "Customer with provided ID {$customerId} not found.");
        }

        // var_dump('Starting business verification...');
        $url = route('business.verify.start', ['step' => 1, 'customer_id' => $customerId]);
        return $url;
    }

    public function startIndividualVerification(Request $request)
    {
        $signedAgreementId  = $request->signed_agreement_id ?? Str::uuid();
        $customerSubmission = CustomerSubmission::create([
            'type'                => 'individual',
            'signed_agreement_id' => $signedAgreementId,
            'customer_id'         => $request->customer_id,
            'user_agent'          => $request->userAgent(),
            'ip_address'          => $request->ip(),
        ]);
        session(['customer_submission_id' => $customerSubmission->id]);
        $url = route('customer.verify.step', ['step' => 1]);
        return $url;
    }

    public function showVerificationStep(Request $request, $step = 1)
    {
        $step = (int) $step;
        if ($step < 1 || $step > self::MAX_STEPS) {
            return redirect()->route('customer.verify.step', ['step' => 1]);
        }

        $submissionId = session('customer_submission_id');

        if (! $submissionId) {
            return redirect()->route('account.type')->with('error', 'Session expired');
        }

        if (! null == session('customer_id')) {
            $customerSubmission = CustomerSubmission::whereCustomerId(session('customer_id'))->first();
        } else {
            $customerSubmission = CustomerSubmission::find($submissionId);
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
            'maxSteps'     => self::MAX_STEPS,
            'customerData' => $customerSubmission,
            'submissionId' => $customerSubmission->id,
        ]);
    }

    public function saveVerificationStep(Request $request, $step)
    {
        $step = (int) $step;
        if ($step < 1 || $step > $this->maxSteps) {
            return response()->json(['success' => false, 'message' => 'Invalid step.'], 400);
        }

        $submissionId = session('customer_submission_id');
        if (! $submissionId) {
            return response()->json([
                'success' => false,
                'message' => 'Session expired.',
                'debug'   => 'Session expired.',
            ], 400);
        }

        $customerSubmission = CustomerSubmission::find($submissionId);
        if (! $customerSubmission) {
            session()->forget('customer_submission_id');
            return response()->json(['success' => false, 'message' => 'Submission not found.'], 404);
        }

        if ($step >= $this->maxSteps) {
            if ($request->has('submit_bridge_kyc')) {
                $customerSubmission->update(['submit_bridge_kyc' => (bool) $request->submit_bridge_kyc]);
            }
            if ($step === $this->maxSteps) {
                $customerSubmission->status       = 'submitted';
                $customerSubmission->submitted_at = now();
                $customerSubmission->save();
                // initiate the third-party KYC job process
                dispatch(new ThirdPartyKycSubmission($customerSubmission->toArray()));
            }
            session()->forget('customer_submission_id');
            $redirectUrl = session('return_url') ?? env('DEFAULT_REDIRECT_URL', 'https://app.yativo.com');
            $redirectUrl = $this->sanitizeRedirectUrl($redirectUrl);
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
            $request       = $this->normalizeRequest($request);
            $validatedData = $this->validateStepData($request, $step);
            $stepData      = $this->mapStepDataToModel($validatedData, $step);
            Log::debug("Step $step Data Mapped to Model", ['data' => $stepData]);

            $this->handleFileUploads($request, $customerSubmission);
            $customerSubmission->update($stepData);

            $nextStep   = ($step < $this->maxSteps) ? $step + 1 : null;
            $isComplete = ($step === $this->maxSteps);

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
            if (str_contains($key, '.')) {
                Arr::set($normalized, $key, $value);
                unset($data[$key]);
            } elseif (str_contains($key, 'residential_address_')) {
                $subKey                                     = str_replace('residential_address_', '', $key);
                $normalized['residential_address'][$subKey] = $value;
                unset($data[$key]);
            } elseif (preg_match('/^endorsements_(\d+)$/', $key, $matches)) {
                $index                              = (int) $matches[1];
                $normalized['endorsements'][$index] = $value;
                unset($data[$key]);
            } elseif (preg_match('/^identifying_information_(\d+)_(.+)$/', $key, $matches)) {
                $index                                                 = (int) $matches[1];
                $field                                                 = $matches[2];
                $normalized['identifying_information'][$index][$field] = $value;
                unset($data[$key]);
            }
        }

        $data = array_merge($data, $normalized);
        $request->replace($data);
        Log::info('Normalized Request Data', [
            'original'   => $data,
            'normalized' => $request->all(),
        ]);
        return $request;
    }

    private function validateStepData(Request $request, int $step): array
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
                    'nationality'      => 'required|string|size:2',
                    'gender'           => 'required|in:Male,Female,male,female',
                    'taxId'            => 'required|string|max:100',
                ];
                break;

            case 2:
                $rules = [
                    'residential_address.street_line_1'         => 'required|string|max:256',
                    'residential_address.street_line_2'         => 'nullable|string|max:256',
                    'residential_address.city'                  => 'required|string|max:256',
                    'residential_address.state'                 => 'required|string|max:256',
                    'residential_address.postal_code'           => 'required|string|max:256',
                    'residential_address.country'               => 'required|string|size:2',
                    'residential_address.proof_of_address_file' => 'required|file|mimes:pdf,jpg,jpeg,png,heic,tif|max:5120',
                ];
                break;

            case 3:
                $rules = [
                    'identifying_information'                    => 'array|required|min:2',
                    'identifying_information.*.type'             => 'required_with:identifying_information|string',
                    'identifying_information.*.issuing_country'  => 'required_with:identifying_information|string|size:2',
                    'identifying_information.*.number'           => 'required|string',
                    'identifying_information.*.date_issued'      => 'required|date|before:today',
                    'identifying_information.*.expiration_date'  => 'required|date|after:today',
                    'identifying_information.*.image_front_file' => 'required_with:identifying_information|file|mimes:pdf,jpg,jpeg,png|max:5120',
                    'identifying_information.*.image_back_file'  => 'sometimes|file|mimes:pdf,jpg,jpeg,png|max:5120',
                ];
                break;

            case 4:
                $request->merge([
                    'acting_as_intermediary' => (bool) $request->input('acting_as_intermediary'),
                ]);

                $rules = [
                    'employment_status'             => ['required'],
                    'most_recent_occupation_code'   => 'required|string',
                    'expected_monthly_payments_usd' => ['required', Rule::in(array_keys(config('bridge_data.expected_monthly_payments_usd')))],
                    'source_of_funds'               => ['required', Rule::in(array_keys(config('bridge_data.source_of_funds')))],
                    'account_purpose'               => ['required'],
                    'account_purpose_other'         => 'required_if:account_purpose,other',
                    'acting_as_intermediary'        => 'sometimes|boolean',
                ];
                break;

            case 5:
                Log::info('Validating step 5 data', ['request_keys' => array_keys($request->all())]);

                $rules = [
                    'uploaded_documents'        => 'required|array|min:1',
                    'uploaded_documents.*.type' => ['required', 'string'],
                    'uploaded_documents.*.file' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
                ];

                $requiredTypes = ['proof_of_funds'];

                $validator = Validator::make($request->all(), $rules);

                $validator->after(function ($validator) use ($request, $requiredTypes) {
                    $uploadedTypes = collect($request->uploaded_documents ?? [])
                        ->pluck('type')
                        ->map(fn($t) => strtolower(trim($t)));

                    foreach ($requiredTypes as $type) {
                        if (! $uploadedTypes->contains(strtolower($type))) {
                            $validator->errors()->add(
                                'uploaded_documents',
                                "The document of type '{$type}' is required."
                            );
                        }
                    }
                });

                $validator->validate();

                return $validator->validated();

            default:
                abort(400, 'Invalid step provided.');
        }

        return $request->validate($rules);
    }

    private function mapStepDataToModel(array $validatedData, int $step): array
    {
        $modelData      = [];
        $transliterated = app(\App\Services\TransliterationService::class);

        switch ($step) {
            case 1:
                $modelData = Arr::only($validatedData, [
                    'first_name',
                    'middle_name',
                    'last_name',
                    'last_name_native',
                    'email',
                    'phone',
                    'birth_date',
                    'nationality',
                    'taxId',
                    'second_last_name',
                    'gender',
                ]);
                $modelData['endorsements'] = ['spei', 'base', 'sepa'];
                foreach (['first_name', 'middle_name', 'last_name'] as $field) {
                    $val                                  = $validatedData[$field] ?? null;
                    $modelData["transliterated_{$field}"] = $val
                        ? ($transliterated->needsTransliteration($val)['transliterated'] ?? null)
                        : null;
                }
                break;

            case 2:
                if (isset($validatedData['residential_address'])) {
                    $addr                             = Arr::except($validatedData['residential_address'], ['proof_of_address_file']);
                    $modelData['residential_address'] = array_filter($addr, fn($v) => ! empty($v));

                    $fileUrl = $this->uploadFileIfExists(
                        'residential_address.proof_of_address_file',
                        'customer_documents/' . request()->signed_agreement_id
                    );

                    $modelData['residential_address']['proof_of_address_file'] = $fileUrl;

                    if (empty($modelData['residential_address'])) {
                        $modelData['residential_address'] = null;
                    }
                }
                break;

            case 3:
                if (! empty($validatedData['identifying_information'])) {
                    $modelData['identifying_information'] = collect($validatedData['identifying_information'])->map(function ($doc, $index) {
                        // $cleaned = array_filter($doc, fn($v) => ! is_file($v) && $v !== null && $v !== '');
                        $cleaned = array_filter($doc, fn($v) => ! empty($v));
                        // Attach file URLs
                        foreach (['image_front_file', 'image_back_file'] as $fileField) {
                            $fileUrl = $this->uploadFileIfExists(
                                "identifying_information.$index.$fileField",
                                'customer_documents/' . request()->signed_agreement_id
                            );
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

                        $fileUrl = $this->uploadFileIfExists(
                            "uploaded_documents.$index.file",
                            'customer_documents/' . request()->signed_agreement_id
                        );

                        $cleaned['file'] = $fileUrl;

                        return $cleaned;
                    })->toArray();
                } else {
                    Log::info('No uploaded_documents found in validated data for step 5', ['validatedData' => $validatedData]);
                }

                if (! empty($validatedData['uploaded_documents'])) {
                    $modelData['documents'] = collect($validatedData['uploaded_documents'])->map(function ($doc, $index) {
                        $cleaned = Arr::only($doc, ['type']); // keep metadata like type

                        $fileUrl = $this->uploadFileIfExists(
                            "uploaded_documents.$index.file",
                            'customer_documents/' . request()->signed_agreement_id
                        );

                        $cleaned['file'] = $fileUrl;

                        return $cleaned;
                    })->toArray();
                }
                break;

                break;
            default:
                Log::warning('Unknown step in customer verification', ['step' => $step, 'submission_id' => session('customer_submission_id')]);
                // return response()->json(['success' => false, 'message' => 'Unknown step.'], 400);

                break;
        }

        return $modelData;
    }

    private function handleFileUploads(Request $request, CustomerSubmission $submission): void
    {
        $this->uploadProofOfAddress($request, $submission);
        $this->uploadIdDocuments($request, $submission);
        $this->uploadAdditionalDocuments($request, $submission);
    }

    private function uploadProofOfAddress(Request $request, CustomerSubmission $submission): void
    {
        if ($file = $request->file('residential_address.proof_of_address_file')) {
            $path = $file->store("customer_documents/{$submission->id}", 'public');
            $url  = Storage::url($path);

            $addr                            = $submission->residential_address ?? [];
            $addr['proof_of_address_url']    = $url; // ✅ Standardized key
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

    private function uploadIdDocuments(Request $request, CustomerSubmission $submission): void
    {
        foreach ($request->file('identifying_information', []) as $idx => $docFiles) {
            foreach (['image_front_file', 'image_back_file'] as $sideKey) {
                if (isset($docFiles[$sideKey]) && $file = $docFiles[$sideKey]) {
                    $path = $file->store("customer_documents/{$submission->id}/ids", 'public');
                    $url  = Storage::url($path);

                    $data                                     = $submission->identifying_information ?? [];
                    $info                                     = $data[$idx] ?? [];
                    $info[str_replace('_file', '', $sideKey)] = $url;
                    $data[$idx]                               = $info;

                    $submission->identifying_information = $data;
                    $submission->save();

                    CustomerDocument::create([
                        'customer_submission_id' => $submission->id,
                        'document_type'          => 'identification',
                        'side'                   => str_replace('image_', '', $sideKey),
                        'reference_field'        => "identifying_information.{$idx}.{$sideKey}",
                        'file_path'       => $path,
                        'file_name'       => $file->getClientOriginalName(),
                        'mime_type'       => $file->getMimeType(),
                        'file_size'       => $file->getSize(),
                        'issuing_country' => $info['issuing_country'] ?? null,
                    ]);
                }
            }
        }
    }

    private function uploadAdditionalDocuments(Request $request, CustomerSubmission $submission): void
    {
        $documents = $submission->documents ?? [];
        foreach ($request->file('uploaded_documents', []) as $idx => $doc) {
            if (! isset($doc['file'])) {
                continue;
            }

            $file = $doc['file'];
            $type = $request->input("uploaded_documents.{$idx}.type") ?: 'Other';

            $path = $file->store("customer_documents/{$submission->id}/additional", 'public');
            $url  = Storage::url($path);

            $documents[] = [
                'type' => $type,
                'file' => $url,
            ];

            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => $type,
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        }

        $submission->documents = $documents;
        $submission->save();
    }

    // 🔻 Kept for backward compatibility but no longer used — safe to remove later
    private function uploadFileIfExists(string $key, string $folder): ?string
    {
        $file = null;
        if (request()->hasFile($key)) {
            $file = request()->file($key);
        } elseif (request()->hasFile(str_replace('.', '_', $key))) {
            $file = request()->file(str_replace('.', '_', $key));
        }
        if ($file) {
            $path = $file->store($folder, 'public');
            return asset(Storage::url($path));
        }
        return null;
    }

    private function dotToNestedArray(array $data): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $value = $this->dotToNestedArray($value);
            }
            if ($value instanceof \Illuminate\Http\UploadedFile  || $value === null) {
                data_set($result, $key, $value);
                continue;
            }
            data_set($result, $key, $value);
        }
        return $result;
    }

    public function fetchCustomerKycData(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'customer_id'   => 'required|string',
                'customer_type' => 'required|in:business,individual',
            ]);
            if ($validator->fails()) {
                return response()->json(['error' => $validator->errors()->toArray()]);
            }

            $submissionId = session('customer_submission_id');
            $kyc_data     = CustomerSubmission::findOrFail($submissionId);

            return response()->json(['data' => $kyc_data], 200);
        } catch (\Throwable $th) {
            return response()->json(['error' => $th->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

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

    public function fetchUserData(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'customer_id'   => 'required',
                'customer_type' => 'required|in:individual,business',
            ]);
            if ($validator->fails()) {
                return response()->json($validator->errors()->toArray(), 422);
            }

            $validated = $validator->validated();

            switch ($request->customer_type) {
                case 'individual':
                    $customer = CustomerSubmission::query()
                        ->whereCustomerId($validated['customer_id'])
                        ->where('type', 'individual')
                        ->latest()->first()?->toArray();
                    break;
                case 'business':
                    $customer = BusinessCustomer::query()
                        ->whereCustomerId($validated['customer_id'])
                        ->where('type', 'business')
                        ->first()?->toArray();
                    break;
                default:
                    $customer = ['error' => 'Unknown customer type provided'];
                    break;
            }

            return response()->json($customer ?: ['error' => 'Record not found'], 200);
        } catch (\Throwable $th) {
            return response()->json(['error' => $th->getMessage() ?: "Server Error"], 400);
        }
    }

    public function getSubdivisions($countryCode)
    {
        // Left as placeholder — implement as needed
    }

    public function getIdentificationTypesByCountry($countryCode)
    {
        // Left as placeholder — implement as needed
    }

    public function submitIndividualKycAll(Request $request)
    {
        $isJson = $request->isJson();

        $rules = [
            'customer_id'                                => 'required|string',
            'first_name'                                 => 'required|string|min:1|max:1024',
            'middle_name'                                => 'required|string|max:1024',
            'last_name'                                  => 'required|string|min:1|max:1024',
            'last_name_native'                           => 'nullable|string|max:1024',
            'email'                                      => 'required|email|max:1024',
            'gender'                                     => 'required|in:Male,Female,male,female',
            'taxId'                                      => 'required|string|max:100',
            'phone'                                      => 'required|string|regex:/^\+\d{1,15}$/',
            'birth_date'                                 => 'required|date|before:today',
            'nationality'                                => 'required|string|size:2',
            'residential_address.street_line_1'          => 'required|string|max:256',
            'residential_address.street_line_2'          => 'nullable|string|max:256',
            'residential_address.city'                   => 'required|string|max:256',
            'residential_address.state'                  => 'required|string|max:256',
            'residential_address.postal_code'            => 'required|string|max:256',
            'residential_address.country'                => 'required|string|size:2',
            'residential_address.proof_of_address_file'  => $isJson ? 'nullable' : 'required|file|mimes:pdf,jpg,jpeg,png,heic,tif|max:5120',
            'identifying_information'                    => 'required|array',
            'identifying_information.*.type'             => 'required|string',
            'identifying_information.*.issuing_country'  => 'required|string|size:2',
            'identifying_information.*.number'           => 'required|string',
            'identifying_information.*.date_issued'      => 'required|date|before:today',
            'identifying_information.*.expiration_date'  => 'required|date|after:today',
            'identifying_information.*.image_front_file' => $isJson ? 'nullable' : 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'identifying_information.*.image_back_file'  => $isJson ? 'nullable' : 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
            'employment_status'                          => 'required',
            'most_recent_occupation_code'                => 'required|string',
            'expected_monthly_payments_usd'              => ['required', Rule::in(config('bridge_data.expected_monthly_payments_usd'))],
            'source_of_funds'                            => ['required', Rule::in(config('bridge_data.source_of_funds'))],
            'account_purpose'                            => 'required',
            'account_purpose_other'                      => 'required_if:account_purpose,other',
            'acting_as_intermediary'                     => 'nullable|boolean',
            'uploaded_documents'                         => 'required|array',
            'uploaded_documents.*.type'                  => 'required|string',
            'uploaded_documents.*.file'                  => $isJson ? 'nullable' : 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ];

        $validated  = $request->validate($rules);
        $customerId = $validated['customer_id'];

        $submission = CustomerSubmission::firstOrNew([
            'signed_agreement_id' => $customerId,
        ]);

        if (! $submission->exists) {
            $submission->type       = 'individual';
            $submission->user_agent = $request->userAgent();
            $submission->ip_address = $request->ip();
        }

        // Step 1
        $submission->fill(Arr::only($validated, [
            'first_name',
            'middle_name',
            'last_name',
            'last_name_native',
            'email',
            'phone',
            'birth_date',
            'nationality',
        ]));
        $submission->endorsements = ['spei', 'base', 'sepa', 'asian'];

        $transliterated = app(\App\Services\TransliterationService::class);
        foreach (['first_name', 'middle_name', 'last_name'] as $field) {
            $val                                     = $validated[$field];
            $submission->{"transliterated_{$field}"} = $val
                ? ($transliterated->needsTransliteration($val)['transliterated'] ?? null)
                : null;
        }

        $saveBase64File = function ($base64String, $folder, $defaultExtension = 'pdf') {
            if (empty($base64String)) {
                return null;
            }

            if (str_starts_with($base64String, 'data:')) {
                if (! preg_match('/^data:(.*?);base64,(.*)$/', $base64String, $matches)) {
                    throw new \InvalidArgumentException('Invalid Base64 data URI');
                }
                $mime      = $matches[1];
                $data      = $matches[2];
                $extension = match (true) {
                    str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => 'jpg',
                    str_contains($mime, 'png')                                => 'png',
                    str_contains($mime, 'pdf')                                => 'pdf',
                    str_contains($mime, 'heic')                               => 'heic',
                    str_contains($mime, 'tiff') || str_contains($mime, 'tif') => 'tif',
                    default                                                   => $defaultExtension,
                };
            } else {
                $data      = $base64String;
                $extension = $defaultExtension;
            }
            $binary = base64_decode($data, true);
            if ($binary === false) {
                throw new \InvalidArgumentException('Invalid Base64 string');
            }
            $filename = Str::random(20) . '.' . $extension;
            $path     = "$folder/$filename";
            Storage::disk('public')->put($path, $binary);
            return Storage::url($path);
        };

        // Step 2
        $residential = Arr::except($validated['residential_address'], [
            'proof_of_address_file',
            'proof_of_address_file_base64',
        ]);

        $proofFileUrl = null;
        if ($request->hasFile('residential_address.proof_of_address_file')) {
            $file         = $request->file('residential_address.proof_of_address_file');
            $path         = $file->store("customer_documents/{$customerId}", 'public');
            $proofFileUrl = Storage::url($path);
            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => 'proof_of_address',
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        } elseif (! empty($validated['residential_address']['proof_of_address_file_base64'])) {
            try {
                $proofFileUrl = $saveBase64File(
                    $validated['residential_address']['proof_of_address_file_base64'],
                    "customer_documents/{$customerId}",
                    'pdf'
                );
                if ($proofFileUrl) {
                    $filename = basename(parse_url($proofFileUrl, PHP_URL_PATH));
                    CustomerDocument::create([
                        'customer_submission_id' => $submission->id,
                        'document_type'          => 'proof_of_address',
                        'file_path'              => "customer_documents/{$customerId}/$filename",
                        'file_name' => $filename,
                        'mime_type' => 'application/pdf',
                        'file_size' => null,
                    ]);
                }
            } catch (\Exception $e) {
                return response()->json(['error' => 'Invalid proof_of_address_file_base64'], 400);
            }
        }

        $residential['proof_of_address_url'] = $proofFileUrl; // ✅ Consistent key
        $submission->residential_address     = $residential;

        // Step 3
        $idDocs = [];
        foreach ($validated['identifying_information'] as $index => $doc) {
            $cleanDoc = Arr::except($doc, [
                'image_front_file',
                'image_back_file',
                'image_front_file_base64',
                'image_back_file_base64',
            ]);

            // Front
            $frontUrl = null;
            if ($request->hasFile("identifying_information.$index.image_front_file")) {
                $file     = $request->file("identifying_information.$index.image_front_file");
                $path     = $file->store("customer_documents/{$customerId}/ids", 'public');
                $frontUrl = Storage::url($path);
                CustomerDocument::create([
                    'customer_submission_id' => $submission->id,
                    'document_type'          => 'identification',
                    'side'                   => 'front',
                    'reference_field'        => "identifying_information.$index.image_front_file",
                    'file_path'              => $path,
                    'file_name'              => $file->getClientOriginalName(),
                    'mime_type'              => $file->getMimeType(),
                    'file_size'              => $file->getSize(),
                    'issuing_country'        => $doc['issuing_country'] ?? null,
                ]);
            } elseif (! empty($doc['image_front_file_base64'])) {
                try {
                    $frontUrl = $saveBase64File($doc['image_front_file_base64'], "customer_documents/{$customerId}/ids", 'jpg');
                    if ($frontUrl) {
                        $filename = basename(parse_url($frontUrl, PHP_URL_PATH));
                        CustomerDocument::create([
                            'customer_submission_id' => $submission->id,
                            'document_type'          => 'identification',
                            'side'                   => 'front',
                            'reference_field'        => "identifying_information.$index.image_front_file_base64",
                            'file_path'              => "customer_documents/{$customerId}/ids/$filename",
                            'file_name'       => $filename,
                            'mime_type'       => 'image/jpeg',
                            'file_size'       => null,
                            'issuing_country' => $doc['issuing_country'] ?? null,
                        ]);
                    }
                } catch (\Exception $e) {
                    return response()->json(['error' => "Invalid image_front_file_base64 at index $index"], 400);
                }
            }
            $cleanDoc['image_front'] = $frontUrl;

            // Back
            $backUrl = null;
            if ($request->hasFile("identifying_information.$index.image_back_file")) {
                $file    = $request->file("identifying_information.$index.image_back_file");
                $path    = $file->store("customer_documents/{$customerId}/ids", 'public');
                $backUrl = Storage::url($path);
                CustomerDocument::create([
                    'customer_submission_id' => $submission->id,
                    'document_type'          => 'identification',
                    'side'                   => 'back',
                    'reference_field'        => "identifying_information.$index.image_back_file",
                    'file_path'              => $path,
                    'file_name'              => $file->getClientOriginalName(),
                    'mime_type'              => $file->getMimeType(),
                    'file_size'              => $file->getSize(),
                    'issuing_country'        => $doc['issuing_country'] ?? null,
                ]);
            } elseif (! empty($doc['image_back_file_base64'])) {
                try {
                    $backUrl = $saveBase64File($doc['image_back_file_base64'], "customer_documents/{$customerId}/ids", 'jpg');
                    if ($backUrl) {
                        $filename = basename(parse_url($backUrl, PHP_URL_PATH));
                        CustomerDocument::create([
                            'customer_submission_id' => $submission->id,
                            'document_type'          => 'identification',
                            'side'                   => 'back',
                            'reference_field'        => "identifying_information.$index.image_back_file_base64",
                            'file_path'              => "customer_documents/{$customerId}/ids/$filename",
                            'file_name'       => $filename,
                            'mime_type'       => 'image/jpeg',
                            'file_size'       => null,
                            'issuing_country' => $doc['issuing_country'] ?? null,
                        ]);
                    }
                } catch (\Exception $e) {
                    return response()->json(['error' => "Invalid image_back_file_base64 at index $index"], 400);
                }
            }
            $cleanDoc['image_back'] = $backUrl;
            $idDocs[]               = $cleanDoc;
        }
        $submission->identifying_information = $idDocs;

        // Step 4
        $submission->fill(Arr::only($validated, [
            'employment_status',
            'most_recent_occupation_code',
            'expected_monthly_payments_usd',
            'source_of_funds',
            'account_purpose',
            'account_purpose_other',
            'acting_as_intermediary',
        ]));

        // Step 5
        $additionalDocs = [];
        foreach ($validated['uploaded_documents'] as $index => $doc) {
            $docUrl = null;
            if ($request->hasFile("uploaded_documents.$index.file")) {
                $file   = $request->file("uploaded_documents.$index.file");
                $path   = $file->store("customer_documents/{$customerId}/additional", 'public');
                $docUrl = Storage::url($path);
                CustomerDocument::create([
                    'customer_submission_id' => $submission->id,
                    'document_type'          => $doc['type'] ?? 'other',
                    'file_path'              => $path,
                    'file_name'              => $file->getClientOriginalName(),
                    'mime_type'              => $file->getMimeType(),
                    'file_size'              => $file->getSize(),
                ]);
            } elseif (! empty($doc['file_base64'])) {
                try {
                    $docUrl = $saveBase64File($doc['file_base64'], "customer_documents/{$customerId}/additional", 'pdf');
                    if ($docUrl) {
                        $filename = basename(parse_url($docUrl, PHP_URL_PATH));
                        CustomerDocument::create([
                            'customer_submission_id' => $submission->id,
                            'document_type'          => $doc['type'] ?? 'other',
                            'file_path'              => "customer_documents/{$customerId}/additional/$filename",
                            'file_name' => $filename,
                            'mime_type' => 'application/pdf',
                            'file_size' => null,
                        ]);
                    }
                } catch (\Exception $e) {
                    return response()->json(['error' => "Invalid file_base64 at uploaded_documents index $index"], 400);
                }
            }
            if ($docUrl) {
                $additionalDocs[] = ['type' => $doc['type'], 'file' => $docUrl];
            }
        }
        $submission->documents = $additionalDocs;

        // Finalize
        $submission->status       = 'submitted';
        $submission->submitted_at = now();
        $submission->save();

        // initiate the third-party KYC job process
        dispatch(new ThirdPartyKycSubmission($submission->toArray()));

        return response()->json([
            'success'     => true,
            'message'     => 'Individual KYC submitted successfully.',
            'customer_id' => $customerId,
        ]);
    }

    private function sanitizeRedirectUrl(?string $url): string
    {
        $allowedHosts = ['app.yativo.com', 'yativo.com'];
        if (! $url) {
            return 'https://app.yativo.com';
        }

        $host = parse_url($url, PHP_URL_HOST);
        if ($host && in_array($host, $allowedHosts, true)) {
            return $url;
        }

        return 'https://app.yativo.com';
    }
};
