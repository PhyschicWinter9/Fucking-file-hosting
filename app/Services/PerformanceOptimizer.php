<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class PerformanceOptimizer
{
    private array $metrics = [];
    private float $startTime;
    private int $startMemory;

    public function __construct()
    {
        $this->startTime = microtime(true);
        $this->startMemory = memory_get_usage(true);
    }

    /**
     * Start performance monitoring for a specific operation
     */
    public function startMonitoring(string $operation): void
    {
        $this->metrics[$operation] = [
            'start_time' => microtime(true),
            'start_memory' => memory_get_usage(true),
        ];
    }

    /**
     * End performance monitoring for a specific operation
     */
    public function endMonitoring(string $operation): array
    {
        if (!isset($this->metrics[$operation])) {
            return [];
        }

        $endTime = microtime(true);
        $endMemory = memory_get_usage(true);

        $metrics = [
            'operation' => $operation,
            'execution_time' => round(($endTime - $this->metrics[$operation]['start_time']) * 1000, 2), // ms
            'memory_used' => $this->formatBytes($endMemory - $this->metrics[$operation]['start_memory']),
            'memory_peak' => $this->formatBytes(memory_get_peak_usage(true)),
            'timestamp' => now()->toISOString(),
        ];

        // Log performance metrics if enabled
        if (config('shared-hosting.monitoring.enabled')) {
            $this->logPerformanceMetrics($metrics);
        }

        unset($this->metrics[$operation]);

        return $metrics;
    }

    /**
     * Get current memory usage information
     */
    public function getMemoryUsage(): array
    {
        $current = memory_get_usage(true);
        $peak = memory_get_peak_usage(true);
        $limit = $this->getMemoryLimit();

        return [
            'current' => $this->formatBytes($current),
            'current_bytes' => $current,
            'peak' => $this->formatBytes($peak),
            'peak_bytes' => $peak,
            'limit' => $this->formatBytes($limit),
            'limit_bytes' => $limit,
            'usage_percentage' => $limit > 0 ? round(($current / $limit) * 100, 2) : 0,
            'peak_percentage' => $limit > 0 ? round(($peak / $limit) * 100, 2) : 0,
        ];
    }

    /**
     * Check if memory usage is approaching limits
     */
    public function isMemoryUsageHigh(): bool
    {
        $usage = $this->getMemoryUsage();
        $threshold = config('shared-hosting.monitoring.memory_usage_threshold', 80);

        return $usage['usage_percentage'] > $threshold;
    }

    /**
     * Optimize memory usage by clearing unnecessary data
     */
    public function optimizeMemory(): void
    {
        // Clear opcode cache if available
        if (function_exists('opcache_reset')) {
            opcache_reset();
        }

        // Force garbage collection
        gc_collect_cycles();

        // Clear Laravel caches if memory is high
        if ($this->isMemoryUsageHigh()) {
            Cache::flush();
        }
    }

    /**
     * Get execution time since start
     */
    public function getExecutionTime(): float
    {
        return round((microtime(true) - $this->startTime) * 1000, 2); // ms
    }

    /**
     * Check if execution time is approaching limits
     */
    public function isExecutionTimeHigh(): bool
    {
        $maxExecutionTime = ini_get('max_execution_time');
        if ($maxExecutionTime == 0) return false; // No limit

        $currentTime = $this->getExecutionTime() / 1000; // Convert to seconds
        $threshold = $maxExecutionTime * 0.8; // 80% of limit

        return $currentTime > $threshold;
    }

    /**
     * Process large files in chunks to manage memory
     */
    public function processFileInChunks(string $filePath, callable $processor, int $chunkSize = 8192): void
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $handle = fopen($filePath, 'rb');
        if (!$handle) {
            throw new \RuntimeException("Cannot open file: {$filePath}");
        }

        try {
            $chunkNumber = 0;
            while (!feof($handle)) {
                $chunk = fread($handle, $chunkSize);
                if ($chunk !== false) {
                    $processor($chunk, $chunkNumber);
                    $chunkNumber++;

                    // Check memory usage and optimize if needed
                    if ($chunkNumber % 100 === 0 && $this->isMemoryUsageHigh()) {
                        $this->optimizeMemory();
                    }

                    // Check execution time
                    if ($this->isExecutionTimeHigh()) {
                        Log::warning('Execution time approaching limit during file processing', [
                            'file' => $filePath,
                            'chunk' => $chunkNumber,
                            'execution_time' => $this->getExecutionTime(),
                        ]);
                        break;
                    }
                }
            }
        } finally {
            fclose($handle);
        }
    }

    /**
     * Stream file download with memory optimization
     */
    public function streamFileDownload(string $filePath, array $headers = []): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->stream(function () use ($filePath) {
            $this->processFileInChunks($filePath, function ($chunk) {
                echo $chunk;
                flush();
            });
        }, 200, $headers);
    }

    /**
     * Monitor resource usage and log warnings
     */
    public function monitorResources(): array
    {
        $memory = $this->getMemoryUsage();
        $executionTime = $this->getExecutionTime();
        $diskUsage = $this->getDiskUsage();

        $warnings = [];

        // Check memory usage
        if ($memory['usage_percentage'] > config('shared-hosting.monitoring.memory_usage_threshold', 80)) {
            $warnings[] = "High memory usage: {$memory['usage_percentage']}%";
        }

        // Check execution time
        if ($this->isExecutionTimeHigh()) {
            $warnings[] = "High execution time: {$executionTime}ms";
        }

        // Check disk usage
        if ($diskUsage['usage_percentage'] > config('shared-hosting.monitoring.disk_usage_threshold', 90)) {
            $warnings[] = "High disk usage: {$diskUsage['usage_percentage']}%";
        }

        if (!empty($warnings)) {
            Log::warning('Resource usage warnings', [
                'warnings' => $warnings,
                'memory' => $memory,
                'execution_time' => $executionTime,
                'disk_usage' => $diskUsage,
            ]);
        }

        return [
            'memory' => $memory,
            'execution_time' => $executionTime,
            'disk_usage' => $diskUsage,
            'warnings' => $warnings,
        ];
    }

    /**
     * Get disk usage information
     */
    private function getDiskUsage(): array
    {
        $storagePath = storage_path();
        $totalBytes = disk_total_space($storagePath);
        $freeBytes = disk_free_space($storagePath);
        $usedBytes = $totalBytes - $freeBytes;

        return [
            'total' => $this->formatBytes($totalBytes),
            'used' => $this->formatBytes($usedBytes),
            'free' => $this->formatBytes($freeBytes),
            'usage_percentage' => $totalBytes > 0 ? round(($usedBytes / $totalBytes) * 100, 2) : 0,
        ];
    }

    /**
     * Get PHP memory limit in bytes
     */
    private function getMemoryLimit(): int
    {
        $memoryLimit = ini_get('memory_limit');
        if ($memoryLimit == -1) {
            return 0; // No limit
        }

        return $this->parseBytes($memoryLimit);
    }

    /**
     * Parse memory size string to bytes
     */
    private function parseBytes(string $size): int
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

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Log performance metrics
     */
    private function logPerformanceMetrics(array $metrics): void
    {
        // Only log if execution time or memory usage is significant
        if ($metrics['execution_time'] > 1000 || $this->isMemoryUsageHigh()) {
            Log::info('Performance metrics', $metrics);
        }
    }
}