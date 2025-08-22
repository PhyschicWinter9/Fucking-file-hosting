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

        // Calculate session expiration (24 hours for incomplete uploads)
        $sessionExpiration = Carbon::now()->addHours(24);

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

        // Store chunk temporarily
        $chunkPath = $this->storeChunk($sessionId, $chunkIndex, $chunkFile);

        // Update session with uploaded chunk
        $session->addChunk($chunkIndex);

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
            // Assemble chunks into final file
            $finalFile = $this->assembleChunks($session);

            // Store the assembled file using FileService
            $fileModel = $this->fileService->store($finalFile, $expirationDays);

            // Clean up temporary chunks and session
            $this->cleanupSession($sessionId);

            return $fileModel;

        } catch (\Exception $e) {
            // Clean up on failure
            $this->cleanupSession($sessionId);
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
        $isLastChunk = ($chunkIndex === $totalChunks - 1);

        if ($isLastChunk) {
            $expectedSize = $session->total_size % $session->chunk_size;
            if ($expectedSize === 0) {
                $expectedSize = $session->chunk_size;
            }
        }

        if ($chunkFile->getSize() !== $expectedSize) {
            throw new \Exception("Invalid chunk size. Expected: {$expectedSize}, Got: " . $chunkFile->getSize());
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
     * Assemble chunks into final file.
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
            // Assemble chunks in order
            for ($i = 0; $i < $totalChunks; $i++) {
                $chunkPath = "{$chunkDir}/chunk_{$i}";

                if (!Storage::disk('local')->exists($chunkPath)) {
                    throw new \Exception("Missing chunk: {$i}");
                }

                $chunkContent = Storage::disk('local')->get($chunkPath);
                fwrite($handle, $chunkContent);
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
     * Calculate optimal chunk size based on file size.
     */
    public static function calculateOptimalChunkSize(int $fileSize): int
    {
        // Base chunk size: 1MB
        $baseChunkSize = 1048576;

        // For files larger than 1GB, use 5MB chunks
        if ($fileSize > 1073741824) {
            return $baseChunkSize * 5;
        }

        // For files larger than 500MB, use 2MB chunks
        if ($fileSize > 524288000) {
            return $baseChunkSize * 2;
        }

        // Default 1MB chunks
        return $baseChunkSize;
    }
}
