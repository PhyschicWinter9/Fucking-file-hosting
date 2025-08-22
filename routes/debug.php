<?php

use Illuminate\Support\Facades\Route;

// Debug route to check PHP upload settings (only in development)
if (config('app.debug')) {
    Route::get('/debug/php-settings', function () {
        return response()->json([
            'current_php_settings' => [
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'max_file_uploads' => ini_get('max_file_uploads'),
                'max_input_time' => ini_get('max_input_time'),
            ],
            'config_values' => [
                'upload_max_filesize' => config('filehosting.upload_max_filesize'),
                'post_max_size' => config('filehosting.post_max_size'),
                'memory_limit' => config('filehosting.memory_limit'),
                'max_execution_time' => config('filehosting.max_execution_time'),
            ],
            'ini_set_results' => [
                'upload_max_filesize' => ini_set('upload_max_filesize', '10240M'),
                'post_max_size' => ini_set('post_max_size', '10240M'),
            ]
        ]);
    });
}
