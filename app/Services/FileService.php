<?php

namespace App\Services;

use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FileService
{
    private PerformanceOptimizer $optimizer;

    public function __construct(PerformanceOptimizer $optimizer)
    {
        $this->optimizer = $optimizer;
    }
    /**
     * Store a file and return the File model.
     */
    public function store(UploadedFile $file, ?int $expirationDays = null): File
    {
        $this->optimizer->startMonitoring('file_store');

        try {
            // Check memory usage before processing large files
            if ($file->getSize() > 100 * 1024 * 1024 && $this->optimizer->isMemoryUsageHigh()) { // 100MB
                $this->optimizer->optimizeMemory();
            }

            // Generate cryptographic file ID using SHA-256
            $fileId = $this->generateSecureId();

            // Calculate file checksum for duplicate detection (memory-efficient for large files)
            $checksum = $this->calculateChecksumEfficiently($file->getRealPath());

            // Check for existing file with same checksum (duplicate detection)
            $existingFile = File::where('checksum', $checksum)
                ->where('file_size', $file->getSize())
                ->notExpired()
                ->first();

            if ($existingFile) {
                // Return existing file instead of storing duplicate
                return $existingFile;
            }

            // Generate file path with better distribution
            $extension = $file->getClientOriginalExtension();
            $fileName = $fileId . ($extension ? '.' . $extension : '');
            $filePath = 'files/' . substr($fileId, 0, 2) . '/' . substr($fileId, 2, 2) . '/' . $fileName;

            // Store the file with memory optimization for large files
            $storedPath = $this->storeFileOptimized($file, $filePath);

            if (!$storedPath) {
                throw new \Exception('Failed to store file');
            }

            // Apply secure file storage permissions
            $securityService = app(SecurityService::class);
            $securityService->secureFileStorage($storedPath);

            // Calculate expiration date
            $expiresAt = null;
            if ($expirationDays !== null) {
                $expiresAt = Carbon::now()->addDays($expirationDays);
            }

            // Generate delete token if enabled
            $deleteToken = null;
            if (config('filehosting.generate_delete_tokens', true)) {
                $deleteToken = $this->generateDeleteToken();
            }

            // Create file record
            $fileModel = File::create([
                'file_id' => $fileId,
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $storedPath,
                'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
                'file_size' => $file->getSize(),
                'checksum' => $checksum,
                'expires_at' => $expiresAt,
                'delete_token' => $deleteToken,
            ]);

            return $fileModel;
        } finally {
            $this->optimizer->endMonitoring('file_store');
        }
    }

    /**
     * Retrieve a file by its ID.
     */
    public function retrieve(string $fileId): ?File
    {
        $file = File::findByFileId($fileId);

        if (!$file) {
            return null;
        }

        // Check if file has expired
        if ($file->isExpired()) {
            // Clean up expired file
            $this->delete($fileId);
            return null;
        }

        // Verify file still exists on disk
        if (!Storage::disk('public')->exists($file->file_path)) {
            // File missing from disk, clean up database record
            $file->delete();
            return null;
        }

        return $file;
    }

    /**
     * Delete a file by its ID.
     */
    public function delete(string $fileId): bool
    {
        $file = File::findByFileId($fileId);

        if (!$file) {
            return false;
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($file->file_path)) {
            Storage::disk('public')->delete($file->file_path);
        }

        // Delete database record
        $file->delete();

        return true;
    }

    /**
     * Delete a file using delete token (owner deletion).
     */
    public function deleteWithToken(string $fileId, string $deleteToken): bool
    {
        if (!config('filehosting.allow_owner_delete', true)) {
            return false;
        }

        $file = File::where('file_id', $fileId)
            ->where('delete_token', $deleteToken)
            ->first();

        if (!$file) {
            return false;
        }

        return $this->delete($fileId);
    }

    /**
     * Generate a secure delete token.
     */
    private function generateDeleteToken(): string
    {
        return hash('sha256', Str::random(32) . microtime(true));
    }

    /**
     * Generate a cryptographically secure file ID using enhanced security.
     *
     * Requirements: 3.4 - Cryptographic file ID generation
     */
    public function generateSecureId(): string
    {
        $securityService = app(SecurityService::class);

        // Generate cryptographically secure ID
        $hash = $securityService->generateSecureFileId();

        // Ensure uniqueness by checking database
        while (File::where('file_id', $hash)->exists()) {
            $hash = $securityService->generateSecureFileId();
        }

        return $hash;
    }



    /**
     * Check if file exists by checksum (for duplicate detection).
     */
    public function findByChecksum(string $checksum, int $fileSize): ?File
    {
        return File::where('checksum', $checksum)
            ->where('file_size', $fileSize)
            ->notExpired()
            ->first();
    }

    /**
     * Get duplicate files statistics.
     */
    public function getDuplicateStats(): array
    {
        // Get files grouped by checksum and size
        $duplicates = DB::table('files')
            ->select('checksum', 'file_size', DB::raw('COUNT(*) as count'), DB::raw('SUM(file_size) as total_size'))
            ->whereNull('deleted_at')
            ->groupBy('checksum', 'file_size')
            ->having('count', '>', 1)
            ->get();

        $totalDuplicates = $duplicates->sum('count') - $duplicates->count(); // Subtract one original per group
        $savedSpace = $duplicates->sum(function ($duplicate) {
            return ($duplicate->count - 1) * $duplicate->file_size;
        });

        return [
            'duplicate_groups' => $duplicates->count(),
            'total_duplicate_files' => $totalDuplicates,
            'space_saved_bytes' => $savedSpace,
            'space_saved_human' => $this->formatBytes($savedSpace),
        ];
    }

    /**
     * Find all files that share the same content (duplicates).
     */
    public function findDuplicates(string $fileId): array
    {
        $file = File::findByFileId($fileId);
        if (!$file) {
            return [];
        }

        return File::where('checksum', $file->checksum)
            ->where('file_size', $file->file_size)
            ->where('file_id', '!=', $file->file_id)
            ->notExpired()
            ->get()
            ->toArray();
    }

    /**
     * Check if uploading a file would be a duplicate.
     */
    public function checkForDuplicate(UploadedFile $file): ?array
    {
        $checksum = hash_file('sha256', $file->getRealPath());
        $existingFile = $this->findByChecksum($checksum, $file->getSize());

        if ($existingFile) {
            return [
                'is_duplicate' => true,
                'existing_file' => [
                    'file_id' => $existingFile->file_id,
                    'original_name' => $existingFile->original_name,
                    'created_at' => $existingFile->created_at->toISOString(),
                    'expires_at' => $existingFile->expires_at?->toISOString(),
                    'download_url' => $existingFile->getDownloadUrl(),
                ],
                'space_saved' => $file->getSize(),
            ];
        }

        return ['is_duplicate' => false];
    }

    /**
     * Calculate file checksum efficiently for large files.
     */
    private function calculateChecksumEfficiently(string $filePath): string
    {
        $fileSize = filesize($filePath);

        // For small files (< 50MB), use standard hash_file
        if ($fileSize < 50 * 1024 * 1024) {
            return hash_file('sha256', $filePath);
        }

        // For large files, use chunked processing to manage memory
        $hash = hash_init('sha256');
        $this->optimizer->processFileInChunks($filePath, function ($chunk) use ($hash) {
            hash_update($hash, $chunk);
        });

        return hash_final($hash);
    }

    /**
     * Store file with memory optimization for large files.
     */
    private function storeFileOptimized(UploadedFile $file, string $filePath): string
    {
        $fileSize = $file->getSize();

        // For small files (< 100MB), use standard Laravel storage
        if ($fileSize < 100 * 1024 * 1024) {
            return Storage::disk('public')->putFileAs(
                dirname($filePath),
                $file,
                basename($filePath)
            );
        }

        // For large files, use chunked copying to manage memory
        $sourcePath = $file->getRealPath();
        $destinationPath = Storage::disk('public')->path($filePath);

        // Ensure directory exists
        $directory = dirname($destinationPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        // Copy file in chunks
        $sourceHandle = fopen($sourcePath, 'rb');
        $destHandle = fopen($destinationPath, 'wb');

        if (!$sourceHandle || !$destHandle) {
            throw new \Exception('Failed to open file handles for large file copy');
        }

        try {
            $chunkSize = 8192; // 8KB chunks
            while (!feof($sourceHandle)) {
                $chunk = fread($sourceHandle, $chunkSize);
                if ($chunk !== false) {
                    fwrite($destHandle, $chunk);
                }

                // Check memory usage periodically
                if ($this->optimizer->isMemoryUsageHigh()) {
                    $this->optimizer->optimizeMemory();
                }

                // Check execution time
                if ($this->optimizer->isExecutionTimeHigh()) {
                    throw new \Exception('File upload interrupted due to execution time limits');
                }
            }
        } finally {
            fclose($sourceHandle);
            fclose($destHandle);
        }

        return $filePath;
    }

    /**
     * Get file stream for download with memory optimization.
     */
    public function getFileStream(string $fileId): ?\Symfony\Component\HttpFoundation\StreamedResponse
    {
        $file = $this->retrieve($fileId);
        if (!$file) {
            return null;
        }

        $filePath = Storage::disk('public')->path($file->file_path);
        if (!file_exists($filePath)) {
            return null;
        }

        $headers = [
            'Content-Type' => $file->mime_type,
            'Content-Length' => $file->file_size,
            'Content-Disposition' => 'attachment; filename="' . $file->original_name . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        return $this->optimizer->streamFileDownload($filePath, $headers);
    }

    /**
     * Clean up expired files with performance monitoring.
     */
    public function cleanup(): int
    {
        $this->optimizer->startMonitoring('file_cleanup');

        try {
            $expiredFiles = File::expired()->get();
            $cleanedCount = 0;
            $batchSize = 100; // Process in batches to manage memory

            foreach ($expiredFiles->chunk($batchSize) as $batch) {
                foreach ($batch as $file) {
                    if ($this->delete($file->file_id)) {
                        $cleanedCount++;
                    }

                    // Check memory usage periodically
                    if ($cleanedCount % 50 === 0 && $this->optimizer->isMemoryUsageHigh()) {
                        $this->optimizer->optimizeMemory();
                    }

                    // Check execution time
                    if ($this->optimizer->isExecutionTimeHigh()) {
                        break 2; // Break out of both loops
                    }
                }
            }

            return $cleanedCount;
        } finally {
            $this->optimizer->endMonitoring('file_cleanup');
        }
    }

    /**
     * Get storage statistics with performance monitoring.
     */
    public function getStorageStats(): array
    {
        $this->optimizer->startMonitoring('storage_stats');

        try {
            // Use more efficient queries for large datasets
            $stats = DB::select("
                SELECT
                    COUNT(*) as total_files,
                    SUM(file_size) as total_size,
                    SUM(CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 1 ELSE 0 END) as expired_files,
                    SUM(CASE WHEN expires_at IS NULL OR expires_at >= NOW() THEN 1 ELSE 0 END) as active_files
                FROM files
                WHERE deleted_at IS NULL
            ")[0];

            return [
                'total_files' => (int) $stats->total_files,
                'total_size' => (int) $stats->total_size,
                'expired_files' => (int) $stats->expired_files,
                'active_files' => (int) $stats->active_files,
                'total_size_human' => $this->formatBytes((int) $stats->total_size),
            ];
        } finally {
            $this->optimizer->endMonitoring('storage_stats');
        }
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
}
