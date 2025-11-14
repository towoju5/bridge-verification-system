<?php
namespace App\Http\Controllers;

use App\Jobs\SubmitBusinessKycToPlatforms;
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

    // =============== BUSINESS VERIFICATION ===============

    public function startBusinessVerification(Request $request)
    {
        $sessionId = $request->signed_agreement_id ?? Str::uuid();

        BusinessCustomer::firstOrCreate([
            'session_id' => $sessionId,
            'type'       => 'business',
            'user_agent' => $request->userAgent(),
            'ip_address' => $request->ip(),
        ]);

        $business = BusinessCustomer::where('session_id', $sessionId)->first();
        session(['business_customer_id' => $business->id]);

        return Inertia::render('Business/BusinessCustomerForm', [
            'currentStep'                  => 1,
            'maxSteps'                     => 8,
            'businessData'                 => $business,
            'submissionId'                 => $business->id,
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => array_keys(config('bridge_data.account_purposes')),
            'sourceOfFunds'                => array_keys(config('bridge_data.source_of_funds')),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
        ]);
    }

    public function saveBusinessVerificationStep(Request $request, $step)
    {
        $businessId = session('business_customer_id');
        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $business = BusinessCustomer::find($businessId);
        if (! $business) {
            session()->forget('business_customer_id');
            return response()->json(['success' => false, 'message' => 'Business record not found.'], 404);
        }

        try {
            $validated = $this->validateBusinessStepData($request, $step);
            $data      = $this->mapBusinessStepDataToModel($validated, $step);
            $business->update($data);

            $nextStep   = ($step < 8) ? $step + 1 : null;
            $isComplete = ($step === 8);

            if ($isComplete) {
                SubmitBusinessKycToPlatforms::dispatch($business)->afterResponse();
            }

            return response()->json([
                'success' => true,
                'message' => "Business step {$step} saved.",
                'next_step'     => $nextStep,
                'is_complete'   => $isComplete,
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
                    'business_legal_name'  => 'required|string|max:255',
                    'business_trade_name'  => 'required|string|max:255',
                    'business_description' => 'required|string|max:1000',
                    'email'                => 'required|email',
                    'business_type'        => 'required|in:cooperative,corporation,llc,partnership,sole_prop,trust,other',
                    'registration_number'  => 'required|string|max:100',
                    'incorporation_date'   => 'required|date|before:today',
                    'tax_id'               => 'nullable|string|max:100',
                    'phone_calling_code'   => 'nullable|regex:/^\+[1-9]\d{0,3}$/',
                    'phone_number'         => 'nullable|string|regex:/^\d{7,15}$/',
                    'business_industry'    => 'nullable|string',
                    'primary_website'      => 'nullable|url',
                    'is_dao'               => 'boolean',
                    'statement_descriptor' => 'nullable|string|max:22',
                ];
                break;

            case 2:
                $rules = [
                    'registered_address.street_line_1' => 'required|string|max:255',
                    'registered_address.city'          => 'required|string|max:100',
                    'registered_address.country'       => 'required|string|size:2',
                    'physical_address.street_line_1'   => 'required|string|max:255',
                    'physical_address.city'            => 'required|string|max:100',
                    'physical_address.country'         => 'required|string|size:2',
                ];
                break;

            case 3:
                $rules = [
                    'associated_persons'                                     => 'required|array|min:1',
                    'associated_persons.*.first_name'                        => 'required|string|max:100',
                    'associated_persons.*.last_name'                         => 'required|string|max:100',
                    'associated_persons.*.birth_date'                        => 'required|date|before:today',
                    'associated_persons.*.nationality'                       => 'required|string|size:2',
                    'associated_persons.*.email'                             => 'required|email',
                    'associated_persons.*.phone'                             => 'nullable|string',
                    'associated_persons.*.title'                             => 'nullable|string',
                    'associated_persons.*.ownership_percentage'              => 'required|numeric|min:0|max:100',
                    'associated_persons.*.relationship_established_at'       => 'nullable|date|before_or_equal:today',
                    'associated_persons.*.residential_address.street_line_1' => 'required|string|max:255',
                    'associated_persons.*.residential_address.city'          => 'required|string|max:100',
                    'associated_persons.*.residential_address.country'       => 'required|string|size:2',
                    'associated_persons.*.has_ownership'                     => 'boolean',
                    'associated_persons.*.has_control'                       => 'boolean',
                    'associated_persons.*.is_signer'                         => 'boolean',
                    'associated_persons.*.is_director'                       => 'boolean',
                ];
                break;

            case 4:
                $rules = [
                    'account_purpose'                     => ['required', Rule::in(array_keys(config('bridge_data.account_purposes')))],
                    'account_purpose_other'               => 'required_if:account_purpose,Other|nullable|string',
                    'source_of_funds'                     => ['required', Rule::in(array_keys(config('bridge_data.source_of_funds')))],
                    'high_risk_activities'                => 'required|array',
                    'high_risk_activities.*'              => 'string',
                    'high_risk_activities_explanation'    => 'required_if:high_risk_activities,*,!=,none_of_the_above|string',
                    'conducts_money_services'             => 'boolean',
                    'conducts_money_services_description' => 'required_if:conducts_money_services,true|string',
                    'compliance_screening_explanation'    => 'required_if:conducts_money_services,true|string',
                    'estimated_annual_revenue_usd'        => 'nullable|string',
                    'expected_monthly_payments_usd'       => 'nullable|integer|min:0',
                    'operates_in_prohibited_countries'    => 'nullable|in:yes,no',
                    'ownership_threshold'                 => 'nullable|integer|min:5|max:25',
                    'has_material_intermediary_ownership' => 'boolean',
                ];
                break;

            case 5:
                $rules = [
                    'regulated_activities_description'     => 'nullable|string',
                    'primary_regulatory_authority_country' => 'nullable|string|size:2',
                    'primary_regulatory_authority_name'    => 'nullable|string',
                    'license_number'                       => 'nullable|string',
                ];
                break;

            case 6:
                $rules = [
                    'documents'               => 'required|array',
                    'documents.*.purposes'    => 'required|array|min:1',
                    'documents.*.description' => 'required|string',
                ];
                break;

            case 7:
                $rules = [
                    'identifying_information'                   => 'required|array|min:1',
                    'identifying_information.*.type'            => 'required|string',
                    'identifying_information.*.issuing_country' => 'required|string|size:2',
                    'identifying_information.*.number'          => 'required|string',
                    'identifying_information.*.description'     => 'nullable|string',
                    'identifying_information.*.expiration'      => 'required|date|after:today',
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
                    'business_legal_name',
                    'business_trade_name',
                    'business_description',
                    'email',
                    'business_type',
                    'registration_number',
                    'tax_id',
                    'statement_descriptor',
                    'phone_calling_code',
                    'phone_number',
                    'business_industry',
                    'primary_website',
                    'is_dao',
                ]);
                if (isset($data['incorporation_date'])) {
                    $out['incorporation_date'] = Carbon::createFromFormat('Y-m-d', $data['incorporation_date']);
                }
                return $out;

            case 2:
                return [
                    'registered_address' => (Arr::get($data, 'registered_address')),
                    'physical_address'   => (Arr::get($data, 'physical_address')),
                ];

            case 3:
                return ['associated_persons' => (Arr::get($data, 'associated_persons'))];

            case 4:
                $out = Arr::only($data, [
                    'account_purpose',
                    'account_purpose_other',
                    'source_of_funds',
                    'high_risk_activities_explanation',
                    'conducts_money_services',
                    'conducts_money_services_description',
                    'compliance_screening_explanation',
                    'estimated_annual_revenue_usd',
                    'expected_monthly_payments_usd',
                    'operates_in_prohibited_countries',
                    'ownership_threshold',
                    'has_material_intermediary_ownership',
                ]);
                if (isset($data['high_risk_activities'])) {
                    $out['high_risk_activities'] = ($data['high_risk_activities']);
                }
                return $out;

            case 5:
                return Arr::only($data, [
                    'regulated_activities_description',
                    'primary_regulatory_authority_country',
                    'primary_regulatory_authority_name',
                    'license_number',
                ]);

            case 6:
                return ['documents' => $data['documents']];

            case 7:
                return ['identifying_information' => ($data['identifying_information'])];

            case 8:
                return ['status' => 'completed'];

            default:
                return [];
        }
    }

    // =============== SHARED DROPDOWN ENDPOINTS ===============

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
    {
        $subdivisions = config('bridge_data.subdivisions_by_country');
        return response()->json($subdivisions[strtoupper($countryCode)] ?? []);
    }
    public function getIdentificationTypesByCountry($countryCode)
    {
        $identificationTypesByCountry = config('bridge_data.identification_types_by_country');
        return response()->json($identificationTypesByCountry[strtoupper($countryCode)] ?? [['type' => 'other', 'description' => 'Other']]);
    }

    public function getBusinessReviewData()
    {
        $id       = session('business_customer_id');
        $business = BusinessCustomer::find($id);
        return $business ? response()->json(['data' => $business]) : response()->json(['error' => 'Not found'], 404);
    }
}
