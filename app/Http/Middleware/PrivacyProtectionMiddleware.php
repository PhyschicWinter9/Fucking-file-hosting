<?php

namespace App\Http\Middleware;

use App\Services\PrivacyManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PrivacyProtectionMiddleware
{
    private PrivacyManager $privacyManager;

    public function __construct(PrivacyManager $privacyManager)
    {
        $this->privacyManager = $privacyManager;
    }

    /**
     * Handle an incoming request with comprehensive privacy protection.
     *
     * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6 - Complete privacy protection
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Initialize privacy protection
        $this->privacyManager->preventLogging();

        // Sanitize request to remove all personal data and tracking information
        $this->privacyManager->sanitizeRequest($request);

        // Remove IP logging from Laravel's default logging
        $this->disableIPLogging($request);

        // Process the request
        $response = $next($request);

        // Add privacy-focused headers to response
        $this->addPrivacyHeaders($response);

        // Log privacy-compliant action if needed
        $this->logPrivacyCompliantAction($request);

        return $response;
    }

    /**
     * Disable IP logging in Laravel's default request logging.
     */
    private function disableIPLogging(Request $request): void
    {
        // Override Laravel's default IP detection methods
        $request->setTrustedProxies(['*'], Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO);

        // Remove IP-related server variables
        $ipHeaders = [
            'REMOTE_ADDR',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_X_FORWARDED',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
        ];

        foreach ($ipHeaders as $header) {
            $request->server->remove($header);
        }

        // Override the ip() method result
        $request->setUserResolver(function () {
            return null; // No user tracking
        });
    }

    /**
     * Add comprehensive privacy headers to response.
     */
    private function addPrivacyHeaders(Response $response): void
    {
        $privacyHeaders = array_merge(
            $this->privacyManager->getGDPRHeaders(),
            [
                // Prevent tracking and analytics
                'X-Robots-Tag' => 'noindex, nofollow, noarchive, nosnippet, noimageindex',
                'X-Privacy-Mode' => 'strict',
                'X-No-Tracking' => 'true',
                'X-Analytics-Disabled' => 'true',

                // Prevent caching of personal data
                'Cache-Control' => 'no-cache, no-store, must-revalidate, private',
                'Pragma' => 'no-cache',
                'Expires' => '0',

                // Additional privacy headers
                'Clear-Site-Data' => '"cache", "cookies", "storage"',
                'X-DNS-Prefetch-Control' => 'off',

                // Prevent referrer leakage
                'Referrer-Policy' => 'no-referrer',

                // Content security to prevent tracking scripts
                'Content-Security-Policy' => $this->getContentSecurityPolicy(),

                // Permissions policy to disable tracking features
                'Permissions-Policy' => implode(', ', [
                    'geolocation=()',
                    'microphone=()',
                    'camera=()',
                    'payment=()',
                    'usb=()',
                    'magnetometer=()',
                    'gyroscope=()',
                    'accelerometer=()',
                    'ambient-light-sensor=()',
                    'autoplay=()',
                    'encrypted-media=()',
                    'fullscreen=()',
                    'picture-in-picture=()',
                    'sync-xhr=()',
                    'web-share=()'
                ])
            ]
        );

        foreach ($privacyHeaders as $header => $value) {
            $response->headers->set($header, $value);
        }
    }

    /**
     * Log privacy-compliant action without personal data.
     */
    private function logPrivacyCompliantAction(Request $request): void
    {
        // Only log essential information without any personal data
        $logData = [
            'action' => 'request_processed',
            'method' => $request->method(),
            'path' => $request->path(),
            'anonymous_id' => session('anonymous_id'),
            'timestamp' => now()->toISOString(),
            'user_agent_hash' => $this->getAnonymousUserAgentHash($request),
        ];

        // Remove any potential personal data
        $logData = $this->privacyManager->stripPersonalData($logData);

        Log::info('Privacy-compliant request processed', $logData);
    }

    /**
     * Generate anonymous hash of user agent for basic analytics without tracking.
     */
    private function getAnonymousUserAgentHash(Request $request): string
    {
        $userAgent = $request->header('User-Agent', 'unknown');

        // Create a non-reversible hash that can't be used for tracking
        // but can help with basic browser compatibility statistics
        return substr(hash('sha256', $userAgent . config('app.key')), 0, 8);
    }

    /**
     * Get environment-appropriate Content Security Policy.
     */
    private function getContentSecurityPolicy(): string
    {
        $isDevelopment = config('app.env') === 'local' || config('app.debug');

        if ($isDevelopment) {
            // Development-friendly CSP
            return implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*",
                "script-src-elem 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*",
                "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
                "style-src-elem 'self' 'unsafe-inline' https://fonts.bunny.net",
                "img-src 'self' data: blob:",
                "font-src 'self' data: https://fonts.bunny.net",
                "connect-src 'self' ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*",
                "media-src 'self' blob:",
                "object-src 'none'",
                "frame-src 'none'",
                "worker-src 'none'",
                "frame-ancestors 'none'",
                "form-action 'self'",
                "base-uri 'self'",
                "manifest-src 'none'"
            ]);
        }

        // Production CSP - strict security
        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
            "img-src 'self' data:",
            "font-src 'self' data: https://fonts.bunny.net",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "frame-src 'none'",
            "worker-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "manifest-src 'none'"
        ]);
    }
}
