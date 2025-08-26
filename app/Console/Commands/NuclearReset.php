<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class NuclearReset extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:nuclear-reset {--force : Skip confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Nuclear reset: Clear all database data and uploaded files';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('This will PERMANENTLY delete ALL database data and uploaded files. Are you sure?')) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info('🚀 Starting nuclear reset...');

        // Clear uploaded files
        $this->info('💥 Clearing uploaded files...');
        $storagePaths = [
            storage_path('app/files'),
            storage_path('app/public'),
            storage_path('app/private'),
        ];

        foreach ($storagePaths as $path) {
            if (is_dir($path)) {
                $this->deleteDirectory($path);
                mkdir($path, 0755, true);
                $this->line("   Cleared: {$path}");
            }
        }

        // Reset database
        $this->info('💥 Resetting database...');
        $this->call('migrate:fresh');

        // Clear all caches
        $this->info('💥 Clearing caches...');
        $this->call('cache:clear');
        $this->call('config:clear');
        $this->call('route:clear');
        $this->call('view:clear');

        $this->info('✅ Nuclear reset complete! Everything is fresh and clean.');
        return 0;
    }

    private function deleteDirectory($dir)
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}
