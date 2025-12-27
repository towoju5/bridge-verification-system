<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YellowCardController extends Controller
{
    public function index()
    {
        $endpoint = config('services.tazapay.base_url') . 'entity';
        logger()->info("Submitting KYC to Tazapay at endpoint: {$endpoint}");
        $response = Http::withBasicAuth(env('TAZAPAY_API_KEY'), env('TAZAPAY_SECRET_KEY'))
            ->get($endpoint);

        logger()->info("Tazapay response: " . $response->body());

        if ($response->successful()) {
            Log::info("KYC to Tazapay submitted successfully");
            $result = $response->json();
            return ['status' => 'success', 'provider_id' => $result['id'] ?? null];
        } else {
            throw new \Exception("HTTP {$response->status()}: " . $response->body());
        }
    }
}