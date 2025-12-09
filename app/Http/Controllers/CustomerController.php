<?php

// declare(strict_types=1);

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
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;




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

        if (! Schema::hasColumn('customer_submissions', 'selfie_image')) {
            Schema::table('customer_submissions', function ($table) {
                $table->json('selfie_image')->nullable()->after('email');
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

            if (!env('IS_LOCAL_ENV')) {
                $customer = Customer::whereCustomerId($customerId);

                if (! $customer->exists()) {
                    abort(404, "Customer with provided ID {$customerId} not found.");
                }
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
                $url = $this->startBusinessVerification(request()->merge(['customer_id' => $customer_id]));

                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return redirect()->to($url);
                }
            }

            // Removed: var_dump($customer_type);

            abort(400, "Invalid customer type. {$customer_type} provided.");
        } catch (\Throwable $th) {
            return view('errors', [
                'message' => $th->getMessage() ?? "Error Encountered, Please contact support",
                'code'    => $th->getCode(),
            ]);
        }
    }

    public function startBusinessVerification(Request $request)
    {
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid();
        $customerId        = $request->customer_id;
        if (!env('IS_LOCAL_ENV')) {
            $customer          = Customer::whereCustomerId($customerId);

            if (! $customer->exists()) {
                abort(404, "Customer with provided ID {$customerId} not found.");
            }
        }

        // var_dump('Starting business verification...');
        $url = route('business.verify.start', ['step' => 1, 'customer_id' => $customerId]);
        return $url;
    }

    public function startIndividualVerification(Request $request)
    {
        $signedAgreementId  = $request->signed_agreement_id ?? Str::uuid();
        $customerSubmission = CustomerSubmission::firstOrCreate(
            [
                'customer_id'         => $request->customer_id
            ],
            [
                'type'                => 'individual',
                'signed_agreement_id' => $signedAgreementId,
                'user_agent'          => $request->userAgent(),
                'ip_address'          => $request->ip(),
            ]
        );
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
                    'selfie_image'     => 'required|file|mimes:pdf,jpg,jpeg,png,heic,tif|max:5120',
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
                    'identifying_information'                    => 'array|required|min:1',
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
                $fileUrl = $this->uploadFileIfExists(
                    'selfie_image',
                    'customer_documents/' . request()->signed_agreement_id
                );

                $modelData['selfie_image'] = $fileUrl;

                if (empty($modelData['selfie_image'])) {
                    $modelData['selfie_image'] = null;
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
            if ($value instanceof UploadedFile  || $value === null) {
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

    public function submitFullKyc(Request $request)
    {
        // 1. Validate presence of customer_id
        $request->validate([
            'customer_id' => 'required|string',
        ]);

        $customerId = $request->customer_id;
        $customer = Customer::where('customer_id', $customerId)->first();

        if (!$customer) {
            return response()->json(['error' => 'Customer with provided customer_id not found'], 404);
        }

        DB::beginTransaction();

        try {
            // 2. Create submission
            $submission = CustomerSubmission::updateOrCreate(
                ['customer_id' => $customerId],
                [
                    'type'                => 'individual',
                    'signed_agreement_id' => Str::uuid(),
                    'user_agent'          => $request->userAgent() ?? 'API',
                    'ip_address'          => $request->ip(),
                    'status'              => 'submitted',
                    'submitted_at'        => now(),
                ]
            );

            // 3. Preprocess: convert Base64 to UploadedFile if needed
            $processedRequest = $this->convertBase64ToUploadedFiles($request);

            // 4. Validate all sections using your existing rules (adapted)
            $data = $processedRequest->all();

            // Step 1
            $step1 = $this->validateSection($data, [
                'first_name'       => 'required|string|min:1|max:1024',
                'middle_name'      => 'required|string|max:1024',
                'last_name'        => 'required|string|min:1|max:1024',
                'email'            => 'required|email|max:1024',
                'phone'            => 'required|string|regex:/^\+\d{1,15}$/',
                'birth_date'       => 'required|date|before:today',
                'nationality'      => 'required|string|size:2',
                'gender'           => 'required|in:Male,Female,male,female',
                'taxId'            => 'required|string|max:100',
            ]);
            if ($processedRequest->hasFile('selfie_image')) {
                $step1['selfie_image'] = $processedRequest->file('selfie_image');
            }

            // Step 2
            $step2 = $this->validateSection($data['residential_address'] ?? [], [
                'street_line_1'   => 'required|string|max:256',
                'city'            => 'required|string|max:256',
                'state'           => 'required|string|max:256',
                'postal_code'     => 'required|string|max:256',
                'country'         => 'required|string|size:2',
            ]);
            if (
                !empty($data['residential_address']['proof_of_address_file']) ||
                $processedRequest->hasFile('residential_address.proof_of_address_file')
            ) {
                $step2['proof_of_address_file'] = $processedRequest->file('residential_address.proof_of_address_file')
                    ?? $data['residential_address']['proof_of_address_file'];
            }
            $step2 = ['residential_address' => $step2];

            // Step 3
            $ids = [];
            foreach ($data['identifying_information'] ?? [] as $idx => $idDoc) {
                $validatedId = $this->validateSection($idDoc, [
                    'type'            => 'required|string',
                    'issuing_country' => 'required|string|size:2',
                    'number'          => 'required|string',
                    'date_issued'     => 'required|date|before:today',
                    'expiration_date' => 'required|date|after:today',
                ]);
                // Attach files if present
                $frontFile = $processedRequest->file("identifying_information.{$idx}.image_front_file")
                    ?? ($idDoc['image_front_file'] ?? null);
                $backFile = $processedRequest->file("identifying_information.{$idx}.image_back_file")
                    ?? ($idDoc['image_back_file'] ?? null);
                if ($frontFile) $validatedId['image_front_file'] = $frontFile;
                if ($backFile) $validatedId['image_back_file'] = $backFile;
                $ids[] = $validatedId;
            }
            $step3 = ['identifying_information' => $ids];

            // Step 4
            $step4 = $this->validateSection($data, [
                'employment_status'             => 'required',
                'most_recent_occupation_code'   => 'required|string',
                'expected_monthly_payments_usd' => ['required', Rule::in(array_keys(config('bridge_data.expected_monthly_payments_usd', [])))],
                'source_of_funds'               => ['required', Rule::in(array_keys(config('bridge_data.source_of_funds', [])))],
                'account_purpose'               => 'required',
                'account_purpose_other'         => 'required_if:account_purpose,other',
                'acting_as_intermediary'        => 'boolean',
            ]);

            // Step 5
            $docs = [];
            foreach ($data['uploaded_documents'] ?? [] as $idx => $doc) {
                $type = $doc['type'] ?? 'other';
                $file = $processedRequest->file("uploaded_documents.{$idx}.file")
                    ?? ($doc['file'] ?? null);
                if (!$file) continue;
                $docs[] = ['type' => $type, 'file' => $file];
            }
            // Enforce required types (e.g., proof_of_funds)
            $uploadedTypes = collect($docs)->pluck('type');
            if (!$uploadedTypes->contains('proof_of_funds')) {
                return response()->json([
                    'success' => false,
                    'message' => "Document of type 'proof_of_funds' is required."
                ], 400);
            }
            $step5 = ['uploaded_documents' => $docs];

            // 5. Merge all data and map to model fields
            $allData = array_merge($step1, $step2, $step3, $step4, $step5);

            // Reuse your mapping logic by simulating step-by-step
            $modelData = [];
            $tempRequest = new Request();
            $tempRequest->replace($allData);

            // Simulate each step mapping
            $modelData = array_merge($modelData, $this->mapStepDataToModel($this->extractStepData($allData, 1), 1));
            $modelData = array_merge($modelData, $this->mapStepDataToModel($this->extractStepData($allData, 2), 2));
            $modelData = array_merge($modelData, $this->mapStepDataToModel($this->extractStepData($allData, 3), 3));
            $modelData = array_merge($modelData, $this->mapStepDataToModel($this->extractStepData($allData, 4), 4));
            $modelData = array_merge($modelData, $this->mapStepDataToModel($this->extractStepData($allData, 5), 5));

            // 6. Save submission
            $submission->fill($modelData);
            $submission->save();

            // 7. Save CustomerDocument records (optional but recommended)
            // $this->saveCustomerDocuments($submission, $allData);

            DB::commit();

            // 8. Dispatch third-party job
            dispatch(job: new ThirdPartyKycSubmission($submission->toArray()));

            return response()->json([
                'success' => true,
                'message' => 'KYC submitted successfully.',
                'submission_id' => $submission->id
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Full KYC API failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Submission failed. Please check your data and try again.',
                'debug'   => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    private function validateSection(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            throw new \Exception(json_encode($validator->errors()->first()));
        }
        return $validator->validated();
    }

    private function extractStepData(array $data, int $step): array
    {
        // Reuse your existing mapping logic by returning relevant subset
        switch ($step) {
            case 1:
                return Arr::only($data, ['first_name', 'middle_name', 'last_name', 'email', 'phone', 'birth_date', 'nationality', 'gender', 'taxId', 'selfie_image']);
            case 2:
                return ['residential_address' => $data['residential_address'] ?? []];
            case 3:
                return ['identifying_information' => $data['identifying_information'] ?? []];
            case 4:
                return Arr::only($data, ['employment_status', 'most_recent_occupation_code', 'expected_monthly_payments_usd', 'source_of_funds', 'account_purpose', 'account_purpose_other', 'acting_as_intermediary']);
            case 5:
                return ['uploaded_documents' => $data['uploaded_documents'] ?? []];
            default:
                return [];
        }
    }

    private function convertBase64ToUploadedFiles(Request $request): Request
    {
        $data = $request->all();
        $files = [];

        $this->processBase64InArray($data, $files, '');

        // Merge files into a new request
        $newRequest = Request::create('', 'POST', $data, [], $files, $request->server->all());
        return $newRequest;
    }

    private function processBase64InArray(array &$data, array &$files, string $prefix)
    {
        foreach ($data as $key => $value) {
            $fullKey = $prefix ? "{$prefix}.{$key}" : $key;

            if (is_string($value) && preg_match('/^data:([^;]+);base64,(.*)$/', $value, $matches)) {
                $mime = $matches[1];
                $base64 = $matches[2];
                $binary = base64_decode($base64);
                if ($binary === false) continue;

                $tempFile = tmpfile();
                fwrite($tempFile, $binary);
                $meta = stream_get_meta_data($tempFile);
                $filePath = $meta['uri'];

                $extension = match (true) {
                    str_starts_with($mime, 'image/jpeg') => 'jpg',
                    str_starts_with($mime, 'image/png')  => 'png',
                    str_starts_with($mime, 'image/heic') => 'heic',
                    str_starts_with($mime, 'image/tiff') => 'tif',
                    str_starts_with($mime, 'application/pdf') => 'pdf',
                    default => 'bin'
                };

                $fileName = Str::random(20) . '.' . $extension;
                $uploadedFile = new UploadedFile($filePath, $fileName, $mime, null, true);
                $files[$fullKey] = $uploadedFile;
                $data[$key] = $uploadedFile; // replace with UploadedFile
            } elseif (is_array($value)) {
                $this->processBase64InArray($value, $files, $fullKey);
                $data[$key] = $value;
            }
        }
    }

    private function saveCustomerDocuments(CustomerSubmission $submission, array $data)
    {
        // Reuse your file-saving logic or call existing methods with mock request
        // For brevity, you can call:
        $mockRequest = new Request();
        $mockRequest->replace($data);
        // But since your upload methods expect files in request, and we already processed them,
        // you may need to refactor or inline the storage logic.
        // Alternatively, enhance `uploadFileIfExists` to accept direct UploadedFile.
    }
}
