<?php

use App\Http\Controllers\FileUploadController;
use App\Http\Controllers\FileDownloadController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// File upload endpoints with rate limiting and bypass post size validation
Route::middleware(['throttle:uploads', \App\Http\Middleware\BypassPostSizeValidation::class])->group(function () {
    Route::post('/upload', [FileUploadController::class, 'upload'])->name('api.upload');
    Route::post('/upload/chunk', [FileUploadController::class, 'chunkedUpload'])->name('api.upload.chunk');
    Route::post('/upload/finalize', [FileUploadController::class, 'finalizeUpload'])->name('api.upload.finalize');
});

// File information endpoint with general rate limiting
Route::middleware(['throttle:api'])->group(function () {
    Route::get('/file/{fileId}/info', [FileDownloadController::class, 'info'])->name('api.file.info');
    Route::get('/file/{fileId}/duplicates', [FileUploadController::class, 'duplicates'])->name('api.file.duplicates');
});

// Admin/maintenance endpoints with strict rate limiting
Route::middleware(['throttle:admin'])->group(function () {
    Route::delete('/cleanup', [FileUploadController::class, 'cleanup'])->name('api.cleanup');
    Route::get('/stats', [FileUploadController::class, 'stats'])->name('api.stats');
});
