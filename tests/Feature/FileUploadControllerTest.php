<?php

use App\Models\File;
use App\Models\UploadSession;
use App\Services\FileService;
use App\Services\ChunkedUploadService;
use App\Services\PrivacyManager;
use App\Services\FileValidationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Storage::fake('public');
    
    // Mock services for testing
    $this->fileService = Mockery::mock(FileService::class);
    $this->chunkedUploadService = Mockery::mock(ChunkedUploadService::class);
    $this->privacyManager = Mockery::mock(PrivacyManager::class);
    $this->fileValidationService = Mockery::mock(FileValidationService::class);
    
    // Bind mocks to container
    $this->app->instance(FileService::class, $this->fileService);
    $this->app->instance(ChunkedUploadService::class, $this->chunkedUploadService);
    $this->app->instance(PrivacyManager::class, $this->privacyManager);
    $this->app->instance(FileValidationService::class, $this->fileValidationService);
    
    // Default privacy manager expectations
    $this->privacyManager->shouldReceive('preventLogging')->andReturn(null);
    $this->privacyManager->shouldReceive('sanitizeRequest')->andReturn(null);
    $this->privacyManager->shouldReceive('createPrivacyLog')->andReturn(null);
});

describe('FileUploadController Index', function () {
    it('renders upload index page with correct props', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240); // 10GB
        
        // Act & Assert
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Upload/Index')
                ->has('maxFileSize')
                ->has('chunkThreshold')
                ->has('supportedFormats')
                ->where('maxFileSize', 10737418240)
                ->where('chunkThreshold', 104857600) // 100MB
            );
    });

    it('applies privacy protection on index page', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->privacyManager->shouldReceive('preventLogging')->once();
        
        // Act
        $this->get('/');
        
        // Assert - privacy manager was called
        $this->privacyManager->shouldHaveReceived('preventLogging');
    });
});

describe('FileUploadController Upload', function () {
    it('successfully uploads a valid file', function () {
        // Arrange
        $file = UploadedFile::fake()->create('test.txt', 1024, 'text/plain');
        $fileModel = new File([
            'file_id' => 'test123',
            'original_name' => 'test.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
            'created_at' => now(),
        ]);
        
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->fileValidationService->shouldReceive('validateFile')->andReturn(['valid' => true]);
        $this->fileService->shouldReceive('checkForDuplicate')->andReturn(['is_duplicate' => false]);
        $this->fileService->shouldReceive('store')->andReturn($fileModel);
        
        // For testing, we'll assume small files don't require chunked upload
        // In real implementation, this would be handled by the controller logic
        
        // Act
        $response = $this->postJson('/api/upload', [
            'file' => $file,
            'expiration_days' => 30,
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'file_id' => 'test123',
                    'original_name' => 'test.txt',
                    'file_size' => 1024,
                    'mime_type' => 'text/plain',
                    'is_duplicate' => false,
                ]
            ]);
    });

    it('handles file validation errors', function () {
        // Arrange
        $file = UploadedFile::fake()->create('malicious.exe', 1024);
        
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->fileValidationService->shouldReceive('validateFile')->andReturn([
            'valid' => false,
            'errors' => ['File type not allowed']
        ]);
        
        // Act
        $response = $this->postJson('/api/upload', [
            'file' => $file,
        ]);
        
        // Assert
        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'FILE_VALIDATION_FAILED',
                    'message' => 'File validation failed',
                ]
            ]);
    });

    it('handles duplicate files correctly', function () {
        // Arrange
        $file = UploadedFile::fake()->create('duplicate.txt', 1024, 'text/plain');
        $fileModel = new File([
            'file_id' => 'existing123',
            'original_name' => 'duplicate.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
            'created_at' => now(),
        ]);
        
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->fileValidationService->shouldReceive('validateFile')->andReturn(['valid' => true]);
        $this->fileService->shouldReceive('checkForDuplicate')->andReturn([
            'is_duplicate' => true,
            'space_saved' => 1024
        ]);
        $this->fileService->shouldReceive('store')->andReturn($fileModel);
        
        // Act
        $response = $this->postJson('/api/upload', [
            'file' => $file,
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_duplicate' => true,
                    'space_saved' => 1024,
                ]
            ]);
    });

    it('validates request parameters', function () {
        // Act
        $response = $this->postJson('/api/upload', [
            'expiration_days' => 400, // Invalid - over 365
        ]);
        
        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    });
});

describe('FileUploadController Chunked Upload', function () {
    it('initializes chunked upload session successfully', function () {
        // Arrange
        $session = new UploadSession([
            'session_id' => 'session123',
            'chunk_size' => 10485760,
            'expires_at' => now()->addHours(24),
        ]);
        
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->chunkedUploadService->shouldReceive('initializeSession')->andReturn($session);
        
        // Act
        $response = $this->postJson('/api/upload/chunk', [
            'action' => 'initialize',
            'original_name' => 'large-file.zip',
            'total_size' => 500000000, // 500MB
            'chunk_size' => 10485760,
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'session_id' => 'session123',
                    'chunk_size' => 10485760,
                ]
            ]);
    });

    it('rejects initialization for files that are too large', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        
        // Act
        $response = $this->postJson('/api/upload/chunk', [
            'action' => 'initialize',
            'original_name' => 'huge-file.zip',
            'total_size' => 20000000000, // 20GB - over limit
        ]);
        
        // Assert
        $response->assertStatus(413)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'FILE_TOO_LARGE',
                ]
            ]);
    });

    it('uploads chunk successfully', function () {
        // Arrange
        $chunk = UploadedFile::fake()->create('chunk', 1024);
        
        $this->fileValidationService->shouldReceive('validateChunk')->andReturn(['valid' => true]);
        $this->chunkedUploadService->shouldReceive('uploadChunk')->andReturn([
            'chunk_index' => 0,
            'uploaded' => true,
            'progress' => 10.5,
        ]);
        
        // Act
        $response = $this->postJson('/api/upload/chunk', [
            'action' => 'upload_chunk',
            'session_id' => 'session123',
            'chunk_index' => 0,
            'chunk' => $chunk,
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'chunk_index' => 0,
                    'uploaded' => true,
                ]
            ]);
    });

    it('handles invalid chunked upload actions', function () {
        // Act
        $response = $this->postJson('/api/upload/chunk', [
            'action' => 'invalid_action',
        ]);
        
        // Assert
        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'INVALID_ACTION',
                ]
            ]);
    });

    it('resumes interrupted upload', function () {
        // Arrange
        $this->chunkedUploadService->shouldReceive('resumeUpload')->andReturn([
            'session_id' => 'session123',
            'missing_chunks' => [2, 5, 8],
            'progress' => 65.2,
        ]);
        
        // Act
        $response = $this->postJson('/api/upload/chunk', [
            'action' => 'resume',
            'session_id' => 'session123',
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'session_id' => 'session123',
                    'missing_chunks' => [2, 5, 8],
                ]
            ]);
    });
});

describe('FileUploadController Finalize Upload', function () {
    it('finalizes chunked upload successfully', function () {
        // Arrange
        $fileModel = new File([
            'file_id' => 'finalized123',
            'original_name' => 'large-file.zip',
            'file_size' => 500000000,
            'mime_type' => 'application/zip',
            'created_at' => now(),
        ]);
        
        $this->chunkedUploadService->shouldReceive('finalizeUpload')->andReturn($fileModel);
        
        // Act
        $response = $this->postJson('/api/upload/finalize', [
            'session_id' => 'session123',
            'expiration_days' => 7,
        ]);
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'file_id' => 'finalized123',
                    'original_name' => 'large-file.zip',
                ]
            ]);
    });

    it('validates finalization request parameters', function () {
        // Act
        $response = $this->postJson('/api/upload/finalize', [
            'expiration_days' => 400, // Invalid
        ]);
        
        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['session_id']);
    });
});

describe('FileUploadController Show', function () {
    it('displays file information page', function () {
        // Arrange
        $file = new File([
            'file_id' => 'show123',
            'original_name' => 'document.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'created_at' => now(),
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('show123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/show123')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('File/Show')
                ->has('file')
                ->where('file.file_id', 'show123')
                ->where('file.original_name', 'document.pdf')
            );
    });

    it('returns 404 for non-existent file', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('nonexistent')->andReturn(null);
        
        // Act & Assert
        $this->get('/file/nonexistent')
            ->assertNotFound();
    });
});

describe('FileUploadController Stats', function () {
    it('returns storage statistics', function () {
        // Arrange
        $this->fileService->shouldReceive('getStorageStats')->andReturn([
            'total_files' => 150,
            'total_size' => 5368709120, // 5GB
        ]);
        $this->fileService->shouldReceive('getDuplicateStats')->andReturn([
            'duplicate_count' => 25,
            'space_saved' => 1073741824, // 1GB
        ]);
        
        // Act
        $response = $this->getJson('/api/stats');
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'storage' => [
                        'total_files' => 150,
                        'total_size' => 5368709120,
                    ],
                    'duplicates' => [
                        'duplicate_count' => 25,
                        'space_saved' => 1073741824,
                    ],
                ]
            ]);
    });
});

describe('FileUploadController Duplicates', function () {
    it('finds duplicate files', function () {
        // Arrange
        $duplicates = [
            ['file_id' => 'dup1', 'created_at' => now()->subDays(1)],
            ['file_id' => 'dup2', 'created_at' => now()->subDays(2)],
        ];
        
        $this->fileService->shouldReceive('findDuplicates')->with('original123')->andReturn($duplicates);
        
        // Act
        $response = $this->getJson('/api/file/original123/duplicates');
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'file_id' => 'original123',
                    'duplicates' => $duplicates,
                    'count' => 2,
                ]
            ]);
    });
});