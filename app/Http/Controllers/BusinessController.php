<?php
namespace App\Http\Controllers;

use App\Models\CustomerSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class BusinessController extends Controller
{
    protected $bridgeApiKey;
    protected $bridgeApiUrl;

    public function __construct()
    {
        $this->bridgeApiKey = env('BRIDGE_API_KEY');
        $this->bridgeApiUrl = env('BRIDGE_API_URL');
    }

    /**
     * Show the initial account type selection page.
     */
    public function showAccountTypeSelection()
    {
        return Inertia::render('Business/BusinessCustomerForm');
    }

    /**
     * Start the individual verification process.
     * Creates a CustomerSubmission record and stores its ID in the session.
     * This is called when the user selects 'Individual' and before showing Step 1.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function startBusinessVerification(Request $request)
    {
                                                                           // Create a new, empty submission record for 'individual'
                                                                           // signed_agreement_id should ideally come from the frontend or be pre-defined
                                                                           // For now, we generate a placeholder or you can set a default/config value
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid(); // Or a predefined ID

        $customerSubmission = CustomerSubmission::create([
            'type'                => 'business',
            'signed_agreement_id' => $signedAgreementId,
        ]);

        // Store the submission ID in the session
        session(['customer_submission_id' => $customerSubmission->id]);

        $arr = [
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => config('bridge_data.account_purposes'),
            'sourceOfFunds'                => config('bridge_data.source_of_funds'),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
            'currentStep'                  => 1,
            'maxSteps'                     => 8,
            'customerData'                 => $customerSubmission, // Pass the full model instance
            'submissionId'                 => $customerSubmission->id,
        ];

        // return response()->json([
        //     'success' => true,
        //     'message' => 'Business verification started successfully.',
        //     'data'    => $arr,
        // ], 200);
        return Inertia::render('Business/BusinessCustomerForm', $arr);

        // Redirect to the first step
        // return redirect()->route('business.verify.step', ['step' => 1]);
    }

    /**
     * Start the individual verification process.
     * Creates a CustomerSubmission record and stores its ID in the session.
     * This is called when the user selects 'Individual' and before showing Step 1.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function startIndividualVerification(Request $request)
    {
                                                                           // Create a new, empty submission record for 'individual'
                                                                           // signed_agreement_id should ideally come from the frontend or be pre-defined
                                                                           // For now, we generate a placeholder or you can set a default/config value
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid(); // Or a predefined ID

        $customerSubmission = CustomerSubmission::create([
            'type'                => 'individual',
            'signed_agreement_id' => $signedAgreementId,
            // All other fields will be null initially
        ]);

        // Store the submission ID in the session
        session(['customer_submission_id' => $customerSubmission->id]);

        // Redirect to the first step
        return redirect()->route('customer.verify.step', ['step' => 1]);
    }

    /**
     * Show a specific step of the individual verification form.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $step
     * @return \Inertia\Response
     */
    public function showVerificationStep(Request $request, $step = 1)
    {
        $step     = (int) $step;
        $maxSteps = 5; // Define your total steps

        if ($step < 1 || $step > $maxSteps) {
            return redirect()->route('customer.verify.step', ['step' => 1]);
        }

        // Retrieve the submission ID from the session
        $submissionId = session('customer_submission_id');

        // If no session ID, redirect to the start or account type selection
        if (! $submissionId) {
            return redirect()->route('account.type')->with('error', 'No session ID'); // Or a dedicated start route
        }

        // Find the submission record
        $customerSubmission = CustomerSubmission::find($submissionId);

        // If record not found or type mismatch, redirect appropriately
        if (! $customerSubmission || $customerSubmission->type !== 'individual') {
            // Clear invalid session data
            session()->forget('customer_submission_id');
            return redirect()->route('account.type');
        }

        // Pass initial data needed for dropdowns (as before)
        $initialData = [
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => config('bridge_data.account_purposes'),
            'sourceOfFunds'                => config('bridge_data.source_of_funds'),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
            // Add subdivisions if needed dynamically or via API
        ];

        // Pass current step data to the view
        return Inertia::render('Business/BusinessCustomerForm', [
            'initialData'  => $initialData,
            'currentStep'  => $step,
            'maxSteps'     => $maxSteps,
            'customerData' => $customerSubmission, // Pass the full model instance
            'submissionId' => $customerSubmission->id,
        ]);
    }

    /**
     * Save data for a specific step.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $step
     * @return \Illuminate\Http\JsonResponse
     */
    public function saveVerificationStep(Request $request, $step)
    {
        $step     = (int) $step;
        $maxSteps = 5; // Define your total steps

        if ($step < 1 || $step > $maxSteps) {
            return response()->json(['success' => false, 'message' => 'Invalid step.'], 400);
        }

        // Retrieve the submission ID from the session
        $submissionId = session('customer_submission_id');

        // Check if session ID exists
        if (! $submissionId) {
            // This is the key change: Instead of failing, we could potentially
            // try to recreate the session if it's the first step, but it's better
            // to ensure the flow starts correctly.
            // For now, we treat it as an error state.
            return response()->json(['success' => false, 'message' => 'Session expired or not found. Please start the verification process again.'], 400);
        }

        // Find the submission record
        $customerSubmission = CustomerSubmission::find($submissionId);

        // Check if the record exists
        if (! $customerSubmission) {
            // Clear the invalid session ID
            session()->forget('customer_submission_id');
            return response()->json(['success' => false, 'message' => 'Submission record not found. Please start the verification process again.'], 404);
        }

        try {
                                                                       // 1. Validate data for the current step
            $validatedData = $this->validateStepData($request, $step); // You need to implement this

                                                                          // 2. Map validated data to model attributes for this step
            $stepData = $this->mapStepDataToModel($validatedData, $step); // You need to implement this

            // 3. Update the model
            $customerSubmission->update($stepData);

            // Determine next step or if finished
            $nextStep   = ($step < $maxSteps) ? $step + 1 : null;
            $isComplete = ($step === $maxSteps);

            // Return success response with updated data
            return response()->json([
                'success'       => true,
                'message'       => 'Step ' . $step . ' saved successfully.',
                'next_step'     => $nextStep,
                'is_complete'   => $isComplete,
                'customer_data' => $customerSubmission->fresh(), // Return the updated model instance
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Customer Step Save Failed', [
                'message'       => $e->getMessage(),
                'step'          => $step,
                'submission_id' => $submissionId,
                'data'          => $request->all(),
                'trace'         => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'An error occurred while saving data. Please try again.',
                'debug'   => $e->getMessage(), // Uncomment for debugging, remove in production
            ], 500);
        }
    }

    /**
     * Validate data for a specific step.
     */
    private function validateStepData(Request $request, int $step)
    {
        $rules = [];
        switch ($step) {
            case 1: // Personal Information
                $rules = [
                    'first_name'       => ['nullable', 'string', 'between:2,1024'],
                    'middle_name'      => ['nullable', 'string', 'between:1,1024'],
                    'last_name'        => ['nullable', 'string', 'between:1,1024'],
                    'last_name_native' => ['nullable', 'string', 'between:1,1024'],
                    'email'            => ['nullable', 'string', 'between:1,1024', 'email'],
                    'phone'            => ['nullable', 'string', 'between:1,1024', 'regex:/^\+\d{1,15}$/'],
                    'birth_date'       => ['nullable', 'date_format:Y-m-d', 'before:today'],
                ];
                break;
            case 2: // Address
                $rules = [
                    'residential_address.street_line_1' => ['required', 'string', 'between:1,256'],
                    'residential_address.street_line_2' => ['required', 'string', 'between:1,256'],
                    'residential_address.city'          => ['required', 'string', 'between:1,256'],
                    'residential_address.state'         => ['required', 'string'],
                    'residential_address.postal_code'   => ['required', 'string', 'between:1,16'],
                    'residential_address.country'       => ['required', 'string', 'size:3'],
                    // Transliterated address rules would be similar if needed
                ];
                break;
            case 3: // Identification
                $rules = [
                    'identifying_information'                   => ['required', 'array'],
                    'identifying_information.*.type'            => ['required_with:identifying_information', 'string'],
                    'identifying_information.*.issuing_country' => ['required_with:identifying_information', 'string', 'size:3'],
                    'identifying_information.*.number'          => ['required', 'string'],
                    'identifying_information.*.description'     => ['sometimes', 'string'],
                    // 'identifying_information.*.image_front' => ['required', 'string'],
                    // 'identifying_information.*.image_back' => ['required', 'string'],
                    'identifying_information.*.expiration_date' => ['required', 'date_format:Y-m-d', 'after:today'],
                ];
                break;
            case 4: // Employment & Finances
                $rules = [
                    'employment_status'             => ['required', 'string'],
                    'most_recent_occupation'        => ['required', 'string'],
                    'expected_monthly_payments_usd' => ['required', 'string'],
                    'source_of_funds'               => ['required', Rule::in(config('bridge_data.source_of_funds'))],
                    'account_purpose'               => ['required', Rule::in(config('bridge_data.account_purposes'))],
                    'account_purpose_other'         => ['required', 'string', 'required_if:account_purpose,other'],
                    'acting_as_intermediary'        => ['required', 'boolean'],
                ];
                // Add conditional validation for occupation code
                if ($request->has('most_recent_occupation')) {
                    $occupationCodes                   = Arr::pluck(config('bridge_data.occupations'), 'code');
                    $rules['most_recent_occupation'][] = Rule::in($occupationCodes);
                }
                break;
            case 5: // Review & Submit (might just validate required fields)
                        // This step might not save new data, just confirm
                        // Or it could save endorsements if they are part of the form
                $rules = [
                    // 'endorsements' => ['nullable', 'array'],
                    // 'endorsements.*' => ['string'],
                ];
                break;
        }

        return $request->validate($rules);
    }

    /**
     * Map validated step data to CustomerSubmission model attributes.
     */
    private function mapStepDataToModel(array $validatedData, int $step)
    {
        $modelData      = [];
        $transliterated = app(\App\Services\TransliterationService::class);

        switch ($step) {
            case 1: // Personal Information
                $modelData = [
                    'first_name'       => $validatedData['first_name'] ?? null,
                    'middle_name'      => $validatedData['middle_name'] ?? null,
                    'last_name'        => $validatedData['last_name'] ?? null,
                    'last_name_native' => $validatedData['last_name_native'] ?? null,
                    'email'            => $validatedData['email'] ?? null,
                    'phone'            => $validatedData['phone'] ?? null,
                    'birth_date'       => $validatedData['birth_date'] ? Carbon::createFromFormat('Y-m-d', $validatedData['birth_date'])->startOfDay() : null,
                ];

                $modelData['endorsements'] = ["spei", "base", "sepa"];

                $modelData['transliterated_first_name']  = $transliterated->needsTransliteration($validatedData['first_name'])['transliterated'] ?? null;
                $modelData['transliterated_middle_name'] = $transliterated->needsTransliteration($validatedData['middle_name'])['transliterated'] ?? null;
                $modelData['transliterated_last_name']   = $transliterated->needsTransliteration($validatedData['last_name'])['transliterated'] ?? null;
                break;
            case 2: // Address
                if (! empty($validatedData['residential_address'])) {
                    $modelData['residential_address'] = array_filter([
                        'street_line_1' => $validatedData['residential_address']['street_line_1'] ?? null,
                        'street_line_2' => $validatedData['residential_address']['street_line_2'] ?? null,
                        'city'          => $validatedData['residential_address']['city'] ?? null,
                        'state'         => $validatedData['residential_address']['state'] ?? null,
                        'postal_code'   => $validatedData['residential_address']['postal_code'] ?? null,
                        'country'       => $validatedData['residential_address']['country'] ?? null,
                    ], function ($value) {return $value !== null && $value !== '';});
                    if (empty($modelData['residential_address'])) {
                        $modelData['residential_address'] = null;
                    }
                } else {
                    $modelData['residential_address'] = null;
                }
                // Handle transliterated address similarly if needed
                break;
            case 3: // Identification
                if (! empty($validatedData['identifying_information']) && is_array($validatedData['identifying_information'])) {
                    $modelData['identifying_information'] = [];
                    foreach ($validatedData['identifying_information'] as $info) {
                        if (! empty($info['type'])) {
                            $docInfo = array_filter([
                                'type'            => $info['type'],
                                'issuing_country' => $info['issuing_country'] ?? null,
                                'number'          => $info['number'] ?? null,
                                'description'     => $info['description'] ?? null,
                                'image_front'     => $info['image_front'] ?? null,
                                'image_back'      => $info['image_back'] ?? null,
                                'expiration_date' => $info['expiration_date'] ?? null,
                            ], function ($value) {return $value !== null && $value !== '';});
                            $modelData['identifying_information'][] = $docInfo;
                        }
                    }
                    if (empty($modelData['identifying_information'])) {
                        $modelData['identifying_information'] = null;
                    }
                } else {
                    $modelData['identifying_information'] = null;
                }
                break;
            case 4: // Employment & Finances
                $modelData = [
                    'employment_status'             => $validatedData['employment_status'] ?? null,
                    'most_recent_occupation_code'   => $validatedData['most_recent_occupation'] ?? null,
                    'expected_monthly_payments_usd' => $validatedData['expected_monthly_payments_usd'] ?? null,
                    'source_of_funds'               => $validatedData['source_of_funds'] ?? null,
                    'account_purpose'               => $validatedData['account_purpose'] ?? null,
                    'account_purpose_other'         => $validatedData['account_purpose_other'] ?? null,
                    'acting_as_intermediary'        => $validatedData['acting_as_intermediary'] ?? null,
                ];
                break;
            case 5: // Review & Submit
                        // If there's data to save on this step (e.g., endorsements)
                        // $modelData['endorsements'] = $validatedData['endorsements'] ?? null;
                break;
        }

        return $modelData;
    }

    // --- API Endpoints for Frontend Data (Dropdowns etc.) ---
    // These remain the same as in your previous controller
    public function getOccupations()
    {return response()->json(config('bridge_data.occupations'));}
    public function getAccountPurposes()
    {return response()->json(config('bridge_data.account_purposes'));}
    public function getSourceOfFunds()
    {return response()->json(config('bridge_data.source_of_funds'));}
    public function getCountries()
    {return response()->json(config('bridge_data.countries'));}
    public function getSubdivisions($countryCode)
    {
        $subdivisions = config('bridge_data.subdivisions_by_country');
        return response()->json($subdivisions[strtoupper($countryCode)] ?? []);
    }
    public function getIdentificationTypesByCountry($countryCode)
    {
        $identificationTypesByCountry = config('bridge_data.identification_types_by_country');
        return response()->json($identificationTypesByCountry[strtoupper($countryCode)] ?? [['type' => 'other', 'description' => 'Please provide a description of the document being provided']]);
    }
}
