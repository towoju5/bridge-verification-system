<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessCustomer extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',

        // Step 1
        'business_legal_name',
        'business_trade_name',
        'business_description',
        'email',
        'business_type',
        'primary_website',
        'is_dao',
        'business_industry',

        // Step 2+
        'registered_address',
        'physical_address',
        'associated_persons',
        'account_information',
        'regulated_activity',
        'documents',
        'identifying_information',
        'customer_id',
        'is_submitted',
    ];

    protected $casts = [
        'is_dao' => 'boolean',
        'is_submitted' => 'boolean',

        'registered_address' => 'array',
        'physical_address' => 'array',
        'associated_persons' => 'array',
        'account_information' => 'array',
        'regulated_activity' => 'array',
        'documents' => 'array',
        'identifying_information' => 'array',
    ];
}
