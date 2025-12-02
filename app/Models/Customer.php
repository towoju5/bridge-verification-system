<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $connection = 'mysql_second';

    protected $guarded = [];

    protected $casts = [
        'identifying_information' => 'array',
        'residential_address'    => 'array',
        'uploaded_documents'     => 'array',
        'documents'              => 'array',
        'endorsements'           => 'array',
    ];
}
