<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ChunkedUploadService;
use App\Services\PerformanceOptimizer;
use App\Models\UploadSession;
use App\Models\File;

class MonitorPerformance extends Command
{
    protected $signature = 'filehosting:monitor {--cleanup : Clean up expired sessions}';
    protected $description = 'Monitor file hosting performance and resource usage';

    public function handle()
    {
        $chunkedService = app(ChunkedUploadService::class);
        $optimizer = app(PerformanceOptimizer::class);
        
        $this->info('=== File Hosting Performance Monitor ===');
        
        // Server load metrics
        $loadMetrics = $chunkedService->getServerLoadMetrics();
        $this->displayServerMetrics($loadMetrics);
        
        // Resource usage
        $resourceMetrics = $optimizer->monitorResources();
        $this->displayResourceMetrics($resourceMetrics);
        
        // File statistics
        $this->displayFileStatistics();
        
        // Upload session statistics
        $sessionStats = $chunkedService->getSessionStats();
        $this->displaySessionStatistics($sessionStats);
        
        // Cleanup if requested
        if ($this->option('cleanup')) {
            $this->performCleanup($chunkedService);
        }
        
        // Recommendations
        $this->displayRecommendations($loadMetrics, $resourceMetrics);
    }
    
    private function displayServerMetrics(array $metrics): void
    {
        $this->info("\n--- Server Load Metrics ---");
        $this->line("Active Upload Sessions: {$metrics['active_sessions']}");
        $this->line("Memory Usage: {$metrics['memory_usage_percent']}%");
        $this->line("Disk Usage: {$metrics['disk_usage_percent']}%");
        $this->line("Server Load Score: {$metrics['server_load']}/100");
        $this->line("Recommended Chunk Size: " . $this->formatBytes($metrics['recommended_chunk_size']));
        
        $status = $metrics['can_accept_uploads'] ? '<info>HEALTHY</info>' : '<error>OVERLOADED</error>';
        $this->line("Server Status: {$status}");
    }
    
    private function displayResourceMetrics(array $metrics): void
    {
        $this->info("\n--- Resource Usage ---");
        $this->line("Memory: {$metrics['memory']['current']} / {$metrics['memory']['limit']} ({$metrics['memory']['usage_percentage']}%)");
        $this->line("Peak Memory: {$metrics['memory']['peak']} ({$metrics['memory']['peak_percentage']}%)");
        $this->line("Execution Time: {$metrics['execution_time']}ms");
        $this->line("Disk: {$metrics['disk_usage']['used']} / {$metrics['disk_usage']['total']} ({$metrics['disk_usage']['usage_percentage']}%)");
        
        if (!empty($metrics['warnings'])) {
            $this->warn("\nWarnings:");
            foreach ($metrics['warnings'] as $warning) {
                $this->line("  • {$warning}");
            }
        }
    }
    
    private function displayFileStatistics(): void
    {
        $this->info("\n--- File Statistics ---");
        
        $totalFiles = File::count();
        $totalSize = File::sum('file_size');
        $expiredFiles = File::expired()->count();
        $recentFiles = File::where('created_at', '>', now()->subDay())->count();
        
        $this->line("Total Files: " . number_format($totalFiles));
        $this->line("Total Size: " . $this->formatBytes($totalSize));
        $this->line("Expired Files: " . number_format($expiredFiles));
        $this->line("Files (24h): " . number_format($recentFiles));
        
        if ($totalFiles > 0) {
            $avgSize = $totalSize / $totalFiles;
            $this->line("Average File Size: " . $this->formatBytes($avgSize));
        }
    }
    
    private function displaySessionStatistics(array $stats): void
    {
        $this->info("\n--- Upload Session Statistics ---");
        $this->line("Active Sessions: {$stats['active_sessions']}");
        $this->line("Expired Sessions: {$stats['expired_sessions']}");
        $this->line("Total Sessions: {$stats['total_sessions']}");
    }
    
    private function performCleanup(ChunkedUploadService $service): void
    {
        $this->info("\n--- Performing Cleanup ---");
        
        $cleaned = $service->cleanupExpiredSessions();
        $this->line("Cleaned up {$cleaned} expired upload sessions");
        
        // Clean up expired files
        $expiredFiles = File::expired()->get();
        $deletedFiles = 0;
        
        foreach ($expiredFiles as $file) {
            try {
                $file->delete();
                $deletedFiles++;
            } catch (\Exception $e) {
                $this->warn("Failed to delete file {$file->file_id}: {$e->getMessage()}");
            }
        }
        
        $this->line("Deleted {$deletedFiles} expired files");
    }
    
    private function displayRecommendations(array $loadMetrics, array $resourceMetrics): void
    {
        $this->info("\n--- Recommendations ---");
        
        $recommendations = [];
        
        // Memory recommendations
        if ($resourceMetrics['memory']['usage_percentage'] > 75) {
            $recommendations[] = "High memory usage detected. Consider reducing chunk size or limiting concurrent uploads.";
        }
        
        // Disk recommendations
        if ($resourceMetrics['disk_usage']['usage_percentage'] > 85) {
            $recommendations[] = "Disk usage is high. Consider cleaning up expired files more frequently.";
        }
        
        // Session recommendations
        if ($loadMetrics['active_sessions'] > 20) {
            $recommendations[] = "Many active upload sessions. Consider implementing upload queuing.";
        }
        
        // Server load recommendations
        if ($loadMetrics['server_load'] > 80) {
            $recommendations[] = "Server load is high. Consider implementing rate limiting or load balancing.";
        }
        
        // File count recommendations
        $fileCount = File::count();
        if ($fileCount > 500000) { // Approaching your 600k limit
            $recommendations[] = "File count is approaching hosting limits. Implement aggressive cleanup policies.";
        }
        
        if (empty($recommendations)) {
            $this->line("<info>✓ System is running optimally</info>");
        } else {
            foreach ($recommendations as $recommendation) {
                $this->line("• {$recommendation}");
            }
        }
        
        // Optimal settings
        $this->info("\n--- Optimal Settings for Your Hosting ---");
        $this->line("Recommended chunk size: " . $this->formatBytes($loadMetrics['recommended_chunk_size']));
        $this->line("Max concurrent uploads: " . $this->getRecommendedMaxUploads($loadMetrics));
        $this->line("Cleanup frequency: " . $this->getRecommendedCleanupFrequency($resourceMetrics));
    }
    
    private function getRecommendedMaxUploads(array $metrics): int
    {
        if ($metrics['server_load'] > 80) return 3;
        if ($metrics['server_load'] > 60) return 5;
        if ($metrics['server_load'] > 40) return 10;
        return 15;
    }
    
    private function getRecommendedCleanupFrequency(array $metrics): string
    {
        if ($metrics['disk_usage']['usage_percentage'] > 85) return "Every 2 hours";
        if ($metrics['disk_usage']['usage_percentage'] > 70) return "Every 4 hours";
        return "Every 6 hours (current)";
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