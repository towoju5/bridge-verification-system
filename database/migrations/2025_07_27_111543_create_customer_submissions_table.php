<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customer_submissions', function (Blueprint $table) {
            $table->id();

            $table->string('type', 20)->index(); // individual/business
            $table->string('signed_agreement_id')->nullable()->index();

            // Personal Info
            $table->string('first_name', 1024)->nullable();
            $table->string('middle_name', 1024)->nullable();
            $table->string('last_name', 1024)->nullable();
            $table->string('last_name_native', 1024)->nullable();
            $table->string('transliterated_first_name', 1024)->nullable();
            $table->string('transliterated_middle_name', 1024)->nullable();
            $table->string('transliterated_last_name', 1024)->nullable();
            $table->string('email', 1024)->nullable();
            $table->string('phone', 1024)->nullable();
            $table->string('nationality', 3)->nullable(); // ISO 3166-1 alpha-3
            $table->date('birth_date')->nullable();

            // Address
            $table->json('residential_address')->nullable(); // includes proof_of_address_url
            $table->json('transliterated_residential_address')->nullable();

            // Identification
            $table->json('identifying_information')->nullable(); // with image_front/image_back URLs

            // Employment & Finance
            $table->string('employment_status', 50)->nullable();
            $table->string('most_recent_occupation_code', 10)->nullable();
            $table->string('expected_monthly_payments_usd', 20)->nullable();
            $table->string('source_of_funds', 50)->nullable();
            $table->string('account_purpose', 50)->nullable();
            $table->text('account_purpose_other')->nullable();
            $table->boolean('acting_as_intermediary')->nullable();

            // Endorsements
            $table->json('endorsements')->nullable();
            $table->json('documents')->nullable();

            // Status
            $table->enum('status', ['draft', 'submitted', 'verified', 'rejected', 'pending'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();

            // Metadata
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamps();

            $table->index(['status', 'email']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_submissions');
    }
};
