<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CustomerMeta extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $connection = 'mysql_second';

    protected $table = 'customer_meta_data';

    protected $guarded = [];

    protected $fillable = ['customer_id', 'key', 'value'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected $casts = [
        'value' => 'array'
    ];

    protected $hidden = [
        'id',
        'created_at',
        'updated_at',
        'deleted_at'
    ];
}
