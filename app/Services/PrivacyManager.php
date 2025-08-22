<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PrivacyManager
{
    /**
     * Sanitize request to strip personal data and tracking information.
     * 
     * Requirements: 3.1, 3.2, 3.6 - Strip personal data, prevent tracking
     */
    public function sanitizeRequest(Request $request): void
    {
        // Remove all IP-related headers
        $ipHeaders = [
            'REMOTE_ADDR', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP',
            'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED', 'HTTP_CF_CONNECTING_IP', 'HTTP_TRUE_CLIENT_IP'
        ];
        
        foreach ($ipHeaders as $header) {
            $request->server->remove($header);
        }
        
        // Remove user agent and fingerprinting headers
        $fingerprintingHeaders = [
            'HTTP_USER_AGENT', 'HTTP_ACCEPT_LANGUAGE', 'HTTP_ACCEPT_ENCODING',
            'HTTP_ACCEPT_CHARSET', 'HTTP_ACCEPT', 'HTTP_DNT', 'HTTP_SEC_CH_UA',
            'HTTP_SEC_CH_UA_MOBILE', 'HTTP_SEC_CH_UA_PLATFORM', 'HTTP_SEC_FETCH_DEST',
            'HTTP_SEC_FETCH_MODE', 'HTTP_SEC_FETCH_SITE', 'HTTP_SEC_FETCH_USER'
        ];
        
        foreach ($fingerprintingHeaders as $header) {
            $request->server->remove($header);
        }
        
        // Remove referrer and tracking headers
        $trackingHeaders = [
            'HTTP_REFERER', 'HTTP_ORIGIN', 'HTTP_X_REQUESTED_WITH',
            'HTTP_UPGRADE_INSECURE_REQUESTS', 'HTTP_CACHE_CONTROL'
        ];
        
        foreach ($trackingHeaders as $header) {
            $request->server->remove($header);
        }
        
        // Remove authentication and session headers that could enable tracking
        $authHeaders = [
            'HTTP_AUTHORIZATION', 'HTTP_PROXY_AUTHORIZATION', 'HTTP_WWW_AUTHENTICATE'
        ];
        
        foreach ($authHeaders as $header) {
            $request->server->remove($header);
        }
        
        // Clear any existing cookies to prevent tracking
        foreach ($request->cookies->all() as $name => $value) {
            // Only check session name if session is available
            $sessionName = $request->hasSession() ? session()->getName() : null;
            if ($name !== $sessionName) { // Keep only session cookie if it exists
                $request->cookies->remove($name);
            }
        }
        
        // Generate or maintain anonymous identifier for essential session management
        // Only if session is available (not for API routes)
        if ($request->hasSession()) {
            if (!$request->session()->has('anonymous_id')) {
                $request->session()->put('anonymous_id', $this->generateAnonymousId());
            }
        }
        
        // Remove any personal data from request input
        $sanitizedInput = $this->stripPersonalData($request->all());
        $request->replace($sanitizedInput);
        
        // Override IP method to always return null
        $request->macro('ip', function () {
            return null;
        });
        
        // Override getClientIp method
        $request->macro('getClientIp', function () {
            return null;
        });
    }
    
    /**
     * Prevent logging of personal information.
     * 
     * Requirements: 3.1, 3.2, 3.5 - No IP logging, no user tracking, privacy-focused logging
     */
    public function preventLogging(): void
    {
        // Configure logging to exclude personal data
        config([
            'logging.channels.single.ignore_exceptions' => false,
            'logging.channels.daily.ignore_exceptions' => false,
            'logging.channels.stack.ignore_exceptions' => false,
        ]);
        
        // Disable Laravel's default request logging that includes IP addresses
        config(['logging.log_request_details' => false]);
        
        // Set up custom log formatter that strips all personal data
        Log::getLogger()->pushProcessor(function ($record) {
            // Handle both old array format and new LogRecord format
            if ($record instanceof \Monolog\LogRecord) {
                // Remove all personal identifiers from context
                $personalKeys = [
                    'ip', 'user_agent', 'referer', 'remote_addr', 'client_ip',
                    'x_forwarded_for', 'x_real_ip', 'forwarded_for', 'forwarded',
                    'user_id', 'session_id', 'email', 'phone', 'name'
                ];
                
                $context = $record->context;
                foreach ($personalKeys as $key) {
                    if (isset($context[$key])) {
                        unset($context[$key]);
                    }
                }
                
                // Sanitize message content to remove any leaked personal data
                $message = $this->sanitizeLogMessage($record->message);
                
                // Sanitize extra data
                $extra = $record->extra;
                if (!empty($extra)) {
                    $extra = $this->stripPersonalData($extra);
                }
                
                // Add privacy compliance marker
                $context['privacy_compliant'] = true;
                $context['data_protection'] = 'gdpr_compliant';
                
                return $record->with(message: $message, context: $context, extra: $extra);
            } else {
                // Legacy array format support
                $personalKeys = [
                    'ip', 'user_agent', 'referer', 'remote_addr', 'client_ip',
                    'x_forwarded_for', 'x_real_ip', 'forwarded_for', 'forwarded',
                    'user_id', 'session_id', 'email', 'phone', 'name'
                ];
                
                foreach ($personalKeys as $key) {
                    if (isset($record['context'][$key])) {
                        unset($record['context'][$key]);
                    }
                }
                
                // Sanitize message content to remove any leaked personal data
                $record['message'] = $this->sanitizeLogMessage($record['message']);
                
                // Sanitize extra data
                if (isset($record['extra'])) {
                    $record['extra'] = $this->stripPersonalData($record['extra']);
                }
                
                // Add privacy compliance marker
                $record['context']['privacy_compliant'] = true;
                $record['context']['data_protection'] = 'gdpr_compliant';
                
                return $record;
            }
        });
        
        // Override Laravel's default exception handler to prevent IP logging
        $this->configurePrivacyExceptionHandling();
    }
    
    /**
     * Configure exception handling to be privacy-compliant.
     */
    private function configurePrivacyExceptionHandling(): void
    {
        // Prevent IP addresses from being logged in exceptions
        config([
            'app.debug_blacklist' => array_merge(
                config('app.debug_blacklist', []),
                [
                    '_SERVER' => [
                        'REMOTE_ADDR', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP',
                        'HTTP_CLIENT_IP', 'HTTP_USER_AGENT', 'HTTP_REFERER'
                    ],
                    '_ENV' => ['*'],
                    '_COOKIE' => ['*'],
                    '_SESSION' => ['*']
                ]
            )
        ]);
    }
    
    /**
     * Generate anonymous session identifier.
     */
    public function generateAnonymousId(): string
    {
        // Generate a random anonymous identifier
        // This is NOT tied to any personal information
        return 'anon_' . Str::random(32);
    }
    
    /**
     * Check if request contains personal data.
     */
    public function containsPersonalData(Request $request): bool
    {
        $personalDataIndicators = [
            'email',
            'phone',
            'address',
            'name',
            'ssn',
            'credit_card',
            'passport',
            'license',
        ];
        
        $requestData = $request->all();
        $requestString = json_encode($requestData);
        
        foreach ($personalDataIndicators as $indicator) {
            if (stripos($requestString, $indicator) !== false) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Strip personal data from request data.
     */
    public function stripPersonalData(array $data): array
    {
        $personalDataKeys = [
            'email',
            'phone',
            'address',
            'name',
            'first_name',
            'last_name',
            'ssn',
            'social_security',
            'credit_card',
            'passport',
            'license',
            'ip_address',
            'user_agent',
            'referer',
        ];
        
        foreach ($personalDataKeys as $key) {
            if (isset($data[$key])) {
                unset($data[$key]);
            }
        }
        
        // Recursively clean nested arrays
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = $this->stripPersonalData($value);
            }
        }
        
        return $data;
    }
    
    /**
     * Get privacy-safe request headers.
     */
    public function getPrivacySafeHeaders(Request $request): array
    {
        $safeHeaders = [
            'content-type',
            'content-length',
            'accept',
            'cache-control',
            'connection',
            'host',
        ];
        
        $headers = [];
        foreach ($safeHeaders as $header) {
            if ($request->hasHeader($header)) {
                $headers[$header] = $request->header($header);
            }
        }
        
        return $headers;
    }
    
    /**
     * Create privacy-compliant log entry.
     */
    public function createPrivacyLog(string $action, array $context = []): void
    {
        // Strip any personal data from context
        $sanitizedContext = $this->stripPersonalData($context);
        
        // Add anonymous identifier if available
        try {
            if (session()->has('anonymous_id')) {
                $sanitizedContext['anonymous_id'] = session('anonymous_id');
            }
        } catch (\Exception $e) {
            // Session not available (e.g., API routes), skip anonymous ID
        }
        
        // Add timestamp
        $sanitizedContext['timestamp'] = now()->toISOString();
        
        Log::info("Privacy-compliant action: {$action}", $sanitizedContext);
    }
    
    /**
     * Sanitize log message to remove personal data.
     */
    private function sanitizeLogMessage(string $message): string
    {
        // Remove IP addresses (IPv4 and IPv6)
        $message = preg_replace('/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/', '[IP_REMOVED]', $message);
        $message = preg_replace('/\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/', '[IPv6_REMOVED]', $message);
        
        // Remove email addresses
        $message = preg_replace('/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/', '[EMAIL_REMOVED]', $message);
        
        // Remove phone numbers (basic patterns)
        $message = preg_replace('/\b\d{3}-\d{3}-\d{4}\b/', '[PHONE_REMOVED]', $message);
        $message = preg_replace('/\b\(\d{3}\)\s*\d{3}-\d{4}\b/', '[PHONE_REMOVED]', $message);
        
        return $message;
    }
    
    /**
     * Validate that no personal data is being stored.
     */
    public function validateNoPersonalData(array $data): bool
    {
        $cleanedData = $this->stripPersonalData($data);
        
        // If the cleaned data is the same as original, no personal data was found
        return json_encode($data) === json_encode($cleanedData);
    }
    
    /**
     * Get GDPR-compliant response headers.
     * 
     * Requirements: 3.3, 3.5, 3.6 - No analytics, no tracking scripts, GDPR compliance
     */
    public function getGDPRHeaders(): array
    {
        return [
            'X-Privacy-Policy' => 'No personal data collected or stored',
            'X-Data-Retention' => 'Files only, zero user data retention',
            'X-Tracking' => 'Completely disabled',
            'X-Analytics' => 'No analytics or tracking scripts',
            'X-Cookies' => 'Essential session only, no tracking cookies',
            'X-IP-Logging' => 'Disabled - no IP addresses logged',
            'X-User-Agent-Logging' => 'Disabled - no user agent tracking',
            'X-Fingerprinting' => 'Prevented - no browser fingerprinting',
            'X-GDPR-Compliant' => 'true',
            'X-Privacy-Mode' => 'maximum',
            'X-Data-Minimization' => 'enforced',
            'X-Purpose-Limitation' => 'file-hosting-only',
            'X-Consent-Required' => 'false - no personal data processed',
        ];
    }
    
    /**
     * Ensure no analytics or tracking scripts are present.
     * 
     * Requirements: 3.5 - No analytics or tracking scripts
     */
    public function validateNoTrackingScripts(string $content): bool
    {
        $trackingPatterns = [
            // Google Analytics
            '/google-analytics\.com/i',
            '/googletagmanager\.com/i',
            '/gtag\(/i',
            '/ga\(/i',
            
            // Facebook tracking
            '/facebook\.net/i',
            '/fbevents\.js/i',
            '/fbq\(/i',
            
            // Other common tracking
            '/hotjar\.com/i',
            '/mixpanel\.com/i',
            '/segment\.com/i',
            '/amplitude\.com/i',
            '/intercom\.io/i',
            '/zendesk\.com/i',
            '/mouseflow\.com/i',
            '/fullstory\.com/i',
            '/logrocket\.com/i',
            
            // Generic tracking patterns
            '/track\(/i',
            '/analytics/i',
            '/_gaq/i',
            '/__utm/i',
        ];
        
        foreach ($trackingPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Remove all tracking and analytics code from content.
     */
    public function removeTrackingCode(string $content): string
    {
        // Remove Google Analytics
        $content = preg_replace('/<script[^>]*google-analytics[^>]*>.*?<\/script>/is', '', $content);
        $content = preg_replace('/<script[^>]*googletagmanager[^>]*>.*?<\/script>/is', '', $content);
        
        // Remove Facebook Pixel
        $content = preg_replace('/<script[^>]*fbevents[^>]*>.*?<\/script>/is', '', $content);
        
        // Remove other tracking scripts
        $content = preg_replace('/<script[^>]*hotjar[^>]*>.*?<\/script>/is', '', $content);
        $content = preg_replace('/<script[^>]*mixpanel[^>]*>.*?<\/script>/is', '', $content);
        
        // Remove tracking pixels
        $content = preg_replace('/<img[^>]*tracking[^>]*>/i', '', $content);
        $content = preg_replace('/<img[^>]*analytics[^>]*>/i', '', $content);
        
        return $content;
    }
}