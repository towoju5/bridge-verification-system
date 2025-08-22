<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration {
    public function up(): void
    {
        Schema::create('business_customers', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();

            // Step 1
            $table->string('business_legal_name')->nullable();
            $table->string('business_trade_name')->nullable();
            $table->text('business_description')->nullable();
            $table->string('email')->nullable();
            $table->string('business_type')->nullable();
            $table->string('primary_website')->nullable();
            $table->boolean('is_dao')->default(false);
            $table->string('business_industry')->nullable();

            // Step 2+
            $table->json('registered_address')->nullable();
            $table->json('physical_address')->nullable();
            $table->json('associated_persons')->nullable();
            $table->json('account_information')->nullable();
            $table->json('regulated_activity')->nullable();
            $table->json('documents')->nullable();
            $table->json('identifying_information')->nullable();

            $table->boolean('is_submitted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_customers');
    }
};