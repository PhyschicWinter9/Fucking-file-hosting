<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $type = 'general'): Response
    {
        if (!config('filehosting.rate_limiting_enabled', true)) {
            return $next($request);
        }

        $maxAttempts = $this->getMaxAttempts($type);
        
        // Skip rate limiting if max attempts is 0 (unlimited)
        if ($maxAttempts === 0) {
            return $next($request);
        }

        $key = $this->resolveRequestSignature($request, $type);
        $decayMinutes = $this->getDecayMinutes($type);

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($key);

            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'RATE_LIMIT_EXCEEDED',
                    'message' => 'Too many requests. Please try again later.',
                    'details' => [
                        'retry_after' => $retryAfter,
                        'limit' => $maxAttempts,
                        'window' => $decayMinutes . ' minutes'
                    ]
                ]
            ], 429)->header('Retry-After', $retryAfter);
        }

        RateLimiter::hit($key, $decayMinutes * 60);

        $response = $next($request);

        // Add rate limit headers
        $remaining = $maxAttempts - RateLimiter::attempts($key);
        $response->headers->set('X-RateLimit-Limit', $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', max(0, $remaining));
        $response->headers->set('X-RateLimit-Reset', now()->addMinutes($decayMinutes)->timestamp);

        return $response;
    }

    /**
     * Resolve request signature for rate limiting.
     */
    protected function resolveRequestSignature(Request $request, string $type): string
    {
        // Use IP address for rate limiting (privacy-friendly approach)
        $ip = $request->ip();

        // Hash the IP for additional privacy
        $hashedIp = hash('sha256', $ip . config('app.key'));

        return "rate_limit:{$type}:{$hashedIp}";
    }

    /**
     * Get maximum attempts for the given type.
     */
    protected function getMaxAttempts(string $type): int
    {
        return match ($type) {
            'upload' => config('filehosting.rate_limit_uploads', 0),
            'download' => config('filehosting.rate_limit_downloads', 60),
            'api' => config('filehosting.rate_limit_api', 100),
            default => 60,
        };
    }

    /**
     * Get decay minutes for the given type.
     */
    protected function getDecayMinutes(string $type): int
    {
        return match ($type) {
            'upload' => 1, // 1 minute window for uploads
            'download' => 1, // 1 minute window for downloads
            'api' => 1, // 1 minute window for API calls
            default => 1,
        };
    }
}
