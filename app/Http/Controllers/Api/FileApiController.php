<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FileService;
use App\Services\PrivacyManager;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FileApiController extends Controller
{
    private FileService $fileService;
    private PrivacyManager $privacyManager;

    public function __construct(FileService $fileService, PrivacyManager $privacyManager)
    {
        $this->fileService = $fileService;
        $this->privacyManager = $privacyManager;
    }

    /**
     * Get file information via API.
     */
    public function info(string $fileId): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->preventLogging();

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

            return response()->json([
                'success' => true,
                'data' => [
                    'file_id' => $file->file_id,
                    'original_name' => $file->original_name,
                    'file_size' => $file->file_size,
                    'human_file_size' => $file->getHumanFileSize(),
                    'mime_type' => $file->mime_type,
                    'download_url' => $file->getDownloadUrl(),
                    'preview_url' => $file->getPreviewUrl(),
                    'info_url' => $file->getInfoUrl(),
                    'expires_at' => $file->expires_at?->toISOString(),
                    'is_expired' => $file->isExpired(),
                    'created_at' => $file->created_at->toISOString(),
                    'can_delete' => $file->canDelete(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'INFO_ERROR',
                    'message' => 'Failed to retrieve file information',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }

    /**
     * Delete file with owner token.
     */
    public function delete(Request $request, string $fileId): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->sanitizeRequest($request);

            $deleteToken = $request->header('X-Delete-Token');

            if (!$deleteToken) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'MISSING_DELETE_TOKEN',
                        'message' => 'Delete token is required'
                    ]
                ], 401);
            }

            $deleted = $this->fileService->deleteWithToken($fileId, $deleteToken);

            if (!$deleted) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'DELETE_FAILED',
                        'message' => 'File not found or invalid delete token'
                    ]
                ], 404);
            }

            // Log privacy-compliant action
            $this->privacyManager->createPrivacyLog('file_deleted_by_owner', [
                'file_id' => $fileId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'File deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'DELETE_ERROR',
                    'message' => 'Failed to delete file',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }

    /**
     * Get storage statistics.
     */
    public function stats(): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->preventLogging();

            $storageStats = $this->fileService->getStorageStats();
            $duplicateStats = $this->fileService->getDuplicateStats();

            return response()->json([
                'success' => true,
                'data' => [
                    'total_files' => $storageStats['total_files'],
                    'total_size' => $storageStats['total_size'],
                    'total_size_human' => $storageStats['total_size_human'],
                    'active_files' => $storageStats['active_files'],
                    'expired_files' => $storageStats['expired_files'],
                    'duplicate_groups' => $duplicateStats['duplicate_groups'],
                    'total_duplicate_files' => $duplicateStats['total_duplicate_files'],
                    'space_saved_bytes' => $duplicateStats['space_saved_bytes'],
                    'space_saved_human' => $duplicateStats['space_saved_human'],
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'STATS_ERROR',
                    'message' => 'Failed to retrieve statistics',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }
}
