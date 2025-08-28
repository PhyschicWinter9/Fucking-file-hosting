<?php

namespace App\Console\Commands;

use App\Models\File;
use App\Models\UploadSession;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class CleanupTempFiles extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'upload:cleanup-temp 
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--force : Force cleanup without confirmation}
                            {--chunks : Only clean up temporary chunks}
                            {--failed : Only clean up failed uploads}
                            {--orphaned : Only clean up orphaned files}
                            {--empty-dirs : Only clean up empty directories}';

    /**
     * The console command description.
     */
    protected $description = 'Clean up temporary chunks, failed uploads, and orphaned files';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting temporary files cleanup...');

        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        
        $cleanupStats = [
            'temp_chunks' => 0,
            'failed_uploads' => 0,
            'orphaned_files' => 0,
            'empty_directories' => 0,
            'bytes_freed' => 0,
        ];

        try {
            // Clean up temporary chunks
            if (!$this->option('failed') && !$this->option('orphaned') && !$this->option('empty-dirs')) {
                $cleanupStats = array_merge($cleanupStats, $this->cleanupTempChunks($dryRun, $force));
            }

            // Clean up failed uploads
            if (!$this->option('chunks') && !$this->option('orphaned') && !$this->option('empty-dirs')) {
                $cleanupStats = array_merge($cleanupStats, $this->cleanupFailedUploads($dryRun, $force));
            }

            // Clean up orphaned files
            if (!$this->option('chunks') && !$this->option('failed') && !$this->option('empty-dirs')) {
                $cleanupStats = array_merge($cleanupStats, $this->cleanupOrphanedFiles($dryRun, $force));
            }

            // Clean up empty directories
            if (!$this->option('chunks') && !$this->option('failed') && !$this->option('orphaned')) {
                $cleanupStats = array_merge($cleanupStats, $this->cleanupEmptyDirectories($dryRun, $force));
            }

            // Display summary
            $this->displayCleanupSummary($cleanupStats, $dryRun);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Cleanup failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Clean up temporary chunks from expired or stale sessions.
     */
    private function cleanupTempChunks(bool $dryRun, bool $force): array
    {
        if (!config('filehosting.cleanup_temp_chunks_enabled', true)) {
            $this->info('Temporary chunks cleanup is disabled.');
            return ['temp_chunks' => 0, 'bytes_freed' => 0];
        }

        $this->info('Cleaning up temporary chunks...');
        
        $ageHours = config('filehosting.cleanup_temp_chunks_age_hours', 24);
        $cutoffTime = Carbon::now()->subHours($ageHours);
        
        $cleanedCount = 0;
        $bytesFreed = 0;

        // Get all chunk directories
        $chunkDirectories = Storage::disk('local')->directories('chunks');
        
        foreach ($chunkDirectories as $chunkDir) {
            $sessionId = basename($chunkDir);
            
            // Check if session exists and is not expired
            $session = UploadSession::where('session_id', $sessionId)->first();
            
            $shouldCleanup = false;
            $reason = '';
            
            if (!$session) {
                $shouldCleanup = true;
                $reason = 'No session record found';
            } elseif ($session->expires_at && $session->expires_at->lt($cutoffTime)) {
                $shouldCleanup = true;
                $reason = 'Session expired';
            } elseif ($session->created_at->lt($cutoffTime) && !$session->updated_at->gt($cutoffTime)) {
                $shouldCleanup = true;
                $reason = 'Session inactive for too long';
            }
            
            if ($shouldCleanup) {
                $chunkFiles = Storage::disk('local')->files($chunkDir);
                $dirSize = 0;
                
                foreach ($chunkFiles as $chunkFile) {
                    $dirSize += Storage::disk('local')->size($chunkFile);
                }
                
                if ($dryRun) {
                    $this->line("Would delete: {$chunkDir} ({$reason}) - " . $this->formatBytes($dirSize));
                } else {
                    if (!$force) {
                        if (!$this->confirm("Delete chunk directory {$sessionId}? ({$reason})")) {
                            continue;
                        }
                    }
                    
                    Storage::disk('local')->deleteDirectory($chunkDir);
                    $cleanedCount++;
                    $bytesFreed += $dirSize;
                    
                    // Also clean up the session record if it exists
                    if ($session) {
                        $session->delete();
                    }
                }
            }
        }

        if (!$dryRun && $cleanedCount > 0) {
            $this->info("Cleaned up {$cleanedCount} temporary chunk directories.");
        }

        return ['temp_chunks' => $cleanedCount, 'bytes_freed' => $bytesFreed];
    }

    /**
     * Clean up failed upload sessions and their chunks.
     */
    private function cleanupFailedUploads(bool $dryRun, bool $force): array
    {
        if (!config('filehosting.cleanup_failed_uploads_enabled', true)) {
            $this->info('Failed uploads cleanup is disabled.');
            return ['failed_uploads' => 0];
        }

        $this->info('Cleaning up failed uploads...');
        
        $ageHours = config('filehosting.cleanup_failed_uploads_age_hours', 72);
        $cutoffTime = Carbon::now()->subHours($ageHours);
        
        // Find sessions that haven't been updated in a while and aren't complete
        $failedSessions = UploadSession::where('updated_at', '<', $cutoffTime)
            ->get()
            ->filter(function ($session) {
                $totalChunks = ceil($session->total_size / $session->chunk_size);
                $uploadedChunks = count($session->uploaded_chunks ?? []);
                return $uploadedChunks < $totalChunks;
            });
        
        $cleanedCount = 0;
        $bytesFreed = 0;

        foreach ($failedSessions as $session) {
            $chunkDir = "chunks/{$session->session_id}";
            $dirSize = 0;
            
            if (Storage::disk('local')->exists($chunkDir)) {
                $chunkFiles = Storage::disk('local')->files($chunkDir);
                foreach ($chunkFiles as $chunkFile) {
                    $dirSize += Storage::disk('local')->size($chunkFile);
                }
            }
            
            if ($dryRun) {
                $this->line("Would delete failed upload: {$session->session_id} - " . $this->formatBytes($dirSize));
            } else {
                if (!$force) {
                    if (!$this->confirm("Delete failed upload session {$session->session_id}?")) {
                        continue;
                    }
                }
                
                // Delete chunks
                if (Storage::disk('local')->exists($chunkDir)) {
                    Storage::disk('local')->deleteDirectory($chunkDir);
                }
                
                // Delete session
                $session->delete();
                
                $cleanedCount++;
                $bytesFreed += $dirSize;
            }
        }

        if (!$dryRun && $cleanedCount > 0) {
            $this->info("Cleaned up {$cleanedCount} failed upload sessions.");
        }

        return ['failed_uploads' => $cleanedCount, 'bytes_freed' => $bytesFreed];
    }

    /**
     * Clean up orphaned files (files on disk without database records).
     */
    private function cleanupOrphanedFiles(bool $dryRun, bool $force): array
    {
        if (!config('filehosting.cleanup_orphaned_files_enabled', true)) {
            $this->info('Orphaned files cleanup is disabled.');
            return ['orphaned_files' => 0];
        }

        $this->info('Cleaning up orphaned files...');
        
        $cleanedCount = 0;
        $bytesFreed = 0;
        
        // Get all files in the files directory
        $allFiles = Storage::disk('public')->allFiles('files');
        
        foreach ($allFiles as $filePath) {
            // Extract file ID from path (assuming structure: files/xx/xx/filename)
            $pathParts = explode('/', $filePath);
            if (count($pathParts) >= 4) {
                $filename = end($pathParts);
                $fileId = pathinfo($filename, PATHINFO_FILENAME);
                
                // Check if file record exists in database
                $fileRecord = File::where('file_id', $fileId)->first();
                
                if (!$fileRecord) {
                    $fileSize = Storage::disk('public')->size($filePath);
                    
                    if ($dryRun) {
                        $this->line("Would delete orphaned file: {$filePath} - " . $this->formatBytes($fileSize));
                    } else {
                        if (!$force) {
                            if (!$this->confirm("Delete orphaned file {$filename}?")) {
                                continue;
                            }
                        }
                        
                        Storage::disk('public')->delete($filePath);
                        $cleanedCount++;
                        $bytesFreed += $fileSize;
                    }
                }
            }
        }

        if (!$dryRun && $cleanedCount > 0) {
            $this->info("Cleaned up {$cleanedCount} orphaned files.");
        }

        return ['orphaned_files' => $cleanedCount, 'bytes_freed' => $bytesFreed];
    }

    /**
     * Clean up empty directories in the files storage.
     */
    private function cleanupEmptyDirectories(bool $dryRun, bool $force): array
    {
        if (!config('filehosting.cleanup_empty_directories_enabled', true)) {
            $this->info('Empty directories cleanup is disabled.');
            return ['empty_directories' => 0];
        }

        $this->info('Cleaning up empty directories...');
        
        $cleanedCount = 0;
        
        // Get all directories in files storage
        $allDirectories = Storage::disk('public')->allDirectories('files');
        
        // Sort by depth (deepest first) to clean up nested empty directories
        usort($allDirectories, function($a, $b) {
            return substr_count($b, '/') - substr_count($a, '/');
        });
        
        foreach ($allDirectories as $directory) {
            $files = Storage::disk('public')->files($directory);
            $subdirectories = Storage::disk('public')->directories($directory);
            
            if (empty($files) && empty($subdirectories)) {
                if ($dryRun) {
                    $this->line("Would delete empty directory: {$directory}");
                } else {
                    if (!$force) {
                        if (!$this->confirm("Delete empty directory {$directory}?")) {
                            continue;
                        }
                    }
                    
                    Storage::disk('public')->deleteDirectory($directory);
                    $cleanedCount++;
                }
            }
        }

        if (!$dryRun && $cleanedCount > 0) {
            $this->info("Cleaned up {$cleanedCount} empty directories.");
        }

        return ['empty_directories' => $cleanedCount];
    }

    /**
     * Display cleanup summary.
     */
    private function displayCleanupSummary(array $stats, bool $dryRun): void
    {
        $this->newLine();
        $this->info($dryRun ? 'Cleanup Summary (DRY RUN):' : 'Cleanup Summary:');
        $this->info("- Temporary chunks: {$stats['temp_chunks']}");
        $this->info("- Failed uploads: {$stats['failed_uploads']}");
        $this->info("- Orphaned files: {$stats['orphaned_files']}");
        $this->info("- Empty directories: {$stats['empty_directories']}");
        
        if (isset($stats['bytes_freed']) && $stats['bytes_freed'] > 0) {
            $this->info("- Storage freed: " . $this->formatBytes($stats['bytes_freed']));
        }
    }

    /**
     * Format bytes to human readable format.
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }
}