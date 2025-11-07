<?php

namespace App\Http\Controllers;

use App\Models\CustomerSubmission;
use App\Models\BusinessCustomer;
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

    public function showAccountTypeSelection()
    {
        return Inertia::render('Business/BusinessCustomerForm');
    }

    // =============== INDIVIDUAL VERIFICATION (existing logic) ===============
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
        $step = (int) $step;
        $maxSteps = 5;

        if ($step < 1 || $step > $maxSteps) {
            return redirect()->route('customer.verify.step', ['step' => 1]);
        }

        $submissionId = session('customer_submission_id');
        if (!$submissionId) {
            return redirect()->route('account.type')->with('error', 'No session ID');
        }

        $customerSubmission = CustomerSubmission::find($submissionId);
        if (!$customerSubmission || $customerSubmission->type !== 'individual') {
            session()->forget('customer_submission_id');
            return redirect()->route('account.type');
        }

        return Inertia::render('Business/BusinessCustomerForm', [
            'initialData' => [
                'occupations' => config('bridge_data.occupations'),
                'accountPurposes' => config('bridge_data.account_purposes'),
                'sourceOfFunds' => config('bridge_data.source_of_funds'),
                'countries' => config('bridge_data.countries'),
                'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
            ],
            'currentStep' => $step,
            'maxSteps' => $maxSteps,
            'customerData' => $customerSubmission,
            'submissionId' => $customerSubmission->id,
        ]);
    }

    public function saveIndividualVerificationStep(Request $request, $step)
    {
        $step = (int) $step;
        $maxSteps = 5;

        if ($step < 1 || $step > $maxSteps) {
            return response()->json(['success' => false, 'message' => 'Invalid step.'], 400);
        }

        $submissionId = session('customer_submission_id');
        if (!$submissionId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $customerSubmission = CustomerSubmission::find($submissionId);
        if (!$customerSubmission || $customerSubmission->type !== 'individual') {
            session()->forget('customer_submission_id');
            return response()->json(['success' => false, 'message' => 'Invalid record.'], 400);
        }

        try {
            $validatedData = $this->validateIndividualStepData($request, $step);
            $stepData = $this->mapIndividualStepDataToModel($validatedData, $step);
            $customerSubmission->update($stepData);

            $nextStep = ($step < $maxSteps) ? $step + 1 : null;
            $isComplete = ($step === $maxSteps);

            return response()->json([
                'success' => true,
                'message' => "Individual step {$step} saved.",
                'next_step' => $nextStep,
                'is_complete' => $isComplete,
                'customer_data' => $customerSubmission->fresh(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Individual Step Save Failed', [
                'step' => $step,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['success' => false, 'message' => 'Save failed.'], 500);
        }
    }

    private function validateIndividualStepData(Request $request, int $step)
    {
        $rules = [];
        switch ($step) {
            case 1:
                $rules = [
                    'first_name' => ['nullable', 'string', 'between:2,1024'],
                    'middle_name' => ['nullable', 'string', 'between:1,1024'],
                    'last_name' => ['nullable', 'string', 'between:1,1024'],
                    'last_name_native' => ['nullable', 'string', 'between:1,1024'],
                    'email' => ['nullable', 'string', 'between:1,1024', 'email'],
                    'phone' => ['nullable', 'string', 'between:1,1024', 'regex:/^\+\d{1,15}$/'],
                    'birth_date' => ['nullable', 'date_format:Y-m-d', 'before:today'],
                ];
                break;
            case 2:
                $rules = [
                    'residential_address.street_line_1' => ['required', 'string', 'between:1,256'],
                    'residential_address.street_line_2' => ['nullable', 'string', 'between:1,256'],
                    'residential_address.city' => ['required', 'string', 'between:1,256'],
                    'residential_address.state' => ['required', 'string'],
                    'residential_address.postal_code' => ['required', 'string', 'between:1,16'],
                    'residential_address.country' => ['required', 'string', 'size:2'],
                ];
                break;
            case 3:
                $rules = [
                    'identifying_information' => ['required', 'array'],
                    'identifying_information.*.type' => ['required_with:identifying_information', 'string'],
                    'identifying_information.*.issuing_country' => ['required_with:identifying_information', 'string', 'size:2'],
                    'identifying_information.*.number' => ['required', 'string'],
                    'identifying_information.*.expiration_date' => ['required', 'date_format:Y-m-d', 'after:today'],
                ];
                break;
            case 4:
                $rules = [
                    'employment_status' => ['required', 'string'],
                    'most_recent_occupation' => ['required', 'string'],
                    'expected_monthly_payments_usd' => ['required', 'string'],
                    'source_of_funds' => ['required', Rule::in(config('bridge_data.source_of_funds'))],
                    'account_purpose' => ['required', Rule::in(config('bridge_data.account_purposes'))],
                    'account_purpose_other' => ['required_if:account_purpose,other', 'string'],
                    'acting_as_intermediary' => ['required', 'boolean'],
                ];
                if ($request->has('most_recent_occupation')) {
                    $occupationCodes = Arr::pluck(config('bridge_data.occupations'), 'code');
                    $rules['most_recent_occupation'][] = Rule::in($occupationCodes);
                }
                break;
            case 5:
                // Review
                break;
        }
        return $request->validate($rules);
    }

    private function mapIndividualStepDataToModel(array $validatedData, int $step)
    {
        $modelData = [];
        $transliterated = app(\App\Services\TransliterationService::class);

        switch ($step) {
            case 1:
                $modelData = [
                    'first_name' => $validatedData['first_name'] ?? null,
                    'middle_name' => $validatedData['middle_name'] ?? null,
                    'last_name' => $validatedData['last_name'] ?? null,
                    'last_name_native' => $validatedData['last_name_native'] ?? null,
                    'email' => $validatedData['email'] ?? null,
                    'phone' => $validatedData['phone'] ?? null,
                    'birth_date' => $validatedData['birth_date'] ? Carbon::createFromFormat('Y-m-d', $validatedData['birth_date'])->startOfDay() : null,
                ];
                $modelData['endorsements'] = ["spei", "base", "sepa"];
                $modelData['transliterated_first_name'] = $transliterated->needsTransliteration($validatedData['first_name'])['transliterated'] ?? null;
                $modelData['transliterated_middle_name'] = $transliterated->needsTransliteration($validatedData['middle_name'])['transliterated'] ?? null;
                $modelData['transliterated_last_name'] = $transliterated->needsTransliteration($validatedData['last_name'])['transliterated'] ?? null;
                break;
            case 2:
                if (!empty($validatedData['residential_address'])) {
                    $modelData['residential_address'] = array_filter([
                        'street_line_1' => $validatedData['residential_address']['street_line_1'] ?? null,
                        'street_line_2' => $validatedData['residential_address']['street_line_2'] ?? null,
                        'city' => $validatedData['residential_address']['city'] ?? null,
                        'state' => $validatedData['residential_address']['state'] ?? null,
                        'postal_code' => $validatedData['residential_address']['postal_code'] ?? null,
                        'country' => $validatedData['residential_address']['country'] ?? null,
                    ]);
                }
                break;
            case 3:
                if (!empty($validatedData['identifying_information']) && is_array($validatedData['identifying_information'])) {
                    $modelData['identifying_information'] = [];
                    foreach ($validatedData['identifying_information'] as $info) {
                        if (!empty($info['type'])) {
                            $docInfo = array_filter([
                                'type' => $info['type'],
                                'issuing_country' => $info['issuing_country'] ?? null,
                                'number' => $info['number'] ?? null,
                                'description' => $info['description'] ?? null,
                                'image_front' => $info['image_front'] ?? null,
                                'image_back' => $info['image_back'] ?? null,
                                'expiration_date' => $info['expiration_date'] ?? null,
                            ]);
                            $modelData['identifying_information'][] = $docInfo;
                        }
                    }
                }
                break;
            case 4:
                $modelData = [
                    'employment_status' => $validatedData['employment_status'] ?? null,
                    'most_recent_occupation_code' => $validatedData['most_recent_occupation'] ?? null,
                    'expected_monthly_payments_usd' => $validatedData['expected_monthly_payments_usd'] ?? null,
                    'source_of_funds' => $validatedData['source_of_funds'] ?? null,
                    'account_purpose' => $validatedData['account_purpose'] ?? null,
                    'account_purpose_other' => $validatedData['account_purpose_other'] ?? null,
                    'acting_as_intermediary' => $validatedData['acting_as_intermediary'] ?? null,
                ];
                break;
        }
        return $modelData;
    }

    // =============== BUSINESS VERIFICATION (new logic) ===============
    public function startBusinessVerification(Request $request)
    {
        $signedAgreementId = $request->signed_agreement_id ?? Str::uuid();
        $business = BusinessCustomer::create(['signed_agreement_id' => $signedAgreementId]);
        session(['business_customer_id' => $business->id]);

        return Inertia::render('Business/BusinessCustomerForm', [
            'currentStep' => 1,
            'maxSteps' => 8,
            'businessData' => $business,
            'submissionId' => $business->id,
            'occupations' => config('bridge_data.occupations'),
            'accountPurposes' => config('bridge_data.account_purposes'),
            'sourceOfFunds' => config('bridge_data.source_of_funds'),
            'countries' => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
        ]);
    }

    public function saveBusinessVerificationStep(Request $request, $step)
    {
        $businessId = session('business_customer_id');
        if (!$businessId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $business = BusinessCustomer::find($businessId);
        if (!$business) {
            session()->forget('business_customer_id');
            return response()->json(['success' => false, 'message' => 'Business record not found.'], 404);
        }

        try {
            $validated = $this->validateBusinessStepData($request, $step);
            $data = $this->mapBusinessStepDataToModel($validated, $step);
            $business->update($data);

            $nextStep = ($step < 8) ? $step + 1 : null;
            $isComplete = ($step === 8);

            return response()->json([
                'success' => true,
                'message' => "Business step {$step} saved.",
                'next_step' => $nextStep,
                'is_complete' => $isComplete,
                'business_data' => $business->fresh(),
            ]);
        } catch (\Exception $e) {
            \Log::error('Business KYB Step Save Failed', ['step' => $step, 'error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Save failed.'], 500);
        }
    }

    private function validateBusinessStepData(Request $request, int $step)
    {
        $rules = [];
        switch ($step) {
            case 1:
                $rules = [
                    'business_legal_name' => 'required|string|max:255',
                    'business_trade_name' => 'required|string|max:255',
                    'business_description' => 'required|string|max:1000',
                    'email' => 'required|email',
                    'business_type' => ['required', Rule::in(['cooperative', 'corporation', 'llc', 'partnership', 'sole_prop', 'trust', 'other'])],
                    'registration_number' => 'required|string|max:100',
                    'incorporation_date' => 'required|date|before:today',
                    'tax_id' => 'nullable|string|max:100',
                    'phone_calling_code' => 'nullable|regex:/^\+[1-9]\d{0,3}$/',
                    'phone_number' => 'nullable|string|regex:/^\d{7,15}$/',
                    'business_industry' => 'nullable|string',
                    'primary_website' => 'nullable|url',
                    'is_dao' => 'boolean',
                    'statement_descriptor' => 'nullable|string|max:22',
                ];
                break;
            case 2:
                $rules = [
                    'registered_address.street_line_1' => 'required|string|max:255',
                    'registered_address.city' => 'required|string|max:100',
                    'registered_address.country' => 'required|string|size:2',
                    'physical_address.street_line_1' => 'required|string|max:255',
                    'physical_address.city' => 'required|string|max:100',
                    'physical_address.country' => 'required|string|size:2',
                ];
                break;
            case 3:
                $rules = [
                    'associated_persons' => 'required|array|min:1',
                    'associated_persons.*.first_name' => 'required|string|max:100',
                    'associated_persons.*.last_name' => 'required|string|max:100',
                    'associated_persons.*.birth_date' => 'required|date|before:today',
                    'associated_persons.*.nationality' => 'required|string|size:2',
                    'associated_persons.*.email' => 'required|email',
                    'associated_persons.*.ownership_percentage' => 'required|numeric|min:0|max:100',
                    'associated_persons.*.residential_address.street_line_1' => 'required|string|max:255',
                    'associated_persons.*.residential_address.city' => 'required|string|max:100',
                    'associated_persons.*.residential_address.country' => 'required|string|size:2',
                ];
                break;
            case 4:
                $rules = [
                    'account_purpose' => ['required', Rule::in(config('bridge_data.account_purposes'))],
                    'account_purpose_other' => 'required_if:account_purpose,other|string',
                    'source_of_funds' => ['required', Rule::in([
                        'business_loans', 'business_revenue', 'grants', 'inter_company_funds',
                        'investment_proceeds', 'legal_settlement', 'owners_capital', 'pension_retirement',
                        'sale_of_assets', 'sales_of_goods_and_services', 'tax_refund', 'third_party_funds', 'treasury_reserves'
                    ])],
                    'high_risk_activities' => 'required|array',
                    'high_risk_activities.*' => 'string',
                    'high_risk_activities_explanation' => 'required_if:high_risk_activities,*,!=,none_of_the_above|string',
                    'conducts_money_services' => 'boolean',
                    'conducts_money_services_description' => 'required_if:conducts_money_services,true|string',
                    'compliance_screening_explanation' => 'required_if:conducts_money_services,true|string',
                    'expected_monthly_payments_usd' => 'nullable|integer|min:0',
                    'has_material_intermediary_ownership' => 'boolean',
                ];
                break;
            case 5:
                $rules = [
                    'regulated_activities_description' => 'nullable|string',
                    'primary_regulatory_authority_country' => 'nullable|string|size:2',
                    'primary_regulatory_authority_name' => 'nullable|string',
                    'license_number' => 'nullable|string',
                ];
                break;
            case 6:
                $rules = [
                    'documents' => 'required|array',
                    'documents.*.purposes' => 'required|array|min:1',
                    'documents.*.description' => 'required|string',
                ];
                break;
            case 7:
                $rules = [
                    'identifying_information' => 'required|array|min:1',
                    'identifying_information.*.type' => 'required|string',
                    'identifying_information.*.issuing_country' => 'required|string|size:2',
                    'identifying_information.*.number' => 'required|string',
                    'identifying_information.*.expiration' => 'required|date|after:today',
                ];
                break;
            case 8:
                return [];
        }
        return $request->validate($rules);
    }

    private function mapBusinessStepDataToModel(array $data, int $step)
    {
        switch ($step) {
            case 1:
                $out = Arr::only($data, [
                    'business_legal_name', 'business_trade_name', 'business_description', 'email',
                    'business_type', 'registration_number', 'tax_id', 'statement_descriptor',
                    'phone_calling_code', 'phone_number', 'business_industry', 'primary_website',
                    'is_dao'
                ]);
                if (isset($data['incorporation_date'])) {
                    $out['incorporation_date'] = Carbon::createFromFormat('Y-m-d', $data['incorporation_date']);
                }
                return $out;
            case 2:
                return [
                    'registered_address' => json_encode(Arr::get($data, 'registered_address')),
                    'physical_address' => json_encode(Arr::get($data, 'physical_address')),
                ];
            case 3:
                return ['associated_persons' => json_encode(Arr::get($data, 'associated_persons'))];
            case 4:
                $out = Arr::only($data, [
                    'account_purpose', 'account_purpose_other', 'source_of_funds',
                    'high_risk_activities_explanation', 'conducts_money_services',
                    'conducts_money_services_description', 'compliance_screening_explanation',
                    'expected_monthly_payments_usd', 'has_material_intermediary_ownership',
                    'estimated_annual_revenue_usd', 'operates_in_prohibited_countries', 'ownership_threshold'
                ]);
                if (isset($data['high_risk_activities'])) {
                    $out['high_risk_activities'] = json_encode($data['high_risk_activities']);
                }
                return $out;
            case 5:
                return Arr::only($data, [
                    'regulated_activities_description', 'primary_regulatory_authority_country',
                    'primary_regulatory_authority_name', 'license_number'
                ]);
            case 6:
                return ['documents' => json_encode($data['documents'])];
            case 7:
                return ['identifying_information' => json_encode($data['identifying_information'])];
            case 8:
                return ['status' => 'completed'];
            default:
                return [];
        }
    }

    // =============== SHARED DROPDOWN ENDPOINTS ===============
    public function getOccupations() { return response()->json(config('bridge_data.occupations')); }
    public function getAccountPurposes() { return response()->json(config('bridge_data.account_purposes')); }
    public function getSourceOfFunds() { return response()->json(config('bridge_data.source_of_funds')); }
    public function getCountries() { return response()->json(config('bridge_data.countries')); }
    public function getSubdivisions($countryCode) {
        $subdivisions = config('bridge_data.subdivisions_by_country');
        return response()->json($subdivisions[strtoupper($countryCode)] ?? []);
    }
    public function getIdentificationTypesByCountry($countryCode) {
        $identificationTypesByCountry = config('bridge_data.identification_types_by_country');
        return response()->json($identificationTypesByCountry[strtoupper($countryCode)] ?? [['type' => 'other', 'description' => 'Other']]);
    }

    public function getBusinessReviewData()
    {
        $id = session('business_customer_id');
        $business = BusinessCustomer::find($id);
        if (!$business) return response()->json(['error' => 'Not found'], 404);
        return response()->json(['data' => $business]);
    }
}