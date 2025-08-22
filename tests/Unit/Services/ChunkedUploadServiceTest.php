<?php

namespace Tests\Unit\Services;

use App\Models\File;
use App\Models\UploadSession;
use App\Services\ChunkedUploadService;
use App\Services\FileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Mockery;

class ChunkedUploadServiceTest extends TestCase
{
    use RefreshDatabase;

    private ChunkedUploadService $chunkedUploadService;
    private $mockFileService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock FileService
        $this->mockFileService = Mockery::mock(FileService::class);
        $this->app->instance(FileService::class, $this->mockFileService);
        
        $this->chunkedUploadService = new ChunkedUploadService($this->mockFileService);
        
        // Set up storage fake
        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_can_initialize_upload_session()
    {
        // Arrange
        $originalName = 'large_file.zip';
        $totalSize = 10485760; // 10MB
        $chunkSize = 1048576;  // 1MB

        // Act
        $session = $this->chunkedUploadService->initializeSession($originalName, $totalSize, $chunkSize);

        // Assert
        $this->assertInstanceOf(UploadSession::class, $session);
        $this->assertEquals($originalName, $session->original_name);
        $this->assertEquals($totalSize, $session->total_size);
        $this->assertEquals($chunkSize, $session->chunk_size);
        $this->assertStringStartsWith('upload_', $session->session_id);
        $this->assertNotNull($session->expires_at);
        $this->assertTrue($session->expires_at->isAfter(now()));
        $this->assertDatabaseHas('upload_sessions', [
            'session_id' => $session->session_id,
            'original_name' => $originalName
        ]);
    }

    /** @test */
    public function it_can_upload_chunk_successfully()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'test_session_123',
            'total_size' => 2097152, // 2MB
            'chunk_size' => 1048576,  // 1MB
            'uploaded_chunks' => [],
            'expires_at' => now()->addHours(24)
        ]);

        $chunkFile = UploadedFile::fake()->create('chunk_0', 1024); // 1MB chunk

        // Act
        $result = $this->chunkedUploadService->uploadChunk('test_session_123', 0, $chunkFile);

        // Assert
        $this->assertTrue($result['uploaded']);
        $this->assertEquals(0, $result['chunk_index']);
        $this->assertEquals(50.0, $result['progress']); // 1 of 2 chunks
        $this->assertFalse($result['is_complete']);
        $this->assertEquals(1, $result['next_chunk']);
        $this->assertEquals([1], $result['missing_chunks']);
        
        // Verify chunk is stored
        $this->assertTrue(Storage::disk('local')->exists("chunks/test_session_123/chunk_0"));
        
        // Verify session is updated
        $session->refresh();
        $this->assertEquals([0], $session->uploaded_chunks);
    }

    /** @test */
    public function it_throws_exception_for_non_existent_session()
    {
        // Arrange
        $chunkFile = UploadedFile::fake()->create('chunk_0', 1024);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Upload session not found');
        
        $this->chunkedUploadService->uploadChunk('non_existent_session', 0, $chunkFile);
    }

    /** @test */
    public function it_throws_exception_for_expired_session()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'expired_session_123',
            'expires_at' => now()->subHour()
        ]);

        $chunkFile = UploadedFile::fake()->create('chunk_0', 1024);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Upload session has expired');
        
        $this->chunkedUploadService->uploadChunk('expired_session_123', 0, $chunkFile);
        
        // Verify session is cleaned up
        $this->assertDatabaseMissing('upload_sessions', ['session_id' => 'expired_session_123']);
    }

    /** @test */
    public function it_validates_chunk_index()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'test_session_456',
            'total_size' => 1048576, // 1MB (1 chunk)
            'chunk_size' => 1048576,
            'expires_at' => now()->addHours(24)
        ]);

        $chunkFile = UploadedFile::fake()->create('chunk_invalid', 1024);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid chunk index: 5. Expected 0 to 0');
        
        $this->chunkedUploadService->uploadChunk('test_session_456', 5, $chunkFile);
    }

    /** @test */
    public function it_validates_chunk_size()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'test_session_789',
            'total_size' => 2097152, // 2MB
            'chunk_size' => 1048576,  // 1MB
            'expires_at' => now()->addHours(24)
        ]);

        $wrongSizeChunk = UploadedFile::fake()->create('chunk_0', 512); // 512KB instead of 1MB

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Invalid chunk size');
        
        $this->chunkedUploadService->uploadChunk('test_session_789', 0, $wrongSizeChunk);
    }

    /** @test */
    public function it_prevents_duplicate_chunk_upload()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'test_session_duplicate',
            'total_size' => 2097152,
            'chunk_size' => 1048576,
            'uploaded_chunks' => [0], // Chunk 0 already uploaded
            'expires_at' => now()->addHours(24)
        ]);

        $chunkFile = UploadedFile::fake()->create('chunk_0', 1024);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Chunk 0 already uploaded');
        
        $this->chunkedUploadService->uploadChunk('test_session_duplicate', 0, $chunkFile);
    }

    /** @test */
    public function it_can_finalize_complete_upload()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'complete_session_123',
            'original_name' => 'complete_file.txt',
            'total_size' => 2097152,
            'chunk_size' => 1048576,
            'uploaded_chunks' => [0, 1], // All chunks uploaded
            'expires_at' => now()->addHours(24)
        ]);

        // Create chunk files
        Storage::disk('local')->put('chunks/complete_session_123/chunk_0', str_repeat('A', 1048576));
        Storage::disk('local')->put('chunks/complete_session_123/chunk_1', str_repeat('B', 1048576));

        $mockFile = Mockery::mock(File::class);
        $this->mockFileService->shouldReceive('store')
            ->once()
            ->with(Mockery::type(UploadedFile::class), null)
            ->andReturn($mockFile);

        // Act
        $result = $this->chunkedUploadService->finalizeUpload('complete_session_123');

        // Assert
        $this->assertEquals($mockFile, $result);
        
        // Verify cleanup
        $this->assertDatabaseMissing('upload_sessions', ['session_id' => 'complete_session_123']);
        $this->assertFalse(Storage::disk('local')->exists('chunks/complete_session_123'));
    }

    /** @test */
    public function it_throws_exception_when_finalizing_incomplete_upload()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'incomplete_session_123',
            'total_size' => 2097152,
            'chunk_size' => 1048576,
            'uploaded_chunks' => [0], // Missing chunk 1
            'expires_at' => now()->addHours(24)
        ]);

        // Act & Assert
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Upload session is not complete. Missing chunks: 1');
        
        $this->chunkedUploadService->finalizeUpload('incomplete_session_123');
    }

    /** @test */
    public function it_can_resume_upload_session()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'resume_session_123',
            'original_name' => 'resume_file.txt',
            'total_size' => 3145728, // 3MB
            'chunk_size' => 1048576,  // 1MB
            'uploaded_chunks' => [0, 2], // Missing chunk 1
            'expires_at' => now()->addHours(24)
        ]);

        // Act
        $result = $this->chunkedUploadService->resumeUpload('resume_session_123');

        // Assert
        $this->assertEquals('resume_session_123', $result['session_id']);
        $this->assertEquals('resume_file.txt', $result['original_name']);
        $this->assertEquals(3145728, $result['total_size']);
        $this->assertEquals(1048576, $result['chunk_size']);
        $this->assertEquals(66.67, round($result['progress'], 2)); // 2 of 3 chunks
        $this->assertFalse($result['is_complete']);
        $this->assertEquals(1, $result['next_chunk']);
        $this->assertEquals([1], $result['missing_chunks']);
        $this->assertEquals([0, 2], $result['uploaded_chunks']);
    }

    /** @test */
    public function it_can_cleanup_session_and_chunks()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'cleanup_session_123'
        ]);

        // Create some chunk files
        Storage::disk('local')->put('chunks/cleanup_session_123/chunk_0', 'data');
        Storage::disk('local')->put('chunks/cleanup_session_123/chunk_1', 'data');

        // Act
        $this->chunkedUploadService->cleanupSession('cleanup_session_123');

        // Assert
        $this->assertDatabaseMissing('upload_sessions', ['session_id' => 'cleanup_session_123']);
        $this->assertFalse(Storage::disk('local')->exists('chunks/cleanup_session_123'));
    }

    /** @test */
    public function it_can_cleanup_expired_sessions()
    {
        // Arrange
        $expiredSession1 = UploadSession::factory()->create([
            'session_id' => 'expired_1',
            'expires_at' => now()->subHour()
        ]);
        
        $expiredSession2 = UploadSession::factory()->create([
            'session_id' => 'expired_2',
            'expires_at' => now()->subDay()
        ]);
        
        $activeSession = UploadSession::factory()->create([
            'session_id' => 'active_1',
            'expires_at' => now()->addHour()
        ]);

        // Create chunk files for expired sessions
        Storage::disk('local')->put('chunks/expired_1/chunk_0', 'data');
        Storage::disk('local')->put('chunks/expired_2/chunk_0', 'data');
        Storage::disk('local')->put('chunks/active_1/chunk_0', 'data');

        // Act
        $cleanedCount = $this->chunkedUploadService->cleanupExpiredSessions();

        // Assert
        $this->assertEquals(2, $cleanedCount);
        $this->assertDatabaseMissing('upload_sessions', ['session_id' => 'expired_1']);
        $this->assertDatabaseMissing('upload_sessions', ['session_id' => 'expired_2']);
        $this->assertDatabaseHas('upload_sessions', ['session_id' => 'active_1']);
        
        // Verify chunk cleanup
        $this->assertFalse(Storage::disk('local')->exists('chunks/expired_1'));
        $this->assertFalse(Storage::disk('local')->exists('chunks/expired_2'));
        $this->assertTrue(Storage::disk('local')->exists('chunks/active_1/chunk_0'));
    }

    /** @test */
    public function it_can_get_session_statistics()
    {
        // Arrange
        UploadSession::factory()->create(['expires_at' => now()->addHour()]);
        UploadSession::factory()->create(['expires_at' => now()->addDay()]);
        UploadSession::factory()->create(['expires_at' => now()->subHour()]);
        UploadSession::factory()->create(['expires_at' => now()->subDay()]);

        // Act
        $stats = $this->chunkedUploadService->getSessionStats();

        // Assert
        $this->assertEquals(2, $stats['active_sessions']);
        $this->assertEquals(2, $stats['expired_sessions']);
        $this->assertEquals(4, $stats['total_sessions']);
    }

    /** @test */
    public function it_determines_if_chunked_upload_is_required()
    {
        // Act & Assert
        $this->assertTrue(ChunkedUploadService::requiresChunkedUpload(200 * 1024 * 1024)); // 200MB
        $this->assertFalse(ChunkedUploadService::requiresChunkedUpload(50 * 1024 * 1024));  // 50MB
        
        // Test custom threshold
        $this->assertTrue(ChunkedUploadService::requiresChunkedUpload(60 * 1024 * 1024, 50 * 1024 * 1024));
        $this->assertFalse(ChunkedUploadService::requiresChunkedUpload(40 * 1024 * 1024, 50 * 1024 * 1024));
    }

    /** @test */
    public function it_calculates_optimal_chunk_size()
    {
        // Act & Assert
        
        // Small file (< 500MB) - 1MB chunks
        $this->assertEquals(1048576, ChunkedUploadService::calculateOptimalChunkSize(100 * 1024 * 1024));
        
        // Medium file (500MB - 1GB) - 2MB chunks
        $this->assertEquals(2097152, ChunkedUploadService::calculateOptimalChunkSize(700 * 1024 * 1024));
        
        // Large file (> 1GB) - 5MB chunks
        $this->assertEquals(5242880, ChunkedUploadService::calculateOptimalChunkSize(2 * 1024 * 1024 * 1024));
    }

    /** @test */
    public function it_handles_last_chunk_size_correctly()
    {
        // Arrange - File that doesn't divide evenly by chunk size
        $session = UploadSession::factory()->create([
            'session_id' => 'last_chunk_test',
            'total_size' => 2621440, // 2.5MB
            'chunk_size' => 1048576,  // 1MB chunks
            'uploaded_chunks' => [],
            'expires_at' => now()->addHours(24)
        ]);

        // Upload first chunk (full size)
        $chunk0 = UploadedFile::fake()->create('chunk_0', 1024); // 1MB
        $result0 = $this->chunkedUploadService->uploadChunk('last_chunk_test', 0, $chunk0);
        $this->assertTrue($result0['uploaded']);

        // Upload second chunk (full size)
        $chunk1 = UploadedFile::fake()->create('chunk_1', 1024); // 1MB
        $result1 = $this->chunkedUploadService->uploadChunk('last_chunk_test', 1, $chunk1);
        $this->assertTrue($result1['uploaded']);

        // Upload last chunk (partial size - 0.5MB)
        $chunk2 = UploadedFile::fake()->create('chunk_2', 512); // 0.5MB
        $result2 = $this->chunkedUploadService->uploadChunk('last_chunk_test', 2, $chunk2);
        
        // Assert
        $this->assertTrue($result2['uploaded']);
        $this->assertTrue($result2['is_complete']);
        $this->assertEquals(100.0, $result2['progress']);
    }

    /** @test */
    public function it_assembles_chunks_correctly()
    {
        // Arrange
        $session = UploadSession::factory()->create([
            'session_id' => 'assemble_test',
            'original_name' => 'assembled_file.txt',
            'total_size' => 20, // 20 bytes total
            'chunk_size' => 10,  // 10 bytes per chunk
            'uploaded_chunks' => [0, 1],
            'expires_at' => now()->addHours(24)
        ]);

        // Create chunk files with specific content
        Storage::disk('local')->put('chunks/assemble_test/chunk_0', '1234567890'); // 10 bytes
        Storage::disk('local')->put('chunks/assemble_test/chunk_1', 'abcdefghij'); // 10 bytes

        $this->mockFileService->shouldReceive('store')
            ->once()
            ->with(Mockery::on(function ($uploadedFile) {
                // Verify the assembled file has correct content
                $content = file_get_contents($uploadedFile->getRealPath());
                return $content === '1234567890abcdefghij' && $uploadedFile->getSize() === 20;
            }), null)
            ->andReturn(Mockery::mock(File::class));

        // Act
        $this->chunkedUploadService->finalizeUpload('assemble_test');

        // Assert - Mockery will verify the file content is correct
    }
}