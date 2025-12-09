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
            $table->foreign('customer_id')->references('customer_id')->on('customers')->onDelete('cascade');
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



/**


#----------------------------------------
#   BITNOB API KEYS
#----------------------------------------
BITNOB_API_KEY="sk.4a639fdf1840.2e3f85b0514f6b77467685759" #"pk.e27c232.5367654ca4df707b7e602f"
BITNOB_BASE_URL="https://api.bitnob.co/api/v1/"
BITNOB_LIGHTNING_KEY="ln.f5d261c.cd18972131b3a35b33"
BITNOB_WEBHOOK_SECRET="f9701ba65dc8f5971102"
