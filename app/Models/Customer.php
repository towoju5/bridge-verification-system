<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $connection = 'mysql_second';

    protected $guarded = [];

    protected $casts = [
        'residential_address' => 'array',
        'identifying_information' => 'array',
    ];
}
