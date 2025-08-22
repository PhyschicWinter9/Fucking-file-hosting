<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BypassPostSizeValidation
{
    /**
     * Handle an incoming request and bypass Laravel's post size validation.
     * This middleware removes the ValidatePostSize middleware for upload routes.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Set high limits that won't trigger Laravel's validation
        ini_set('post_max_size', '11G');
        ini_set('upload_max_filesize', '11G');
        ini_set('memory_limit', '1G');
        ini_set('max_execution_time', '600');
        ini_set('max_input_time', '600');

        return $next($request);
    }
}
