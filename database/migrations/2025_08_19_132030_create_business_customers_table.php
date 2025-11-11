<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('business_customers', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->nullable();
            $table->string('customer_id')->nullable();
            $table->string('type')->default('business');
            $table->string('signed_agreement_id')->nullable()->index();

            // === Business Entity Info (Tazapay, Borderless, Noah, Transfi) ===
            $table->string('business_legal_name')->nullable();
            $table->string('business_trade_name')->nullable();
            $table->text('business_description')->nullable();
            $table->string('email')->nullable();
            $table->string('business_type')->nullable(); // e.g., 'llc', 'sole_prop'
            $table->string('registration_number')->nullable();
            $table->date('incorporation_date')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('statement_descriptor')->nullable();
            $table->string('phone_calling_code')->nullable(); // e.g., '+234'
            $table->string('phone_number')->nullable();       // e.g., '8039395114'
            $table->string('business_industry')->nullable();  // NAICS code
            $table->string('primary_website')->nullable();
            $table->boolean('is_dao')->default(false);
            $table->boolean('has_material_intermediary_ownership')->default(false);

            // === Addresses (JSON) ===
            $table->json('registered_address')->nullable(); // { street_line_1, city, state, postal_code, country }
            $table->json('physical_address')->nullable(); // operating address

            // === Associated Persons (UBOs/Reps) — JSON array ===
            $table->json('associated_persons')->nullable();

            // === Financial & Regulatory ===
            $table->string('account_purpose')->nullable();
            $table->string('account_purpose_other')->nullable();
            $table->string('source_of_funds')->nullable();
            $table->json('high_risk_activities')->nullable()->default(json_encode(['none_of_the_above']));
            $table->string('high_risk_activities_explanation')->nullable();
            $table->boolean('conducts_money_services')->default(false);
            $table->string('conducts_money_services_description')->nullable();
            $table->string('compliance_screening_explanation')->nullable();
            $table->string('regulated_activities_description')->nullable();
            $table->string('primary_regulatory_authority_country')->nullable();
            $table->string('primary_regulatory_authority_name')->nullable();
            $table->string('license_number')->nullable();
            $table->string('estimated_annual_revenue_usd')->nullable();
            $table->integer('expected_monthly_payments_usd')->nullable();
            $table->string('operates_in_prohibited_countries')->default('no');
            $table->integer('ownership_threshold')->default(25);

            // === Documents & Identifying Info (metadata only; files stored on disk/S3) ===
            $table->json('documents')->nullable(); // { purposes: [], description: '', file_path: '' }
            $table->json('identifying_information')->nullable(); // for reps' IDs

            // === Status & Metadata ===
            $table->string('status')->default('in_progress'); // in_progress, completed, rejected
            $table->string('user_agent')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down()
    {
        Schema::dropIfExists('business_customers');
    }
};