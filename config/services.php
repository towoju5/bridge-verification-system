<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'noah' => [
        'api_key' => env('NOAH_API_KEY'),
        'base_url' => env('NOAH_BASE_URL', 'https://api.noah.com/v1'),
    ],
    'tazapay' => [
        'base_url' => env('TAZAPAY_BASE_URL', 'https://service.tazapay.com/v3/'),
        'secret_key' => env('TAZAPAY_SECRET_KEY'),
    ],
    'borderless' => [
        'base_url' => env('BORDERLESS_BASE_URL', 'https://api.borderless.xyz/v1'),
        'api_key' => env('BORDERLESS_API_KEY'),
    ],
    'transfi' => [
        'base_url' => env('TRANSFI_BASE_URL', 'https://api.transfi.com/v2'),
        'api_key' => env('TRANSFI_API_KEY'),
    ],
];
