<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Performance monitoring every hour
        $schedule->command('filehosting:monitor --cleanup')
                 ->hourly()
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Aggressive optimization during low traffic (3 AM)
        $schedule->command('filehosting:optimize --aggressive')
                 ->dailyAt('03:00')
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Light optimization every 4 hours
        $schedule->command('filehosting:optimize')
                 ->cron('0 */4 * * *')
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Clean up expired upload sessions every 6 hours (existing)
        $schedule->command('upload:cleanup-sessions')
                 ->everySixHours()
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Clean up expired files daily at 2 AM
        $schedule->command('files:cleanup --force')
                 ->dailyAt('02:00')
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Clean up temporary files (chunks, failed uploads) every 12 hours
        $schedule->command('upload:cleanup-temp --force')
                 ->twiceDaily(2, 14) // 2 AM and 2 PM
                 ->withoutOverlapping()
                 ->runInBackground();
        
        // Comprehensive cleanup weekly on Sunday at 3 AM
        $schedule->command('upload:cleanup-all --force')
                 ->weeklyOn(0, '03:00') // Sunday at 3 AM
                 ->withoutOverlapping()
                 ->runInBackground();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}