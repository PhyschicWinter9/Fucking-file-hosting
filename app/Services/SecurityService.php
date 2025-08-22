<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SecurityService
{
    /**
     * Generate cryptographically secure file ID with enhanced security.
     *
     * Requirements: 3.4 - Cryptographic file ID generation
     */
    public function generateSecureFileId(): string
    {
        // Use multiple entropy sources for maximum security
        $entropy = [
            random_bytes(64),                    // 64 bytes of cryptographically secure random data
            microtime(true),                     // High precision timestamp
            hrtime(true),                        // High resolution time
            memory_get_usage(true),              // Current memory usage
            getmypid(),                          // Process ID
            gethostname(),                       // Hostname
            $_SERVER['REQUEST_TIME_FLOAT'] ?? microtime(true), // Request time
            uniqid('', true),                    // Unique ID with more entropy
        ];

        // Add application key for additional entropy
        $entropy[] = config('app.key');

        // Combine all entropy sources
        $entropyString = implode('|', array_map(function ($item) {
            return is_scalar($item) ? (string) $item : serialize($item);
        }, $entropy));

        // Generate multiple hashes and combine them
        $hash1 = hash('sha256', $entropyString);
        $hash2 = hash('sha512', $entropyString . $hash1);
        $hash3 = hash('sha3-256', $hash1 . $hash2);

        // Final hash combining all previous hashes
        $finalHash = hash('sha256', $hash1 . $hash2 . $hash3);

        return $finalHash;
    }

    /**
     * Secure file storage with proper permissions.
     *
     * Requirements: 3.4, 7.7 - Secure file storage with proper permissions
     */
    public function secureFileStorage(string $filePath): bool
    {
        $fullPath = Storage::disk('public')->path($filePath);

        if (!file_exists($fullPath)) {
            return false;
        }

        // Set secure file permissions (readable by owner and group, not world-readable)
        chmod($fullPath, 0640);

        // Ensure directory has proper permissions
        $directory = dirname($fullPath);
        if (is_dir($directory)) {
            chmod($directory, 0750);
        }

        // Create .htaccess file to prevent direct access if it doesn't exist
        $htaccessPath = $directory . '/.htaccess';
        if (!file_exists($htaccessPath)) {
            $htaccessContent = $this->generateSecureHtaccess();
            file_put_contents($htaccessPath, $htaccessContent);
            chmod($htaccessPath, 0644);
        }

        return true;
    }

    /**
     * Generate secure .htaccess content for file protection.
     */
    private function generateSecureHtaccess(): string
    {
        return <<<'HTACCESS'
# Deny direct access to files
<Files "*">
    Order Deny,Allow
    Deny from all
</Files>

# Prevent directory browsing
Options -Indexes

# Disable server signature
ServerSignature Off

# Prevent access to sensitive files
<FilesMatch "\.(env|log|ini|conf|config|bak|backup|old|tmp|temp)$">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "no-referrer"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>

# Disable PHP execution in upload directories
<IfModule mod_php7.c>
    php_flag engine off
</IfModule>
<IfModule mod_php8.c>
    php_flag engine off
</IfModule>

# Remove server information
<IfModule mod_headers.c>
    Header unset Server
    Header unset X-Powered-By
</IfModule>
HTACCESS;
    }

    /**
     * Add comprehensive security headers to response.
     *
     * Requirements: 7.7 - Security headers and CSRF protection
     */
    public function getSecurityHeaders(): array
    {
        return [
            // Content Security Policy - Environment specific
            'Content-Security-Policy' => $this->getContentSecurityPolicy(),

            // Prevent MIME type sniffing
            'X-Content-Type-Options' => 'nosniff',

            // Prevent clickjacking
            'X-Frame-Options' => 'DENY',

            // XSS Protection
            'X-XSS-Protection' => '1; mode=block',

            // Referrer Policy - No referrer to protect privacy
            'Referrer-Policy' => 'no-referrer',

            // HSTS - Force HTTPS
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains; preload',

            // Cross-Origin policies
            'Cross-Origin-Embedder-Policy' => 'require-corp',
            'Cross-Origin-Opener-Policy' => 'same-origin',
            'Cross-Origin-Resource-Policy' => 'same-origin',

            // Permissions Policy - Disable all unnecessary features
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
                'web-share=()',
                'clipboard-read=()',
                'clipboard-write=()',
                'gamepad=()',
                'hid=()',
                'idle-detection=()',
                'serial=()',
                'bluetooth=()',
                'midi=()'
            ]),

            // Cache Control - Prevent caching of sensitive data
            'Cache-Control' => 'no-cache, no-store, must-revalidate, private',
            'Pragma' => 'no-cache',
            'Expires' => '0',

            // Remove server information
            'Server' => '',
            'X-Powered-By' => '',

            // Additional security headers
            'X-Robots-Tag' => 'noindex, nofollow, noarchive, nosnippet, noimageindex',
            'X-DNS-Prefetch-Control' => 'off',
            'X-Download-Options' => 'noopen',
            'X-Permitted-Cross-Domain-Policies' => 'none',
        ];
    }

    /**
     * Validate and sanitize file path to prevent directory traversal.
     */
    public function sanitizeFilePath(string $path): string
    {
        // Remove any directory traversal attempts
        $path = str_replace(['../', '..\\', '../', '..\\'], '', $path);

        // Remove null bytes
        $path = str_replace("\0", '', $path);

        // Remove leading slashes and backslashes
        $path = ltrim($path, '/\\');

        // Normalize path separators
        $path = str_replace('\\', '/', $path);

        // Remove multiple consecutive slashes
        $path = preg_replace('/\/+/', '/', $path);

        return $path;
    }

    /**
     * Generate secure random token for CSRF protection.
     */
    public function generateSecureToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }

    /**
     * Verify file integrity using checksum.
     */
    public function verifyFileIntegrity(string $filePath, string $expectedChecksum): bool
    {
        if (!file_exists($filePath)) {
            return false;
        }

        $actualChecksum = hash_file('sha256', $filePath);
        return hash_equals($expectedChecksum, $actualChecksum);
    }

    /**
     * Secure file deletion with multiple overwrites.
     */
    public function secureFileDelete(string $filePath): bool
    {
        if (!file_exists($filePath)) {
            return true;
        }

        $fileSize = filesize($filePath);
        if ($fileSize === false) {
            return false;
        }

        // Open file for writing
        $handle = fopen($filePath, 'r+b');
        if (!$handle) {
            return false;
        }

        try {
            // Overwrite with random data multiple times
            for ($pass = 0; $pass < 3; $pass++) {
                fseek($handle, 0);

                $written = 0;
                while ($written < $fileSize) {
                    $chunkSize = min(8192, $fileSize - $written);
                    $randomData = random_bytes($chunkSize);
                    $bytesWritten = fwrite($handle, $randomData);

                    if ($bytesWritten === false) {
                        break;
                    }

                    $written += $bytesWritten;
                }

                fflush($handle);
                fsync($handle);
            }

            // Final overwrite with zeros
            fseek($handle, 0);
            $written = 0;
            while ($written < $fileSize) {
                $chunkSize = min(8192, $fileSize - $written);
                $zeroData = str_repeat("\0", $chunkSize);
                $bytesWritten = fwrite($handle, $zeroData);

                if ($bytesWritten === false) {
                    break;
                }

                $written += $bytesWritten;
            }

            fflush($handle);
            fsync($handle);

        } finally {
            fclose($handle);
        }

        // Finally delete the file
        return unlink($filePath);
    }

    /**
     * Check if request is from a secure context.
     */
    public function isSecureRequest(Request $request): bool
    {
        // Check if HTTPS is being used
        if (!$request->isSecure() && config('app.env') === 'production') {
            return false;
        }

        // Check for required security headers
        $requiredHeaders = ['X-Requested-With', 'Accept'];
        foreach ($requiredHeaders as $header) {
            if (!$request->hasHeader($header)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Rate limiting check for security.
     */
    public function checkRateLimit(string $identifier, int $maxAttempts = 10, int $timeWindow = 60): bool
    {
        $key = 'rate_limit:' . hash('sha256', $identifier);
        $attempts = cache()->get($key, 0);

        if ($attempts >= $maxAttempts) {
            return false;
        }

        cache()->put($key, $attempts + 1, $timeWindow);
        return true;
    }

    /**
     * Log security event without personal data.
     */
    public function logSecurityEvent(string $event, array $context = []): void
    {
        // Strip any personal data from context
        $sanitizedContext = array_filter($context, function ($key) {
            $personalDataKeys = ['ip', 'user_agent', 'email', 'phone', 'name'];
            return !in_array(strtolower($key), $personalDataKeys);
        }, ARRAY_FILTER_USE_KEY);

        $sanitizedContext['event_type'] = 'security';
        $sanitizedContext['timestamp'] = now()->toISOString();
        $sanitizedContext['session_id'] = session('anonymous_id');

        Log::warning("Security Event: {$event}", $sanitizedContext);
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
            "manifest-src 'none'",
            "upgrade-insecure-requests"
        ]);
    }
}
