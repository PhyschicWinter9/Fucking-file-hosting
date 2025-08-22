<?php

use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FileDownloadController;
use App\Http\Controllers\SetupController;
use Illuminate\Support\Facades\Route;

// Main upload interface (Inertia page)
Route::get('/', [FileUploadController::class, 'index'])->name('upload.index');

// File information page (Inertia page)
Route::get('/file/{fileId}', [FileUploadController::class, 'show'])->name('file.show');

// Direct file download routes (not Inertia)
Route::get('/f/{fileId}', [FileDownloadController::class, 'download'])->name('file.download');
Route::get('/p/{fileId}', [FileDownloadController::class, 'preview'])->name('file.preview');

// API Documentation page
Route::get('/docs/api', [FileUploadController::class, 'apiDocs'])->name('docs.api');

// SEO routes
Route::get('/sitemap.xml', [App\Http\Controllers\SitemapController::class, 'index'])->name('sitemap');

// Setup wizard routes
Route::get('/setup', [SetupController::class, 'index'])->name('setup.index');
Route::post('/api/setup/save', [SetupController::class, 'save'])->name('setup.save');
Route::post('/api/setup/test-database', [SetupController::class, 'testDatabase'])->name('setup.test-database');
Route::get('/api/setup/check', [SetupController::class, 'checkSetup'])->name('setup.check');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
