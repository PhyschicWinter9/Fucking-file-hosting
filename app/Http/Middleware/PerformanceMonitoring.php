<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Services\PerformanceOptimizer;
use Symfony\Component\HttpFoundation\Response;

class PerformanceMonitoring
{
    private PerformanceOptimizer $optimizer;

    public function __construct(PerformanceOptimizer $optimizer)
    {
        $this->optimizer = $optimizer;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip monitoring for static assets
        if ($this->isStaticAsset($request)) {
            return $next($request);
        }

        // Start monitoring
        $operation = $this->getOperationName($request);
        $this->optimizer->startMonitoring($operation);

        // Set memory and execution time limits for shared hosting
        $this->setResourceLimits();

        // Process request
        $response = $next($request);

        // End monitoring and log metrics
        $metrics = $this->optimizer->endMonitoring($operation);
        $this->logRequestMetrics($request, $response, $metrics);

        // Add performance headers in debug mode
        if (config('app.debug')) {
            $this->addPerformanceHeaders($response, $metrics);
        }

        return $response;
    }

    /**
     * Set resource limits optimized for shared hosting
     */
    private function setResourceLimits(): void
    {
        // Set memory limit if configured
        $memoryLimit = config('shared-hosting.performance.memory_limit');
        if ($memoryLimit && ini_get('memory_limit') !== $memoryLimit) {
            ini_set('memory_limit', $memoryLimit);
        }

        // Set execution time limit if configured
        $executionTimeLimit = config('shared-hosting.performance.execution_time_limit');
        if ($executionTimeLimit && ini_get('max_execution_time') < $executionTimeLimit) {
            set_time_limit($executionTimeLimit);
        }

        // Enable output compression if configured
        if (config('shared-hosting.performance.enable_compression') && !ob_get_level()) {
            ob_start('ob_gzhandler');
        }
    }

    /**
     * Check if request is for a static asset
     */
    private function isStaticAsset(Request $request): bool
    {
        $path = $request->getPathInfo();
        $staticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot'];
        
        foreach ($staticExtensions as $extension) {
            if (str_ends_with($path, '.' . $extension)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get operation name for monitoring
     */
    private function getOperationName(Request $request): string
    {
        $route = $request->route();
        if ($route) {
            $action = $route->getActionName();
            if ($action !== 'Closure') {
                return $action;
            }
        }

        return $request->method() . ' ' . $request->getPathInfo();
    }

    /**
     * Log request metrics
     */
    private function logRequestMetrics(Request $request, Response $response, array $metrics): void
    {
        // Only log if monitoring is enabled and metrics are significant
        if (!config('shared-hosting.monitoring.enabled')) {
            return;
        }

        $executionTime = $metrics['execution_time'] ?? 0;
        $responseTimeThreshold = config('shared-hosting.monitoring.response_time_threshold', 5000);

        // Log slow requests
        if ($executionTime > $responseTimeThreshold) {
            Log::warning('Slow request detected', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'status_code' => $response->getStatusCode(),
                'metrics' => $metrics,
                'user_agent' => $request->userAgent(),
                'ip' => config('shared-hosting.privacy.log_ip_addresses') ? $request->ip() : 'hidden',
            ]);
        }

        // Log high memory usage
        if ($this->optimizer->isMemoryUsageHigh()) {
            Log::warning('High memory usage detected', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'memory_usage' => $this->optimizer->getMemoryUsage(),
                'metrics' => $metrics,
            ]);
        }

        // Log errors
        if ($response->getStatusCode() >= 400) {
            Log::error('Request error', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'status_code' => $response->getStatusCode(),
                'metrics' => $metrics,
            ]);
        }
    }

    /**
     * Add performance headers to response (debug mode only)
     */
    private function addPerformanceHeaders(Response $response, array $metrics): void
    {
        $memoryUsage = $this->optimizer->getMemoryUsage();
        
        $response->headers->set('X-Debug-Execution-Time', ($metrics['execution_time'] ?? 0) . 'ms');
        $response->headers->set('X-Debug-Memory-Usage', $memoryUsage['current']);
        $response->headers->set('X-Debug-Memory-Peak', $memoryUsage['peak']);
        $response->headers->set('X-Debug-Memory-Percentage', $memoryUsage['usage_percentage'] . '%');
    }
}