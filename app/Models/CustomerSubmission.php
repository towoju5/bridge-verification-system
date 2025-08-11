<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str; // For UUID

class CustomerSubmission extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        // 'customer_data', // Removed
        'bridge_customer_id',
        'status',
        'bridge_response',
        'type', // Should default to 'individual'
        'first_name',
        'middle_name',
        'last_name',
        'last_name_native',
        'email',
        'phone',
        'birth_date',
        'signed_agreement_id', // Make sure this is fillable
        'residential_address', // JSON
        'transliterated_residential_address', // JSON
        'employment_status',
        'most_recent_occupation_code', // Updated name
        'expected_monthly_payments_usd',
        'source_of_funds',
        'account_purpose',
        'account_purpose_other',
        'acting_as_intermediary',
        'endorsements', // JSON
        'identifying_information', // JSON
    ];

    protected $casts = [
        // 'customer_data' => 'array', // Removed cast
        'bridge_response' => 'array',
        'birth_date' => 'date',
        'residential_address' => 'array',
        'transliterated_residential_address' => 'array',
        'acting_as_intermediary' => 'boolean',
        'endorsements' => 'array',
        'identifying_information' => 'array',
        // signed_agreement_id is a string/uuid
    ];

    protected static function boot()
    {
        parent::boot();

        // Generate UUID automatically when creating
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            // Ensure type is always 'individual' for this model/system
            if (empty($model->type)) {
                 $model->type = 'individual';
            }
        });
    }

    // Accessor to get the Idempotency Key (which is our UUID)
    public function getIdempotencyKeyAttribute()
    {
        return $this->uuid;
    }

    // Optional: Mutator to ensure occupation code is stored correctly if needed
    // public function setMostRecentOccupationAttribute($value) {
    //     // If value is the full object/array, extract code
    //     // This depends on how data comes from frontend
    //     if (is_array($value) && isset($value['code'])) {
    //         $this->attributes['most_recent_occupation_code'] = $value['code'];
    //     } else {
    //         $this->attributes['most_recent_occupation_code'] = $value;
    //     }
    // }

    // Optional: Accessor to get full occupation details if needed
    // public function getMostRecentOccupationDetailsAttribute() {
    //     $occupations = config('bridge_data.occupations');
    //     return collect($occupations)->firstWhere('code', $this->most_recent_occupation_code);
    // }
}
