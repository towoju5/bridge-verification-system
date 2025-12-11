<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SubmitBusinessToBorderless;
use App\Jobs\SubmitBusinessToNoah;
use App\Jobs\SubmitBusinessToTazapay;
use App\Jobs\SubmitUBODocumentsToBorderless;
use App\Models\BusinessCustomer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusinessCustomerController extends Controller
{
    private function getCustomerBySession()
    {
        $request = new Request;
        $sessionId = $request->header('X-Session-ID') ?? session('business_customer_session_id');
        if (! $sessionId) {
            return null;
        }

        return BusinessCustomer::where('session_id', $sessionId)->first();
    }

    public function step1(Request $request)
    {
        $validated = $request->validate([
            'business_legal_name'  => 'required|string|max:1024',
            'business_trade_name'  => 'required|string|max:1024',
            'business_description' => 'required|string|max:1024',
            'email'                => 'required|email',
            'business_type'        => 'required|string',
            'primary_website'      => 'nullable|url',
            'is_dao'               => 'boolean',
            'business_industry'    => 'required|string',
            'customer_id'          => 'nullable|string',
        ]);

        $sessionId = $request->customer_id ?? \Str::uuid();
        session(['business_customer_session_id' => $sessionId]);

        BusinessCustomer::firstOrCreate(array_merge($validated, [
            'session_id'          => $sessionId,
            'type'                => 'business',
            'signed_agreement_id' => session('customer_submission_id'),
            'user_agent'          => $request->userAgent(),
            'ip_address'          => $request->ip(),
            'customer_id'         => session('customer_submission_id'),
        ]));

        return response()->json(['success' => true, 'session_id' => $sessionId]);
    }

    public function step2(Request $request)
    {
        $validated = $request->validate([
            'registered_address.street_line_1'         => 'required|string',
            'registered_address.city'                  => 'required|string',
            'registered_address.country'               => 'required|string|size:2',
            'registered_address.proof_of_address_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',

            'physical_address.street_line_1'           => 'required|string',
            'physical_address.city'                    => 'required|string',
            'physical_address.country'                 => 'required|string|size:2',
            'physical_address.proof_of_address_file'   => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session', 'session_id' => session('business_customer_session_id')], 400);
        }

        $registered = $request->input('registered_address', []);
        $physical   = $request->input('physical_address', []);

        // Handle Registered Address Proof of Address File
        if ($request->hasFile('registered_address.proof_of_address_file')) {
            $registered['proof_of_address_file'] = $request->file('registered_address.proof_of_address_file')
                ->store('proof_of_address/registered', 'public');
        } elseif (! empty($registered['proof_of_address_file']) && is_string($registered['proof_of_address_file'])) {
            // keep existing path if string already provided
        } else {
            $registered['proof_of_address_file'] = null;
        }

        // Handle Physical Address Proof of Address File
        if ($request->hasFile('physical_address.proof_of_address_file')) {
            $physical['proof_of_address_file'] = $request->file('physical_address.proof_of_address_file')
                ->store('proof_of_address/physical', 'public');
        } elseif (! empty($physical['proof_of_address_file']) && is_string($physical['proof_of_address_file'])) {
            // keep existing path if string already provided
        } else {
            $physical['proof_of_address_file'] = null;
        }

        $customer->update([
            'registered_address' => $registered,
            'physical_address'   => $physical,
        ]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step3(Request $request)
    {
        $validated = $request->validate([
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
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update([
            'associated_persons' => $request->input('associated_persons'),
        ]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step4(Request $request)
    {
        $rules = [
            'account_purpose'                     => ['required', Rule::in(array_keys(config('bridge_data.account_purposes')))],
            'account_purpose_other'               => 'required_if:account_purpose,Other|nullable|string',
            'source_of_funds'                     => ['required', Rule::in(array_keys(config('bridge_data.source_of_funds')))],
            'high_risk_activities'                => 'required|array',
            'high_risk_activities.*'              => 'string',
            'high_risk_activities_explanation'    => 'string|nullable',
            'conducts_money_services'             => 'boolean',
            'conducts_money_services_description' => 'required_if:conducts_money_services,true|string',
            'compliance_screening_explanation'    => 'required_if:conducts_money_services,true|string',
            'estimated_annual_revenue_usd'        => 'nullable|string',
            'expected_monthly_payments_usd'       => 'nullable|integer|min:0',
            'operates_in_prohibited_countries'    => 'nullable|in:yes,no',
            'ownership_threshold'                 => 'nullable|integer|min:5|max:25',
            'has_material_intermediary_ownership' => 'boolean',
        ];
        $validated = $request->validate($rules);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update([
            'account_information' => $validated,
        ]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step5(Request $request)
    {
        $validated = $request->validate([
            'regulated_activity.regulated_activities_description'     => 'nullable|string',
            'regulated_activity.primary_regulatory_authority_country' => 'nullable|string|size:2',
            'regulated_activity.primary_regulatory_authority_name'    => 'nullable|string',
            'regulated_activity.license_number'                       => 'nullable|string',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update([
            'regulated_activity' => $request->input('regulated_activity'),
        ]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step6(Request $request)
    {
        $validated = $request->validate([
            'documents'               => 'array|required',
            'documents.*.purposes'    => 'array|required',
            'documents.*.file'        => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'documents.*.description' => 'required|string',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $documents = [];
        foreach ($request->input('documents', []) as $index => $doc) {
            $filePath = null;

            if ($request->hasFile("documents.$index.file")) {
                $file     = $request->file("documents.$index.file");
                $filePath = $file->store('business_documents', 'public'); // stored in storage/app/public/business_documents
            } elseif (isset($doc['file'])) {
                $filePath = $doc['file']; // keep string if already path/url
            }

            $documents[] = [
                'purposes'    => $doc['purposes'] ?? [],
                'file'        => $filePath,
                'description' => $doc['description'] ?? null,
            ];
        }

        $customer->update(['documents' => $documents]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step7(Request $request)
    {
        $validated = $request->validate([
            'identifying_information'                   => 'required|array|min:1',
            'identifying_information.*.type'            => 'required|string',
            'identifying_information.*.issuing_country' => 'required|string|size:2',
            'identifying_information.*.number'          => 'required|string',
            'identifying_information.*.expiration'      => 'nullable|date',
            'identifying_information.*.file'            => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $infos = [];
        foreach ($request->input('identifying_information', []) as $index => $info) {
            $filePath = null;

            if ($request->hasFile("identifying_information.$index.file")) {
                $file     = $request->file("identifying_information.$index.file");
                $filePath = $file->store('identifying_information', 'public');
            } elseif (isset($info['file'])) {
                $filePath = $info['file']; // keep if already stored
            }

            $infos[] = array_merge($info, ['file' => $filePath]);
        }

        $customer->update(['identifying_information' => $infos]);

        return response()->json(['success' => true, 'data' => $customer, 'business_details' => $customer, 'initialData' => $customer]);
    }

    public function step8(Request $request)
    {
        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $data = BusinessCustomer::where('session_id', $customer->session_id)->first();

        $arr = [
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => config('bridge_data.account_purposes'),
            'sourceOfFunds'                => config('bridge_data.source_of_funds'),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
            'currentStep'                  => 1,
            'maxSteps'                     => 8,
            'customerData'                 => $data, // Pass the full model instance
        ];

        return response()->json(['data' => $customer, 'business_details' => $data, 'initialData' => $arr]);
    }

    public function submit(Request $request)
    {
        $customer = $this->getCustomerBySession();
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->status = 'submitted';
        if (null == $customer->customer_id) {
            $customer->customer_id = $customer->session_id;
        }
        $customer->save();

        $customer = $customer->toArray();
        dispatch(new SubmitBusinessToNoah($customer))->afterResponse();
        dispatch(new SubmitBusinessToBorderless($customer))->afterResponse();
        dispatch(new SubmitBusinessToTazapay($customer))->afterResponse();

        return response()->json([
            'success' => true,
            'message' => 'KYB submitted successfully.',
        ]);
    }

    public function submitAll(Request $request)
    {
        // Validate all fields across all steps
        $validated = $request->validate([
            // Step 1
            'business_legal_name'                                     => 'required|string|max:1024',
            'business_trade_name'                                     => 'required|string|max:1024',
            'business_description'                                    => 'required|string|max:1024',
            'email'                                                   => 'required|email',
            'business_type'                                           => 'required|string',
            'primary_website'                                         => 'nullable|url',
            'is_dao'                                                  => 'boolean',
            'business_industry'                                       => 'required|string',
            'customer_id'                                             => 'required|string', // used as session_id

            // Step 2
            'registered_address.street_line_1'                        => 'required|string',
            'registered_address.city'                                 => 'required|string',
            'registered_address.country'                              => 'required|string|size:2',
            'registered_address.proof_of_address_file'                => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',

            'physical_address.street_line_1'                          => 'required|string',
            'physical_address.city'                                   => 'required|string',
            'physical_address.country'                                => 'required|string|size:2',
            'physical_address.proof_of_address_file'                  => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',

            // Step 3
            'associated_persons'                                      => 'required|array',
            'associated_persons.*.first_name'                         => 'required|string',
            'associated_persons.*.last_name'                          => 'required|string',
            'associated_persons.*.email'                              => 'required|email',
            'associated_persons.*.residential_address.street_line_1'  => 'required|string',
            'associated_persons.*.residential_address.city'           => 'required|string',
            'associated_persons.*.residential_address.country'        => 'required|string|size:2',

            // Step 4
            'account_purpose'                                         => 'required|string',
            'source_of_funds'                                         => 'required|string',
            'high_risk_activities'                                    => 'required|array',
            'estimated_annual_revenue_usd'                            => 'nullable|string',
            'expected_monthly_payments_usd'                           => 'nullable|integer|min:0',

            // Step 5
            'regulated_activity.regulated_activities_description'     => 'nullable|string',
            'regulated_activity.primary_regulatory_authority_country' => 'nullable|string|size:2',
            'regulated_activity.primary_regulatory_authority_name'    => 'nullable|string',
            'regulated_activity.license_number'                       => 'nullable|string',

            // Step 6
            'documents'                                               => 'array|required',
            'documents.*.purposes'                                    => 'array|required',
            'documents.*.file'                                        => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'documents.*.description'                                 => 'required|string',

            // Step 7
            'identifying_information'                                 => 'array',
            'identifying_information.*.type'                          => 'required|string',
            'identifying_information.*.issuing_country'               => 'required|string|size:2',
            'identifying_information.*.number'                        => 'required|string',
            'identifying_information.*.expiration'                    => 'nullable|date',
            'identifying_information.*.file'                          => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $sessionId = $validated['customer_id'];

        // Find or create customer
        $customer = BusinessCustomer::firstOrNew(['session_id' => $sessionId]);

        // Step 1 data
        $customer->fill([
            'business_legal_name'  => $validated['business_legal_name'],
            'business_trade_name'  => $validated['business_trade_name'],
            'business_description' => $validated['business_description'],
            'email'                => $validated['email'],
            'business_type'        => $validated['business_type'],
            'primary_website'      => $validated['primary_website'] ?? null,
            'is_dao'               => $validated['is_dao'] ?? false,
            'business_industry'    => $validated['business_industry'],
            'session_id'           => $sessionId,
        ]);

        // Step 2: Handle address files
        $registered = $validated['registered_address'];
        $physical   = $validated['physical_address'];

        if ($request->hasFile('registered_address.proof_of_address_file')) {
            $registered['proof_of_address_file'] = $request->file('registered_address.proof_of_address_file')
                ->store('proof_of_address/registered', 'public');
        } else {
            $registered['proof_of_address_file'] = null;
        }

        if ($request->hasFile('physical_address.proof_of_address_file')) {
            $physical['proof_of_address_file'] = $request->file('physical_address.proof_of_address_file')
                ->store('proof_of_address/physical', 'public');
        } else {
            $physical['proof_of_address_file'] = null;
        }

        $customer->registered_address = $registered;
        $customer->physical_address   = $physical;

        // Step 3
        $customer->associated_persons = $validated['associated_persons'];

        // Step 4
        $customer->account_information = [
            'account_purpose'               => $validated['account_purpose'],
            'source_of_funds'               => $validated['source_of_funds'],
            'high_risk_activities'          => $validated['high_risk_activities'],
            'estimated_annual_revenue_usd'  => $validated['estimated_annual_revenue_usd'] ?? null,
            'expected_monthly_payments_usd' => $validated['expected_monthly_payments_usd'] ?? null,
        ];

        // Step 5
        $customer->regulated_activity = $validated['regulated_activity'] ?? null;

        // Step 6: Documents with files
        $documents = [];
        foreach ($validated['documents'] as $index => $doc) {
            $filePath = null;
            if ($request->hasFile("documents.$index.file")) {
                $filePath = $request->file("documents.$index.file")->store('business_documents', 'public');
            }
            $documents[] = [
                'purposes'    => $doc['purposes'],
                'file'        => $filePath,
                'description' => $doc['description'],
            ];
        }
        $customer->documents = $documents;

        // Step 7: Identifying info with files
        $identifyingInfo = [];
        foreach ($validated['identifying_information'] as $index => $info) {
            $filePath = null;
            if ($request->hasFile("identifying_information.$index.file")) {
                $filePath = $request->file("identifying_information.$index.file")
                    ->store('identifying_information', 'public');
            }
            $identifyingInfo[] = array_merge($info, ['file' => $filePath]);
        }
        $customer->identifying_information = $identifyingInfo;

        // Mark as submitted
        $customer->is_submitted = true;

        // Save
        $customer->save();

        return response()->json([
            'success'    => true,
            'message'    => 'Business KYC submitted successfully.',
            'session_id' => $sessionId,
        ]);
    }
}
