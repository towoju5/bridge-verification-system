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
            // Core Identifiers
            $table->uuid('uuid')->unique(); // For idempotency key
            $table->string('bridge_customer_id')->nullable(); // ID returned by Bridge on success
            $table->string('status')->default('pending'); // pending, success, failed
            $table->text('bridge_response')->nullable(); // Store Bridge API response for debugging

            // Customer Type (Fixed to 'individual' for this system)
            $table->string('type')->default('individual');

            // Personal Information
            $table->string('first_name', 1024)->nullable();
            $table->string('middle_name', 1024)->nullable();
            $table->string('last_name', 1024)->nullable();
            $table->string('last_name_native', 1024)->nullable(); // Conditional based on last_name content
            $table->string('email', 1024)->nullable();
            $table->string('phone', 1024)->nullable(); // Format "+12223334444"
            $table->date('birth_date')->nullable(); // Format yyyy-mm-dd

            // Signed Agreement
            $table->uuid('signed_agreement_id'); // Required by Bridge API, assumed provided

            // Address (Residential)
            // Using json for address objects is often easier for handling optional nested fields
            // Alternative: Create separate columns for each address part (street_line_1, city, etc.)
            $table->json('residential_address')->nullable();
            $table->json('transliterated_residential_address')->nullable(); // Conditional

            // Employment & Financials
            $table->string('employment_status', 255)->nullable();
            // Assuming 'most_recent_occupation' stores the code (e.g., '132011')
            $table->string('most_recent_occupation_code', 20)->nullable(); // Link to occupations config
            $table->string('expected_monthly_payments_usd', 255)->nullable(); // String as per example
            $table->string('source_of_funds', 255)->nullable(); // From predefined list
            $table->string('account_purpose', 255)->nullable(); // From predefined list
            $table->string('account_purpose_other', 1024)->nullable(); // Conditional
            $table->boolean('acting_as_intermediary')->nullable(); // Yes/No -> Boolean

            // Endorsements (Array of strings)
            $table->json('endorsements')->nullable(); // Store array like ["base", "sepa"]

            // Identifying Information (Array of Objects)
            // Storing as JSON is standard for complex nested arrays in relational DBs
            $table->json('identifying_information')->nullable(); // Array of objects

            $table->timestamps();
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
