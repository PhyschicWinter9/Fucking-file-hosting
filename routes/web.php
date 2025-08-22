<?php

use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FileDownloadController;
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

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
