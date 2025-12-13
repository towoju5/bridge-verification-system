<?php

use App\Models\CustomerMeta;
use App\Models\Endorsement;

if (!function_exists('array_filter_recursive')) {
    function array_filter_recursive($array)
    {
        foreach ($array as $key => $value) {
            if (is_array($value)) {
                $array[$key] = array_filter_recursive($value);
                if (empty($array[$key])) {
                    unset($array[$key]);
                }
            } elseif ($value === null || $value === '') {
                unset($array[$key]);
            }
        }
        return $array;
    }
}

if (!function_exists('normalizeNoahApiUrl')) {
    /**
     * Normalizes a URL to the correct Noah API format:
     * https://api.noah.com/v1/{endpoint}
     *
     * Fixes common issues:
     * - Adds https://api.noah.com if missing
     * - Ensures exactly one /v1/ at the start of the path
     * - Removes duplicate /v1/ segments
     * - Strips extra leading/trailing slashes in the endpoint
     *
     * @param string $url Partial path or full URL
     * @return string Correctly formatted Noah API URL
     */
    function normalizeNoahApiUrl(string $url): string
    {
        $url = trim($url);

        // Extract path regardless of input format
        if (preg_match('#^https?://#i', $url)) {
            $parsed = parse_url($url);
            $path = ltrim($parsed['path'] ?? '', '/');
        } else {
            $path = ltrim($url, '/');
        }

        // Fix: insert slash if path starts with "v1" followed directly by a letter/digit/underscore
        // e.g. "v1onboarding" → "v1/onboarding"
        $path = preg_replace('#^v1([a-zA-Z0-9_])#', 'v1/$1', $path);
        $path = preg_replace('#^/v1([a-zA-Z0-9_])#', '/v1/$1', $path);

        // Remove any redundant /v1/ prefixes (keep only one at start)
        // This handles cases like /v1/v1/..., v1/v1/..., etc.
        $path = preg_replace('#^(/?v1/)+#', '', $path);

        // Ensure the path starts with /v1/
        $path = '/v1/' . ltrim($path, '/');

        // Collapse multiple slashes (e.g. /v1///onboarding → /v1/onboarding)
        $path = preg_replace('#/+#', '/', $path);

        // Prevent trailing slash if not needed (optional)
        // $path = rtrim($path, '/');

        return 'https://api.noah.com' . $path;
    }
}

if (!function_exists('add_customer_meta')) {
    function add_customer_meta($customerId, $key, $value)
    {
        $meta = CustomerMeta::updateOrCreate([
            'customer_id' => $customerId,
            'key' => $key
        ], [
            'value' => (array)$value
        ]);

        return $meta;
    }
}

if (!function_exists('get_customer_meta')) {
    function get_customer_meta($customerId, $key)
    {
        $meta = CustomerMeta::where([
            'customer_id' => $customerId,
            'key' => $key
        ])->first();

        return $meta;
    }
}

if (!function_exists('get_customer_endorsement')) {
    function get_customer_endorsement($customerId, $service)
    {
        $meta = Endorsement::where([
            'customer_id' => $customerId,
            'service' => $service
        ])->first();

        return $meta;
    }
}

if (!function_exists('update_endorsement')) {
    function update_endorsement($customerId, $service, $status, $hostedUrl = null)
    {
        if (!is_array($hostedUrl)) {
            // convert it to an array
            $hostedUrl = (array) $hostedUrl;
        }

        if (!in_array($status, ['pending', 'approved', 'rejected', 'under_review', 'not_started']) || $status == "submitted") {
            $status = "under_review";
        }

        $meta = Endorsement::where([
            'customer_id' => $customerId,
            'service' => $service
        ])->update([
            'status' => $status,
            'hosted_kyc_url' => $hostedUrl
        ]);

        logger("Endorsement updated for {$service} successfully", ['endorsement' => $meta]);

        return $meta;
    }
}
