<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Security Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains security settings for the Fast File Hosting service.
    | All settings are designed to maximize security while maintaining
    | functionality for file hosting operations.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Cryptographic Settings
    |--------------------------------------------------------------------------
    |
    | Requirements: 3.4 - Cryptographic file ID generation
    */
    'cryptography' => [
        'file_id_algorithm' => 'sha256',
        'checksum_algorithm' => 'sha256',
        'secure_random_bytes' => 64,
        'entropy_sources' => [
            'random_bytes',
            'microtime',
            'hrtime',
            'memory_usage',
            'process_id',
            'hostname',
            'app_key'
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | File Security Settings
    |--------------------------------------------------------------------------
    |
    | Requirements: 7.7 - File type validation and sanitization
    */
    'files' => [
        'max_size' => 10737418240, // 10GB in bytes
        'secure_permissions' => [
            'file' => 0640,
            'directory' => 0750,
            'htaccess' => 0644,
        ],
        'blocked_extensions' => [
            'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
            'php', 'php3', 'php4', 'php5', 'phtml', 'asp', 'aspx', 'jsp',
            'sh', 'bash', 'csh', 'ksh', 'zsh', 'pl', 'py', 'rb', 'ps1',
            'msi', 'deb', 'rpm', 'dmg', 'pkg', 'app', 'ipa', 'apk',
        ],
        'blocked_mime_types' => [
            'application/x-executable',
            'application/x-msdownload',
            'application/x-msdos-program',
            'application/x-msi',
            'application/x-winexe',
            'application/x-php',
            'text/x-php',
            'application/x-httpd-php',
            'text/x-script.phps',
            'application/x-javascript',
            'text/javascript',
            'application/javascript',
            'text/x-shellscript',
            'application/x-sh',
        ],
        'secure_deletion' => [
            'enabled' => true,
            'overwrite_passes' => 3,
            'chunk_size' => 8192,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | HTTP Security Headers
    |--------------------------------------------------------------------------
    |
    | Requirements: 7.7 - Security headers and CSRF protection
    */
    'headers' => [
        'content_security_policy' => [
            'default-src' => "'self'",
            'script-src' => "'self' 'unsafe-inline'",
            'style-src' => "'self' 'unsafe-inline'",
            'img-src' => "'self' data: blob:",
            'font-src' => "'self'",
            'connect-src' => "'self'",
            'media-src' => "'self'",
            'object-src' => "'none'",
            'frame-src' => "'none'",
            'worker-src' => "'none'",
            'frame-ancestors' => "'none'",
            'form-action' => "'self'",
            'base-uri' => "'self'",
            'manifest-src' => "'none'",
            'upgrade-insecure-requests' => true,
        ],
        'permissions_policy' => [
            'geolocation' => '()',
            'microphone' => '()',
            'camera' => '()',
            'payment' => '()',
            'usb' => '()',
            'magnetometer' => '()',
            'gyroscope' => '()',
            'accelerometer' => '()',
            'ambient-light-sensor' => '()',
            'autoplay' => '()',
            'encrypted-media' => '()',
            'fullscreen' => '()',
            'picture-in-picture' => '()',
            'sync-xhr' => '()',
            'web-share' => '()',
            'clipboard-read' => '()',
            'clipboard-write' => '()',
            'gamepad' => '()',
            'hid' => '()',
            'idle-detection' => '()',
            'serial' => '()',
            'bluetooth' => '()',
            'midi' => '()',
        ],
        'hsts' => [
            'max_age' => 31536000,
            'include_subdomains' => true,
            'preload' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting Configuration
    |--------------------------------------------------------------------------
    */
    'rate_limiting' => [
        'enabled' => true,
        'upload' => [
            'max_attempts' => 10,
            'time_window' => 60, // seconds
        ],
        'download' => [
            'max_attempts' => 60,
            'time_window' => 60, // seconds
        ],
        'api' => [
            'max_attempts' => 100,
            'time_window' => 60, // seconds
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Privacy Protection Settings
    |--------------------------------------------------------------------------
    |
    | Requirements: 3.1, 3.2, 3.3, 3.5, 3.6 - Complete privacy protection
    */
    'privacy' => [
        'mode' => 'strict',
        'strip_personal_data' => true,
        'disable_ip_logging' => true,
        'disable_user_agent_logging' => true,
        'disable_analytics' => true,
        'disable_tracking' => true,
        'gdpr_compliant' => true,
        'anonymous_sessions' => true,
        'secure_logging' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | CSRF Protection
    |--------------------------------------------------------------------------
    |
    | Requirements: 7.7 - CSRF protection
    */
    'csrf' => [
        'enabled' => true,
        'token_length' => 32,
        'lifetime' => 7200, // 2 hours in seconds
        'regenerate_on_login' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Session Security
    |--------------------------------------------------------------------------
    */
    'session' => [
        'secure' => true,
        'http_only' => true,
        'same_site' => 'strict',
        'encrypt' => true,
        'lifetime' => 120, // minutes
        'expire_on_close' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Input Validation and Sanitization
    |--------------------------------------------------------------------------
    */
    'validation' => [
        'max_filename_length' => 255,
        'sanitize_filenames' => true,
        'check_file_content' => true,
        'validate_mime_types' => true,
        'prevent_path_traversal' => true,
        'strip_null_bytes' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Monitoring and Logging
    |--------------------------------------------------------------------------
    */
    'monitoring' => [
        'log_security_events' => true,
        'log_failed_uploads' => true,
        'log_suspicious_activity' => true,
        'alert_on_multiple_failures' => true,
        'max_failures_before_alert' => 5,
    ],

    /*
    |--------------------------------------------------------------------------
    | Secure File Storage Configuration
    |--------------------------------------------------------------------------
    */
    'storage' => [
        'encrypt_files' => false, // Set to true for additional security
        'secure_directory_structure' => true,
        'auto_create_htaccess' => true,
        'verify_file_integrity' => true,
        'quarantine_suspicious_files' => true,
    ],
];