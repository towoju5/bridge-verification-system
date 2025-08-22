<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('old_business_customers', function (Blueprint $table) {
            $table->id();
            $table->string('business_legal_name');
            $table->string('business_trade_name');
            $table->text('business_description');
            $table->string('email');
            $table->string('business_type');
            $table->string('primary_website')->nullable();
            $table->boolean('is_dao')->default(false);
            $table->string('business_industry');
            $table->json('registered_address');
            $table->json('physical_address');
            $table->json('associated_persons')->nullable();
            $table->string('account_purpose');
            $table->string('source_of_funds');
            $table->json('high_risk_activities');
            $table->text('high_risk_activities_explanation')->nullable();
            $table->string('estimated_annual_revenue_usd')->nullable();
            $table->integer('expected_monthly_payments_usd')->default(0);
            $table->json('regulated_activity')->nullable();
            $table->json('documents')->nullable();
            $table->json('identifying_information')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('business_customers');
    }
};