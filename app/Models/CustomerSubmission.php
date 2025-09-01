<?php

namespace App\Models;

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

    protected $fillable = [
        'type',
        'signed_agreement_id',
        'first_name',
        'middle_name',
        'last_name',
        'last_name_native',
        'transliterated_first_name',
        'transliterated_middle_name',
        'transliterated_last_name',
        'email',
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
        'submit_bridge_kyc'
    ];

    // public function documents(): HasMany
    // {
    //     return $this->hasMany(CustomerDocument::class);
    // }
}