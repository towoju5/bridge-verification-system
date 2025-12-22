<?php

namespace App\Http\Controllers;

use App\Jobs\SubmitBusinessKycToPlatforms;
use App\Models\BusinessCustomer;
use App\Models\Customer;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
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

        if (! Schema::hasColumn('business_customers', 'extra_business_info')) {
            Schema::table('business_customers', function ($table) {
                $table->json('extra_business_info')->nullable()->after('email');
            });
        }

        if (!Schema::hasColumn('business_customers', 'collections_data')) {
            Schema::table('business_customers', function (Blueprint $table) {
                $table->json('collections_data')->nullable()->after('identifying_information');
                $table->json('payouts_data')->nullable()->after('collections_data');
            });
        }
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

        $business = BusinessCustomer::firstOrCreate([
            "customer_id" => $businessId
        ]);
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

        if ($step == 'business') {
            $data['extra_business_info'] = $request->all();
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
     * Supports:
     *   - Direct file uploads (multipart/form-data)
     *   - Base64-encoded strings (standard or "base64:" prefixed)
     *   - Publicly accessible URLs (http/https)
     */
    public function submitAll(Request $request)
    {
        $businessId = $request->customer_id ?? $request->header('X-Business-Id');
        if (! $businessId) {
            return response()->json(['success' => false, 'message' => 'Customer ID is required.'], 400);
        }

        session(['business_customer_id' => $businessId]);

        $business = Customer::whereCustomerId($businessId)->first();
        if (! $business) {
            return response()->json(['success' => false, 'message' => 'Business record not found.'], 404);
        }

        // Collect rules for steps 1..9 + custom steps
        $allRules = [];
        for ($i = 1; $i <= 9; $i++) {
            $allRules = array_merge($allRules, $this->rulesForStep($i));
        }
        // Add rules for custom sections (business, collections, payouts)
        $allRules = array_merge($allRules, $this->rulesForStep('business'));
        $allRules = array_merge($allRules, $this->rulesForStep('collections'));
        $allRules = array_merge($allRules, $this->rulesForStep('payouts'));

        $validator = Validator::make($request->all(), $allRules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $payload = $validator->validated();
        $merged = [];

        // Map step data (1–9)
        for ($s = 1; $s <= 9; $s++) {
            $mapped = $this->mapBusinessStepDataToModel($payload, $s);
            $merged = array_merge_recursive($merged, $mapped);
        }

        // Handle Step 2: Address proof files
        foreach (['registered_address', 'physical_address'] as $addr) {
            $fileInput = $request->file("{$addr}.proof_of_address_file") ?? $request->input("{$addr}.proof_of_address_file");
            if ($fileInput) {
                $storedName = $this->normalizeAndStoreFile($fileInput, $business->id, 'proof_of_address');
                if ($storedName) {
                    Arr::set($merged, "{$addr}.proof_of_address_file", $storedName);
                }
            }
        }

        // Handle Step 6: Supporting documents
        if ($request->has('documents')) {
            $docs = $request->input('documents', []);
            $finalDocs = [];
            foreach ($docs as $i => $doc) {
                $d = $doc;
                $fileInput = $request->file("documents.{$i}.file") ?? ($doc['file'] ?? null);
                if ($fileInput) {
                    $storedName = $this->normalizeAndStoreFile($fileInput, $business->id, 'document');
                    if ($storedName) {
                        $d['file'] = $storedName;
                    }
                }
                $finalDocs[] = $d;
            }
            $merged['documents'] = $finalDocs;
        }

        // Handle Step 7: Business identifying documents (ID images)
        if ($request->filled('identifying_information')) {
            $ids = $request->input('identifying_information', []);
            $finalIds = [];
            foreach ($ids as $i => $id) {
                $item = $id;
                // Front image
                $frontInput = $request->file("identifying_information.{$i}.image_front") ?? ($id['image_front'] ?? null);
                if ($frontInput) {
                    $storedName = $this->normalizeAndStoreFile($frontInput, $business->id, 'id_front');
                    if ($storedName) {
                        $item['image_front'] = $storedName;
                    }
                }
                // Back image
                $backInput = $request->file("identifying_information.{$i}.image_back") ?? ($id['image_back'] ?? null);
                if ($backInput) {
                    $storedName = $this->normalizeAndStoreFile($backInput, $business->id, 'id_back');
                    if ($storedName) {
                        $item['image_back'] = $storedName;
                    }
                }
                $finalIds[] = $item;
            }
            $merged['identifying_information'] = $finalIds;
        }

        // Handle Step 8: Extra documents
        $extra = [];
        if ($request->has('extra_documents')) {
            $extraDocs = $request->input('extra_documents', []);
            foreach ($extraDocs as $k => $doc) {
                $d = $doc;
                $fileInput = $request->file("extra_documents.{$k}.file") ?? ($doc['file'] ?? null);
                if ($fileInput) {
                    $storedName = $this->normalizeAndStoreFile($fileInput, $business->id, 'extra_doc');
                    if ($storedName) {
                        $d['file'] = $storedName;
                    }
                }
                $extra[] = $d;
            }
            $merged['extra_documents'] = $extra;
        }

        // Handle custom sections: 'business', 'collections', 'payouts'
        if (isset($payload['meeting_mode'])) {
            $merged['extra_business_info'] = Arr::only($payload, [
                'meeting_mode',
                'industry_vertical',
                'business_description',
                'obo_usage',
                'monthly_volume_usd',
                'avg_transaction_usd',
                'max_transaction_usd',
                'primary_account_purpose',
                'sender_geographies',
            ]);
        }

        if (isset($payload['sender_industries'])) {
            $merged['collections_data'] = Arr::only($payload, [
                'sender_industries',
                'sender_types',
                'top_5_senders',
                'incoming_from_fintech_wallets',
                'incoming_fintech_wallet_details',
                'collection_currencies',
                'current_collection_provider',
                'reason_for_switching_collection',
                'expected_monthly_disbursement_usd',
                'avg_transaction_amount_collection',
                'max_transaction_amount_collection',
            ]);
        }

        if (isset($payload['payout_primary_purpose'])) {
            $merged['payouts_data'] = Arr::only($payload, [
                'payout_primary_purpose',
                'beneficiary_geographies',
                'beneficiary_industries',
                'beneficiary_types',
                'top_5_beneficiaries',
                'primary_payout_method',
                'payout_currencies',
                'current_payout_provider',
                'reason_for_switching_payout',
            ]);
        }

        // Save all data
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
     * Accepts a file in one of three forms:
     * 1. UploadedFile (from multipart)
     * 2. Base64 string (data:image/... or base64:...)
     * 3. Public URL (http/https)
     *
     * Returns stored filename (e.g., "doc_abc123.jpg") or null on failure.
     */
    /**
     * Normalize and store a file from one of three sources:
     * 1. UploadedFile (direct upload)
     * 2. Base64 string (e.g., "image/png;base64,..." or "base64:image/jpg,...")
     * 3. Public URL (http/https)
     *
     * @param mixed $input
     * @param int $businessId
     * @param string $prefix
     * @return string|null Stored filename (e.g., "document_abc123.jpg")
     */
    private function normalizeAndStoreFile($input, int $businessId, string $prefix = 'file')
    {
        try {
            $contents = null;
            $extension = 'bin';

            // Case 1: Direct upload (Laravel UploadedFile)
            if ($input instanceof \Illuminate\Http\UploadedFile) {
                if (!$input->isValid()) {
                    return null;
                }
                $contents = file_get_contents($input->getRealPath());
                $extension = $input->getClientOriginalExtension() ?: $input->guessExtension() ?: 'bin';
            }
            // Case 2: Base64 string
            elseif (is_string($input) && (Str::contains($input, ';base64,') || Str::startsWith($input, 'base64:'))) {
                // Normalize: support both "image/png;base64,..." and "base64:image/jpg,..."
                $pattern = '/^(?:|base64:)([a-zA-Z0-9\/+]+),(.+)$/i';
                if (!preg_match($pattern, $input, $matches)) {
                    return null;
                }
                $mime = $matches[1];
                $encoded = $matches[2];
                $contents = base64_decode($encoded, true);
                if ($contents === false) {
                    return null;
                }
                $extension = match ($mime) {
                    'image/jpeg', 'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'application/pdf' => 'pdf',
                    'text/plain' => 'txt',
                    default => explode('/', $mime, 2)[1] ?? 'bin'
                };
            }
            // Case 3: Public URL
            elseif (is_string($input) && filter_var($input, FILTER_VALIDATE_URL)) {
                $scheme = parse_url($input, PHP_URL_SCHEME);
                if (!in_array($scheme, ['http', 'https'])) {
                    return null;
                }
                $response = Http::timeout(30)->accept('*/*')->get($input);
                if (!$response->successful()) {
                    return null;
                }
                $contents = $response->body();
                $contentType = $response->header('Content-Type') ?: 'application/octet-stream';
                $extension = match ($contentType) {
                    'image/jpeg', 'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'application/pdf' => 'pdf',
                    default => explode('/', $contentType, 2)[1] ?? 'bin'
                };
            } else {
                return null; // Unsupported type
            }

            // Generate safe filename
            $filename = "{$prefix}_" . Str::random(12) . '.' . $extension;
            $path = "public/business_documents/{$businessId}/{$filename}";
            Storage::put($path, $contents);

            return basename($path);
        } catch (\Exception $e) {
            // Optionally log: \Log::warning("File store failed: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Rules generator for each step — used by saveBusinessVerificationStep and submitAll
     */
    private function rulesForStep(string|int $step)
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
                    'registered_address.proof_of_address_file' => 'nullable',
                    'physical_address.proof_of_address_file'  => 'nullable',
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
                    'documents.*.purpose'           => 'required|string|min:1',
                    'documents.*.description'       => 'required|string',
                    'documents.*.file'              => 'nullable',
                ];
            case 7:
                return [
                    'identifying_information'                       => 'nullable|array|min:1',
                    'identifying_information.*.type'                => 'nullable|string',
                    'identifying_information.*.issuing_country'     => 'nullable|string|size:2',
                    'identifying_information.*.number'              => 'nullable|string',
                    'identifying_information.*.description'         => 'nullable|string',
                    'identifying_information.*.expiration'          => 'nullable|date|after:today',
                    'identifying_information.*.image_front'         => 'nullable',
                    'identifying_information.*.image_back'          => 'nullable',
                ];

            case 'business': // EXTRA BUSINESS INFO
                return [

                    // Communication / meeting mode
                    'meeting_mode' => 'nullable|string|max:255',

                    // Industry vertical
                    'industry_vertical' => 'nullable|string|max:255',

                    // Business description
                    'business_description' => 'nullable|string|min:140|max:5000',

                    // OBO usage
                    'obo_usage' => [
                        'nullable',
                        Rule::in(['yes', 'no']),
                    ],

                    // Transaction volumes
                    'monthly_volume_usd' => 'nullable|numeric|min:0',
                    'avg_transaction_usd' => 'nullable|numeric|min:0|lte:max_transaction_usd',
                    'max_transaction_usd' => 'nullable|numeric|min:0',

                    // Logical amount relationship (optional but recommended)
                    // Account usage purpose
                    'primary_account_purpose' => 'nullable|string|max:255',

                    // Sender geographies
                    'sender_geographies' => 'nullable|array|min:1',
                    'sender_geographies.*' => [
                        'string',
                        'max:50',
                        Rule::in([
                            'Africa',
                            'Europe',
                            'North America',
                            'South America',
                            'Asia',
                        ]),
                    ],
                ];


            case 'collections': // COLLECTIONS
                return [
                    // Sender profile
                    'sender_industries'              => 'nullable|array|min:1',
                    'sender_industries.*'            => [
                        'string',
                        'max:100',
                        Rule::in(["E-commerce", "Wholesale", "Retail", "Logistics", "Manufacturing", "Consulting", "Others"])
                    ],

                    'sender_types'                   => [
                        'nullable',
                        Rule::in(['individuals', 'businesses', 'both']),
                    ],

                    // Top senders
                    'top_5_senders'                  => 'nullable|array|size:5',
                    'top_5_senders.*'                => 'string|max:255',

                    // Fintech wallet inflow
                    'incoming_from_fintech_wallets'  => 'nullable|boolean',
                    'incoming_fintech_wallet_details' => 'nullable_if:incoming_from_fintech_wallets,true|nullable|string|max:1000',

                    // Supported collection currencies
                    'collection_currencies'          => 'nullable|array|min:1',
                    'collection_currencies.*'        => [
                        'string',
                        'size:3',
                        Rule::in(["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "AED", "HKD"]),
                    ],

                    // Current provider & reason
                    'current_collection_provider'    => 'nullable|string|max:255',
                    'reason_for_switching_collection' => 'nullable|string|max:1000',

                    // Transaction expectations
                    'expected_monthly_disbursement_usd'   => 'nullable|numeric|min:0',
                    'avg_transaction_amount_collection'   => 'nullable|numeric|min:0',
                    'max_transaction_amount_collection'   => 'nullable|numeric|min:0',

                ];

            case 'payouts': // PAYOUTS
                return [

                    // Primary payout purpose
                    'payout_primary_purpose'      => 'nullable|string|max:255',

                    // Beneficiary geography
                    'beneficiary_geographies'     => 'nullable|array|min:1',
                    'beneficiary_geographies.*'   => 'string|size:2',

                    // Beneficiary industries
                    'beneficiary_industries'      => 'nullable|array|min:1',
                    'beneficiary_industries.*'    => 'string|max:100',

                    // Beneficiary type
                    'beneficiary_types'           => [
                        'nullable',
                        Rule::in(['individual', 'business', 'both']),
                    ],

                    // Top beneficiaries
                    'top_5_beneficiaries'         => 'nullable|array|size:5',
                    'top_5_beneficiaries.*'       => 'string|max:255',

                    // Payout method
                    'primary_payout_method'       => [
                        'nullable',
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
                    'payout_currencies'           => 'nullable|array|min:1',
                    'payout_currencies.*'         => [
                        'string',
                        'size:3',
                        Rule::in(['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'AED', 'HKD', 'CAD']),
                    ],

                    // Provider & switching reason
                    'current_payout_provider'     => 'nullable|string|max:255',
                    'reason_for_switching_payout' => 'nullable|string|max:1000',
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
                // if (isset($data['incorporation_date'])) {
                //     $out['incorporation_date'] = Carbon::createFromFormat('Y-m-d', $data['incorporation_date']);
                // }
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

    /*---------- Shared dropdown endpoints ----------*/
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
