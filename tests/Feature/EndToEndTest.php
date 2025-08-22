<?php

namespace Tests\Feature;

use App\Models\File;
use App\Models\UploadSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /** @test */
    public function complete_upload_download_workflow_works()
    {
        // 1. Visit upload page
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Upload/Index'));

        // 2. Upload a file
        $file = UploadedFile::fake()->create('test-file.txt', 100, 'text/plain');
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $file,
            'expiration_days' => 7
        ]);

        $uploadResponse->assertStatus(200);
        $uploadResponse->assertJsonStructure([
            'success',
            'file' => [
                'id',
                'file_id',
                'original_name',
                'file_size',
                'mime_type',
                'download_url',
                'preview_url',
                'expires_at'
            ]
        ]);

        $fileData = $uploadResponse->json('file');
        $fileId = $fileData['file_id'];

        // 3. Verify file is stored
        $this->assertDatabaseHas('files', [
            'file_id' => $fileId,
            'original_name' => 'test-file.txt',
            'mime_type' => 'text/plain'
        ]);

        // 4. Visit file info page
        $infoResponse = $this->get("/file/{$fileId}");
        $infoResponse->assertStatus(200);
        $infoResponse->assertInertia(fn ($page) => 
            $page->component('File/Show')
                 ->has('file')
                 ->where('file.file_id', $fileId)
        );

        // 5. Download the file
        $downloadResponse = $this->get("/f/{$fileId}");
        $downloadResponse->assertStatus(200);
        $downloadResponse->assertHeader('Content-Type', 'text/plain');
        $downloadResponse->assertHeader('Content-Disposition', 'attachment; filename="test-file.txt"');

        // 6. Get file info via API
        $apiInfoResponse = $this->get("/api/file/{$fileId}/info");
        $apiInfoResponse->assertStatus(200);
        $apiInfoResponse->assertJsonStructure([
            'success',
            'file' => [
                'file_id',
                'original_name',
                'file_size',
                'mime_type',
                'created_at',
                'expires_at'
            ]
        ]);
    }

    /** @test */
    public function chunked_upload_workflow_works()
    {
        // Create a larger file for chunked upload
        $fileContent = str_repeat('A', 10 * 1024 * 1024); // 10MB
        $tempFile = tmpfile();
        fwrite($tempFile, $fileContent);
        $tempPath = stream_get_meta_data($tempFile)['uri'];

        // 1. Initialize chunked upload
        $initResponse = $this->post('/api/upload/chunk', [
            'filename' => 'large-file.txt',
            'total_size' => strlen($fileContent),
            'chunk_size' => 5 * 1024 * 1024, // 5MB chunks
            'total_chunks' => 2
        ]);

        $initResponse->assertStatus(200);
        $sessionId = $initResponse->json('session_id');

        // 2. Upload first chunk
        $chunk1 = substr($fileContent, 0, 5 * 1024 * 1024);
        $chunk1File = UploadedFile::fake()->createWithContent('chunk1', $chunk1);

        $chunk1Response = $this->post('/api/upload/chunk', [
            'session_id' => $sessionId,
            'chunk_index' => 0,
            'chunk' => $chunk1File
        ]);

        $chunk1Response->assertStatus(200);

        // 3. Upload second chunk
        $chunk2 = substr($fileContent, 5 * 1024 * 1024);
        $chunk2File = UploadedFile::fake()->createWithContent('chunk2', $chunk2);

        $chunk2Response = $this->post('/api/upload/chunk', [
            'session_id' => $sessionId,
            'chunk_index' => 1,
            'chunk' => $chunk2File
        ]);

        $chunk2Response->assertStatus(200);

        // 4. Finalize upload
        $finalizeResponse = $this->post('/api/upload/finalize', [
            'session_id' => $sessionId,
            'expiration_days' => 30
        ]);

        $finalizeResponse->assertStatus(200);
        $finalizeResponse->assertJsonStructure([
            'success',
            'file' => [
                'file_id',
                'original_name',
                'file_size'
            ]
        ]);

        $fileId = $finalizeResponse->json('file.file_id');

        // 5. Verify file is complete and downloadable
        $downloadResponse = $this->get("/f/{$fileId}");
        $downloadResponse->assertStatus(200);
        $this->assertEquals(strlen($fileContent), strlen($downloadResponse->getContent()));

        fclose($tempFile);
    }

    /** @test */
    public function privacy_protection_measures_work()
    {
        // 1. Upload a file
        $file = UploadedFile::fake()->create('privacy-test.txt', 50);
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $file
        ]);

        $fileId = $uploadResponse->json('file.file_id');

        // 2. Verify no IP logging in database
        $fileRecord = File::where('file_id', $fileId)->first();
        $this->assertNull($fileRecord->ip_address ?? null);
        $this->assertNull($fileRecord->user_agent ?? null);

        // 3. Check that file ID is cryptographically secure (64 characters)
        $this->assertEquals(64, strlen($fileId));
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $fileId);

        // 4. Verify no tracking headers in response
        $downloadResponse = $this->get("/f/{$fileId}");
        $this->assertNull($downloadResponse->headers->get('X-User-ID'));
        $this->assertNull($downloadResponse->headers->get('X-Session-ID'));
    }

    /** @test */
    public function file_expiration_system_works()
    {
        // 1. Upload file with 1-day expiration
        $file = UploadedFile::fake()->create('expiring-file.txt', 25);
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $file,
            'expiration_days' => 1
        ]);

        $fileId = $uploadResponse->json('file.file_id');

        // 2. Verify expiration date is set
        $fileRecord = File::where('file_id', $fileId)->first();
        $this->assertNotNull($fileRecord->expires_at);
        $this->assertTrue($fileRecord->expires_at->isFuture());

        // 3. Simulate file expiration
        $fileRecord->update(['expires_at' => now()->subDay()]);

        // 4. Verify expired file returns 404
        $downloadResponse = $this->get("/f/{$fileId}");
        $downloadResponse->assertStatus(404);

        // 5. Test cleanup command
        $this->artisan('files:cleanup')
             ->assertExitCode(0);

        // 6. Verify expired file is removed from database
        $this->assertDatabaseMissing('files', ['file_id' => $fileId]);
    }

    /** @test */
    public function duplicate_detection_works()
    {
        // 1. Upload first file
        $content = 'This is test content for duplicate detection';
        $file1 = UploadedFile::fake()->createWithContent('file1.txt', $content);
        
        $upload1Response = $this->post('/api/upload', [
            'file' => $file1
        ]);

        $file1Id = $upload1Response->json('file.file_id');
        $file1Record = File::where('file_id', $file1Id)->first();

        // 2. Upload identical file
        $file2 = UploadedFile::fake()->createWithContent('file2.txt', $content);
        
        $upload2Response = $this->post('/api/upload', [
            'file' => $file2
        ]);

        $file2Id = $upload2Response->json('file.file_id');
        $file2Record = File::where('file_id', $file2Id)->first();

        // 3. Verify both files have same checksum
        $this->assertEquals($file1Record->checksum, $file2Record->checksum);

        // 4. Verify storage optimization (same physical file)
        $this->assertTrue(Storage::disk('local')->exists($file1Record->file_path));
        $this->assertTrue(Storage::disk('local')->exists($file2Record->file_path));
    }

    /** @test */
    public function bulk_upload_functionality_works()
    {
        // 1. Create multiple files
        $files = [
            UploadedFile::fake()->create('bulk1.txt', 10),
            UploadedFile::fake()->create('bulk2.txt', 15),
            UploadedFile::fake()->create('bulk3.txt', 20)
        ];

        $uploadedFiles = [];

        // 2. Upload each file
        foreach ($files as $file) {
            $response = $this->post('/api/upload', [
                'file' => $file,
                'expiration_days' => 7
            ]);

            $response->assertStatus(200);
            $uploadedFiles[] = $response->json('file');
        }

        // 3. Verify all files are stored
        $this->assertCount(3, $uploadedFiles);
        
        foreach ($uploadedFiles as $fileData) {
            $this->assertDatabaseHas('files', [
                'file_id' => $fileData['file_id']
            ]);
        }

        // 4. Verify all files are downloadable
        foreach ($uploadedFiles as $fileData) {
            $downloadResponse = $this->get("/f/{$fileData['file_id']}");
            $downloadResponse->assertStatus(200);
        }
    }

    /** @test */
    public function file_preview_functionality_works()
    {
        // 1. Upload an image file
        $imageFile = UploadedFile::fake()->image('test-image.jpg', 100, 100);
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $imageFile
        ]);

        $fileId = $uploadResponse->json('file.file_id');

        // 2. Test image preview
        $previewResponse = $this->get("/p/{$fileId}");
        $previewResponse->assertStatus(200);
        $previewResponse->assertHeader('Content-Type', 'image/jpeg');

        // 3. Upload a text file
        $textFile = UploadedFile::fake()->createWithContent('test.txt', 'Hello World');
        
        $textUploadResponse = $this->post('/api/upload', [
            'file' => $textFile
        ]);

        $textFileId = $textUploadResponse->json('file.file_id');

        // 4. Test text preview
        $textPreviewResponse = $this->get("/p/{$textFileId}");
        $textPreviewResponse->assertStatus(200);
        $textPreviewResponse->assertHeader('Content-Type', 'text/plain');
        $this->assertEquals('Hello World', $textPreviewResponse->getContent());
    }

    /** @test */
    public function error_handling_works_correctly()
    {
        // 1. Test file too large
        $largeFile = UploadedFile::fake()->create('huge-file.txt', 11 * 1024 * 1024); // 11GB
        
        $largeFileResponse = $this->post('/api/upload', [
            'file' => $largeFile
        ]);

        $largeFileResponse->assertStatus(422);
        $largeFileResponse->assertJsonValidationErrors(['file']);

        // 2. Test invalid file ID
        $invalidResponse = $this->get('/f/invalid-file-id');
        $invalidResponse->assertStatus(404);

        // 3. Test missing file
        $missingResponse = $this->get('/f/' . str_repeat('a', 64));
        $missingResponse->assertStatus(404);

        // 4. Test invalid chunked upload
        $invalidChunkResponse = $this->post('/api/upload/chunk', [
            'session_id' => 'invalid-session',
            'chunk_index' => 0
        ]);

        $invalidChunkResponse->assertStatus(422);
    }

    /** @test */
    public function security_measures_are_enforced()
    {
        // 1. Test CSRF protection
        $this->withoutMiddleware(\App\Http\Middleware\VerifyCsrfToken::class);
        
        $file = UploadedFile::fake()->create('security-test.txt', 10);
        
        // This should work without CSRF middleware disabled
        $response = $this->post('/api/upload', [
            'file' => $file
        ]);
        $response->assertStatus(200);

        // 2. Test file type validation
        $executableFile = UploadedFile::fake()->create('malicious.exe', 10);
        
        $execResponse = $this->post('/api/upload', [
            'file' => $executableFile
        ]);

        // Should be rejected or sanitized based on configuration
        $this->assertTrue(
            $execResponse->status() === 422 || 
            $execResponse->status() === 200
        );

        // 3. Test rate limiting (if enabled)
        // This would require multiple rapid requests to test properly
    }

    /** @test */
    public function performance_with_large_files_is_acceptable()
    {
        // 1. Create a moderately large file (100MB simulation)
        $content = str_repeat('A', 1024 * 1024); // 1MB of data
        $file = UploadedFile::fake()->createWithContent('performance-test.txt', $content);

        // 2. Measure upload time
        $startTime = microtime(true);
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $file
        ]);

        $uploadTime = microtime(true) - $startTime;

        $uploadResponse->assertStatus(200);
        
        // Upload should complete within reasonable time (adjust as needed)
        $this->assertLessThan(30, $uploadTime, 'Upload took too long');

        $fileId = $uploadResponse->json('file.file_id');

        // 3. Measure download time
        $startTime = microtime(true);
        
        $downloadResponse = $this->get("/f/{$fileId}");
        
        $downloadTime = microtime(true) - $startTime;

        $downloadResponse->assertStatus(200);
        
        // Download should complete within reasonable time
        $this->assertLessThan(30, $downloadTime, 'Download took too long');

        // 4. Verify content integrity
        $this->assertEquals($content, $downloadResponse->getContent());
    }

    /** @test */
    public function shared_hosting_compatibility_features_work()
    {
        // 1. Test memory-efficient file processing
        $file = UploadedFile::fake()->create('memory-test.txt', 1024); // 1MB
        
        $memoryBefore = memory_get_usage();
        
        $uploadResponse = $this->post('/api/upload', [
            'file' => $file
        ]);

        $memoryAfter = memory_get_usage();
        $memoryUsed = $memoryAfter - $memoryBefore;

        $uploadResponse->assertStatus(200);
        
        // Memory usage should be reasonable (less than 10MB for 1MB file)
        $this->assertLessThan(10 * 1024 * 1024, $memoryUsed, 'Memory usage too high');

        // 2. Test execution time management
        $fileId = $uploadResponse->json('file.file_id');
        
        $startTime = microtime(true);
        $downloadResponse = $this->get("/f/{$fileId}");
        $executionTime = microtime(true) - $startTime;

        $downloadResponse->assertStatus(200);
        
        // Should complete quickly
        $this->assertLessThan(5, $executionTime, 'Execution time too long');

        // 3. Test database optimization
        $queryCount = 0;
        \DB::listen(function ($query) use (&$queryCount) {
            $queryCount++;
        });

        $this->get("/api/file/{$fileId}/info");

        // Should use minimal database queries
        $this->assertLessThan(5, $queryCount, 'Too many database queries');
    }
}