<?php

namespace App\Services;

use App\Models\UploadSession;
use App\Models\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ChunkedUploadService
{
    private FileService $fileService;

    public function __construct(FileService $fileService)
    {
        $this->fileService = $fileService;
    }

    /**
     * Initialize a chunked upload session.
     */
    public function initializeSession(
        string $originalName,
        int $totalSize,
        int $chunkSize = 1048576, // 1MB default chunk size
        ?int $expirationDays = null
    ): UploadSession {
        $sessionId = $this->generateSessionId();

        // Calculate session expiration using configurable timeout
        $timeoutHours = (int) config('filehosting.chunked_upload_session_timeout_hours', 48);
        $sessionExpiration = Carbon::now()->addHours($timeoutHours);

        return UploadSession::create([
            'session_id' => $sessionId,
            'original_name' => $originalName,
            'total_size' => $totalSize,
            'chunk_size' => $chunkSize,
            'uploaded_chunks' => [],
            'expires_at' => $sessionExpiration,
        ]);
    }

    /**
     * Upload a chunk for an existing session.
     */
    public function uploadChunk(
        string $sessionId,
        int $chunkIndex,
        UploadedFile $chunkFile
    ): array {
        $session = UploadSession::findBySessionId($sessionId);

        if (!$session) {
            throw new \Exception('Upload session not found');
        }

        if ($session->expires_at && $session->expires_at->isPast()) {
            $this->cleanupSession($sessionId);
            throw new \Exception('Upload session has expired');
        }

        // Validate chunk
        $this->validateChunk($session, $chunkIndex, $chunkFile);

        // Store chunk temporarily with retry logic
        $maxRetries = (int) config('filehosting.chunked_upload_max_retries', 3);
        $chunkPath = $this->storeChunkWithRetry($sessionId, $chunkIndex, $chunkFile, $maxRetries);

        // Update session with uploaded chunk
        $session->addChunk($chunkIndex);

        // Extend session timeout on active uploads
        $this->extendSessionTimeout($session);

        return [
            'chunk_index' => $chunkIndex,
            'uploaded' => true,
            'progress' => $session->getProgress(),
            'is_complete' => $session->isComplete(),
            'next_chunk' => $session->isComplete() ? null : $session->getNextChunkIndex(),
            'missing_chunks' => $session->getMissingChunks(),
        ];
    }

    /**
     * Finalize chunked upload by assembling chunks into final file.
     */
    public function finalizeUpload(string $sessionId, ?int $expirationDays = null): File
    {
        $session = UploadSession::findBySessionId($sessionId);

        if (!$session) {
            throw new \Exception('Upload session not found');
        }

        if (!$session->isComplete()) {
            throw new \Exception('Upload session is not complete. Missing chunks: ' . implode(', ', $session->getMissingChunks()));
        }

        try {
            // Set longer execution time for large files
            $originalTimeLimit = ini_get('max_execution_time');
            set_time_limit(1800); // 30 minutes for very large files
            
            // Use minimal memory approach for very large files
            if ($session->total_size > 104857600) { // 100MB
                return $this->finalizeUploadDirect($session, $expirationDays);
            }

            // For smaller files, use the standard approach
            $finalFile = $this->assembleChunks($session);
            $fileModel = $this->fileService->store($finalFile, $expirationDays);

            // Clean up temporary chunks and session
            $this->cleanupSession($sessionId);

            // Restore original limits
            set_time_limit($originalTimeLimit);

            return $fileModel;

        } catch (\Exception $e) {
            // Restore original limits on error
            if (isset($originalTimeLimit)) {
                set_time_limit($originalTimeLimit);
            }
            
            // Clean up on failure
            $this->cleanupSession($sessionId);
            throw $e;
        }
    }

    /**
     * Finalize upload directly without creating UploadedFile instance.
     * This bypasses Laravel's memory-intensive file handling for very large files.
     */
    private function finalizeUploadDirect(UploadSession $session, ?int $expirationDays = null): File
    {
        // Generate file information
        $fileId = $this->generateSecureFileId();
        $extension = pathinfo($session->original_name, PATHINFO_EXTENSION);
        $fileName = $fileId . ($extension ? '.' . $extension : '');
        $filePath = 'files/' . substr($fileId, 0, 2) . '/' . substr($fileId, 2, 2) . '/' . $fileName;
        
        // Get full destination path
        $destinationPath = Storage::disk('public')->path($filePath);
        
        // Ensure directory exists
        $directory = dirname($destinationPath);
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        // Assemble chunks directly to final location
        $this->assembleChunksDirect($session, $destinationPath);

        // Calculate checksum for duplicate detection
        $checksum = hash_file('sha256', $destinationPath);

        // Check for existing file with same checksum
        $existingFile = \App\Models\File::where('checksum', $checksum)
            ->where('file_size', $session->total_size)
            ->notExpired()
            ->first();

        if ($existingFile) {
            // Delete the newly assembled file since we have a duplicate
            unlink($destinationPath);
            return $existingFile;
        }

        // Determine MIME type
        $mimeType = mime_content_type($destinationPath) ?: 'application/octet-stream';

        // Calculate expiration date
        $expiresAt = null;
        if ($expirationDays !== null) {
            $expiresAt = \Carbon\Carbon::now()->addDays($expirationDays);
        }

        // Generate delete token
        $deleteToken = null;
        if (config('filehosting.generate_delete_tokens', true)) {
            $deleteToken = hash('sha256', \Illuminate\Support\Str::random(32) . microtime(true));
        }

        // Create file record directly
        $fileModel = \App\Models\File::create([
            'file_id' => $fileId,
            'original_name' => $session->original_name,
            'file_path' => $filePath,
            'mime_type' => $mimeType,
            'file_size' => $session->total_size,
            'checksum' => $checksum,
            'expires_at' => $expiresAt,
            'delete_token' => $deleteToken,
        ]);

        return $fileModel;
    }

    /**
     * Assemble chunks directly to destination without creating temporary file.
     */
    private function assembleChunksDirect(UploadSession $session, string $destinationPath): void
    {
        $chunkDir = "chunks/{$session->session_id}";
        $totalChunks = ceil($session->total_size / $session->chunk_size);

        $handle = fopen($destinationPath, 'wb');
        if (!$handle) {
            throw new \Exception('Failed to create destination file');
        }

        try {
            $bufferSize = 65536; // 64KB buffer for better performance
            
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkPath = "{$chunkDir}/chunk_{$i}";

                if (!Storage::disk('local')->exists($chunkPath)) {
                    throw new \Exception("Missing chunk: {$i}");
                }

                $chunkFullPath = Storage::disk('local')->path($chunkPath);
                $chunkHandle = fopen($chunkFullPath, 'rb');
                
                if (!$chunkHandle) {
                    throw new \Exception("Failed to open chunk: {$i}");
                }

                // Stream chunk data
                while (!feof($chunkHandle)) {
                    $buffer = fread($chunkHandle, $bufferSize);
                    if ($buffer === false) {
                        fclose($chunkHandle);
                        throw new \Exception("Failed to read chunk: {$i}");
                    }
                    
                    if (fwrite($handle, $buffer) === false) {
                        fclose($chunkHandle);
                        throw new \Exception("Failed to write data for chunk: {$i}");
                    }
                }
                
                fclose($chunkHandle);
                
                // Force garbage collection and memory management every 10 chunks
                if ($i % 10 === 0) {
                    if (function_exists('gc_collect_cycles')) {
                        gc_collect_cycles();
                    }
                    
                    // Check memory usage and throw error if too high
                    $memoryUsage = memory_get_usage(true);
                    $memoryLimit = self::parseMemoryLimit(ini_get('memory_limit'));
                    
                    if ($memoryUsage > ($memoryLimit * 0.8)) { // 80% of limit
                        throw new \Exception("Memory usage too high during assembly: " . 
                            number_format($memoryUsage / 1024 / 1024, 2) . "MB");
                    }
                }
            }

        } finally {
            fclose($handle);
        }

        // Verify assembled file size
        $assembledSize = filesize($destinationPath);
        if ($assembledSize !== $session->total_size) {
            unlink($destinationPath);
            throw new \Exception("Assembled file size mismatch. Expected: {$session->total_size}, Got: {$assembledSize}");
        }
    }

    /**
     * Generate secure file ID (copied from FileService to avoid dependency).
     */
    private function generateSecureFileId(): string
    {
        do {
            $hash = hash('sha256', random_bytes(32) . microtime(true) . uniqid());
        } while (\App\Models\File::where('file_id', $hash)->exists());

        return $hash;
    }



    /**
     * Finalize upload asynchronously for very large files.
     */
    private function finalizeUploadAsync(UploadSession $session, ?int $expirationDays = null): File
    {
        // For now, we'll still process synchronously but with optimizations
        // In a production environment, you'd dispatch this to a queue
        
        // Mark session as processing
        $session->update(['status' => 'processing']);
        
        try {
            return $this->finalizeUpload($session->session_id, $expirationDays);
        } catch (\Exception $e) {
            $session->update(['status' => 'failed', 'error_message' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Resume an interrupted upload by returning session status.
     */
    public function resumeUpload(string $sessionId): array
    {
        $session = UploadSession::findBySessionId($sessionId);

        if (!$session) {
            throw new \Exception('Upload session not found');
        }

        if ($session->expires_at && $session->expires_at->isPast()) {
            $this->cleanupSession($sessionId);
            throw new \Exception('Upload session has expired');
        }

        return [
            'session_id' => $session->session_id,
            'original_name' => $session->original_name,
            'total_size' => $session->total_size,
            'chunk_size' => $session->chunk_size,
            'progress' => $session->getProgress(),
            'is_complete' => $session->isComplete(),
            'next_chunk' => $session->isComplete() ? null : $session->getNextChunkIndex(),
            'missing_chunks' => $session->getMissingChunks(),
            'uploaded_chunks' => $session->uploaded_chunks,
        ];
    }

    /**
     * Validate chunk before processing.
     */
    private function validateChunk(UploadSession $session, int $chunkIndex, UploadedFile $chunkFile): void
    {
        $totalChunks = ceil($session->total_size / $session->chunk_size);

        // Validate chunk index
        if ($chunkIndex < 0 || $chunkIndex >= $totalChunks) {
            throw new \Exception("Invalid chunk index: {$chunkIndex}. Expected 0 to " . ($totalChunks - 1));
        }

        // Validate chunk size
        $expectedSize = $session->chunk_size;
        $isLastChunk = ($chunkIndex === (int)($totalChunks - 1));

        if ($isLastChunk) {
            // For the last chunk, calculate the remaining bytes
            $remainingBytes = $session->total_size % $session->chunk_size;
            if ($remainingBytes === 0) {
                // If total_size is perfectly divisible by chunk_size, last chunk is full size
                $expectedSize = $session->chunk_size;
            } else {
                // Otherwise, last chunk is the remainder
                $expectedSize = $remainingBytes;
            }
        }

        $actualSize = $chunkFile->getSize();
        
        // Allow some tolerance for the last chunk (within 1% or 1KB, whichever is larger)
        $tolerance = $isLastChunk ? max(1024, $expectedSize * 0.01) : 0;
        
        if (abs($actualSize - $expectedSize) > $tolerance) {
            throw new \Exception("Invalid chunk size. Expected: {$expectedSize}, Got: {$actualSize}" . 
                ($isLastChunk ? " (last chunk with tolerance: {$tolerance})" : ""));
        }

        // Check if chunk already uploaded
        $uploadedChunks = $session->uploaded_chunks ?? [];
        if (in_array($chunkIndex, $uploadedChunks)) {
            throw new \Exception("Chunk {$chunkIndex} already uploaded");
        }
    }

    /**
     * Store chunk temporarily.
     */
    private function storeChunk(string $sessionId, int $chunkIndex, UploadedFile $chunkFile): string
    {
        $chunkDir = "chunks/{$sessionId}";
        $chunkFileName = "chunk_{$chunkIndex}";

        $path = Storage::disk('local')->putFileAs($chunkDir, $chunkFile, $chunkFileName);

        if (!$path) {
            throw new \Exception('Failed to store chunk');
        }

        return $path;
    }

    /**
     * Store chunk with retry logic for better reliability.
     */
    private function storeChunkWithRetry(string $sessionId, int $chunkIndex, UploadedFile $chunkFile, int $maxRetries = 3): string
    {
        $lastException = null;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                return $this->storeChunk($sessionId, $chunkIndex, $chunkFile);
            } catch (\Exception $e) {
                $lastException = $e;
                
                if ($attempt < $maxRetries) {
                    // Wait before retry (exponential backoff)
                    $waitTime = pow(2, $attempt - 1); // 1s, 2s, 4s...
                    sleep($waitTime);
                    continue;
                }
            }
        }

        throw new \Exception("Failed to store chunk after {$maxRetries} attempts. Last error: " . $lastException->getMessage());
    }

    /**
     * Assemble chunks into final file with optimized streaming.
     */
    private function assembleChunks(UploadSession $session): UploadedFile
    {
        $chunkDir = "chunks/{$session->session_id}";
        $totalChunks = ceil($session->total_size / $session->chunk_size);

        // Create temporary file for assembly
        $tempFile = tempnam(sys_get_temp_dir(), 'assembled_');
        $handle = fopen($tempFile, 'wb');

        if (!$handle) {
            throw new \Exception('Failed to create temporary file for assembly');
        }

        try {
            // Set larger buffer size for better performance
            $bufferSize = 1048576; // 1MB buffer
            
            // Assemble chunks in order with streaming
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkPath = "{$chunkDir}/chunk_{$i}";

                if (!Storage::disk('local')->exists($chunkPath)) {
                    throw new \Exception("Missing chunk: {$i}");
                }

                // Stream chunk content instead of loading into memory
                $chunkFullPath = Storage::disk('local')->path($chunkPath);
                $chunkHandle = fopen($chunkFullPath, 'rb');
                
                if (!$chunkHandle) {
                    throw new \Exception("Failed to open chunk: {$i}");
                }

                // Stream chunk data in smaller buffers to avoid memory issues
                while (!feof($chunkHandle)) {
                    $buffer = fread($chunkHandle, $bufferSize);
                    if ($buffer === false) {
                        fclose($chunkHandle);
                        throw new \Exception("Failed to read chunk: {$i}");
                    }
                    
                    if (fwrite($handle, $buffer) === false) {
                        fclose($chunkHandle);
                        throw new \Exception("Failed to write assembled data for chunk: {$i}");
                    }
                    
                    // Flush output buffer periodically to prevent timeouts
                    if ($i % 10 === 0) {
                        if (function_exists('fastcgi_finish_request')) {
                            fastcgi_finish_request();
                        }
                    }
                }
                
                fclose($chunkHandle);
                
                // Clear any potential memory buildup
                if (function_exists('gc_collect_cycles')) {
                    gc_collect_cycles();
                }
            }

            fclose($handle);

            // Verify assembled file size
            $assembledSize = filesize($tempFile);
            if ($assembledSize !== $session->total_size) {
                unlink($tempFile);
                throw new \Exception("Assembled file size mismatch. Expected: {$session->total_size}, Got: {$assembledSize}");
            }

            // Create UploadedFile instance from assembled file
            return new UploadedFile(
                $tempFile,
                $session->original_name,
                mime_content_type($tempFile),
                null,
                true // Mark as test file to avoid validation issues
            );

        } catch (\Exception $e) {
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            if (file_exists($tempFile)) {
                unlink($tempFile);
            }
            throw $e;
        }
    }

    /**
     * Clean up session and associated chunks.
     */
    public function cleanupSession(string $sessionId): void
    {
        $session = UploadSession::findBySessionId($sessionId);

        if ($session) {
            // Delete chunks from storage
            $chunkDir = "chunks/{$sessionId}";
            if (Storage::disk('local')->exists($chunkDir)) {
                Storage::disk('local')->deleteDirectory($chunkDir);
            }

            // Delete session record
            $session->delete();
        }
    }

    /**
     * Clean up expired sessions.
     */
    public function cleanupExpiredSessions(): int
    {
        $expiredSessions = UploadSession::expired()->get();
        $cleanedCount = 0;

        foreach ($expiredSessions as $session) {
            $this->cleanupSession($session->session_id);
            $cleanedCount++;
        }

        return $cleanedCount;
    }

    /**
     * Generate unique session ID.
     */
    private function generateSessionId(): string
    {
        do {
            $sessionId = 'upload_' . Str::random(32);
        } while (UploadSession::where('session_id', $sessionId)->exists());

        return $sessionId;
    }

    /**
     * Get session statistics.
     */
    public function getSessionStats(): array
    {
        return [
            'active_sessions' => UploadSession::where('expires_at', '>', now())->count(),
            'expired_sessions' => UploadSession::expired()->count(),
            'total_sessions' => UploadSession::count(),
        ];
    }

    /**
     * Check if file size requires chunked upload.
     */
    public static function requiresChunkedUpload(int $fileSize, int $threshold = 26214400): bool
    {
        // Default threshold is 25MB (Cloudflare compatibility)
        return $fileSize > $threshold;
    }
    
    /**
     * Get current server load metrics for upload optimization.
     */
    public function getServerLoadMetrics(): array
    {
        $activeSessions = UploadSession::where('expires_at', '>', now())->count();
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = self::parseMemoryLimit(ini_get('memory_limit'));
        $memoryPercent = $memoryLimit > 0 ? ($memoryUsage / $memoryLimit) * 100 : 0;
        
        // Check disk usage
        $storagePath = storage_path();
        $totalSpace = disk_total_space($storagePath);
        $freeSpace = disk_free_space($storagePath);
        $diskUsagePercent = $totalSpace > 0 ? (($totalSpace - $freeSpace) / $totalSpace) * 100 : 0;
        
        return [
            'active_sessions' => $activeSessions,
            'memory_usage_percent' => round($memoryPercent, 2),
            'disk_usage_percent' => round($diskUsagePercent, 2),
            'recommended_chunk_size' => $this->getRecommendedChunkSize($memoryPercent, $activeSessions),
            'can_accept_uploads' => $memoryPercent < 80 && $diskUsagePercent < 90,
            'server_load' => $this->calculateServerLoad($memoryPercent, $activeSessions, $diskUsagePercent)
        ];
    }
    
    /**
     * Get recommended chunk size based on current server load.
     */
    private function getRecommendedChunkSize(float $memoryPercent, int $activeSessions): int
    {
        $baseChunkSize = (int) config('filehosting.chunk_size', 10485760); // 10MB
        
        // Reduce chunk size based on memory usage and active sessions
        if ($memoryPercent > 75 || $activeSessions > 10) {
            return max(2097152, $baseChunkSize / 2); // Min 2MB
        }
        
        if ($memoryPercent > 60 || $activeSessions > 5) {
            return max(5242880, $baseChunkSize * 0.75); // Min 5MB
        }
        
        return $baseChunkSize;
    }
    
    /**
     * Calculate overall server load score (0-100).
     */
    private function calculateServerLoad(float $memoryPercent, int $activeSessions, float $diskPercent): int
    {
        $memoryScore = min(100, $memoryPercent * 1.2); // Memory is critical
        $sessionScore = min(100, $activeSessions * 5); // Each session adds 5 points
        $diskScore = min(100, $diskPercent * 0.8); // Disk is less critical
        
        return (int) min(100, ($memoryScore + $sessionScore + $diskScore) / 3);
    }

    /**
     * Extend session timeout when chunks are actively being uploaded.
     */
    private function extendSessionTimeout(UploadSession $session): void
    {
        $timeoutHours = (int) config('filehosting.chunked_upload_session_timeout_hours', 48);
        $newExpiration = Carbon::now()->addHours($timeoutHours);
        
        // Only extend if the new expiration is later than current
        if ($newExpiration->isAfter($session->expires_at)) {
            $session->update(['expires_at' => $newExpiration]);
        }
    }

    /**
     * Calculate optimal chunk size based on file size and server load.
     */
    public static function calculateOptimalChunkSize(int $fileSize, ?int $userCount = null): int
    {
        // Get base chunk size from config (default 10MB for better performance)
        $baseChunkSize = (int) config('filehosting.chunk_size', 10485760); // 10MB
        
        // Adjust based on current server load
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = self::parseMemoryLimit(ini_get('memory_limit'));
        $memoryUsagePercent = $memoryLimit > 0 ? ($memoryUsage / $memoryLimit) * 100 : 0;
        
        // Reduce chunk size if memory usage is high
        if ($memoryUsagePercent > 70) {
            $baseChunkSize = min($baseChunkSize, 5242880); // Max 5MB if memory is high
        }
        
        // Adjust based on file size for optimal performance
        if ($fileSize > 5368709120) { // > 5GB
            return min($baseChunkSize * 2, 20971520); // Max 20MB chunks
        }
        
        if ($fileSize > 1073741824) { // > 1GB
            return min($baseChunkSize * 1.5, 15728640); // Max 15MB chunks
        }
        
        if ($fileSize > 104857600) { // > 100MB
            return $baseChunkSize; // Use configured chunk size
        }
        
        // For smaller files, use smaller chunks to reduce memory usage
        if ($fileSize < 52428800) { // < 50MB
            return min($baseChunkSize / 2, 5242880); // Min 5MB chunks
        }
        
        return $baseChunkSize;
    }
    
    /**
     * Parse memory limit string to bytes.
     */
    private static function parseMemoryLimit(string $limit): int
    {
        $limit = trim($limit);
        if ($limit === '-1') return 0; // No limit
        
        $last = strtolower($limit[strlen($limit) - 1]);
        $value = (int) $limit;

        switch ($last) {
            case 'g':
                $value *= 1024;
            case 'm':
                $value *= 1024;
            case 'k':
                $value *= 1024;
        }

        return $value;
    }
}
