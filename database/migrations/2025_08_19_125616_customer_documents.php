<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_documents', function (Blueprint $table) {
            $table->id();

            $table->foreignId('customer_submission_id')
                  ->constrained('customer_submissions')
                  ->onDelete('cascade');

            $table->string('document_type', 50); // matches frontend options
            $table->string('description')->nullable();

            $table->string('file_path'); // storage path
            $table->string('file_name');  // original name
            $table->string('mime_type', 100);
            $table->integer('file_size'); // bytes

            $table->string('side')->nullable(); // front/back/single
            $table->string('reference_field')->nullable(); // e.g., identifying_information.0.image_front

            $table->string('issuing_country', 3)->nullable();
            $table->date('issuance_date')->nullable();
            $table->date('expiration_date')->nullable();

            $table->enum('status', ['uploaded', 'pending', 'verified', 'rejected'])->default('uploaded');
            $table->text('rejection_reason')->nullable();

            $table->timestamps();

            $table->index(['customer_submission_id', 'document_type']);
            $table->index('reference_field');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_documents');
    }
};