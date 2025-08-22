<?php

namespace Tests\Unit\Services;

use App\Models\File;
use App\Services\FileService;
use App\Services\PerformanceOptimizer;
use App\Services\SecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Mockery;

class FileServiceTest extends TestCase
{
    use RefreshDatabase;

    private FileService $fileService;
    private $mockOptimizer;
    private $mockSecurityService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Mock dependencies
        $this->mockOptimizer = Mockery::mock(PerformanceOptimizer::class);
        $this->mockSecurityService = Mockery::mock(SecurityService::class);
        
        // Bind mocks to container
        $this->app->instance(PerformanceOptimizer::class, $this->mockOptimizer);
        $this->app->instance(SecurityService::class, $this->mockSecurityService);
        
        $this->fileService = new FileService($this->mockOptimizer);
        
        // Set up storage fake
        Storage::fake('public');
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** @test */
    public function it_can_store_a_file_successfully()
    {
        // Arrange
        $uploadedFile = UploadedFile::fake()->create('test.txt', 100, 'text/plain');
        
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('isMemoryUsageHigh')->andReturn(false);
        
        $this->mockSecurityService->shouldReceive('generateSecureFileId')->andReturn('test_secure_id_123');
        $this->mockSecurityService->shouldReceive('secureFileStorage')->once();

        // Act
        $file = $this->fileService->store($uploadedFile);

        // Assert
        $this->assertInstanceOf(File::class, $file);
        $this->assertEquals('test_secure_id_123', $file->file_id);
        $this->assertEquals('test.txt', $file->original_name);
        $this->assertEquals('text/plain', $file->mime_type);
        $this->assertEquals(100, $file->file_size);
        $this->assertNotNull($file->checksum);
        $this->assertDatabaseHas('files', [
            'file_id' => 'test_secure_id_123',
            'original_name' => 'test.txt'
        ]);
    }

    /** @test */
    public function it_can_store_file_with_expiration()
    {
        // Arrange
        $uploadedFile = UploadedFile::fake()->create('test.txt', 100);
        $expirationDays = 7;
        
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('isMemoryUsageHigh')->andReturn(false);
        
        $this->mockSecurityService->shouldReceive('generateSecureFileId')->andReturn('test_secure_id_456');
        $this->mockSecurityService->shouldReceive('secureFileStorage')->once();

        // Act
        $file = $this->fileService->store($uploadedFile, $expirationDays);

        // Assert
        $this->assertNotNull($file->expires_at);
        $this->assertTrue($file->expires_at->isAfter(now()));
        $this->assertTrue($file->expires_at->isBefore(now()->addDays(8)));
    }

    /** @test */
    public function it_detects_and_returns_duplicate_files()
    {
        // Arrange
        $uploadedFile1 = UploadedFile::fake()->create('test.txt', 100, 'text/plain');
        $uploadedFile2 = UploadedFile::fake()->create('duplicate.txt', 100, 'text/plain');
        
        // Make files have same content by using same fake file
        $uploadedFile2 = UploadedFile::fake()->createWithContent('duplicate.txt', file_get_contents($uploadedFile1->getRealPath()));
        
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('file_store')->twice();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('file_store')->twice();
        $this->mockOptimizer->shouldReceive('isMemoryUsageHigh')->andReturn(false);
        
        $this->mockSecurityService->shouldReceive('generateSecureFileId')->andReturn('test_secure_id_789');
        $this->mockSecurityService->shouldReceive('secureFileStorage')->once();

        // Act
        $file1 = $this->fileService->store($uploadedFile1);
        $file2 = $this->fileService->store($uploadedFile2);

        // Assert
        $this->assertEquals($file1->file_id, $file2->file_id);
        $this->assertEquals($file1->checksum, $file2->checksum);
        $this->assertDatabaseCount('files', 1); // Only one file stored
    }

    /** @test */
    public function it_can_retrieve_existing_file()
    {
        // Arrange
        $file = File::factory()->create([
            'file_id' => 'test_retrieve_123',
            'expires_at' => null
        ]);
        
        // Create actual file in storage
        Storage::disk('public')->put($file->file_path, 'test content');

        // Act
        $retrievedFile = $this->fileService->retrieve('test_retrieve_123');

        // Assert
        $this->assertInstanceOf(File::class, $retrievedFile);
        $this->assertEquals($file->file_id, $retrievedFile->file_id);
    }

    /** @test */
    public function it_returns_null_for_non_existent_file()
    {
        // Act
        $retrievedFile = $this->fileService->retrieve('non_existent_id');

        // Assert
        $this->assertNull($retrievedFile);
    }

    /** @test */
    public function it_returns_null_and_cleans_up_expired_file()
    {
        // Arrange
        $file = File::factory()->create([
            'file_id' => 'expired_file_123',
            'expires_at' => now()->subDay()
        ]);
        
        Storage::disk('public')->put($file->file_path, 'test content');

        // Act
        $retrievedFile = $this->fileService->retrieve('expired_file_123');

        // Assert
        $this->assertNull($retrievedFile);
        $this->assertDatabaseMissing('files', ['file_id' => 'expired_file_123']);
        $this->assertFalse(Storage::disk('public')->exists($file->file_path));
    }

    /** @test */
    public function it_returns_null_and_cleans_up_file_missing_from_disk()
    {
        // Arrange
        $file = File::factory()->create([
            'file_id' => 'missing_file_123',
            'expires_at' => null
        ]);
        
        // Don't create the actual file in storage

        // Act
        $retrievedFile = $this->fileService->retrieve('missing_file_123');

        // Assert
        $this->assertNull($retrievedFile);
        $this->assertDatabaseMissing('files', ['file_id' => 'missing_file_123']);
    }

    /** @test */
    public function it_can_delete_existing_file()
    {
        // Arrange
        $file = File::factory()->create([
            'file_id' => 'delete_test_123'
        ]);
        
        Storage::disk('public')->put($file->file_path, 'test content');

        // Act
        $result = $this->fileService->delete('delete_test_123');

        // Assert
        $this->assertTrue($result);
        $this->assertDatabaseMissing('files', ['file_id' => 'delete_test_123']);
        $this->assertFalse(Storage::disk('public')->exists($file->file_path));
    }

    /** @test */
    public function it_returns_false_when_deleting_non_existent_file()
    {
        // Act
        $result = $this->fileService->delete('non_existent_id');

        // Assert
        $this->assertFalse($result);
    }

    /** @test */
    public function it_generates_unique_secure_id()
    {
        // Arrange
        $this->mockSecurityService->shouldReceive('generateSecureFileId')
            ->andReturn('existing_id', 'unique_id');

        // Create a file with the first ID to test uniqueness check
        File::factory()->create(['file_id' => 'existing_id']);

        // Act
        $secureId = $this->fileService->generateSecureId();

        // Assert
        $this->assertEquals('unique_id', $secureId);
    }

    /** @test */
    public function it_can_find_file_by_checksum()
    {
        // Arrange
        $file = File::factory()->create([
            'checksum' => 'test_checksum_123',
            'file_size' => 1000,
            'expires_at' => null
        ]);

        // Act
        $foundFile = $this->fileService->findByChecksum('test_checksum_123', 1000);

        // Assert
        $this->assertInstanceOf(File::class, $foundFile);
        $this->assertEquals($file->file_id, $foundFile->file_id);
    }

    /** @test */
    public function it_returns_null_when_checksum_not_found()
    {
        // Act
        $foundFile = $this->fileService->findByChecksum('non_existent_checksum', 1000);

        // Assert
        $this->assertNull($foundFile);
    }

    /** @test */
    public function it_can_get_duplicate_statistics()
    {
        // Arrange
        File::factory()->create(['checksum' => 'dup1', 'file_size' => 100]);
        File::factory()->create(['checksum' => 'dup1', 'file_size' => 100]);
        File::factory()->create(['checksum' => 'dup2', 'file_size' => 200]);
        File::factory()->create(['checksum' => 'dup2', 'file_size' => 200]);
        File::factory()->create(['checksum' => 'unique', 'file_size' => 300]);

        // Act
        $stats = $this->fileService->getDuplicateStats();

        // Assert
        $this->assertEquals(2, $stats['duplicate_groups']);
        $this->assertEquals(2, $stats['total_duplicate_files']);
        $this->assertEquals(300, $stats['space_saved_bytes']); // 100 + 200
        $this->assertArrayHasKey('space_saved_human', $stats);
    }

    /** @test */
    public function it_can_find_duplicates_of_a_file()
    {
        // Arrange
        $originalFile = File::factory()->create([
            'file_id' => 'original_123',
            'checksum' => 'same_checksum',
            'file_size' => 100
        ]);
        
        $duplicateFile = File::factory()->create([
            'file_id' => 'duplicate_456',
            'checksum' => 'same_checksum',
            'file_size' => 100
        ]);

        // Act
        $duplicates = $this->fileService->findDuplicates('original_123');

        // Assert
        $this->assertCount(1, $duplicates);
        $this->assertEquals('duplicate_456', $duplicates[0]['file_id']);
    }

    /** @test */
    public function it_can_check_for_duplicate_upload()
    {
        // Arrange
        $existingFile = File::factory()->create([
            'checksum' => hash('sha256', 'test content'),
            'file_size' => 12,
            'expires_at' => null
        ]);
        
        $uploadedFile = UploadedFile::fake()->createWithContent('test.txt', 'test content');

        // Act
        $result = $this->fileService->checkForDuplicate($uploadedFile);

        // Assert
        $this->assertTrue($result['is_duplicate']);
        $this->assertEquals($existingFile->file_id, $result['existing_file']['file_id']);
        $this->assertEquals(12, $result['space_saved']);
    }

    /** @test */
    public function it_returns_no_duplicate_for_unique_file()
    {
        // Arrange
        $uploadedFile = UploadedFile::fake()->create('unique.txt', 100);

        // Act
        $result = $this->fileService->checkForDuplicate($uploadedFile);

        // Assert
        $this->assertFalse($result['is_duplicate']);
    }

    /** @test */
    public function it_can_cleanup_expired_files()
    {
        // Arrange
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('file_cleanup')->once();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('file_cleanup')->once();
        $this->mockOptimizer->shouldReceive('isMemoryUsageHigh')->andReturn(false);
        $this->mockOptimizer->shouldReceive('isExecutionTimeHigh')->andReturn(false);
        
        $expiredFile1 = File::factory()->create(['expires_at' => now()->subDay()]);
        $expiredFile2 = File::factory()->create(['expires_at' => now()->subHour()]);
        $activeFile = File::factory()->create(['expires_at' => now()->addDay()]);
        
        Storage::disk('public')->put($expiredFile1->file_path, 'content1');
        Storage::disk('public')->put($expiredFile2->file_path, 'content2');
        Storage::disk('public')->put($activeFile->file_path, 'content3');

        // Act
        $cleanedCount = $this->fileService->cleanup();

        // Assert
        $this->assertEquals(2, $cleanedCount);
        $this->assertDatabaseMissing('files', ['file_id' => $expiredFile1->file_id]);
        $this->assertDatabaseMissing('files', ['file_id' => $expiredFile2->file_id]);
        $this->assertDatabaseHas('files', ['file_id' => $activeFile->file_id]);
    }

    /** @test */
    public function it_can_get_storage_statistics()
    {
        // Arrange
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('storage_stats')->once();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('storage_stats')->once();
        
        File::factory()->create(['file_size' => 100, 'expires_at' => null]);
        File::factory()->create(['file_size' => 200, 'expires_at' => now()->addDay()]);
        File::factory()->create(['file_size' => 300, 'expires_at' => now()->subDay()]);

        // Act
        $stats = $this->fileService->getStorageStats();

        // Assert
        $this->assertEquals(3, $stats['total_files']);
        $this->assertEquals(600, $stats['total_size']);
        $this->assertEquals(1, $stats['expired_files']);
        $this->assertEquals(2, $stats['active_files']);
        $this->assertArrayHasKey('total_size_human', $stats);
    }

    /** @test */
    public function it_handles_large_file_memory_optimization()
    {
        // Arrange
        $largeFile = UploadedFile::fake()->create('large.txt', 150 * 1024); // 150MB
        
        $this->mockOptimizer->shouldReceive('startMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('endMonitoring')->with('file_store')->once();
        $this->mockOptimizer->shouldReceive('isMemoryUsageHigh')->andReturn(true);
        $this->mockOptimizer->shouldReceive('optimizeMemory')->once();
        $this->mockOptimizer->shouldReceive('processFileInChunks')->once();
        
        $this->mockSecurityService->shouldReceive('generateSecureFileId')->andReturn('large_file_id');
        $this->mockSecurityService->shouldReceive('secureFileStorage')->once();

        // Act
        $file = $this->fileService->store($largeFile);

        // Assert
        $this->assertInstanceOf(File::class, $file);
        $this->assertEquals('large_file_id', $file->file_id);
    }
}