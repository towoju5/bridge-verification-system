<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessCustomer extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'registered_address' => 'array',
        'physical_address' => 'array',
        'associated_persons' => 'array',
        'documents' => 'array',
        'identifying_information' => 'array',
        'high_risk_activities' => 'array',
        'incorporation_date' => 'date',
        'is_dao' => 'boolean',
        'has_material_intermediary_ownership' => 'boolean',
        'conducts_money_services' => 'boolean',
        'extra_documents' => 'array',
        'collections_data' => 'array',
        'payouts_data' => 'array'
    ];
}