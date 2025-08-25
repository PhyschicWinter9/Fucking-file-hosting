<?php

return [
    /*
    |--------------------------------------------------------------------------
    | File Hosting Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration options specific to the fast file hosting service.
    | These settings control file upload limits, storage paths, and privacy options.
    |
    */

    'max_file_size' => env('MAX_FILE_SIZE', (int)(env('MAX_FILE_SIZE_MB', 10) * 1024 * 1024)), // Configurable via MB setting
    'max_file_size_mb' => env('MAX_FILE_SIZE_MB', 100), // Maximum file size in MB (configurable)
    'chunk_size' => env('CHUNK_SIZE', 2097152), // 2MB in bytes (Cloudflare compatibility)
    'bypass_cloudflare' => env('BYPASS_CLOUDFLARE', true), // Enable direct server uploads to bypass Cloudflare limits
    'files_storage_path' => env('FILES_STORAGE_PATH', 'files'),
    'cleanup_expired_files' => env('CLEANUP_EXPIRED_FILES', true),

    /*
    |--------------------------------------------------------------------------
    | Privacy Configuration
    |--------------------------------------------------------------------------
    |
    | Settings to ensure complete user privacy and anonymity.
    |
    */

    'disable_ip_logging' => env('DISABLE_IP_LOGGING', true),
    'disable_user_tracking' => env('DISABLE_USER_TRACKING', true),
    'anonymous_sessions' => env('ANONYMOUS_SESSIONS', true),

    /*
    |--------------------------------------------------------------------------
    | Shared Hosting Optimizations
    |--------------------------------------------------------------------------
    |
    | Configuration options optimized for shared hosting environments.
    |
    */

    'memory_limit' => env('MEMORY_LIMIT', '512M'),
    'max_execution_time' => env('MAX_EXECUTION_TIME', 300),
    'upload_max_filesize' => env('UPLOAD_MAX_FILESIZE', '100M'),
    'post_max_size' => env('POST_MAX_SIZE', '100M'),

    /*
    |--------------------------------------------------------------------------
    | File Expiration Settings
    |--------------------------------------------------------------------------
    |
    | Default expiration settings for uploaded files.
    |
    */

    'default_expiration_days' => env('DEFAULT_EXPIRATION_DAYS', 1),
    'max_expiration_days' => env('MAX_EXPIRATION_DAYS', 30),
    'allow_permanent_files' => env('ALLOW_PERMANENT_FILES', false),

    /*
    |--------------------------------------------------------------------------
    | Chunked Upload Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for chunked upload sessions and timeouts.
    |
    */

    'chunked_upload_session_timeout_hours' => env('CHUNKED_UPLOAD_SESSION_TIMEOUT_HOURS', 48), // 48 hours for large files
    'chunked_upload_cleanup_interval_hours' => env('CHUNKED_UPLOAD_CLEANUP_INTERVAL_HOURS', 6), // Clean up every 6 hours
    'chunked_upload_max_retries' => env('CHUNKED_UPLOAD_MAX_RETRIES', 3), // Max retries per chunk

    /*
    |--------------------------------------------------------------------------
    | File Management Settings
    |--------------------------------------------------------------------------
    |
    | Settings for file management and owner controls.
    |
    */

    'allow_owner_delete' => env('ALLOW_OWNER_DELETE', true),
    'show_download_links' => env('SHOW_DOWNLOAD_LINKS', true),
    'enable_file_info_page' => env('ENABLE_FILE_INFO_PAGE', true),
    'generate_delete_tokens' => env('GENERATE_DELETE_TOKENS', true),

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting Settings
    |--------------------------------------------------------------------------
    |
    | Configuration for rate limiting to prevent abuse.
    |
    */

    'rate_limiting_enabled' => env('RATE_LIMITING_ENABLED', false),
    'rate_limit_uploads' => env('RATE_LIMIT_UPLOADS', 0), // 0 = no limit
    'rate_limit_downloads' => env('RATE_LIMIT_DOWNLOADS', 60),
    'rate_limit_api' => env('RATE_LIMIT_API', 100),

    /*
    |--------------------------------------------------------------------------
    | Security Settings
    |--------------------------------------------------------------------------
    |
    | Security-related configuration options.
    |
    */

    'allowed_mime_types' => [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        // Documents
        'application/pdf', 'text/plain', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Archives
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'application/gzip', 'application/x-tar',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        // Video
        'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        // Code
        'text/html', 'text/css', 'text/javascript', 'application/json',
        'application/xml', 'text/xml',
        // Other
        'application/octet-stream'
    ],

    'blocked_extensions' => [
        'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
        'php', 'asp', 'aspx', 'jsp', 'py', 'rb', 'pl', 'sh'
    ],
];
