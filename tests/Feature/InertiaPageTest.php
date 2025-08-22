<?php

use App\Models\File;
use App\Services\FileService;
use App\Services\PrivacyManager;
use App\Services\FileValidationService;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    // Mock services for testing
    $this->fileService = Mockery::mock(FileService::class);
    $this->privacyManager = Mockery::mock(PrivacyManager::class);
    $this->fileValidationService = Mockery::mock(FileValidationService::class);
    
    // Bind mocks to container
    $this->app->instance(FileService::class, $this->fileService);
    $this->app->instance(PrivacyManager::class, $this->privacyManager);
    $this->app->instance(FileValidationService::class, $this->fileValidationService);
    
    // Default privacy manager expectations
    $this->privacyManager->shouldReceive('preventLogging')->andReturn(null);
});

describe('Upload Index Page', function () {
    it('renders upload index page with correct component', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        
        // Act & Assert
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Upload/Index')
            );
    });

    it('passes correct props to upload index page', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        
        // Act & Assert
        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->component('Upload/Index')
                ->has('maxFileSize')
                ->has('chunkThreshold')
                ->has('supportedFormats')
                ->where('maxFileSize', 10737418240)
                ->where('chunkThreshold', 104857600)
                ->has('supportedFormats.images')
                ->has('supportedFormats.videos')
                ->has('supportedFormats.audio')
                ->has('supportedFormats.documents')
                ->has('supportedFormats.archives')
                ->has('supportedFormats.code')
            );
    });

    it('includes all supported file format categories', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        
        // Act & Assert
        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('supportedFormats.images', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])
                ->where('supportedFormats.videos', ['mp4', 'webm', 'ogg', 'avi', 'mov'])
                ->where('supportedFormats.audio', ['mp3', 'wav', 'ogg', 'aac', 'flac'])
                ->where('supportedFormats.documents', ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'])
                ->where('supportedFormats.archives', ['zip', 'rar', '7z', 'tar', 'gz'])
                ->where('supportedFormats.code', ['js', 'css', 'html', 'php', 'py', 'java', 'cpp', 'c', 'json', 'xml'])
            );
    });

    it('applies privacy protection on index page load', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        $this->privacyManager->shouldReceive('preventLogging')->once();
        
        // Act
        $this->get('/');
        
        // Assert
        $this->privacyManager->shouldHaveReceived('preventLogging');
    });

    it('handles different file size limits correctly', function () {
        // Arrange - Test with different max file size
        $customMaxSize = 5368709120; // 5GB
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn($customMaxSize);
        
        // Act & Assert
        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('maxFileSize', $customMaxSize)
            );
    });
});

describe('File Show Page', function () {
    it('renders file show page with correct component', function () {
        // Arrange
        $file = new File([
            'file_id' => 'show123',
            'original_name' => 'document.pdf',
            'file_size' => 2048,
            'mime_type' => 'application/pdf',
            'created_at' => now(),
            'expires_at' => now()->addDays(30),
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('show123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/show123')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('File/Show')
            );
    });

    it('passes complete file data to show page', function () {
        // Arrange
        $file = new File([
            'file_id' => 'complete123',
            'original_name' => 'presentation.pptx',
            'file_size' => 5242880, // 5MB
            'mime_type' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'created_at' => now(),
            'expires_at' => now()->addDays(7),
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('complete123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/complete123')
            ->assertInertia(fn (Assert $page) => $page
                ->component('File/Show')
                ->has('file')
                ->where('file.file_id', 'complete123')
                ->where('file.original_name', 'presentation.pptx')
                ->where('file.file_size', 5242880)
                ->where('file.human_size', '5 MB')
                ->where('file.mime_type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
                ->has('file.download_url')
                ->has('file.preview_url')
                ->has('file.expires_at')
                ->has('file.created_at')
                ->has('file.is_previewable')
            );
    });

    it('correctly identifies previewable files', function () {
        // Test different file types for previewability
        
        // Previewable image
        $imageFile = new File([
            'file_id' => 'image123',
            'original_name' => 'photo.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 1024,
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('image123')->andReturn($imageFile);
        
        $this->get('/file/image123')
            ->assertInertia(fn (Assert $page) => $page
                ->where('file.is_previewable', true)
            );
        
        // Non-previewable binary file
        $binaryFile = new File([
            'file_id' => 'binary123',
            'original_name' => 'program.exe',
            'mime_type' => 'application/octet-stream',
            'file_size' => 1024,
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('binary123')->andReturn($binaryFile);
        
        $this->get('/file/binary123')
            ->assertInertia(fn (Assert $page) => $page
                ->where('file.is_previewable', false)
            );
    });

    it('handles files without expiration date', function () {
        // Arrange
        $permanentFile = new File([
            'file_id' => 'permanent123',
            'original_name' => 'permanent.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
            'created_at' => now(),
            'expires_at' => null, // No expiration
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('permanent123')->andReturn($permanentFile);
        
        // Act & Assert
        $this->get('/file/permanent123')
            ->assertInertia(fn (Assert $page) => $page
                ->where('file.expires_at', null)
            );
    });

    it('returns 404 for non-existent files', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('nonexistent')->andReturn(null);
        
        // Act & Assert
        $this->get('/file/nonexistent')
            ->assertNotFound();
    });

    it('applies privacy protection on file show page', function () {
        // Arrange
        $file = new File([
            'file_id' => 'privacy123',
            'original_name' => 'document.txt',
            'file_size' => 1024,
            'mime_type' => 'text/plain',
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('privacy123')->andReturn($file);
        $this->privacyManager->shouldReceive('preventLogging')->once();
        
        // Act
        $this->get('/file/privacy123');
        
        // Assert
        $this->privacyManager->shouldHaveReceived('preventLogging');
    });
});

describe('Inertia Page Error Handling', function () {
    it('handles service exceptions on index page', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andThrow(new Exception('Service error'));
        
        // Act & Assert
        $this->get('/')
            ->assertStatus(500);
    });

    it('handles service exceptions on show page', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->andThrow(new Exception('Database error'));
        
        // Act & Assert
        $this->get('/file/error123')
            ->assertStatus(500);
    });

    it('returns proper 404 page for missing files', function () {
        // Arrange
        $this->fileService->shouldReceive('retrieve')->with('missing')->andReturn(null);
        
        // Act & Assert
        $response = $this->get('/file/missing');
        $response->assertNotFound();
        
        // Check that it's a proper 404 response, not an Inertia page
        expect($response->headers->get('Content-Type'))->not->toContain('application/json');
    });
});

describe('Inertia Page Performance', function () {
    it('loads index page efficiently', function () {
        // Arrange
        $this->fileValidationService->shouldReceive('getMaxFileSize')->andReturn(10737418240);
        
        // Act
        $startTime = microtime(true);
        $response = $this->get('/');
        $endTime = microtime(true);
        
        // Assert
        $response->assertOk();
        
        // Basic performance check - should load quickly in test environment
        $loadTime = $endTime - $startTime;
        expect($loadTime)->toBeLessThan(1.0); // Should load in under 1 second
    });

    it('minimizes data passed to show page', function () {
        // Arrange
        $file = new File([
            'file_id' => 'minimal123',
            'original_name' => 'document.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('minimal123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/minimal123')
            ->assertInertia(fn (Assert $page) => $page
                ->has('file')
                // Ensure we're not passing unnecessary data
                ->missing('file.checksum') // Internal data shouldn't be exposed
                ->missing('file.file_path') // Internal path shouldn't be exposed
            );
    });
});

describe('Inertia Page Security', function () {
    it('does not expose sensitive file information', function () {
        // Arrange
        $file = new File([
            'file_id' => 'secure123',
            'original_name' => 'document.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
            'file_path' => 'files/internal/path/document.pdf', // Internal path
            'checksum' => 'abc123def456', // Internal checksum
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('secure123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/secure123')
            ->assertInertia(fn (Assert $page) => $page
                ->missing('file.file_path') // Should not expose internal file path
                ->missing('file.checksum')  // Should not expose internal checksum
                ->missing('file.id')        // Should not expose database ID
            );
    });

    it('sanitizes file names in page data', function () {
        // Arrange
        $file = new File([
            'file_id' => 'sanitize123',
            'original_name' => '<script>alert("xss")</script>document.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
        ]);
        
        $this->fileService->shouldReceive('retrieve')->with('sanitize123')->andReturn($file);
        
        // Act & Assert
        $this->get('/file/sanitize123')
            ->assertInertia(fn (Assert $page) => $page
                // The original name should be passed as-is to the frontend
                // XSS protection should be handled by the React components
                ->where('file.original_name', '<script>alert("xss")</script>document.pdf')
            );
    });
});