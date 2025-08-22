<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ConfigureUploadLimits
{
    /**
     * Handle an incoming request and configure PHP upload limits.
     * This middleware must run before Laravel's ValidatePostSize middleware.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Configure PHP upload limits from environment/config
        $this->configureUploadLimits();

        return $next($request);
    }

    /**
     * Configure PHP upload limits at runtime.
     */
    private function configureUploadLimits(): void
    {
        // Get limits from config
        $uploadMaxFilesize = config('filehosting.upload_max_filesize', '10240M');
        $postMaxSize = config('filehosting.post_max_size', '10240M');
        $memoryLimit = config('filehosting.memory_limit', '512M');
        $maxExecutionTime = config('filehosting.max_execution_time', 300);

        // Set PHP configuration at runtime
        ini_set('upload_max_filesize', $uploadMaxFilesize);
        ini_set('post_max_size', $postMaxSize);
        ini_set('memory_limit', $memoryLimit);
        ini_set('max_execution_time', $maxExecutionTime);
        ini_set('max_input_time', $maxExecutionTime);
        ini_set('max_file_uploads', 100);

        // Also set time limit for the current script
        set_time_limit($maxExecutionTime);
    }
}
