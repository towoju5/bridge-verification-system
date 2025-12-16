<?php

namespace App\Http\Controllers;

use App\Jobs\SubmitBusinessKycToPlatforms;
use App\Models\BusinessCustomer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
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

    // start session & create business record
    public function startBusinessVerification(Request $request)
    {
        $sessionId = $request->customer_id; // $request->signed_agreement_id ?? Str::uuid();

        BusinessCustomer::firstOrCreate([
            'customer_id' => $request->customer_id
        ], [
            'session_id' => $request->customer_id,
            'customer_id' => $request->customer_id,
            'type'       => 'business',
            'user_agent' => $request->userAgent(),
            'ip_address' => $request->ip(),
        ]);

        $business = BusinessCustomer::where('customer_id', $sessionId)->first();
        session(['business_customer_id' => $business->id]);

        return Inertia::render('Business/BusinessCustomerForm', [
            'currentStep'                  => 1,
            'maxSteps'                     => 9,
            'businessData'                 => $business,
            'submissionId'                 => $business->id,
            'occupations'                  => config('bridge_data.occupations'),
            'accountPurposes'              => array_keys(config('bridge_data.account_purposes')),
            'sourceOfFunds'                => array_keys(config('bridge_data.source_of_funds')),
            'countries'                    => config('bridge_data.countries'),
            'identificationTypesByCountry' => config('bridge_data.identification_types_by_country'),
        ]);
    }

    /**
     * Save a step (API used by each tab)
     */
    public function saveBusinessVerificationStep(Request $request, $step)
    {
        $businessId = session('business_customer_id') ?? $request->header('X-Business-Id');
        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $business = BusinessCustomer::find($businessId);
        if (! $business) {
            session()->forget('business_customer_id');
            return response()->json(['success' => false, 'message' => 'Business record not found.'], 404);
        }

        // get rules for step
        $rules = $this->rulesForStep((int)$step);

        // special: allow files — use Validator::make
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        if (!Schema::hasColumn('business_customers', 'collections_data')) {
            Schema::table('business_customers', function (Blueprint $table) {
                $table->json('collections_data')->nullable()->after('identifying_information');
                $table->json('payouts_data')->nullable()->after('collections_data');
            });
        }

        // validated data (non-files)
        $validated = $validator->validated();

        // handle file uploads for specific steps and attach to $data
        $data = $this->mapBusinessStepDataToModel($validated, (int)$step);

        // files processing
        if (in_array((int)$step, [2, 6, 7, 8], true)) {
            // step 2: addresses proof_of_address_file (registered_address/physical_address)
            if ((int)$step === 2) {
                foreach (['registered_address', 'physical_address'] as $addr) {
                    if ($request->hasFile("{$addr}.proof_of_address_file")) {
                        $file = $request->file("{$addr}.proof_of_address_file");
                        $path = $file->store("public/business_documents/{$business->id}");
                        Arr::set($data, "{$addr}.proof_of_address_file", basename($path));
                    }
                }
            }

            // step 6: documents array => documents.*.file
            if ((int)$step === 6 && $request->has('documents')) {
                $docs = $request->input('documents', []);
                // persist files if present
                $finalDocs = [];
                foreach ($docs as $i => $doc) {
                    $d = $doc;
                    if ($request->hasFile("documents.{$i}.file")) {
                        $file = $request->file("documents.{$i}.file");
                        $path = $file->store("public/business_documents/{$business->id}");
                        $d['file'] = basename($path);
                    }
                    $finalDocs[] = $d;
                }
                $data['documents'] = $finalDocs;
            }

            // step 7: identifying_information => images
            if ((int)$step === 7 && $request->has('identifying_information')) {
                $ids = $request->input('identifying_information', []);
                $finalIds = [];
                foreach ($ids as $i => $id) {
                    $item = $id;
                    if ($request->hasFile("identifying_information.{$i}.image_front")) {
                        $front = $request->file("identifying_information.{$i}.image_front");
                        $path  = $front->store("public/business_documents/{$business->id}");
                        $item['image_front'] = basename($path);
                    }
                    if ($request->hasFile("identifying_information.{$i}.image_back")) {
                        $back = $request->file("identifying_information.{$i}.image_back");
                        $path = $back->store("public/business_documents/{$business->id}");
                        $item['image_back'] = basename($path);
                    }
                    $finalIds[] = $item;
                }
                $data['identifying_information'] = $finalIds;
            }
            if ((int) $step === 8) {

                $extra = $business->extra_documents ?? [];

                // Loop through the nested extra_documents array
                foreach ($request->file('extra_documents', []) as $index => $item) {

                    // $item is an array: [ 'file' => UploadedFile ]
                    if (isset($item['file']) && $item['file'] instanceof \Illuminate\Http\UploadedFile) {

                        $storedPath = $item['file']->store("public/business_documents/{$business->id}");

                        $extra[$index] = [
                            'type'        => $request->input("extra_documents.$index.type"),
                            'description' => $request->input("extra_documents.$index.description"),
                            'file'        => basename($storedPath),
                        ];
                    } else {
                        // If no file uploaded but metadata exists, still store metadata
                        $extra[$index] = [
                            'type'        => $request->input("extra_documents.$index.type"),
                            'description' => $request->input("extra_documents.$index.description"),
                            'file'        => $extra[$index]['file'] ?? null,
                        ];
                    }
                }

                // Save to business JSON column
                $business->extra_documents = $extra;
                $business->save();

                $data['extra_documents'] = $extra;
            }
        }

        if ($step == 'collections') {
            $data['collections_data'] = $request->all();
        }

        if ($step == 'payouts') {
            $data['payouts_data'] = $request->all();
        }

        // merge and save
        $business->fill($data);
        $business->save();

        $nextStep   = ((int)$step < 9) ? ((int)$step + 1) : null;
        $isComplete = ((int)$step === 9);

        if ($isComplete) {
            $business->status = 'completed';
            $business->save();
            SubmitBusinessKycToPlatforms::dispatch($business)->afterResponse();
        }

        return response()->json([
            'success' => true,
            'message' => "Business step {$step} saved.",
            'next_step'     => $nextStep,
            'is_complete'   => $isComplete,
            'business_data' => $business->fresh(),
        ]);
    }


    public function submitKyc()
    {
        $this->saveBusinessVerificationStep(request(), 9);
    }


    /**
     * Submit all data in a single API call (full payload + files).
     * Accepts nested arrays and files in the same shape as individual steps.
     */
    public function submitAll(Request $request)
    {
        $businessId = session('business_customer_id') ?? $request->header('X-Business-Id');
        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Session expired.'], 400);
        }

        $business = BusinessCustomer::find($businessId);
        if (! $business) {
            return response()->json(['success' => false, 'message' => 'Business record not found.'], 404);
        }

        // Collect rules for steps 1..9
        $allRules = [];
        for ($i = 1; $i <= 9; $i++) {
            $allRules = array_merge($allRules, $this->rulesForStep($i));
        }

        $validator = Validator::make($request->all(), $allRules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        // Now map step-by-step (reuse mapping), and process files similar to single-step handler
        $payload = $validator->validated();

        // Merge mapped data
        $merged = [];
        for ($s = 1; $s <= 9; $s++) {
            $mapped = $this->mapBusinessStepDataToModel($payload, $s);
            $merged = array_merge_recursive($merged, $mapped);
        }

        foreach (['registered_address', 'physical_address'] as $addr) {
            if ($request->hasFile("{$addr}.proof_of_address_file")) {
                $file = $request->file("{$addr}.proof_of_address_file");
                $path = $file->store("public/business_documents/{$business->id}");
                Arr::set($merged, "{$addr}.proof_of_address_file", basename($path));
            }
        }

        // documents array files
        if ($request->has('documents')) {
            $docs = $request->input('documents', []);
            $finalDocs = [];
            foreach ($docs as $i => $doc) {
                $d = $doc;
                if ($request->hasFile("documents.{$i}.file")) {
                    $file = $request->file("documents.{$i}.file");
                    $path = $file->store("public/business_documents/{$business->id}");
                    $d['file'] = basename($path);
                }
                $finalDocs[] = $d;
            }
            $merged['documents'] = $finalDocs;
        }

        // identifying_information images
        if ($request->has('identifying_information')) {
            $ids = $request->input('identifying_information', []);
            $finalIds = [];
            foreach ($ids as $i => $id) {
                $item = $id;
                if ($request->hasFile("identifying_information.{$i}.image_front")) {
                    $front = $request->file("identifying_information.{$i}.image_front");
                    $path  = $front->store("public/business_documents/{$business->id}");
                    $item['image_front'] = basename($path);
                }
                if ($request->hasFile("identifying_information.{$i}.image_back")) {
                    $back = $request->file("identifying_information.{$i}.image_back");
                    $path = $back->store("public/business_documents/{$business->id}");
                    $item['image_back'] = basename($path);
                }
                $finalIds[] = $item;
            }
            $merged['identifying_information'] = $finalIds;
        }

        // extra documents
        $extra = $business->extra_documents ?? [];
        if ($request->hasFile('extra_documents')) {
            $files = $request->file('extra_documents');
            foreach ($files as $k => $f) {
                $path = $f->store("public/business_documents/{$business->id}");
                $extra[$k] = basename($path);
            }
        }
        $merged['extra_documents'] = $extra;

        $business->fill($merged);
        $business->status = 'completed';
        $business->save();

        SubmitBusinessKycToPlatforms::dispatch($business)->afterResponse();

        return response()->json([
            'success' => true,
            'message' => 'All data submitted successfully.',
            'business_data' => $business->fresh(),
        ]);
    }

    /**
     * Rules generator for each step — used by saveBusinessVerificationStep and submitAll
     */
    private function rulesForStep(int $step)
    {
        switch ($step) {
            case 1:
                return [
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
            case 2:
                return [
                    'registered_address.street_line_1' => 'required|string|max:255',
                    'registered_address.city'          => 'required|string|max:100',
                    'registered_address.country'       => 'required|string|size:2',
                    'physical_address.street_line_1'   => 'required|string|max:255',
                    'physical_address.city'            => 'required|string|max:100',
                    'physical_address.country'         => 'required|string|size:2',
                    'registered_address.proof_of_address_file' => 'nullable|file',
                    'physical_address.proof_of_address_file'  => 'nullable|file',
                ];
            case 3:
                return [
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
                    'associated_persons.*.identifying_information'           => 'required|array',
                    'associated_persons.*.has_ownership'                     => 'boolean',
                    'associated_persons.*.has_control'                       => 'boolean',
                    'associated_persons.*.is_signer'                         => 'boolean',
                    'associated_persons.*.is_director'                       => 'boolean',
                ];
            case 4:
                return [
                    'account_purpose'                     => ['required', Rule::in(array_keys(config('bridge_data.account_purposes')))],
                    'account_purpose_other'               => 'required_if:account_purpose,Other|nullable|string',
                    'source_of_funds'                     => ['required', Rule::in(array_keys(config('bridge_data.source_of_funds')))],
                    'high_risk_activities'                => 'required|array',
                    'high_risk_activities.*'              => 'string',
                    'high_risk_activities_explanation'    => 'required_if:high_risk_activities,*,!=,none_of_the_above|nullable|string',
                    'conducts_money_services'             => 'boolean',
                    'conducts_money_services_description' => 'required_if:conducts_money_services,true|nullable|string',
                    'compliance_screening_explanation'    => 'required_if:conducts_money_services,true|nullable|string',
                    'estimated_annual_revenue_usd'        => 'nullable|string',
                    'expected_monthly_payments_usd'       => 'nullable|integer|min:0',
                    'operates_in_prohibited_countries'    => 'nullable|in:yes,no',
                    'ownership_threshold'                 => 'nullable|integer|min:5|max:100',
                    'has_material_intermediary_ownership' => 'boolean',
                ];
            case 5:
                return [
                    'regulated_activity.regulated_activities_description'     => 'nullable|string',
                    'regulated_activity.primary_regulatory_authority_country' => 'nullable|string|size:2',
                    'regulated_activity.primary_regulatory_authority_name'    => 'nullable|string',
                    'regulated_activity.license_number'                       => 'nullable|string',
                ];
            case 6:
                return [
                    'documents'                     => 'required|array|min:1',
                    'documents.*.purpose'          => 'required|string|min:1',
                    'documents.*.description'       => 'required|string',
                    'documents.*.file'              => 'nullable|file',
                ];
            case 7:
                return [
                    'identifying_information'                       => 'required|array|min:1',
                    'identifying_information.*.type'                => 'required|string',
                    'identifying_information.*.issuing_country'     => 'required|string|size:2',
                    'identifying_information.*.number'              => 'required|string',
                    'identifying_information.*.description'         => 'nullable|string',
                    'identifying_information.*.expiration'          => 'required|date|after:today',
                    'identifying_information.*.image_front'         => 'nullable|file',
                    'identifying_information.*.image_back'          => 'nullable|file',
                ];

            case 'collections': // COLLECTIONS
                return [
                    // Sender profile
                    'sender_industries'              => 'required|array|min:1',
                    'sender_industries.*'            => [
                        'string',
                        'max:100',
                        Rule::in(["E-commerce", "Wholesale", "Retail", "Logistics", "Manufacturing", "Consulting", "Others"])
                    ],

                    'sender_types'                   => [
                        'required',
                        Rule::in(['individuals', 'businesses', 'both']),
                    ],

                    // Top senders
                    'top_5_senders'                  => 'required|array|size:5',
                    'top_5_senders.*'                => 'string|max:255',

                    // Fintech wallet inflow
                    'incoming_from_fintech_wallets'  => 'required|boolean',
                    'incoming_fintech_wallet_details' => 'required_if:incoming_from_fintech_wallets,true|nullable|string|max:1000',

                    // Supported collection currencies
                    'collection_currencies'          => 'required|array|min:1',
                    'collection_currencies.*'        => [
                        'string',
                        'size:3',
                        Rule::in(["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "AED", "HKD"]),
                    ],

                    // Current provider & reason
                    'current_collection_provider'    => 'required|string|max:255',
                    'reason_for_switching_collection' => 'required|string|max:1000',

                    // Transaction expectations
                    'expected_monthly_disbursement_usd'   => 'required|numeric|min:0',
                    'avg_transaction_amount_collection'   => 'required|numeric|min:0',
                    'max_transaction_amount_collection'   => 'required|numeric|min:0',

                ];

            case 'payouts': // PAYOUTS
                return [

                    // Primary payout purpose
                    'payout_primary_purpose'      => 'required|string|max:255',

                    // Beneficiary geography
                    'beneficiary_geographies'     => 'required|array|min:1',
                    'beneficiary_geographies.*'   => 'string|size:2',

                    // Beneficiary industries
                    'beneficiary_industries'      => 'required|array|min:1',
                    'beneficiary_industries.*'    => 'string|max:100',

                    // Beneficiary type
                    'beneficiary_types'           => [
                        'required',
                        Rule::in(['individual', 'business', 'both']),
                    ],

                    // Top beneficiaries
                    'top_5_beneficiaries'         => 'required|array|size:5',
                    'top_5_beneficiaries.*'       => 'string|max:255',

                    // Payout method
                    'primary_payout_method'       => [
                        'required',
                        Rule::in([
                            'ach',
                            'wire',
                            'sepa',
                            'swift',
                            'local_transfer',
                            'mobile_money',
                            'crypto',
                        ]),
                    ],

                    // Supported payout currencies
                    'payout_currencies'           => 'required|array|min:1',
                    'payout_currencies.*'         => [
                        'string',
                        'size:3',
                        Rule::in(['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'AED', 'HKD', 'CAD']),
                    ],

                    // Provider & switching reason
                    'current_payout_provider'     => 'required|string|max:255',
                    'reason_for_switching_payout' => 'required|string|max:1000',
                ];

            case 8:
                // extra_documents can be a map/object with files
                return [
                    'extra_documents' => 'nullable|array',
                    // we can't define every key here; file checks are looser
                ];
            case 9:
                return []; // review/finish
            default:
                return [];
        }
    }

    public function step8(Request $request)
    {
        $businessId = session('business_customer_id');

        // Load the business customer
        $business = BusinessCustomer::find($businessId);

        if (!$business) {
            return response()->json(['message' => 'Invalid business session.'], 400);
        }

        $storedDocuments = [];

        foreach ($request->extra_documents as $idx => $item) {
            $filePath = null;
            $fileName = null;
            $mime = null;
            $size = null;

            if ($request->hasFile("extra_documents.$idx.file")) {
                $file = $request->file("extra_documents.$idx.file");

                $fileName = $file->getClientOriginalName();
                $mime = $file->getClientMimeType();
                $size = $file->getSize();

                // Store file
                $filePath = $file->store(
                    'business_extra_documents/' . $businessId,
                    'public'
                );
            }

            $storedDocuments[] = [
                'type'        => $item['type'] ?? null,
                'description' => $item['description'] ?? null,
                'file_path'   => $filePath,
                'file_name'   => $fileName,
                'mime_type'   => $mime,
                'file_size'   => $size,
            ];
        }

        // Save JSON into business_customers.extra_documents column
        $business->extra_documents = $storedDocuments;
        $business->save();

        return response()->json(['message' => 'Extra documents saved.'], 200);
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
                return ['regulated_activity' => Arr::get($data, 'regulated_activity', [])];

            case 6:
                return ['documents' => Arr::get($data, 'documents', [])];

            case 7:
                return ['identifying_information' => (Arr::get($data, 'identifying_information'))];

            case 8:
                // extra_documents stored as object/map in DB
                return ['extra_documents' => Arr::get($data, 'extra_documents', [])];

            case 9:
                return ['status' => 'completed'];

            default:
                return [];
        }
    }

    // ---------- Shared dropdown endpoints ----------
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
