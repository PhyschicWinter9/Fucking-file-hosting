<?php

use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FileDownloadController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\LegalController;
use Illuminate\Support\Facades\Route;

// Main upload interface (Inertia page)
Route::get('/', [FileUploadController::class, 'index'])->name('upload.index');

// Upload demo page (Inertia page)
Route::get('/demo', function () {
    return \Inertia\Inertia::render('UploadDemo');
})->name('upload.demo');

// File information page (Inertia page)
Route::get('/file/{fileId}', [FileUploadController::class, 'show'])->name('file.show');

// Direct file download routes (not Inertia)
Route::get('/f/{fileId}', [FileDownloadController::class, 'download'])->name('file.download');
Route::get('/p/{fileId}', [FileDownloadController::class, 'preview'])->name('file.preview');

// API Documentation page
Route::get('/docs/api', [FileUploadController::class, 'apiDocs'])->name('docs.api');

// Legal pages
Route::get('/terms', [LegalController::class, 'terms'])->name('legal.terms');
Route::get('/privacy', [LegalController::class, 'privacy'])->name('legal.privacy');

// SEO routes
Route::get('/sitemap.xml', [App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');

// Setup wizard routes
Route::get('/setup', [SetupController::class, 'index'])->name('setup.index');
Route::post('/api/setup/save', [SetupController::class, 'save'])->name('setup.save');
Route::post('/api/setup/test-database', [SetupController::class, 'testDatabase'])->name('setup.test-database');
Route::get('/api/setup/check', [SetupController::class, 'checkSetup'])->name('setup.check');

// Error page testing routes (remove in production)
if (app()->environment(['local', 'testing'])) {
    Route::get('/test/404', [App\Http\Controllers\ErrorController::class, 'notFound'])->name('test.404');
    Route::get('/test/403', [App\Http\Controllers\ErrorController::class, 'forbidden'])->name('test.403');
    Route::get('/test/500', [App\Http\Controllers\ErrorController::class, 'serverError'])->name('test.500');
    Route::get('/test/503', [App\Http\Controllers\ErrorController::class, 'serviceUnavailable'])->name('test.503');
    Route::get('/test/file-not-found/{fileId?}', [App\Http\Controllers\ErrorController::class, 'fileNotFound'])->name('test.file-not-found');
}

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
