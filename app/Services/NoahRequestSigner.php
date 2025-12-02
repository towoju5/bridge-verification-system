<?php
namespace App\Services;

use Firebase\JWT\JWT;
use function Illuminate\Log\log;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

// use function Sentry\logger;

class NoahRequestSigner
{
    protected string $privateKey;
    protected string $audience;

    public function __construct()
    {
        $rawKey = config('noah.private_key') ?? 'test who i am';
        log('Loading Noah private key from environment', ['key_present' => $rawKey ?? null]);
        if (empty($rawKey) || $rawKey === 'test who i am') {
            throw new \Exception('NOAH_PRIVATE_KEY is missing in environment.');
        }

        // Support both inline \n and multiline keys
        $this->privateKey = str_replace('\n', "\n", trim($rawKey));
        if (! str_starts_with($this->privateKey, '-----BEGIN ')) {
            throw new InvalidArgumentException('NOAH_PRIVATE_KEY must be a valid PEM-formatted private key.');
        }
    }

    /**
     * Generate signed JWT for Noah API request.
     *
     * @param string      $method        HTTP method (e.g., 'GET', 'POST')
     * @param string      $path          API path, e.g., '/checkout/payin/fiat'
     * @param array|null  $queryParams  Query parameters (only if included in actual request)
     * @param string|null $body          Raw JSON body (for POST/PUT), must match byte-for-byte
     * @return string Signed JWT (ES384)
     */
    public function signRequest(string $method, string $path, ?array $queryParams = null, ?string $body = null): string
    {
        logger("initiating Noah request signing");

        // Normalize the path: extract path if full URL is given
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $parsedUrl = parse_url($path);
            $path      = $parsedUrl['path'] ?? '';
        }

        // Ensure path starts with '/' (required by Noah)
        if ($path === '') {
            $path = '/';
        } elseif (! str_starts_with($path, '/')) {
            $path = '/' . $path;
        }

        $iat = time();
        $exp = $iat + 5 * 60; // 5 minutes

        $payload = [
            'aud'    => 'https://api.noah.com', // ✅ no trailing spaces
            'iat'    => $iat,
            'exp'    => $exp,
            'method' => strtoupper($method),
            'path'   => $path, // ✅ now guaranteed to be a clean path like "/v1/customers/..."
        ];

        // Include queryParams only if present
        if ($queryParams && is_array($queryParams) && count($queryParams) > 0) {
            $payload['queryParams'] = $queryParams;
        }

        logger("proceeding to Noah request body hashing");
        if ($body !== null) {
            $payload['bodyHash'] = hash('sha256', $body);
        }

        Log::info('Noah request payload for signing', ['payload' => $payload]);

        // Sign using ES384 (EC P-384)
        return JWT::encode($payload, $this->privateKey, 'ES384');
    }

    /**
     * Prepare JSON body exactly as sent — no extra spaces or escaping.
     */
    public static function prepareJsonBody(array $data): string
    {
        $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new InvalidArgumentException('Failed to encode JSON: ' . json_last_error_msg());
        }
        return $json;
    }
}
