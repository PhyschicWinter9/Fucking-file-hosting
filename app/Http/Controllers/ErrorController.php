<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class ErrorController extends Controller
{
    /**
     * Show file not found error page
     */
    public function fileNotFound(Request $request, $fileId = null)
    {
        return Inertia::render('Errors/FileNotFound', [
            'fileId' => $fileId
        ]);
    }

    /**
     * Show 404 error page
     */
    public function notFound()
    {
        return Inertia::render('Errors/404');
    }

    /**
     * Show 403 error page
     */
    public function forbidden()
    {
        return Inertia::render('Errors/403');
    }

    /**
     * Show 500 error page
     */
    public function serverError()
    {
        return Inertia::render('Errors/500');
    }

    /**
     * Show 503 error page
     */
    public function serviceUnavailable()
    {
        return Inertia::render('Errors/503');
    }
}