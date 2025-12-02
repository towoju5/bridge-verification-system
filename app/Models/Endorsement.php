<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Endorsement extends Model
{
    use HasFactory, SoftDeletes;
    protected $connection = 'mysql_second';

    protected $table      = "customer_kyc_endorsements";

    public const SERVICES = [
        'base',
        'sepa',
        'spei',
        'virtual_card',
        'asian_payment_gateways',
    ];

    public const STATUSES = [
        'not_started',
        'submitted',
        'approved',
        'rejected',
        'under_review',
    ];

    protected $fillable = [
        'customer_id',
        'service',
        'status',
        'errors',
        'requirements_due',
        'future_requirements_due',
        'metadata',
        'hosted_url'
    ];

    public static function ensureAllEndorsementsExist($customerId)
    {
        foreach (self::SERVICES as $service) {
            self::firstOrCreate(
                ['customer_id' => $customerId, 'service' => $service],
                ['status' => 'not_started']
            );
        }
    }

    protected $hidden = [
        'id',
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    protected $casts = [
        'metadata'                => 'array',
        'errors'                  => 'array',
        'requirements_due'        => 'array',
        'future_requirements_due' => 'array',
    ];
    protected $keyType = 'string';

    protected $primaryKey = 'id';

    public $incrementing = false;

    // Automatically generate UUID when creating a new model instance
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = Str::uuid();
            }
        });
    }

}
