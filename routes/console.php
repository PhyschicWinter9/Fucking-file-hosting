<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule automatic cleanup of expired files
Schedule::command('files:cleanup --force')
    ->daily()
    ->at('02:00')
    ->description('Clean up expired files automatically')
    ->withoutOverlapping()
    ->runInBackground();
