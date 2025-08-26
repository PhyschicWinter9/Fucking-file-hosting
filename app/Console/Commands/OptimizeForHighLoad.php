<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ChunkedUploadService;
use App\Models\UploadSession;
use App\Models\File;

class OptimizeForHighLoad extends Command
{
    protected $signature = 'filehosting:optimize 
                            {--aggressive : Use aggressive optimization}
                            {--dry-run : Show what would be done without executing}';
    
    protected $description = 'Optimize file hosting for high user load';

    public function handle()
    {
        $isDryRun = $this->option('dry-run');
        $isAggressive = $this->option('aggressive');
        
        $this->info('=== File Hosting High Load Optimization ===');
        
        if ($isDryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }
        
        // Step 1: Clean up expired sessions
        $this->optimizeUploadSessions($isDryRun);
        
        // Step 2: Clean up expired files
        $this->optimizeFileStorage($isDryRun, $isAggressive);
        
        // Step 3: Optimize database
        $this->optimizeDatabase($isDryRun);
        
        // Step 4: Memory optimization
        $this->optimizeMemoryUsage();
        
        // Step 5: Generate optimization report
        $this->generateOptimizationReport();
        
        $this->info("\n✓ Optimization complete!");
    }
    
    private function optimizeUploadSessions(bool $isDryRun): void
    {
        $this->info("\n--- Optimizing Upload Sessions ---");
        
        $expiredSessions = UploadSession::expired()->get();
        $stuckSessions = UploadSession::where('updated_at', '<', now()->subHours(6))
                                    ->where('expires_at', '>', now())
                                    ->get();
        
        $this->line("Found {$expiredSessions->count()} expired sessions");
        $this->line("Found {$stuckSessions->count()} stuck sessions (inactive > 6h)");
        
        if (!$isDryRun) {
            $chunkedService = app(ChunkedUploadService::class);
            
            // Clean expired sessions
            $cleanedExpired = $chunkedService->cleanupExpiredSessions();
            $this->line("✓ Cleaned {$cleanedExpired} expired sessions");
            
            // Clean stuck sessions
            $cleanedStuck = 0;
            foreach ($stuckSessions as $session) {
                $chunkedService->cleanupSession($session->session_id);
                $cleanedStuck++;
            }
            $this->line("✓ Cleaned {$cleanedStuck} stuck sessions");
        }
    }
    
    private function optimizeFileStorage(bool $isDryRun, bool $isAggressive): void
    {
        $this->info("\n--- Optimizing File Storage ---");
        
        // Find expired files
        $expiredFiles = File::expired()->get();
        $this->line("Found {$expiredFiles->count()} expired files");
        
        // Find large old files if aggressive mode
        $oldLargeFiles = collect();
        if ($isAggressive) {
            $oldLargeFiles = File::where('created_at', '<', now()->subDays(7))
                                ->where('file_size', '>', 104857600) // > 100MB
                                ->notExpired()
                                ->get();
            $this->line("Found {$oldLargeFiles->count()} large files older than 7 days");
        }
        
        if (!$isDryRun) {
            $deletedCount = 0;
            $freedSpace = 0;
            
            // Delete expired files
            foreach ($expiredFiles as $file) {
                try {
                    $freedSpace += $file->file_size;
                    $file->delete();
                    $deletedCount++;
                } catch (\Exception $e) {
                    $this->warn("Failed to delete expired file {$file->file_id}: {$e->getMessage()}");
                }
            }
            
            // Delete old large files in aggressive mode
            if ($isAggressive) {
                foreach ($oldLargeFiles as $file) {
                    try {
                        $freedSpace += $file->file_size;
                        $file->delete();
                        $deletedCount++;
                    } catch (\Exception $e) {
                        $this->warn("Failed to delete large file {$file->file_id}: {$e->getMessage()}");
                    }
                }
            }
            
            $this->line("✓ Deleted {$deletedCount} files, freed " . $this->formatBytes($freedSpace));
        }
    }
    
    private function optimizeDatabase(bool $isDryRun): void
    {
        $this->info("\n--- Optimizing Database ---");
        
        if (!$isDryRun) {
            try {
                // Optimize tables (MySQL/MariaDB)
                if (config('database.default') === 'mysql') {
                    \DB::statement('OPTIMIZE TABLE files');
                    \DB::statement('OPTIMIZE TABLE upload_sessions');
                    $this->line("✓ Optimized database tables");
                }
                
                // Clear query cache
                \DB::statement('RESET QUERY CACHE');
                $this->line("✓ Cleared query cache");
                
            } catch (\Exception $e) {
                $this->warn("Database optimization failed: {$e->getMessage()}");
            }
        } else {
            $this->line("Would optimize database tables and clear query cache");
        }
    }
    
    private function optimizeMemoryUsage(): void
    {
        $this->info("\n--- Optimizing Memory Usage ---");
        
        // Clear opcode cache
        if (function_exists('opcache_reset')) {
            opcache_reset();
            $this->line("✓ Cleared opcode cache");
        }
        
        // Force garbage collection
        $beforeMemory = memory_get_usage(true);
        gc_collect_cycles();
        $afterMemory = memory_get_usage(true);
        $freed = $beforeMemory - $afterMemory;
        
        $this->line("✓ Garbage collection freed " . $this->formatBytes($freed));
        
        // Clear Laravel caches
        \Artisan::call('cache:clear');
        \Artisan::call('config:clear');
        \Artisan::call('route:clear');
        \Artisan::call('view:clear');
        
        $this->line("✓ Cleared Laravel caches");
    }
    
    private function generateOptimizationReport(): void
    {
        $this->info("\n--- Optimization Report ---");
        
        $chunkedService = app(ChunkedUploadService::class);
        $loadMetrics = $chunkedService->getServerLoadMetrics();
        
        // Current status
        $this->line("Server Load: {$loadMetrics['server_load']}/100");
        $this->line("Memory Usage: {$loadMetrics['memory_usage_percent']}%");
        $this->line("Disk Usage: {$loadMetrics['disk_usage_percent']}%");
        $this->line("Active Sessions: {$loadMetrics['active_sessions']}");
        
        // File statistics
        $totalFiles = File::count();
        $totalSize = File::sum('file_size');
        $this->line("Total Files: " . number_format($totalFiles));
        $this->line("Total Size: " . $this->formatBytes($totalSize));
        
        // Recommendations for your hosting specs
        $this->info("\n--- Recommendations for Your Hosting ---");
        
        if ($totalFiles > 550000) { // 90% of your 600k limit
            $this->warn("⚠ File count approaching hosting limit (600k). Implement aggressive cleanup.");
        }
        
        if ($loadMetrics['disk_usage_percent'] > 80) {
            $this->warn("⚠ Disk usage high. Consider upgrading storage or implementing file compression.");
        }
        
        if ($loadMetrics['memory_usage_percent'] > 70) {
            $this->warn("⚠ Memory usage high. Consider reducing chunk size or limiting concurrent uploads.");
        }
        
        // Optimal settings for your specs
        $this->line("\nOptimal Settings:");
        $this->line("• Chunk Size: " . $this->formatBytes($loadMetrics['recommended_chunk_size']));
        $this->line("• Max Concurrent Uploads: " . $this->getOptimalConcurrentUploads($loadMetrics));
        $this->line("• Cleanup Frequency: Every " . $this->getOptimalCleanupHours($loadMetrics) . " hours");
        $this->line("• File Retention: " . $this->getOptimalRetentionDays($totalFiles) . " days");
    }
    
    private function getOptimalConcurrentUploads(array $metrics): int
    {
        // Based on your 4GB memory and current load
        if ($metrics['memory_usage_percent'] > 80) return 2;
        if ($metrics['memory_usage_percent'] > 60) return 5;
        if ($metrics['server_load'] > 70) return 8;
        return 12; // Conservative for shared hosting
    }
    
    private function getOptimalCleanupHours(array $metrics): int
    {
        if ($metrics['disk_usage_percent'] > 85) return 2;
        if ($metrics['disk_usage_percent'] > 70) return 4;
        return 6;
    }
    
    private function getOptimalRetentionDays(int $fileCount): int
    {
        // Adjust retention based on file count approaching limits
        if ($fileCount > 550000) return 1; // Very aggressive
        if ($fileCount > 450000) return 3; // Aggressive
        if ($fileCount > 300000) return 7; // Moderate
        return 30; // Default
    }
    
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        
        $bytes /= pow(1024, $pow);
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}