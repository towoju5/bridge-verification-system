<?php

namespace App\Models;

use App\Jobs\ThirdPartyKycSubmission;
use Illuminate\Database\Eloquent\Model;

class CustomerSubmission extends Model
{
    protected $casts = [
        // arrays
        'residential_address'               => 'encrypted:array',
        'transliterated_residential_address'=> 'encrypted:array',
        'identifying_information'           => 'encrypted:array',
        'endorsements'                      => 'encrypted:array',
        'documents'                         => 'encrypted:array',
        'uploaded_documents'                => 'encrypted:array',

        // booleans
        'submit_bridge_kyc'                 => 'encrypted:boolean',
        'acting_as_intermediary'            => 'encrypted:boolean',

        // dates / datetimes
        'birth_date'                        => 'encrypted:date',
        'submitted_at'                      => 'encrypted:datetime',
        'verified_at'                       => 'encrypted:datetime',

        // ALL OTHER FIELDS AS ENCRYPTED STRINGS
        'type'                              => 'encrypted',
        'signed_agreement_id'               => 'encrypted',
        'first_name'                        => 'encrypted',
        'middle_name'                       => 'encrypted',
        'last_name'                         => 'encrypted',
        'second_last_name'                  => 'encrypted',
        'last_name_native'                  => 'encrypted',
        'transliterated_first_name'         => 'encrypted',
        'transliterated_middle_name'        => 'encrypted',
        'transliterated_last_name'          => 'encrypted',
        'taxId'                             => 'encrypted',
        'email'                             => 'encrypted',
        'phone'                             => 'encrypted',
        'nationality'                       => 'encrypted',
        'employment_status'                 => 'encrypted',
        'most_recent_occupation_code'       => 'encrypted',
        'expected_monthly_payments_usd'     => 'encrypted',
        'source_of_funds'                   => 'encrypted',
        'account_purpose'                   => 'encrypted',
        'account_purpose_other'             => 'encrypted',
        'status'                            => 'encrypted',
        'ip_address'                        => 'encrypted',
        'user_agent'                        => 'encrypted',
        'gender'                            => 'encrypted',
        'customer_id'                       => 'encrypted',
        'selfie_image'                      => 'encrypted',
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
        'gender',file:///home/ignite/Documents/new-kyc-response.json
        
        'customer_id',
        'selfie_image'
    ];

    protected static function booted()
    {
        static::created(function ($customerSubmission) {
            if ($customerSubmission->submitted_at && $customerSubmission->status === 'submitted') {

                // Dispatch job with decrypted data automatically 
                dispatch(new ThirdPartyKycSubmission($customerSubmission->toArray()));
            }
        });
    }
}
