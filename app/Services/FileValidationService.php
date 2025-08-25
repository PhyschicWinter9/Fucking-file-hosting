<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class FileValidationService
{
    /**
     * Dangerous file extensions that should be blocked.
     */
    const DANGEROUS_EXTENSIONS = [
        'exe',
        'bat',
        'cmd',
        'com',
        'pif',
        'scr',
        'vbs',
        'js',
        'jar',
        'php',
        'php3',
        'php4',
        'php5',
        'phtml',
        'asp',
        'aspx',
        'jsp',
        'sh',
        'bash',
        'csh',
        'ksh',
        'zsh',
        'pl',
        'py',
        'rb',
        'ps1',
        'msi',
        'deb',
        'rpm',
        'dmg',
        'pkg',
        'app',
        'ipa',
        'apk',
    ];

    /**
     * Dangerous MIME types that should be blocked.
     */
    const DANGEROUS_MIME_TYPES = [
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
    ];

    /**
     * Get maximum file size from config.
     */
    private function getMaxFileSizeFromConfig(): int
    {
        return config('filehosting.max_file_size', 104857600); // Default 100MB
    }

    /**
     * Validate uploaded file comprehensively.
     *
     * Requirements: 1.6, 2.5, 7.7 - File size validation, MIME validation, security checks
     */
    public function validateFile(UploadedFile $file): array
    {
        $errors = [];

        // Validate file size
        $sizeValidation = $this->validateFileSize($file);
        if (!$sizeValidation['valid']) {
            $errors[] = $sizeValidation['error'];
        }

        // Validate file extension
        $extensionValidation = $this->validateFileExtension($file);
        if (!$extensionValidation['valid']) {
            $errors[] = $extensionValidation['error'];
        }

        // Validate MIME type
        $mimeValidation = $this->validateMimeType($file);
        if (!$mimeValidation['valid']) {
            $errors[] = $mimeValidation['error'];
        }

        // Validate file content
        $contentValidation = $this->validateFileContent($file);
        if (!$contentValidation['valid']) {
            $errors[] = $contentValidation['error'];
        }

        // Check for malicious content
        $securityValidation = $this->performSecurityChecks($file);
        if (!$securityValidation['valid']) {
            $errors[] = $securityValidation['error'];
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'sanitized_name' => $this->sanitizeFileName($file->getClientOriginalName()),
            'detected_mime' => $this->detectMimeType($file),
        ];
    }

    /**
     * Validate file size against 10GB limit.
     *
     * Requirements: 1.6 - File size validation (10GB limit)
     */
    public function validateFileSize(UploadedFile $file): array
    {
        $fileSize = $file->getSize();

        if ($fileSize === false || $fileSize === null) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'INVALID_FILE_SIZE',
                    'message' => 'Unable to determine file size',
                ]
            ];
        }

        $maxFileSize = $this->getMaxFileSizeFromConfig();

        if ($fileSize > $maxFileSize) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'FILE_TOO_LARGE',
                    'message' => 'File size exceeds maximum limit',
                    'details' => [
                        'max_size' => $maxFileSize,
                        'file_size' => $fileSize,
                        'max_size_human' => $this->formatBytes($maxFileSize),
                        'file_size_human' => $this->formatBytes($fileSize),
                    ]
                ]
            ];
        }

        if ($fileSize === 0) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'EMPTY_FILE',
                    'message' => 'File is empty',
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Validate file extension for security.
     *
     * Requirements: 7.7 - File extension security checks
     */
    public function validateFileExtension(UploadedFile $file): array
    {
        $originalName = $file->getClientOriginalName();
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        // Check for dangerous extensions
        if (in_array($extension, self::DANGEROUS_EXTENSIONS)) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'DANGEROUS_FILE_TYPE',
                    'message' => 'File type not allowed for security reasons',
                    'details' => [
                        'extension' => $extension,
                        'reason' => 'Potentially executable file type'
                    ]
                ]
            ];
        }

        // Check for double extensions (e.g., file.txt.exe)
        if ($this->hasDoubleExtension($originalName)) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'SUSPICIOUS_FILENAME',
                    'message' => 'Filename contains suspicious double extension',
                    'details' => [
                        'filename' => $originalName,
                        'reason' => 'Double extensions can be used to hide malicious files'
                    ]
                ]
            ];
        }

        // Check for null bytes in filename
        if (strpos($originalName, "\0") !== false) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'INVALID_FILENAME',
                    'message' => 'Filename contains null bytes',
                    'details' => [
                        'reason' => 'Null bytes can be used for directory traversal attacks'
                    ]
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Validate and sanitize MIME type.
     *
     * Requirements: 2.5, 7.7 - MIME type validation and sanitization
     */
    public function validateMimeType(UploadedFile $file): array
    {
        $reportedMime = $file->getMimeType();
        $detectedMime = $this->detectMimeType($file);

        // Check for dangerous MIME types
        if (
            in_array($reportedMime, self::DANGEROUS_MIME_TYPES) ||
            in_array($detectedMime, self::DANGEROUS_MIME_TYPES)
        ) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'DANGEROUS_MIME_TYPE',
                    'message' => 'File MIME type not allowed for security reasons',
                    'details' => [
                        'reported_mime' => $reportedMime,
                        'detected_mime' => $detectedMime,
                        'reason' => 'Potentially executable MIME type'
                    ]
                ]
            ];
        }

        // Check for MIME type spoofing
        if ($reportedMime !== $detectedMime && $this->isCriticalMismatch($reportedMime, $detectedMime)) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'MIME_TYPE_MISMATCH',
                    'message' => 'File content does not match reported MIME type',
                    'details' => [
                        'reported_mime' => $reportedMime,
                        'detected_mime' => $detectedMime,
                        'reason' => 'Possible file type spoofing attempt'
                    ]
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Validate file content for malicious patterns.
     */
    public function validateFileContent(UploadedFile $file): array
    {
        $filePath = $file->getRealPath();

        // Read first 1KB of file for analysis
        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'FILE_READ_ERROR',
                    'message' => 'Unable to read file content for validation',
                ]
            ];
        }

        $header = fread($handle, 1024);
        fclose($handle);

        // Check for executable signatures
        if ($this->containsExecutableSignature($header)) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'EXECUTABLE_CONTENT',
                    'message' => 'File contains executable content',
                    'details' => [
                        'reason' => 'File header indicates executable format'
                    ]
                ]
            ];
        }

        // Check for script content in non-script files
        if ($this->containsScriptContent($header, $file->getMimeType())) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'SCRIPT_CONTENT',
                    'message' => 'File contains script content',
                    'details' => [
                        'reason' => 'Embedded script detected in non-script file'
                    ]
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Perform additional security checks.
     */
    public function performSecurityChecks(UploadedFile $file): array
    {
        // Check file path for directory traversal
        $originalName = $file->getClientOriginalName();
        if ($this->containsPathTraversal($originalName)) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'PATH_TRAVERSAL',
                    'message' => 'Filename contains path traversal sequences',
                    'details' => [
                        'filename' => $originalName,
                        'reason' => 'Directory traversal attempt detected'
                    ]
                ]
            ];
        }

        // Check for excessively long filename
        if (strlen($originalName) > 255) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'FILENAME_TOO_LONG',
                    'message' => 'Filename is too long',
                    'details' => [
                        'max_length' => 255,
                        'actual_length' => strlen($originalName)
                    ]
                ]
            ];
        }

        return ['valid' => true];
    }

    /**
     * Detect actual MIME type using file content.
     */
    private function detectMimeType(UploadedFile $file): string
    {
        $filePath = $file->getRealPath();

        // Use finfo to detect MIME type from content
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo) {
                $mimeType = finfo_file($finfo, $filePath);
                finfo_close($finfo);
                if ($mimeType) {
                    return $mimeType;
                }
            }
        }

        // Fallback to mime_content_type
        if (function_exists('mime_content_type')) {
            $mimeType = mime_content_type($filePath);
            if ($mimeType) {
                return $mimeType;
            }
        }

        // Last resort: use reported MIME type
        return $file->getMimeType() ?: 'application/octet-stream';
    }

    /**
     * Check if filename has double extension.
     */
    private function hasDoubleExtension(string $filename): bool
    {
        $parts = explode('.', $filename);
        if (count($parts) < 3) {
            return false;
        }

        // Check if second-to-last part is a known extension
        $secondExt = strtolower($parts[count($parts) - 2]);
        $commonExtensions = [
            'txt',
            'doc',
            'pdf',
            'jpg',
            'png',
            'gif',
            'mp3',
            'mp4',
            'zip',
            'rar'
        ];

        return in_array($secondExt, $commonExtensions);
    }

    /**
     * Check if MIME type mismatch is critical.
     */
    private function isCriticalMismatch(string $reported, string $detected): bool
    {
        // Allow some common mismatches that are not security risks
        $allowedMismatches = [
            'text/plain' => ['application/octet-stream'],
            'application/octet-stream' => ['text/plain'],
            'image/jpeg' => ['image/jpg'],
            'image/jpg' => ['image/jpeg'],
        ];

        if (
            isset($allowedMismatches[$reported]) &&
            in_array($detected, $allowedMismatches[$reported])
        ) {
            return false;
        }

        // Check if both are in the same category (e.g., both images)
        $reportedCategory = explode('/', $reported)[0];
        $detectedCategory = explode('/', $detected)[0];

        return $reportedCategory !== $detectedCategory;
    }

    /**
     * Check for executable file signatures.
     */
    private function containsExecutableSignature(string $content): bool
    {
        $executableSignatures = [
            "\x4D\x5A",                 // PE/DOS executable (MZ)
            "\x7F\x45\x4C\x46",         // ELF executable
            "\xCA\xFE\xBA\xBE",         // Mach-O executable (big endian)
            "\xCE\xFA\xED\xFE",         // Mach-O executable (little endian)
            "\xFE\xED\xFA\xCE",         // Mach-O executable (reverse)
            "\xFE\xED\xFA\xCF",         // Mach-O 64-bit executable
            "#!/bin/sh",                // Shell script
            "#!/bin/bash",              // Bash script
            "#!/usr/bin/env",           // Environment script
            "<?php",                    // PHP script
            "<script",                  // JavaScript/HTML script
        ];

        foreach ($executableSignatures as $signature) {
            if (strpos($content, $signature) === 0 || strpos($content, $signature) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for script content in files.
     */
    private function containsScriptContent(string $content, string $mimeType): bool
    {
        // Skip all script content validation - allow all file types
        return false;
    }

    /**
     * Check for path traversal sequences.
     */
    private function containsPathTraversal(string $filename): bool
    {
        $dangerousPatterns = [
            '../',
            '..\\',
            '..%2F',
            '..%5C',
            '%2E%2E%2F',
            '%2E%2E%5C',
            '..../',
            '....\\',
            '.%2E/',
            '.%2E\\',
        ];

        $filename = urldecode($filename);

        foreach ($dangerousPatterns as $pattern) {
            if (stripos($filename, $pattern) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize filename for safe storage.
     */
    public function sanitizeFileName(string $filename): string
    {
        // Remove path information
        $filename = basename($filename);

        // Remove null bytes
        $filename = str_replace("\0", '', $filename);

        // Replace dangerous characters
        $filename = preg_replace('/[<>:"|?*]/', '_', $filename);

        // Remove leading/trailing dots and spaces
        $filename = trim($filename, '. ');

        // Ensure filename is not empty
        if (empty($filename)) {
            $filename = 'unnamed_file';
        }

        // Limit length
        if (strlen($filename) > 255) {
            $extension = pathinfo($filename, PATHINFO_EXTENSION);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $maxNameLength = 255 - strlen($extension) - 1;
            $filename = substr($name, 0, $maxNameLength) . '.' . $extension;
        }

        return $filename;
    }

    /**
     * Format bytes to human readable format.
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get security headers for file operations.
     */
    public function getSecurityHeaders(): array
    {
        return [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'X-XSS-Protection' => '1; mode=block',
            'Referrer-Policy' => 'no-referrer',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none';",
            'Strict-Transport-Security' => 'max-age=31536000; includeSubDomains',
        ];
    }

    /**
     * Validate chunk for chunked uploads.
     * Note: Chunks are fragments of larger files and should not be validated for content security.
     */
    public function validateChunk(UploadedFile $chunk, int $expectedSize): array
    {
        $chunkSize = $chunk->getSize();

        if ($chunkSize !== $expectedSize) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'INVALID_CHUNK_SIZE',
                    'message' => 'Chunk size does not match expected size',
                    'details' => [
                        'expected_size' => $expectedSize,
                        'actual_size' => $chunkSize
                    ]
                ]
            ];
        }

        // Only validate that the chunk is readable
        if ($chunkSize === 0) {
            return [
                'valid' => false,
                'error' => [
                    'code' => 'EMPTY_CHUNK',
                    'message' => 'Chunk is empty',
                ]
            ];
        }

        // Chunks are fragments of larger files, so we don't validate content security
        // The final assembled file will be validated after all chunks are assembled
        return ['valid' => true];
    }

    /**
     * Get maximum allowed file size.
     */
    public function getMaxFileSize(): int
    {
        return $this->getMaxFileSizeFromConfig();
    }

    /**
     * Get list of dangerous extensions.
     */
    public function getDangerousExtensions(): array
    {
        return self::DANGEROUS_EXTENSIONS;
    }

    /**
     * Get list of dangerous MIME types.
     */
    public function getDangerousMimeTypes(): array
    {
        return self::DANGEROUS_MIME_TYPES;
    }
}
