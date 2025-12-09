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
use Illuminate\Database\Schema\Blueprint;

class CustomerController extends Controller
{
    private const MAX_STEPS = 6;

    protected string $bridgeApiKey;
    protected string $bridgeApiUrl;
    protected int $maxSteps;

    public function __construct()
    {
        $this->bridgeApiKey = env('BRIDGE_API_KEY');
        $this->bridgeApiUrl = env('BRIDGE_API_URL');
        $this->maxSteps     = self::MAX_STEPS;

        // Kept for backward compatibility (not recommended in production, but you requested no functionality loss)
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


        if (!Schema::hasTable('customer_meta_data')) {
            Schema::create('customer_meta_data', function (Blueprint $table) {
                $table->uuid('customer_id'); // customer_id is a uuid column in the customers table
                $table->string('key');
                $table->json('value');
                $table->timestamps();
                $table->softDeletes();
                $table->foreign('customer_id')->references('customer_id')->on('customers')->onDelete('cascade');
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

            if (! env('IS_LOCAL_ENV')) {
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
                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return redirect()->to($url);
                }
            }

            if ($customer_type == 'business') {
                session([
                    'type'                        => 'business',
                    'signed_agreement_id'         => $customer_id,
                    'user_agent'                  => request()->userAgent(),
                    'ip_address'                  => request()->ip(),
                    'customer_id'                 => $customerId,
                    'customer_submission_id'      => $customerId,
                    'business_customer_session_id' => $customerId,
                ]);

                BusinessCustomer::firstOrCreate([
                    'session_id' => $customer_id,
                    'customer_id' => $customer_id,
                ]);

                $url = $this->startBusinessVerification(request()->merge(['customer_id' => $customer_id]));

                if (filter_var($url, FILTER_VALIDATE_URL)) {
                    return redirect()->to($url);
                }
            }

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

        if (! env('IS_LOCAL_ENV')) {
            $customer = Customer::whereCustomerId($customerId);

            if (! $customer->exists()) {
                abort(404, "Customer with provided ID {$customerId} not found.");
            }
        }

        $url = route('business.verify.start', ['step' => 1, 'customer_id' => $customerId]);
        return $url;
    }

    public function startIndividualVerification(Request $request)
    {
        $signedAgreementId  = $request->signed_agreement_id ?? Str::uuid();
        $customerSubmission = CustomerSubmission::firstOrCreate(
            [
                'customer_id' => $request->customer_id,
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

        // 🔐 Scan ALL incoming files for viruses before any processing
        try {
            $this->scanAllFilesInArray($request->files->all());
        } catch (\Throwable $virusEx) {
            Log::warning('Virus detected during saveVerificationStep', [
                'submission_id' => $submissionId,
                'step'          => $step,
                'error'         => $virusEx->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Uploaded file failed virus scan.',
                'debug'   => $virusEx->getMessage(),
            ], 422);
        }

        if ($step >= $this->maxSteps) {
            if ($request->has('submit_bridge_kyc')) {
                $customerSubmission->update(['submit_bridge_kyc' => (bool) $request->submit_bridge_kyc]);
            }
            if ($step === $this->maxSteps) {
                $customerSubmission->status       = 'submitted';
                $customerSubmission->submitted_at = now();
                $customerSubmission->save();

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
                $subKey                                      = str_replace('residential_address_', '', $key);
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
            'data' => $request->all(),
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
                    'account_purpose'               => [
                        'required',
                        function ($attribute, $value, $fail) {
                            $allowed = array_map('strtolower', array_keys(config('bridge_data.account_purposes')));
                            if (! in_array(strtolower($value), $allowed)) {
                                $fail("Invalid account purpose.");
                            }
                        },
                    ],
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

                $modelData['selfie_image'] = $fileUrl ?: null;
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
                        $cleaned = array_filter($doc, fn($v) => ! empty($v));

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
                        $cleaned = Arr::only($doc, ['type']);

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
                        $cleaned = Arr::only($doc, ['type']);

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
                Log::warning('Unknown step in customer verification', [
                    'step'          => $step,
                    'submission_id' => session('customer_submission_id'),
                ]);
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

            $addr                         = $submission->residential_address ?? [];
            $addr['proof_of_address_url'] = $url;
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

                    $data = $submission->identifying_information ?? [];
                    $info = $data[$idx] ?? [];
                    $info[str_replace('_file', '', $sideKey)] = $url;
                    $data[$idx] = $info;

                    $submission->identifying_information = $data;
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

    // 🔻 Kept for backward compatibility, used by mapStepDataToModel
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

            if ($value instanceof UploadedFile || $value === null) {
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
                        ->latest()
                        ->first()?->toArray();
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
        // Placeholder
    }

    public function getIdentificationTypesByCountry($countryCode)
    {
        // Placeholder
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

    /**
     * API endpoint: submit full KYC in one request.
     * Always returns JSON. All files are virus-scanned before processing.
     */
    public function submitFullKyc(Request $request)
    {
        $respond = fn($success, $message, $errors = null, $code = 422) =>
        response()->json([
            'success' => $success,
            'message' => $message,
            'errors'  => $errors,
        ], $code);

        // Basic validation for customer_id
        $v = Validator::make($request->all(), [
            'customer_id' => 'required|string',
        ]);

        if ($v->fails()) {
            return $respond(false, 'Validation error.', $v->errors());
        }

        $customer = Customer::where('customer_id', $request->customer_id)->first();

        if (! $customer) {
            return $respond(false, 'Customer not found.', null, 404);
        }

        try {
            DB::beginTransaction();

            $submission = CustomerSubmission::updateOrCreate(
                ['customer_id' => $request->customer_id],
                [
                    'type'                => 'individual',
                    'signed_agreement_id' => Str::uuid(),
                    'status'              => 'submitted',
                    'submitted_at'        => now(),
                    'user_agent'          => $request->userAgent() ?? 'API',
                    'ip_address'          => $request->ip(),
                ]
            );

            // Convert Base64 → UploadedFile
            $processedRequest = $this->convertBase64ToUploadedFiles($request);
            $processedRequest->merge(['signed_agreement_id' => $submission->signed_agreement_id]);

            // Replace Laravel request instance so uploadFileIfExists, etc., see this
            app()->instance('request', $processedRequest);

            // Virus scan all files
            try {
                $this->scanAllFilesInArray($processedRequest->files->all());
            } catch (\Throwable $virusEx) {
                Log::warning('Virus detected in submitFullKyc', [
                    'customer_id' => $request->customer_id,
                    'error'       => $virusEx->getMessage(),
                ]);

                DB::rollBack();

                return $respond(false, 'File failed virus scan.', [
                    'virus_error' => $virusEx->getMessage(),
                ]);
            }

            $data = $processedRequest->all();

            // STEP 1 – Personal Info + Selfie
            $step1 = $this->safeValidate($data, [
                'first_name'       => 'required|string|max:1024',
                'middle_name'      => 'required|string|max:1024',
                'last_name'        => 'required|string|max:1024',
                'email'            => 'required|email|max:1024',
                'phone'            => 'required|string|regex:/^\+\d{1,15}$/',
                'birth_date'       => 'required|date|before:today',
                'nationality'      => 'required|string|size:2',
                'gender'           => 'required|in:Male,Female,male,female',
                'taxId'            => 'required|string|max:100',
                'selfie_image'     => 'required|file|max:5120',
            ]);

            if (! $step1['success']) {
                DB::rollBack();
                return $respond(false, $step1['message'], $step1['errors']);
            }

            // STEP 2 – Residential Address + Proof of Address
            $step2 = $this->safeValidate(
                $data['residential_address'] ?? [],
                [
                    'street_line_1' => 'required|string|max:256',
                    'city'          => 'required|string|max:256',
                    'state'         => 'required|string|max:256',
                    'postal_code'   => 'required|string|max:256',
                    'country'       => 'required|string|size:2',
                ]
            );

            if (! $step2['success']) {
                DB::rollBack();
                return $respond(false, $step2['message'], $step2['errors']);
            }

            if (! $processedRequest->hasFile('residential_address.proof_of_address_file')) {
                DB::rollBack();
                return $respond(false, 'Proof of address file is required.');
            }

            $step2['data']['proof_of_address_file'] =
                $processedRequest->file('residential_address.proof_of_address_file');

            // STEP 3 – Identifying Documents
            $ids = [];

            foreach ($data['identifying_information'] ?? [] as $i => $doc) {
                $validated = $this->safeValidate($doc, [
                    'type'            => 'required|string',
                    'issuing_country' => 'required|string|size:2',
                    'number'          => 'required|string',
                    'date_issued'     => 'required|date|before:today',
                    'expiration_date' => 'required|date|after:today',
                ]);

                if (! $validated['success']) {
                    DB::rollBack();
                    return $respond(false, $validated['message'], $validated['errors']);
                }

                $front = $processedRequest->file("identifying_information.$i.image_front_file");
                if (! $front) {
                    DB::rollBack();
                    return $respond(false, "ID front image required at index {$i}.");
                }

                $validated['data']['image_front_file'] = $front;

                $back = $processedRequest->file("identifying_information.$i.image_back_file");
                if ($back) {
                    $validated['data']['image_back_file'] = $back;
                }

                $ids[] = $validated['data'];
            }

            if (empty($ids)) {
                DB::rollBack();
                return $respond(false, 'At least one identifying document is required.');
            }

            // STEP 4 – Employment, Source of Funds, Account Purpose
            $step4 = $this->safeValidate($data, [
                'employment_status'             => 'required',
                'most_recent_occupation_code'   => 'required|string',
                'expected_monthly_payments_usd' => 'required',
                'source_of_funds'               => 'required',
                'account_purpose'               => 'required',
                'account_purpose_other'         => 'required_if:account_purpose,other',
                'acting_as_intermediary'        => 'boolean',
            ]);

            if (! $step4['success']) {
                DB::rollBack();
                return $respond(false, $step4['message'], $step4['errors']);
            }

            // STEP 5 – Supporting Documents
            $docs = [];

            foreach ($data['uploaded_documents'] ?? [] as $i => $doc) {
                $file = $processedRequest->file("uploaded_documents.$i.file");

                if ($file instanceof UploadedFile) {
                    $docs[] = [
                        'type' => strtolower($doc['type'] ?? 'other'),
                        'file' => $file,
                    ];
                }
            }

            $types = collect($docs)->pluck('type');

            if (! $types->contains('proof_of_funds')) {
                DB::rollBack();
                return $respond(false, "Document 'proof_of_funds' is required.");
            }

            // Map into model data using existing mapping logic
            $modelData = [];
            $modelData = array_merge($modelData, $this->mapStepDataToModel($step1['data'], 1));
            $modelData = array_merge(
                $modelData,
                $this->mapStepDataToModel(['residential_address' => $step2['data']], 2)
            );
            $modelData = array_merge(
                $modelData,
                $this->mapStepDataToModel(['identifying_information' => $ids], 3)
            );
            $modelData = array_merge($modelData, $this->mapStepDataToModel($step4['data'], 4));
            $modelData = array_merge(
                $modelData,
                $this->mapStepDataToModel(['uploaded_documents' => $docs], 5)
            );

            $submission->fill($modelData);
            $submission->save();

            DB::commit();

            dispatch(new ThirdPartyKycSubmission($submission->toArray()));
            $this->saveCustomerDocuments($submission, $data);
            return $respond(true, 'KYC submitted successfully.', [
                'submission' => $submission->fresh(),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            Log::error('submitFullKyc error', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return $respond(false, 'Unexpected server error.', [
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Safe validator that returns structured array instead of throwing.
     */
    private function safeValidate(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            return [
                'success' => false,
                'message' => 'Validation error.',
                'errors'  => $validator->errors(),
            ];
        }

        return [
            'success' => true,
            'data'    => $validator->validated(),
        ];
    }

    /**
     * Original validateSection kept for backward compatibility.
     */
    private function validateSection(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            throw new \Exception(json_encode($validator->errors()->first()));
        }

        return $validator->validated();
    }

    /**
     * Convert any Base64 "data:...;base64,..." string in the request into UploadedFile instances.
     * Properly supports nested keys like uploaded_documents.0.file, etc.
     */
    private function convertBase64ToUploadedFiles(Request $request): Request
    {
        $data  = $request->all();
        $files = [];

        $convert = function (&$value, $keyPath) use (&$convert, &$files) {

            // Detect if value is Base64 image/file
            if (is_string($value) && preg_match('/^data:(.+);base64,(.*)$/', $value, $m)) {

                $mime = $m[1];
                $base64Data = $m[2];

                $binary = base64_decode($base64Data);
                if ($binary === false) return;

                // Detect extension from mime
                $extension = match (true) {
                    str_contains($mime, 'jpeg') => 'jpg',
                    str_contains($mime, 'png')  => 'png',
                    str_contains($mime, 'pdf')  => 'pdf',
                    default => 'bin',
                };

                // Create a persistent temp file (fix for stat() errors)
                $tmpPath = sys_get_temp_dir() . '/' . Str::uuid() . '.' . $extension;
                file_put_contents($tmpPath, $binary);

                // Build UploadedFile instance
                $uploaded = new UploadedFile(
                    $tmpPath,
                    basename($tmpPath),
                    $mime,
                    null,
                    true
                );

                // Store in Symfony file bag
                Arr::set($files, $keyPath, $uploaded);

                // Replace value in request data
                $value = $uploaded;

                return;
            }

            // Recurse into arrays
            if (is_array($value)) {
                foreach ($value as $k => $v) {
                    $convert($value[$k], $keyPath ? "$keyPath.$k" : $k);
                }
            }
        };

        foreach ($data as $k => $v) {
            $convert($data[$k], $k);
        }

        // Rebuild the request object
        return Request::create(
            $request->getPathInfo(),
            $request->getMethod(),
            $data,
            $request->cookies->all(),
            $files,
            $request->server->all()
        );
    }



    private function processBase64InArray(array &$data, array &$files, string $prefix): void
    {
        foreach ($data as $key => $value) {
            $fullKey = $prefix ? "{$prefix}.{$key}" : $key;

            if (
                is_string($value) &&
                preg_match('/^data:([^;]+);base64,(.*)$/', $value, $matches)
            ) {

                $mime   = $matches[1];
                $base64 = $matches[2];
                $binary = base64_decode($base64);

                if ($binary === false) {
                    continue;
                }

                $temp = tmpfile();
                fwrite($temp, $binary);
                $meta = stream_get_meta_data($temp);
                $path = $meta['uri'];

                $extension = match (true) {
                    str_contains($mime, 'jpeg'),
                    str_contains($mime, 'jpg')   => 'jpg',
                    str_contains($mime, 'png')   => 'png',
                    str_contains($mime, 'heic')  => 'heic',
                    str_contains($mime, 'tiff')  => 'tif',
                    str_contains($mime, 'pdf')   => 'pdf',
                    default                       => 'bin',
                };

                $fileName     = Str::random(20) . '.' . $extension;
                $uploadedFile = new UploadedFile($path, $fileName, $mime, null, true);

                data_set($files, $fullKey, $uploadedFile);
                data_set($data,  $fullKey, $uploadedFile);
            } elseif (is_array($value)) {
                $this->processBase64InArray($value, $files, $fullKey);
                $data[$key] = $value;
            }
        }
    }

    /**
     * Scan a single UploadedFile for viruses using ClamAV.
     * Throws an exception if a virus is found or if ClamAV is unreachable.
     */
    private function scanFileForVirus(UploadedFile $file): void
    {
        // Adjust this path to your clamd socket path if different
        $socketPath = '/var/run/clamav/clamd.ctl';

        $errno  = 0;
        $errstr = '';
        $conn   = @fsockopen('unix://' . $socketPath, 0, $errno, $errstr);

        if (! $conn) {
            throw new \RuntimeException("Cannot connect to ClamAV daemon: {$errstr} ({$errno})");
        }

        $filePath = $file->getRealPath();
        fwrite($conn, "SCAN {$filePath}\n");
        $result = fgets($conn);
        fclose($conn);

        if ($result !== false && str_contains($result, 'FOUND')) {
            throw new \RuntimeException("Virus detected in uploaded file: {$file->getClientOriginalName()}");
        }
    }

    /**
     * Recursively scan all UploadedFile instances in any nested array structure.
     */
    private function scanAllFilesInArray($data): void
    {
        if (is_array($data)) {
            foreach ($data as $value) {
                $this->scanAllFilesInArray($value);
            }
            return;
        }

        if ($data instanceof UploadedFile) {
            $this->scanFileForVirus($data);
        }
    }

    /**
     * Save ALL uploaded documents (selfie, ID docs, proof of address, additional docs)
     * into the customer_documents table. This supports submitFullKyc API processing.
     */
    private function saveCustomerDocuments(CustomerSubmission $submission, array $data)
    {
        // 1️⃣ Selfie Image
        if (isset($data['selfie_image']) && $data['selfie_image'] instanceof UploadedFile) {
            $file = $data['selfie_image'];

            $path = $file->store("customer_documents/{$submission->id}/selfie", 'public');
            $url  = Storage::url($path);

            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => 'selfie',
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        }

        // 2️⃣ Proof of Address
        if (
            isset($data['residential_address']['proof_of_address_file']) &&
            $data['residential_address']['proof_of_address_file'] instanceof UploadedFile
        ) {
            $file = $data['residential_address']['proof_of_address_file'];

            $path = $file->store("customer_documents/{$submission->id}/address", 'public');
            $url  = Storage::url($path);

            CustomerDocument::create([
                'customer_submission_id' => $submission->id,
                'document_type'          => 'proof_of_address',
                'file_path'              => $path,
                'file_name'              => $file->getClientOriginalName(),
                'mime_type'              => $file->getMimeType(),
                'file_size'              => $file->getSize(),
            ]);
        }

        // 3️⃣ Identification Documents
        if (isset($data['identifying_information']) && is_array($data['identifying_information'])) {

            foreach ($data['identifying_information'] as $idx => $doc) {
                // Front
                if (isset($doc['image_front_file']) && $doc['image_front_file'] instanceof UploadedFile) {
                    $file = $doc['image_front_file'];

                    $path = $file->store("customer_documents/{$submission->id}/ids", 'public');
                    $url  = Storage::url($path);

                    CustomerDocument::create([
                        'customer_submission_id' => $submission->id,
                        'document_type'          => 'identification_front',
                        'reference_field'        => "identifying_information.{$idx}.image_front_file",
                        'file_path'              => $path,
                        'file_name'              => $file->getClientOriginalName(),
                        'mime_type'              => $file->getMimeType(),
                        'file_size'              => $file->getSize(),
                        'issuing_country'        => $doc['issuing_country'] ?? null,
                    ]);
                }

                // Back
                if (isset($doc['image_back_file']) && $doc['image_back_file'] instanceof UploadedFile) {
                    $file = $doc['image_back_file'];

                    $path = $file->store("customer_documents/{$submission->id}/ids", 'public');
                    $url  = Storage::url($path);

                    CustomerDocument::create([
                        'customer_submission_id' => $submission->id,
                        'document_type'          => 'identification_back',
                        'reference_field'        => "identifying_information.{$idx}.image_back_file",
                        'file_path'              => $path,
                        'file_name'              => $file->getClientOriginalName(),
                        'mime_type'              => $file->getMimeType(),
                        'file_size'              => $file->getSize(),
                        'issuing_country'        => $doc['issuing_country'] ?? null,
                    ]);
                }
            }
        }

        // 4️⃣ Additional Uploaded Documents
        if (isset($data['uploaded_documents']) && is_array($data['uploaded_documents'])) {

            foreach ($data['uploaded_documents'] as $idx => $doc) {
                if (!isset($doc['file']) || !($doc['file'] instanceof UploadedFile)) {
                    continue;
                }

                $file = $doc['file'];
                $type = $doc['type'] ?? 'other';

                $path = $file->store("customer_documents/{$submission->id}/additional", 'public');
                $url  = Storage::url($path);

                CustomerDocument::create([
                    'customer_submission_id' => $submission->id,
                    'document_type'          => $type,
                    'file_path'              => $path,
                    'file_name'              => $file->getClientOriginalName(),
                    'mime_type'              => $file->getMimeType(),
                    'file_size'              => $file->getSize(),
                ]);
            }
        }
    }
}
