<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessCustomer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BusinessCustomerController extends Controller
{
    public function step1(Request $request)
    {
        $validated = $request->validate([
            'business_legal_name' => 'required|string|max:1024',
            'business_trade_name' => 'required|string|max:1024',
            'business_description' => 'required|string|max:1024',
            'email' => 'required|email',
            'business_type' => 'required|string',
            'primary_website' => 'nullable|url',
            'is_dao' => 'boolean',
            'business_industry' => 'required|string',
        ]);

        return response()->json(['success' => true]);
    }

    public function step2(Request $request)
    {
        $validated = $request->validate([
            'registered_address.street_line_1' => 'required|string',
            'registered_address.city' => 'required|string',
            'registered_address.country' => 'required|string|size:3',
            'physical_address.street_line_1' => 'required|string',
            'physical_address.city' => 'required|string',
            'physical_address.country' => 'required|string|size:3',
        ]);

        return response()->json(['success' => true]);
    }

    public function step3(Request $request)
    {
        $validated = $request->validate([
            'associated_persons' => 'required|array',
            'associated_persons.*.first_name' => 'required|string',
            'associated_persons.*.last_name' => 'required|string',
            'associated_persons.*.email' => 'required|email',
            'associated_persons.*.residential_address.street_line_1' => 'required|string',
            'associated_persons.*.residential_address.city' => 'required|string',
            'associated_persons.*.residential_address.country' => 'required|string|size:3',
        ]);

        return response()->json(['success' => true]);
    }

    public function step4(Request $request)
    {
        $validated = $request->validate([
            'account_purpose' => 'required|string',
            'source_of_funds' => 'required|string',
            'high_risk_activities' => 'required|array',
            'estimated_annual_revenue_usd' => 'nullable|string',
            'expected_monthly_payments_usd' => 'nullable|integer|min:0',
        ]);

        return response()->json(['success' => true]);
    }

    public function step5(Request $request)
    {
        $validated = $request->validate([
            'regulated_activity.regulated_activities_description' => 'nullable|string',
            'regulated_activity.primary_regulatory_authority_country' => 'nullable|string|size:3',
            'regulated_activity.primary_regulatory_authority_name' => 'nullable|string',
            'regulated_activity.license_number' => 'nullable|string',
        ]);

        return response()->json(['success' => true]);
    }

    public function step6(Request $request)
    {
        $validated = $request->validate([
            'documents' => 'array',
            'documents.*.purposes' => 'array',
            'documents.*.file' => 'nullable|string',
            'documents.*.description' => 'nullable|string',
        ]);

        return response()->json(['success' => true]);
    }

    public function step7(Request $request)
    {
        $validated = $request->validate([
            'identifying_information' => 'array',
            'identifying_information.*.type' => 'required|string',
            'identifying_information.*.issuing_country' => 'required|string',
            'identifying_information.*.number' => 'required|string',
            'identifying_information.*.expiration' => 'nullable|date',
        ]);

        return response()->json(['success' => true]);
    }

    public function submit(Request $request)
    {
        $validated = $request->all();

        BusinessCustomer::create($validated);

        return response()->json(['success' => true, 'message' => 'Business customer created successfully.']);
    }
}