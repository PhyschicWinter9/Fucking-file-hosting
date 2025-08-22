<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Shared Hosting Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration file contains settings optimized for shared hosting
    | environments, particularly cPanel-based hosting providers.
    |
    */

    'enabled' => env('SHARED_HOSTING_MODE', false),

    /*
    |--------------------------------------------------------------------------
    | File Upload Configuration
    |--------------------------------------------------------------------------
    */
    'upload' => [
        'max_size' => env('FILE_MAX_SIZE', 10737418240), // 10GB in bytes
        'chunk_size' => env('UPLOAD_CHUNK_SIZE', 10485760), // 10MB chunks
        'allowed_extensions' => [
            // Documents
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt',
            // Images
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
            // Videos
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp',
            // Audio
            'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
            // Archives
            'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
            // Code
            'html', 'css', 'js', 'php', 'py', 'java', 'cpp', 'c', 'h',
            // Other
            'json', 'xml', 'csv', 'sql', 'log'
        ],
        'blocked_extensions' => [
            'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'jar'
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Performance Configuration
    |--------------------------------------------------------------------------
    */
    'performance' => [
        'memory_limit' => env('MEMORY_LIMIT', '512M'),
        'execution_time_limit' => env('EXECUTION_TIME_LIMIT', 600),
        'enable_compression' => env('ENABLE_COMPRESSION', true),
        'cache_static_assets' => env('CACHE_STATIC_ASSETS', true),
        'optimize_images' => env('OPTIMIZE_IMAGES', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Security Configuration
    |--------------------------------------------------------------------------
    */
    'security' => [
        'secure_headers' => env('SECURE_HEADERS', true),
        'force_https' => env('FORCE_HTTPS', true),
        'csrf_protection' => env('CSRF_PROTECTION', true),
        'rate_limiting' => [
            'enabled' => env('RATE_LIMITING_ENABLED', true),
            'uploads_per_minute' => env('RATE_LIMIT_UPLOADS', 10),
            'downloads_per_minute' => env('RATE_LIMIT_DOWNLOADS', 60),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Privacy Configuration
    |--------------------------------------------------------------------------
    */
    'privacy' => [
        'mode' => env('PRIVACY_MODE', 'strict'), // strict, moderate, basic
        'log_ip_addresses' => env('LOG_IP_ADDRESSES', false),
        'analytics_enabled' => env('ANALYTICS_ENABLED', false),
        'tracking_enabled' => env('TRACKING_ENABLED', false),
        'cookie_consent' => env('COOKIE_CONSENT_REQUIRED', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | File Management Configuration
    |--------------------------------------------------------------------------
    */
    'files' => [
        'storage_path' => env('FILE_STORAGE_PATH', 'storage/app/files'),
        'cleanup_enabled' => env('FILE_CLEANUP_ENABLED', true),
        'default_expiry_days' => env('FILE_DEFAULT_EXPIRY_DAYS', 30),
        'max_expiry_days' => env('FILE_MAX_EXPIRY_DAYS', 365),
        'duplicate_detection' => env('FILE_DUPLICATE_DETECTION', true),
        'virus_scanning' => env('FILE_VIRUS_SCANNING', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Database Configuration
    |--------------------------------------------------------------------------
    */
    'database' => [
        'optimize_queries' => env('DB_OPTIMIZE_QUERIES', true),
        'connection_pooling' => env('DB_CONNECTION_POOLING', false),
        'query_cache' => env('DB_QUERY_CACHE', true),
        'slow_query_log' => env('DB_SLOW_QUERY_LOG', false),
    ],

    /*
    |--------------------------------------------------------------------------
    | Caching Configuration
    |--------------------------------------------------------------------------
    */
    'cache' => [
        'driver' => env('CACHE_DRIVER', 'file'),
        'prefix' => env('CACHE_PREFIX', 'ffh_'),
        'ttl' => [
            'file_info' => env('CACHE_FILE_INFO_TTL', 3600), // 1 hour
            'config' => env('CACHE_CONFIG_TTL', 86400), // 24 hours
            'routes' => env('CACHE_ROUTES_TTL', 86400), // 24 hours
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging Configuration
    |--------------------------------------------------------------------------
    */
    'logging' => [
        'level' => env('LOG_LEVEL', 'error'),
        'max_files' => env('LOG_MAX_FILES', 5),
        'max_size' => env('LOG_MAX_SIZE', '10MB'),
        'channels' => [
            'uploads' => env('LOG_UPLOADS', false),
            'downloads' => env('LOG_DOWNLOADS', false),
            'errors' => env('LOG_ERRORS', true),
            'security' => env('LOG_SECURITY', true),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Monitoring Configuration
    |--------------------------------------------------------------------------
    */
    'monitoring' => [
        'enabled' => env('MONITORING_ENABLED', true),
        'disk_usage_threshold' => env('DISK_USAGE_THRESHOLD', 90), // Percentage
        'memory_usage_threshold' => env('MEMORY_USAGE_THRESHOLD', 80), // Percentage
        'error_rate_threshold' => env('ERROR_RATE_THRESHOLD', 5), // Percentage
        'response_time_threshold' => env('RESPONSE_TIME_THRESHOLD', 5000), // Milliseconds
    ],

    /*
    |--------------------------------------------------------------------------
    | Backup Configuration
    |--------------------------------------------------------------------------
    */
    'backup' => [
        'enabled' => env('BACKUP_ENABLED', false),
        'frequency' => env('BACKUP_FREQUENCY', 'daily'), // daily, weekly, monthly
        'retention_days' => env('BACKUP_RETENTION_DAYS', 30),
        'include_files' => env('BACKUP_INCLUDE_FILES', false),
        'compress' => env('BACKUP_COMPRESS', true),
    ],
];
