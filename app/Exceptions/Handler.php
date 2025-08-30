<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;
use Inertia\Inertia;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e)
    {
        $response = parent::render($request, $e);

        // Only handle HTTP exceptions for web requests
        if (!$request->expectsJson() && $e instanceof HttpException) {
            $statusCode = $e->getStatusCode();

            // Handle specific error pages
            switch ($statusCode) {
                case 404:
                    return $this->handle404($request, $e);
                case 403:
                    return $this->handle403($request);
                case 500:
                    return $this->handle500($request);
                case 503:
                    return $this->handle503($request);
            }
        }

        return $response;
    }

    /**
     * Handle 404 errors with custom logic
     */
    protected function handle404(Request $request, Throwable $e)
    {
        // Check if this is a file-related 404
        $path = $request->path();
        
        // Handle file show pages - updated regex to handle longer file IDs
        if (preg_match('/^file\/([a-zA-Z0-9]{10,})$/', $path, $matches)) {
            $fileId = $matches[1];
            return response()->view('errors.file-not-found', ['fileId' => $fileId], 404);
        }

        // Handle file download pages
        if (preg_match('/^f\/([a-zA-Z0-9]{10,})$/', $path, $matches)) {
            $fileId = $matches[1];
            return response()->view('errors.file-not-found', ['fileId' => $fileId], 404);
        }

        // Handle file preview pages
        if (preg_match('/^p\/([a-zA-Z0-9]{10,})$/', $path, $matches)) {
            $fileId = $matches[1];
            return response()->view('errors.file-not-found', ['fileId' => $fileId], 404);
        }

        // Default 404 page
        return response()->view('errors.404', [], 404);
    }

    /**
     * Handle 403 errors
     */
    protected function handle403(Request $request)
    {
        return response()->view('errors.403', [], 403);
    }

    /**
     * Handle 500 errors
     */
    protected function handle500(Request $request)
    {
        return response()->view('errors.500', [], 500);
    }

    /**
     * Handle 503 errors
     */
    protected function handle503(Request $request)
    {
        return response()->view('errors.503', [], 503);
    }
}