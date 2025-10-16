<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessCustomer;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BusinessCustomerController extends Controller
{
    private function getCustomerBySession(Request $request)
    {
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
        ]);

        $sessionId = (string) Str::uuid();
        session(['business_customer_session_id' => $sessionId]);

        BusinessCustomer::create(array_merge($validated, [
            'session_id' => $sessionId,
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
            return response()->json(['error' => 'Invalid session'], 400);
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

        return response()->json(['success' => true]);
    }

    public function step3(Request $request)
    {
        $validated = $request->validate([
            'associated_persons'                                     => 'required|array',
            'associated_persons.*.first_name'                        => 'required|string',
            'associated_persons.*.last_name'                         => 'required|string',
            'associated_persons.*.email'                             => 'required|email',
            'associated_persons.*.residential_address.street_line_1' => 'required|string',
            'associated_persons.*.residential_address.city'          => 'required|string',
            'associated_persons.*.residential_address.country'       => 'required|string|size:2',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update([
            'associated_persons' => $request->input('associated_persons'),
        ]);

        return response()->json(['success' => true]);
    }

    public function step4(Request $request)
    {
        $validated = $request->validate([
            'account_purpose'               => 'required|string',
            'source_of_funds'               => 'required|string',
            'high_risk_activities'          => 'required|array',
            'estimated_annual_revenue_usd'  => 'nullable|string',
            'expected_monthly_payments_usd' => 'nullable|integer|min:0',
        ]);

        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update([
            'account_information' => $validated,
        ]);

        return response()->json(['success' => true]);
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

        return response()->json(['success' => true]);
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

        return response()->json(['success' => true]);
    }

    public function step7(Request $request)
    {
        $validated = $request->validate([
            'identifying_information'                   => 'array',
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

        return response()->json(['success' => true]);
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

        return response()->json(['data' => $customer, 'data' => $data, 'initialData' => $arr]);
    }

    public function submit(Request $request)
    {
        $customer = $this->getCustomerBySession($request);
        if (! $customer) {
            return response()->json(['error' => 'Invalid session'], 400);
        }

        $customer->update(['is_submitted' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Business customer created successfully.',
        ]);
    }
}
