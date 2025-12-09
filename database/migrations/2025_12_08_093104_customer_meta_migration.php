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
        Schema::create('customer_meta_data', function (Blueprint $table) {
            $table->uuid('customer_id'); // customer_id is a uuid column in the customers table
            $table->string('key');
            $table->json('value');
            $table->timestamps();
            $table->softDeletes();
            // $table->foreign('customer_id')->references('customer_id')->on('customers')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_meta_data');
    }
};