<?php

namespace App\Http\Controllers;

use App\Services\FileService;
use App\Services\ChunkedUploadService;
use App\Services\PrivacyManager;
use App\Services\FileValidationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class FileUploadController extends Controller
{
    private FileService $fileService;
    private ChunkedUploadService $chunkedUploadService;
    private PrivacyManager $privacyManager;
    private FileValidationService $fileValidationService;

    public function __construct(
        FileService $fileService,
        ChunkedUploadService $chunkedUploadService,
        PrivacyManager $privacyManager,
        FileValidationService $fileValidationService
    ) {
        $this->fileService = $fileService;
        $this->chunkedUploadService = $chunkedUploadService;
        $this->privacyManager = $privacyManager;
        $this->fileValidationService = $fileValidationService;
    }

    /**
     * Display the main upload interface.
     *
     * Requirements: 1.1 - Display large drag-and-drop upload area as primary interface
     */
    public function index(): Response
    {
        // Apply privacy protection
        $this->privacyManager->preventLogging();

        return Inertia::render('Upload/Index', [
            'maxFileSize' => $this->getMaxFileSize(),
            'chunkThreshold' => 26214400, // 25MB threshold for chunked uploads (Cloudflare compatibility)
            'supportedFormats' => $this->getSupportedFormats(),
        ]);
    }

    /**
     * Handle single file upload.
     *
     * Requirements: 1.3, 1.4, 1.5 - Upload without login, provide secure URL, show progress
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->sanitizeRequest($request);

            // Validate the upload request
            $validator = $this->validateUploadRequest($request);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'VALIDATION_ERROR',
                        'message' => 'Invalid upload request',
                        'details' => $validator->errors()->toArray()
                    ]
                ], 422);
            }

            $file = $request->file('file');
            $expirationDays = $request->input('expiration_days');

            // Validate file security and content
            $validation = $this->fileValidationService->validateFile($file);
            if (!$validation['valid']) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'FILE_VALIDATION_FAILED',
                        'message' => 'File validation failed',
                        'details' => $validation['errors']
                    ]
                ], 422);
            }

            // Check if file requires chunked upload
            if (ChunkedUploadService::requiresChunkedUpload($file->getSize())) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'USE_CHUNKED_UPLOAD',
                        'message' => 'File is too large for single upload. Use chunked upload instead.',
                        'details' => [
                            'file_size' => $file->getSize(),
                            'threshold' => 26214400,
                            'suggested_chunk_size' => ChunkedUploadService::calculateOptimalChunkSize($file->getSize())
                        ]
                    ]
                ], 413);
            }

            // Check for duplicates before storing
            $duplicateCheck = $this->fileService->checkForDuplicate($file);
            $isDuplicate = $duplicateCheck['is_duplicate'];

            // Store the file (will return existing file if duplicate)
            $fileModel = $this->fileService->store($file, $expirationDays);

            // Log privacy-compliant action
            $this->privacyManager->createPrivacyLog($isDuplicate ? 'duplicate_file_accessed' : 'file_uploaded', [
                'file_id' => $fileModel->file_id,
                'file_size' => $fileModel->file_size,
                'mime_type' => $fileModel->mime_type,
                'is_duplicate' => $isDuplicate,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'file_id' => $fileModel->file_id,
                    'original_name' => $fileModel->original_name,
                    'file_size' => $fileModel->file_size,
                    'human_size' => $fileModel->getHumanFileSize(),
                    'mime_type' => $fileModel->mime_type,
                    'download_url' => $fileModel->getDownloadUrl(),
                    'preview_url' => $fileModel->getPreviewUrl(),
                    'expires_at' => $fileModel->expires_at?->toISOString(),
                    'created_at' => $fileModel->created_at->toISOString(),
                    'is_duplicate' => $isDuplicate,
                    'space_saved' => $isDuplicate ? $duplicateCheck['space_saved'] ?? 0 : 0,
                ]
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Validation failed',
                    'details' => $e->errors()
                ]
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'UPLOAD_ERROR',
                    'message' => 'Failed to upload file',
                    'details' => [
                        'error' => $e->getMessage()
                    ]
                ]
            ], 500);
        }
    }    /**

     * Handle chunked file upload initialization and chunk processing.
     *
     * Requirements: 1.7 - Chunked upload for files over 100MB
     */
    public function chunkedUpload(Request $request): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->sanitizeRequest($request);

            $action = $request->input('action', 'upload_chunk');

            switch ($action) {
                case 'initialize':
                    return $this->initializeChunkedUpload($request);
                case 'upload_chunk':
                    return $this->uploadChunk($request);
                case 'resume':
                    return $this->resumeChunkedUpload($request);
                default:
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'INVALID_ACTION',
                            'message' => 'Invalid chunked upload action',
                            'details' => ['valid_actions' => ['initialize', 'upload_chunk', 'resume']]
                        ]
                    ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CHUNKED_UPLOAD_ERROR',
                    'message' => 'Chunked upload failed',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }

    /**
     * Finalize chunked upload by assembling chunks.
     *
     * Requirements: 1.7 - Complete chunked upload process
     */
    public function finalizeUpload(Request $request): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->sanitizeRequest($request);

            $validator = Validator::make($request->all(), [
                'session_id' => 'required|string',
                'expiration_days' => 'nullable|integer|min:1|max:365',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'error' => [
                        'code' => 'VALIDATION_ERROR',
                        'message' => 'Invalid finalization request',
                        'details' => $validator->errors()->toArray()
                    ]
                ], 422);
            }

            $sessionId = $request->input('session_id');
            $expirationDays = $request->input('expiration_days');

            // Finalize the chunked upload
            $fileModel = $this->chunkedUploadService->finalizeUpload($sessionId, $expirationDays);

            // Log privacy-compliant action
            $this->privacyManager->createPrivacyLog('chunked_upload_finalized', [
                'file_id' => $fileModel->file_id,
                'file_size' => $fileModel->file_size,
                'mime_type' => $fileModel->mime_type,
                'session_id' => $sessionId,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'file_id' => $fileModel->file_id,
                    'original_name' => $fileModel->original_name,
                    'file_size' => $fileModel->file_size,
                    'human_size' => $fileModel->getHumanFileSize(),
                    'mime_type' => $fileModel->mime_type,
                    'download_url' => $fileModel->getDownloadUrl(),
                    'preview_url' => $fileModel->getPreviewUrl(),
                    'expires_at' => $fileModel->expires_at?->toISOString(),
                    'created_at' => $fileModel->created_at->toISOString(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FINALIZATION_ERROR',
                    'message' => 'Failed to finalize upload',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }

    /**
     * Display file information page.
     *
     * Requirements: 1.4 - Provide file information and download options
     */
    public function show(string $fileId): Response
    {
        // Apply privacy protection
        $this->privacyManager->preventLogging();

        $file = $this->fileService->retrieve($fileId);

        if (!$file) {
            abort(404, 'File not found or has expired');
        }

        return Inertia::render('File/Show', [
            'file' => [
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
            ]
        ]);
    }

    /**
     * Initialize chunked upload session.
     */
    private function initializeChunkedUpload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'original_name' => 'required|string|max:255',
            'total_size' => 'required|integer|min:1|max:' . $this->getMaxFileSize(),
            'chunk_size' => 'nullable|integer|min:1048576|max:10485760', // 1MB to 10MB
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Invalid initialization request',
                    'details' => $validator->errors()->toArray()
                ]
            ], 422);
        }

        $originalName = $request->input('original_name');
        $totalSize = $request->input('total_size');
        $chunkSize = $request->input('chunk_size') ?? ChunkedUploadService::calculateOptimalChunkSize($totalSize);

        // Validate file size using validation service
        if ($totalSize > $this->fileValidationService->getMaxFileSize()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'FILE_TOO_LARGE',
                    'message' => 'File size exceeds maximum limit',
                    'details' => [
                        'max_size' => $this->fileValidationService->getMaxFileSize(),
                        'file_size' => $totalSize
                    ]
                ]
            ], 413);
        }

        $session = $this->chunkedUploadService->initializeSession($originalName, $totalSize, $chunkSize);

        return response()->json([
            'success' => true,
            'data' => [
                'session_id' => $session->session_id,
                'chunk_size' => $session->chunk_size,
                'total_chunks' => ceil($session->total_size / $session->chunk_size),
                'expires_at' => $session->expires_at->toISOString(),
            ]
        ]);
    }

    /**
     * Upload a single chunk.
     */
    private function uploadChunk(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'required|string',
            'chunk_index' => 'required|integer|min:0',
            'chunk' => 'required|file',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Invalid chunk upload request',
                    'details' => $validator->errors()->toArray()
                ]
            ], 422);
        }

        $sessionId = $request->input('session_id');
        $chunkIndex = $request->input('chunk_index');
        $chunkFile = $request->file('chunk');

        // Validate chunk (basic validation for chunks)
        $chunkValidation = $this->fileValidationService->validateChunk($chunkFile, $chunkFile->getSize());
        if (!$chunkValidation['valid']) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'CHUNK_VALIDATION_FAILED',
                    'message' => 'Chunk validation failed',
                    'details' => $chunkValidation['error']
                ]
            ], 422);
        }

        $result = $this->chunkedUploadService->uploadChunk($sessionId, $chunkIndex, $chunkFile);

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    /**
     * Resume interrupted chunked upload.
     */
    private function resumeChunkedUpload(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'session_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'VALIDATION_ERROR',
                    'message' => 'Invalid resume request',
                    'details' => $validator->errors()->toArray()
                ]
            ], 422);
        }

        $sessionId = $request->input('session_id');
        $sessionInfo = $this->chunkedUploadService->resumeUpload($sessionId);

        return response()->json([
            'success' => true,
            'data' => $sessionInfo
        ]);
    }

    /**
     * Validate upload request.
     */
    private function validateUploadRequest(Request $request): \Illuminate\Validation\Validator
    {
        return Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                // Remove max validation - we'll handle size validation in FileValidationService
            ],
            'expiration_days' => 'nullable|integer|min:1|max:365',
        ]);
    }

    /**
     * Get maximum file size in bytes.
     */
    private function getMaxFileSize(): int
    {
        return $this->fileValidationService->getMaxFileSize();
    }

    /**
     * Get supported file formats information.
     */
    private function getSupportedFormats(): array
    {
        return [
            'images' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
            'videos' => ['mp4', 'webm', 'ogg', 'avi', 'mov'],
            'audio' => ['mp3', 'wav', 'ogg', 'aac', 'flac'],
            'documents' => ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
            'archives' => ['zip', 'rar', '7z', 'tar', 'gz'],
            'code' => ['js', 'css', 'html', 'php', 'py', 'java', 'cpp', 'c', 'json', 'xml'],
        ];
    }

    /**
     * Get storage and duplicate statistics.
     *
     * Requirements: 5.6 - Storage optimization for identical files
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
                    'storage' => $storageStats,
                    'duplicates' => $duplicateStats,
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

    /**
     * Find duplicate files for a given file ID.
     *
     * Requirements: 5.6 - Duplicate detection
     */
    public function duplicates(string $fileId): JsonResponse
    {
        try {
            // Apply privacy protection
            $this->privacyManager->preventLogging();

            $duplicates = $this->fileService->findDuplicates($fileId);

            return response()->json([
                'success' => true,
                'data' => [
                    'file_id' => $fileId,
                    'duplicates' => $duplicates,
                    'count' => count($duplicates),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'DUPLICATES_ERROR',
                    'message' => 'Failed to find duplicates',
                    'details' => ['error' => $e->getMessage()]
                ]
            ], 500);
        }
    }

    /**
     * Check if file type is previewable.
     */
    private function isPreviewable(string $mimeType): bool
    {
        $previewableMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'video/mp4', 'video/webm', 'video/ogg',
            'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac',
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'application/json', 'application/xml', 'application/pdf',
        ];

        return in_array($mimeType, $previewableMimes);
    }
}
