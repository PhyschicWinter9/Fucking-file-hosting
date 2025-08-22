<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\PerformanceOptimizer;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class MonitorResources extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'resources:monitor 
                            {--alert : Send alerts for critical resource usage}
                            {--cleanup : Perform cleanup operations if needed}
                            {--report : Generate detailed resource report}';

    /**
     * The console command description.
     */
    protected $description = 'Monitor system resources and perform optimizations for shared hosting';

    private PerformanceOptimizer $optimizer;

    public function __construct(PerformanceOptimizer $optimizer)
    {
        parent::__construct();
        $this->optimizer = $optimizer;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting resource monitoring...');

        // Monitor current resource usage
        $resources = $this->optimizer->monitorResources();

        // Display resource information
        $this->displayResourceInfo($resources);

        // Check for warnings and handle them
        if (!empty($resources['warnings'])) {
            $this->handleWarnings($resources['warnings']);
        }

        // Generate report if requested
        if ($this->option('report')) {
            $this->generateReport($resources);
        }

        // Perform cleanup if requested or if resources are high
        if ($this->option('cleanup') || $this->shouldAutoCleanup($resources)) {
            $this->performCleanup();
        }

        // Send alerts if requested and there are critical issues
        if ($this->option('alert') && $this->hasCriticalIssues($resources)) {
            $this->sendAlerts($resources);
        }

        $this->info('Resource monitoring completed.');
        return 0;
    }

    /**
     * Display resource information
     */
    private function displayResourceInfo(array $resources): void
    {
        $this->info('=== Resource Usage Report ===');
        
        // Memory usage
        $memory = $resources['memory'];
        $this->line("Memory Usage: {$memory['current']} / {$memory['limit']} ({$memory['usage_percentage']}%)");
        $this->line("Memory Peak: {$memory['peak']} ({$memory['peak_percentage']}%)");

        // Disk usage
        $disk = $resources['disk_usage'];
        $this->line("Disk Usage: {$disk['used']} / {$disk['total']} ({$disk['usage_percentage']}%)");
        $this->line("Disk Free: {$disk['free']}");

        // Execution time
        $this->line("Current Execution Time: {$resources['execution_time']}ms");

        // Warnings
        if (!empty($resources['warnings'])) {
            $this->warn('Warnings detected:');
            foreach ($resources['warnings'] as $warning) {
                $this->warn("  - {$warning}");
            }
        } else {
            $this->info('No resource warnings detected.');
        }
    }

    /**
     * Handle resource warnings
     */
    private function handleWarnings(array $warnings): void
    {
        foreach ($warnings as $warning) {
            Log::warning('Resource monitoring warning', [
                'warning' => $warning,
                'timestamp' => now()->toISOString(),
                'command' => 'resources:monitor',
            ]);
        }

        // Suggest actions
        $this->warn('Suggested actions:');
        
        if (str_contains(implode(' ', $warnings), 'memory')) {
            $this->warn('  - Consider running: php artisan cache:clear');
            $this->warn('  - Consider running: php artisan config:clear');
            $this->warn('  - Consider running: php artisan view:clear');
        }

        if (str_contains(implode(' ', $warnings), 'disk')) {
            $this->warn('  - Consider running: php artisan files:cleanup');
            $this->warn('  - Consider running: php artisan log:clear');
        }

        if (str_contains(implode(' ', $warnings), 'execution')) {
            $this->warn('  - Consider optimizing database queries');
            $this->warn('  - Consider enabling caching');
        }
    }

    /**
     * Check if automatic cleanup should be performed
     */
    private function shouldAutoCleanup(array $resources): bool
    {
        $memoryThreshold = config('shared-hosting.monitoring.memory_usage_threshold', 80);
        $diskThreshold = config('shared-hosting.monitoring.disk_usage_threshold', 90);

        return $resources['memory']['usage_percentage'] > $memoryThreshold ||
               $resources['disk_usage']['usage_percentage'] > $diskThreshold;
    }

    /**
     * Perform cleanup operations
     */
    private function performCleanup(): void
    {
        $this->info('Performing cleanup operations...');

        // Clear various caches
        $this->call('cache:clear');
        $this->call('config:clear');
        $this->call('route:clear');
        $this->call('view:clear');

        // Clean up expired files
        $this->call('files:cleanup');

        // Optimize memory
        $this->optimizer->optimizeMemory();

        // Clear old log files if they exist
        $this->cleanupLogs();

        $this->info('Cleanup operations completed.');
    }

    /**
     * Clean up old log files
     */
    private function cleanupLogs(): void
    {
        $logPath = storage_path('logs');
        $maxFiles = config('shared-hosting.logging.max_files', 5);
        $maxSize = $this->parseSize(config('shared-hosting.logging.max_size', '10MB'));

        if (!is_dir($logPath)) {
            return;
        }

        $logFiles = glob($logPath . '/*.log');
        
        // Sort by modification time (oldest first)
        usort($logFiles, function ($a, $b) {
            return filemtime($a) - filemtime($b);
        });

        // Remove old files if we have too many
        while (count($logFiles) > $maxFiles) {
            $oldestFile = array_shift($logFiles);
            if (unlink($oldestFile)) {
                $this->line("Removed old log file: " . basename($oldestFile));
            }
        }

        // Check file sizes and truncate if necessary
        foreach ($logFiles as $logFile) {
            if (filesize($logFile) > $maxSize) {
                $this->truncateLogFile($logFile, $maxSize);
            }
        }
    }

    /**
     * Truncate log file to specified size
     */
    private function truncateLogFile(string $filePath, int $maxSize): void
    {
        $handle = fopen($filePath, 'r+');
        if (!$handle) {
            return;
        }

        $fileSize = filesize($filePath);
        if ($fileSize <= $maxSize) {
            fclose($handle);
            return;
        }

        // Keep the last portion of the file
        $keepSize = intval($maxSize * 0.8); // Keep 80% of max size
        $skipSize = $fileSize - $keepSize;

        fseek($handle, $skipSize);
        $content = fread($handle, $keepSize);

        // Find the first complete line
        $firstNewline = strpos($content, "\n");
        if ($firstNewline !== false) {
            $content = substr($content, $firstNewline + 1);
        }

        // Rewrite the file
        ftruncate($handle, 0);
        fseek($handle, 0);
        fwrite($handle, "[TRUNCATED - Previous entries removed to manage file size]\n");
        fwrite($handle, $content);
        fclose($handle);

        $this->line("Truncated log file: " . basename($filePath));
    }

    /**
     * Check if there are critical issues
     */
    private function hasCriticalIssues(array $resources): bool
    {
        return $resources['memory']['usage_percentage'] > 95 ||
               $resources['disk_usage']['usage_percentage'] > 95 ||
               !empty($resources['warnings']);
    }

    /**
     * Send alerts for critical issues
     */
    private function sendAlerts(array $resources): void
    {
        $this->warn('Critical resource usage detected - alerts would be sent in production');
        
        // In a real implementation, you might:
        // - Send email alerts
        // - Log to external monitoring service
        // - Send webhook notifications
        // - Update status page

        Log::critical('Critical resource usage detected', [
            'resources' => $resources,
            'timestamp' => now()->toISOString(),
        ]);
    }

    /**
     * Generate detailed resource report
     */
    private function generateReport(array $resources): void
    {
        $reportPath = storage_path('logs/resource-report-' . now()->format('Y-m-d-H-i-s') . '.json');
        
        $report = [
            'timestamp' => now()->toISOString(),
            'resources' => $resources,
            'php_info' => [
                'version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
            ],
            'laravel_info' => [
                'version' => app()->version(),
                'environment' => app()->environment(),
                'debug' => config('app.debug'),
            ],
        ];

        file_put_contents($reportPath, json_encode($report, JSON_PRETTY_PRINT));
        $this->info("Detailed report saved to: {$reportPath}");
    }

    /**
     * Parse size string to bytes
     */
    private function parseSize(string $size): int
    {
        $size = trim($size);
        $last = strtolower($size[strlen($size) - 1]);
        $size = (int) $size;

        switch ($last) {
            case 'g':
                $size *= 1024;
                // no break
            case 'm':
                $size *= 1024;
                // no break
            case 'k':
                $size *= 1024;
        }

        return $size;
    }
}