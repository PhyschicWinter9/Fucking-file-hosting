<?php

namespace App\Http\Controllers;

use App\Services\FileService;
use App\Services\PrivacyManager;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\StreamedResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class FileDownloadController extends Controller
{
    private FileService $fileService;
    private PrivacyManager $privacyManager;

    public function __construct(FileService $fileService, PrivacyManager $privacyManager)
    {
        $this->fileService = $fileService;
        $this->privacyManager = $privacyManager;
    }

    /**
     * Download file with streaming support for large files.
     * 
     * Requirements: 2.1, 2.2 - Serve files without speed caps, memory-efficient streaming
     */
    public function download(Request $request, string $fileId): StreamedResponse|BinaryFileResponse
    {
        // Apply privacy protection
        $this->privacyManager->sanitizeRequest($request);

        $file = $this->fileService->retrieve($fileId);

        if (!$file) {
            abort(404, 'File not found or has expired');
        }

        $filePath = Storage::disk('public')->path($file->file_path);

        if (!file_exists($filePath)) {
            abort(404, 'File not found on disk');
        }

        // Log privacy-compliant action
        $this->privacyManager->createPrivacyLog('file_downloaded', [
            'file_id' => $file->file_id,
            'file_size' => $file->file_size,
            'mime_type' => $file->mime_type,
        ]);

        // For large files, use streaming response
        if ($file->file_size > 52428800) { // 50MB threshold for streaming
            return $this->streamLargeFile($request, $filePath, $file);
        }

        // For smaller files, use BinaryFileResponse for better performance
        $response = new BinaryFileResponse($filePath);
        
        // Set proper headers for browser compatibility
        $response->headers->set('Content-Type', $file->mime_type);
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $file->original_name . '"');
        $response->headers->set('Content-Length', (string) $file->file_size);
        $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
        $response->headers->set('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT');
        
        // Add privacy headers
        foreach ($this->privacyManager->getGDPRHeaders() as $header => $value) {
            $response->headers->set($header, $value);
        }

        return $response;
    }

    /**
     * Preview file for supported media types.
     * 
     * Requirements: 2.4 - Support direct viewing/playing with proper MIME type detection
     */
    public function preview(Request $request, string $fileId): StreamedResponse|BinaryFileResponse|Response
    {
        // Apply privacy protection
        $this->privacyManager->sanitizeRequest($request);

        $file = $this->fileService->retrieve($fileId);

        if (!$file) {
            abort(404, 'File not found or has expired');
        }

        $filePath = Storage::disk('public')->path($file->file_path);

        if (!file_exists($filePath)) {
            abort(404, 'File not found on disk');
        }

        // Check if file type is previewable
        if (!$this->isPreviewable($file->mime_type)) {
            return response()->json([
                'error' => 'File type not previewable',
                'mime_type' => $file->mime_type,
                'download_url' => $file->getDownloadUrl()
            ], 415);
        }

        // Log privacy-compliant action
        $this->privacyManager->createPrivacyLog('file_previewed', [
            'file_id' => $file->file_id,
            'mime_type' => $file->mime_type,
        ]);

        // For large files, use streaming
        if ($file->file_size > 52428800) { // 50MB threshold
            return $this->streamLargeFile($request, $filePath, $file, true);
        }

        // For smaller files, use BinaryFileResponse
        $response = new BinaryFileResponse($filePath);
        
        // Set headers for inline display (preview)
        $response->headers->set('Content-Type', $file->mime_type);
        $response->headers->set('Content-Disposition', 'inline; filename="' . $file->original_name . '"');
        $response->headers->set('Content-Length', (string) $file->file_size);
        
        // Add caching headers for media files
        if ($this->isMediaFile($file->mime_type)) {
            $response->headers->set('Cache-Control', 'public, max-age=3600');
            $response->headers->set('Expires', gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
        }

        // Add privacy headers
        foreach ($this->privacyManager->getGDPRHeaders() as $header => $value) {
            $response->headers->set($header, $value);
        }

        return $response;
    }

    /**
     * Get file metadata as JSON.
     * 
     * Requirements: 2.6 - Provide file information via API
     */
    public function info(Request $request, string $fileId): JsonResponse
    {
        // Apply privacy protection
        $this->privacyManager->sanitizeRequest($request);

        $file = $this->fileService->retrieve($fileId);

        if (!$file) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FILE_NOT_FOUND',
                    'message' => 'File not found or has expired'
                ]
            ], 404);
        }

        // Log privacy-compliant action
        $this->privacyManager->createPrivacyLog('file_info_accessed', [
            'file_id' => $file->file_id,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'file_id' => $file->file_id,
                'original_name' => $file->original_name,
                'file_size' => $file->file_size,
                'human_size' => $file->getHumanFileSize(),
                'mime_type' => $file->mime_type,
                'download_url' => $file->getDownloadUrl(),
                'preview_url' => $file->getPreviewUrl(),
                'expires_at' => $file->expires_at?->toISOString(),
                'created_at' => $file->created_at->toISOString(),
                'is_previewable' => $this->isPreviewable($file->mime_type),
                'is_media' => $this->isMediaFile($file->mime_type),
            ]
        ]);
    } 
   /**
     * Stream large file with range request support.
     * 
     * Requirements: 2.1, 2.2 - Memory-efficient streaming, range request support
     */
    private function streamLargeFile(Request $request, string $filePath, $file, bool $inline = false): StreamedResponse
    {
        $fileSize = $file->file_size;
        $start = 0;
        $end = $fileSize - 1;
        
        // Handle range requests for partial content
        if ($request->hasHeader('Range')) {
            $range = $request->header('Range');
            if (preg_match('/bytes=(\d+)-(\d*)/', $range, $matches)) {
                $start = (int) $matches[1];
                if (!empty($matches[2])) {
                    $end = (int) $matches[2];
                }
            }
        }
        
        $length = $end - $start + 1;
        
        $response = new StreamedResponse(function () use ($filePath, $start, $length) {
            $handle = fopen($filePath, 'rb');
            if ($handle === false) {
                return;
            }
            
            // Seek to start position
            if ($start > 0) {
                fseek($handle, $start);
            }
            
            // Stream file in chunks
            $chunkSize = 8192; // 8KB chunks
            $bytesRemaining = $length;
            
            while ($bytesRemaining > 0 && !feof($handle)) {
                $readSize = min($chunkSize, $bytesRemaining);
                $chunk = fread($handle, $readSize);
                
                if ($chunk === false) {
                    break;
                }
                
                echo $chunk;
                flush();
                
                $bytesRemaining -= strlen($chunk);
            }
            
            fclose($handle);
        });
        
        // Set appropriate headers
        $disposition = $inline ? 'inline' : 'attachment';
        $response->headers->set('Content-Type', $file->mime_type);
        $response->headers->set('Content-Disposition', $disposition . '; filename="' . $file->original_name . '"');
        $response->headers->set('Content-Length', (string) $length);
        $response->headers->set('Accept-Ranges', 'bytes');
        
        // Set range headers if this is a partial content request
        if ($request->hasHeader('Range')) {
            $response->setStatusCode(206); // Partial Content
            $response->headers->set('Content-Range', "bytes {$start}-{$end}/{$fileSize}");
        }
        
        // Add cache headers for media files
        if ($this->isMediaFile($file->mime_type)) {
            $response->headers->set('Cache-Control', 'public, max-age=3600');
            $response->headers->set('Expires', gmdate('D, d M Y H:i:s', time() + 3600) . ' GMT');
        } else {
            $response->headers->set('Cache-Control', 'no-cache, must-revalidate');
            $response->headers->set('Expires', 'Sat, 26 Jul 1997 05:00:00 GMT');
        }
        
        // Add privacy headers
        foreach ($this->privacyManager->getGDPRHeaders() as $header => $value) {
            $response->headers->set($header, $value);
        }
        
        return $response;
    }

    /**
     * Check if file type is previewable in browser.
     */
    private function isPreviewable(string $mimeType): bool
    {
        $previewableMimes = [
            // Images
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            // Videos
            'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/quicktime',
            // Audio
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac',
            // Text files
            'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/csv',
            // Documents
            'application/json', 'application/xml', 'application/pdf',
            // Code files
            'application/javascript', 'text/x-php', 'text/x-python', 'text/x-java',
        ];

        return in_array($mimeType, $previewableMimes);
    }

    /**
     * Check if file is a media file (image, video, audio).
     */
    private function isMediaFile(string $mimeType): bool
    {
        return str_starts_with($mimeType, 'image/') ||
               str_starts_with($mimeType, 'video/') ||
               str_starts_with($mimeType, 'audio/');
    }

    /**
     * Get appropriate Content-Security-Policy for file type.
     */
    private function getCSPForMimeType(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/')) {
            return "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'";
        }
        
        if (str_starts_with($mimeType, 'video/') || str_starts_with($mimeType, 'audio/')) {
            return "default-src 'none'; media-src 'self'; style-src 'unsafe-inline'";
        }
        
        if ($mimeType === 'application/pdf') {
            return "default-src 'none'; object-src 'self'; style-src 'unsafe-inline'";
        }
        
        if (str_starts_with($mimeType, 'text/')) {
            return "default-src 'none'; style-src 'unsafe-inline'";
        }
        
        // Default restrictive CSP
        return "default-src 'none'";
    }

    /**
     * Validate file exists and is accessible.
     */
    private function validateFileAccess(string $filePath): bool
    {
        if (!file_exists($filePath)) {
            return false;
        }
        
        if (!is_readable($filePath)) {
            return false;
        }
        
        // Additional security check: ensure file is within allowed directory
        $realPath = realpath($filePath);
        $allowedPath = realpath(Storage::disk('public')->path('files'));
        
        return $realPath && $allowedPath && str_starts_with($realPath, $allowedPath);
    }

    /**
     * Get file extension from MIME type.
     */
    private function getExtensionFromMimeType(string $mimeType): string
    {
        $mimeToExt = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'video/mp4' => 'mp4',
            'video/webm' => 'webm',
            'video/ogg' => 'ogv',
            'audio/mpeg' => 'mp3',
            'audio/wav' => 'wav',
            'audio/ogg' => 'ogg',
            'text/plain' => 'txt',
            'application/pdf' => 'pdf',
            'application/json' => 'json',
            'application/xml' => 'xml',
        ];

        return $mimeToExt[$mimeType] ?? 'bin';
    }
}