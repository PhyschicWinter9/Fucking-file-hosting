<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ShowChunkConfig extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'upload:chunk-config';

    /**
     * The console command description.
     */
    protected $description = 'Display current chunk upload configuration and recommendations';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('📦 Chunk Upload Configuration');
        $this->newLine();

        // Current configuration
        $chunkSize = config('filehosting.chunk_size', 2097152);
        $chunkSizeMB = round($chunkSize / 1024 / 1024, 2);
        
        $this->info('Current Settings:');
        $this->line("  Chunk Size: {$chunkSizeMB} MB ({$chunkSize} bytes)");
        $this->line("  Session Timeout: " . config('filehosting.chunked_upload_session_timeout_hours', 48) . " hours");
        $this->line("  Max Retries: " . config('filehosting.chunked_upload_max_retries', 3));
        $this->line("  Cleanup Interval: " . config('filehosting.chunked_upload_cleanup_interval_hours', 6) . " hours");
        $this->newLine();

        // Environment analysis
        $this->info('Environment Analysis:');
        
        $memoryLimit = ini_get('memory_limit');
        $this->line("  PHP Memory Limit: {$memoryLimit}");
        
        $maxExecutionTime = ini_get('max_execution_time');
        $this->line("  Max Execution Time: {$maxExecutionTime}s");
        
        $uploadMaxFilesize = ini_get('upload_max_filesize');
        $this->line("  Upload Max Filesize: {$uploadMaxFilesize}");
        
        $postMaxSize = ini_get('post_max_size');
        $this->line("  Post Max Size: {$postMaxSize}");
        $this->newLine();

        // Recommendations
        $this->info('💡 Configuration Recommendations:');
        
        if ($chunkSizeMB == 2) {
            $this->line("  ✅ 2MB chunks are optimal for shared hosting");
            $this->line("     - Uses less memory per operation");
            $this->line("     - Saves filesystem inodes");
            $this->line("     - Works well with Cloudflare");
            $this->line("     - Balances speed and stability");
        } elseif ($chunkSizeMB < 2) {
            $this->warn("  ⚠️  Chunks smaller than 2MB may impact performance");
            $this->line("     Consider increasing to 2MB for better efficiency");
        } else {
            $this->warn("  ⚠️  Chunks larger than 2MB may use more memory");
            $this->line("     Current setting is suitable for better hardware");
        }
        $this->newLine();

        // Future upgrade notes
        $this->info('🚀 Future Hardware Upgrade Notes:');
        $this->line("  When upgrading to better hardware, consider:");
        $this->line("  - Increasing chunk size to 10MB+ for better performance");
        $this->line("  - Adjusting cleanup intervals for less frequent maintenance");
        $this->line("  - Enabling more aggressive memory limits");
        $this->newLine();

        // Cleanup configuration
        $this->info('🧹 Cleanup Configuration:');
        $cleanupEnabled = [
            'Temp Chunks' => config('filehosting.cleanup_temp_chunks_enabled', true),
            'Failed Uploads' => config('filehosting.cleanup_failed_uploads_enabled', true),
            'Orphaned Files' => config('filehosting.cleanup_orphaned_files_enabled', true),
            'Empty Directories' => config('filehosting.cleanup_empty_directories_enabled', true),
        ];

        foreach ($cleanupEnabled as $type => $enabled) {
            $status = $enabled ? '✅ Enabled' : '❌ Disabled';
            $this->line("  {$type}: {$status}");
        }
        $this->newLine();

        // Age thresholds
        $this->info('⏰ Cleanup Age Thresholds:');
        $this->line("  Temp Chunks: " . config('filehosting.cleanup_temp_chunks_age_hours', 24) . " hours");
        $this->line("  Failed Uploads: " . config('filehosting.cleanup_failed_uploads_age_hours', 72) . " hours");
        $this->newLine();

        // Quick commands
        $this->info('🔧 Quick Commands:');
        $this->line("  Test cleanup (dry run): php artisan upload:cleanup-all --dry-run");
        $this->line("  Run full cleanup: php artisan upload:cleanup-all --force");
        $this->line("  Clean temp files only: php artisan upload:cleanup-temp --force");

        return Command::SUCCESS;
    }
}