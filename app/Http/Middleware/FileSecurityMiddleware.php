<?php

namespace App\Http\Middleware;

use App\Services\FileValidationService;
use App\Services\PrivacyManager;
use App\Services\SecurityService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FileSecurityMiddleware
{
    private FileValidationService $fileValidationService;
    private PrivacyManager $privacyManager;
    private SecurityService $securityService;

    public function __construct(
        FileValidationService $fileValidationService,
        PrivacyManager $privacyManager,
        SecurityService $securityService
    ) {
        $this->fileValidationService = $fileValidationService;
        $this->privacyManager = $privacyManager;
        $this->securityService = $securityService;
    }

    /**
     * Handle an incoming request.
     * 
     * Requirements: 7.7 - CSRF protection and security headers
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if request is from secure context
        if (!$this->securityService->isSecureRequest($request)) {
            $this->securityService->logSecurityEvent('insecure_request_blocked', [
                'path' => $request->path(),
                'method' => $request->method()
            ]);
            
            return response()->json([
                'error' => 'Secure connection required'
            ], 426); // 426 Upgrade Required
        }

        // Apply rate limiting for security
        $identifier = $request->ip() ?? 'anonymous';
        if (!$this->securityService->checkRateLimit($identifier, 100, 60)) {
            $this->securityService->logSecurityEvent('rate_limit_exceeded', [
                'path' => $request->path()
            ]);
            
            return response()->json([
                'error' => 'Rate limit exceeded'
            ], 429);
        }

        // Apply privacy protection
        $this->privacyManager->sanitizeRequest($request);

        // Process the request
        $response = $next($request);

        // Add comprehensive security headers
        $securityHeaders = array_merge(
            $this->securityService->getSecurityHeaders(),
            $this->fileValidationService->getSecurityHeaders(),
            $this->privacyManager->getGDPRHeaders(),
            $this->getAdditionalSecurityHeaders()
        );

        foreach ($securityHeaders as $header => $value) {
            $response->headers->set($header, $value);
        }

        return $response;
    }

    /**
     * Get additional security headers.
     */
    private function getAdditionalSecurityHeaders(): array
    {
        return [
            'Permissions-Policy' => 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
            'Cross-Origin-Embedder-Policy' => 'require-corp',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'Cross-Origin-Resource-Policy' => 'same-origin',
        ];
    }
}