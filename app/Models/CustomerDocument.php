<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerDocument extends Model
{
    protected $casts = [
        'issuance_date' => 'date',
        'expiration_date' => 'date',
    ];

    protected $fillable = [
        'customer_submission_id',
        'document_type',
        'description',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'side',
        'reference_field',
        'issuing_country',
        'issuance_date',
        'expiration_date',
        'status',
        'rejection_reason',
    ];

    public function submission()
    {
        return $this->belongsTo(CustomerSubmission::class, 'customer_submission_id');
    }

    public function getFileUrlAttribute()
    {
        return asset('storage/' . $this->file_path);
    }

    public function getFileSizeFormattedAttribute()
    {
        return number_format($this->file_size / 1024, 2) . ' KB';
    }
}