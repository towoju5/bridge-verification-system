<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessExtraDocument extends Model
{
    protected $fillable = [
        'business_id',
        'description',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
    ];

    public function business()
    {
        return $this->belongsTo(Business::class);
    }
}
