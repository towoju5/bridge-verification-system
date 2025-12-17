<?php

namespace App\Models;

use App\Jobs\ThirdPartyKycSubmission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerSubmission extends Model
{
    protected $casts = [
        'residential_address' => 'array',
        'transliterated_residential_address' => 'array',
        'identifying_information' => 'array',
        'endorsements' => 'array',
        'birth_date' => 'date',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
        'documents' => 'array',
        'uploaded_documents' => 'array',
        'submit_bridge_kyc' => 'boolean'
    ];

    protected $hidden = [
        'endorsements',
        'updated_at',
        'verified_at',
        'id',
        'verified_at',
    ];

    protected $fillable = [
        'type',
        'signed_agreement_id',
        'first_name',
        'middle_name',
        'last_name',
        'taxId',
        'second_last_name',
        'last_name_native',
        'transliterated_first_name',
        'transliterated_middle_name',
        'transliterated_last_name',
        'email',
        'calling_code',
        'phone',
        'nationality',
        'birth_date',
        'residential_address',
        'transliterated_residential_address',
        'identifying_information',
        'employment_status',
        'most_recent_occupation_code',
        'expected_monthly_payments_usd',
        'source_of_funds',
        'account_purpose',
        'account_purpose_other',
        'acting_as_intermediary',
        'endorsements',
        'status',
        'submitted_at',
        'ip_address',
        'user_agent',
        'documents',
        'uploaded_documents',
        'submit_bridge_kyc',
        'gender',
        'customer_id',
        'selfie_image'
    ];

    // public function documents(): HasMany
    // {
    //     return $this->hasMany(CustomerDocument::class);
    // }

    protected static function booted()
    {
        static::created(function ($customerSubmission) {
            if ($customerSubmission->submitted_at != null && $customerSubmission->status == 'submitted') {
                // initiate all job queues to submit to all third party services.
                dispatch(new ThirdPartyKycSubmission($customerSubmission->toArray()));
            }
        });

        static::updating(function ($customerSubmission) {
            // You can add any logic that needs to happen before updating a record
        });
    }
}
