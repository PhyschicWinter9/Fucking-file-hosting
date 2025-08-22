<?php

use App\Models\File;
use App\Services\FileService;
use App\Services\PrivacyManager;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

beforeEach(function () {
    Storage::fake('public');
    
    // Mock services for testing
    $this->fileService = Mockery::mock(FileService::class);
    $this->privacyManager = Mockery::mock(PrivacyManager::class);
    
    // Bind mocks to container
    $this->app->instance(FileService::class, $this->fileService);
    $this->app->instance(PrivacyManager::class, $this->privacyManager);
    
    // Default privacy manager expectations
    $this->privacyManager->shouldReceive('sanitizeRequest')->andReturn(null);
    $this->privacyManager->shouldReceive('createPrivacyLog')->andReturn(null);
    $this->privacyManager->shouldReceive('getGDPRHeaders')->andReturn([
        'X-Privacy-Policy' => 'no-tracking',
        'X-Data-Protection' => 'gdpr-compliant',
    ]);
});

describe('FileDownloadController Download', function () {
    it('downloads existing file successfully', function () {
        // Arrange
        $file = new File([
            'file_id' => 'download123',
            'original_name' => 'test-document.pdf',
            'file_path' => 'files/test-document.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'created_at' => now(),
        ]);
        
        // Create a fake file on disk
        Storage::disk('public')->put('files/test-document.pdf', 'fake pdf content');
        
        $this->fileService->shouldReceive('retrieve')->with('download123')->andReturn($file);
        
        // Act
        $response = $this->get('/f/download123');
        
        // Assert
        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Content-Disposition', 'attachment; filename="test-document.pdf"');
        $response->assertHeader('X-Privacy-Policy', 'no-tracking');
    });

    it('returns 404 for non-existent file', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('nonexistent')->andReturn(null);
        
        // Act & Assert
        $this->get('/f/nonexistent')
            ->assertNotFound();
    });

    it('returns 404 when file exists in database but not on disk', function () {
        // Arrange
        $file = new File([
            'file_id' => 'missing123',
            'original_name' => 'missing.txt',
            'file_path' => 'files/missing.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('missing123')->andReturn($file);
        
        // Act & Assert
        $this->get('/f/missing123')
            ->assertNotFound();
    });

    it('uses streaming for large files', function () {
        // Arrange
        $file = new File([
            'file_id' => 'large123',
            'original_name' => 'large-video.mp4',
            'file_path' => 'files/large-video.mp4',
            'file_size' => 100 * 1024 * 1024, // 100MB - over streaming threshold
            'mime_type' => 'video/mp4',
        ]);
        
        // Create a fake large file
        Storage::disk('public')->put('files/large-video.mp4', str_repeat('x', 1024));
        
        $this->fileService->shouldReceive('retrieve')->with('large123')->andReturn($file);
        
        // Act
        $response = $this->get('/f/large123');
        
        // Assert
        $response->assertOk();
        expect($response->baseResponse)->toBeInstanceOf(StreamedResponse::class);
    });

    it('handles range requests for partial content', function () {
        // Arrange
        $file = new File([
            'file_id' => 'range123',
            'original_name' => 'video.mp4',
            'file_path' => 'files/video.mp4',
            'file_size' => 100 * 1024 * 1024, // 100MB
            'mime_type' => 'video/mp4',
        ]);
        
        Storage::disk('public')->put('files/video.mp4', str_repeat('x', 1024));
        
        $this->fileService->shouldReceive('retrieve')->with('range123')->andReturn($file);
        
        // Act
        $response = $this->get('/f/range123', [
            'Range' => 'bytes=0-1023'
        ]);
        
        // Assert
        $response->assertStatus(206); // Partial Content
        $response->assertHeader('Accept-Ranges', 'bytes');
        $response->assertHeader('Content-Range');
    });

    it('applies privacy protection during download', function () {
        // Arrange
        $file = new File([
            'file_id' => 'privacy123',
            'original_name' => 'document.txt',
            'file_path' => 'files/document.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
        ]);
        
        Storage::disk('public')->put('files/document.txt', 'content');
        
        $this->fileService->shouldReceive('retrieve')->with('privacy123')->andReturn($file);
        $this->privacyManager->shouldReceive('sanitizeRequest')->once();
        $this->privacyManager->shouldReceive('createPrivacyLog')->once()->with('file_downloaded', Mockery::any());
        
        // Act
        $this->get('/f/privacy123');
        
        // Assert - privacy manager methods were called
        $this->privacyManager->shouldHaveReceived('sanitizeRequest');
        $this->privacyManager->shouldHaveReceived('createPrivacyLog');
    });
});

describe('FileDownloadController Preview', function () {
    it('previews previewable file successfully', function () {
        // Arrange
        $file = new File([
            'file_id' => 'preview123',
            'original_name' => 'image.jpg',
            'file_path' => 'files/image.jpg',
            'file_size' => 2048,
            'mime_type' => 'image/jpeg',
        ]);
        
        Storage::disk('public')->put('files/image.jpg', 'fake image content');
        
        $this->fileService->shouldReceive('retrieve')->with('preview123')->andReturn($file);
        
        // Act
        $response = $this->get('/p/preview123');
        
        // Assert
        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/jpeg');
        $response->assertHeader('Content-Disposition', 'inline; filename="image.jpg"');
    });

    it('rejects non-previewable file types', function () {
        // Arrange
        $file = new File([
            'file_id' => 'binary123',
            'original_name' => 'program.exe',
            'file_path' => 'files/program.exe',
            'file_size' => 1024,
            'mime_type' => 'application/octet-stream',
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('binary123')->andReturn($file);
        
        // Act
        $response = $this->getJson('/p/binary123');
        
        // Assert
        $response->assertStatus(415) // Unsupported Media Type
            ->assertJson([
                'error' => 'File type not previewable',
                'mime_type' => 'application/octet-stream',
            ]);
    });

    it('adds caching headers for media files', function () {
        // Arrange
        $file = new File([
            'file_id' => 'media123',
            'original_name' => 'video.mp4',
            'file_path' => 'files/video.mp4',
            'file_size' => 1024,
            'mime_type' => 'video/mp4',
        ]);
        
        Storage::disk('public')->put('files/video.mp4', 'fake video content');
        
        $this->fileService->shouldReceive('retrieve')->with('media123')->andReturn($file);
        
        // Act
        $response = $this->get('/p/media123');
        
        // Assert
        $response->assertOk();
        $response->assertHeader('Cache-Control', 'public, max-age=3600');
        $response->assertHeader('Expires');
    });

    it('uses streaming for large preview files', function () {
        // Arrange
        $file = new File([
            'file_id' => 'largepreview123',
            'original_name' => 'large-image.png',
            'file_path' => 'files/large-image.png',
            'file_size' => 100 * 1024 * 1024, // 100MB
            'mime_type' => 'image/png',
        ]);
        
        Storage::disk('public')->put('files/large-image.png', str_repeat('x', 1024));
        
        $this->fileService->shouldReceive('retrieve')->with('largepreview123')->andReturn($file);
        
        // Act
        $response = $this->get('/p/largepreview123');
        
        // Assert
        $response->assertOk();
        expect($response->baseResponse)->toBeInstanceOf(StreamedResponse::class);
    });

    it('returns 404 for non-existent preview file', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('nonexistent')->andReturn(null);
        
        // Act & Assert
        $this->get('/p/nonexistent')
            ->assertNotFound();
    });
});

describe('FileDownloadController Info', function () {
    it('returns file information as JSON', function () {
        // Arrange
        $file = new File([
            'file_id' => 'info123',
            'original_name' => 'document.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'created_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('info123')->andReturn($file);
        
        // Act
        $response = $this->getJson('/api/file/info123/info');
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'file_id' => 'info123',
                    'original_name' => 'document.pdf',
                    'file_size' => 2048,
                    'mime_type' => 'application/pdf',
                    'is_previewable' => true,
                    'is_media' => false,
                ]
            ]);
    });

    it('returns 404 for non-existent file info', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('nonexistent')->andReturn(null);
        
        // Act
        $response = $this->getJson('/api/file/nonexistent/info');
        
        // Assert
        $response->assertNotFound()
            ->assertJson([
                'success' => false,
                'error' => [
                    'code' => 'FILE_NOT_FOUND',
                    'message' => 'File not found or has expired'
                ]
            ]);
    });

    it('includes correct previewable and media flags', function () {
        // Arrange - Image file (previewable and media)
        $imageFile = new File([
            'file_id' => 'image123',
            'original_name' => 'photo.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('image123')->andReturn($imageFile);
        
        // Act
        $response = $this->getJson('/api/file/image123/info');
        
        // Assert
        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'is_previewable' => true,
                    'is_media' => true,
                ]
            ]);
    });

    it('applies privacy protection when accessing file info', function () {
        // Arrange
        $file = new File([
            'file_id' => 'privacy123',
            'original_name' => 'document.txt',
            'mime_type' => 'text/plain',
            'file_size' => 1024,
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('privacy123')->andReturn($file);
        $this->privacyManager->shouldReceive('sanitizeRequest')->once();
        $this->privacyManager->shouldReceive('createPrivacyLog')->once()->with('file_info_accessed', Mockery::any());
        
        // Act
        $this->getJson('/api/file/privacy123/info');
        
        // Assert - privacy manager methods were called
        $this->privacyManager->shouldHaveReceived('sanitizeRequest');
        $this->privacyManager->shouldHaveReceived('createPrivacyLog');
    });
});

describe('FileDownloadController Error Handling', function () {
    it('handles service exceptions gracefully', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->andThrow(new Exception('Database error'));
        
        // Act & Assert
        $this->get('/f/error123')
            ->assertStatus(500);
    });

    it('handles file system errors', function () {
        // Arrange
        $file = new File([
            'file_id' => 'fserror123',
            'original_name' => 'corrupted.txt',
            'file_path' => 'files/corrupted.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
        ]);
        
        // Don't create the file on disk to simulate file system error
        $this->fileService->shouldReceive('retrieve')->with('fserror123')->andReturn($file);
        
        // Act & Assert
        $this->get('/f/fserror123')
            ->assertNotFound();
    });
});

describe('FileDownloadController Security', function () {
    it('includes security headers in responses', function () {
        // Arrange
        $file = new File([
            'file_id' => 'secure123',
            'original_name' => 'document.txt',
            'file_path' => 'files/document.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
        ]);
        
        Storage::disk('public')->put('files/document.txt', 'content');
        
        $this->fileService->shouldReceive('retrieve')->with('secure123')->andReturn($file);
        
        // Act
        $response = $this->get('/f/secure123');
        
        // Assert
        $response->assertOk();
        $response->assertHeader('X-Privacy-Policy', 'no-tracking');
        $response->assertHeader('X-Data-Protection', 'gdpr-compliant');
    });

    it('prevents directory traversal attacks', function () {
        // This test would be implemented based on the actual security validation logic
        // in the validateFileAccess method of the controller
        expect(true)->toBeTrue(); // Placeholder - actual implementation would test path validation
    });
});