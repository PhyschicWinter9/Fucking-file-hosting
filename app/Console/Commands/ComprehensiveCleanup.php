<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class ComprehensiveCleanup extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'upload:cleanup-all 
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--force : Force cleanup without confirmation}';

    /**
     * The console command description.
     */
    protected $description = 'Run all cleanup operations: expired files, sessions, temp chunks, and orphaned files';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting comprehensive cleanup...');
        $this->newLine();

        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        
        $options = [];
        if ($dryRun) $options['--dry-run'] = true;
        if ($force) $options['--force'] = true;

        $overallSuccess = true;

        // 1. Clean up expired files
        $this->info('🗂️  Cleaning up expired files...');
        $exitCode = Artisan::call('files:cleanup', $options);
        if ($exitCode !== 0) {
            $this->error('Failed to clean up expired files');
            $overallSuccess = false;
        } else {
            $this->info('✅ Expired files cleanup completed');
        }
        $this->newLine();

        // 2. Clean up expired upload sessions
        $this->info('📤 Cleaning up expired upload sessions...');
        $exitCode = Artisan::call('upload:cleanup-sessions');
        if ($exitCode !== 0) {
            $this->error('Failed to clean up expired sessions');
            $overallSuccess = false;
        } else {
            $this->info('✅ Expired sessions cleanup completed');
        }
        $this->newLine();

        // 3. Clean up temporary files (chunks, failed uploads, orphaned files)
        $this->info('🧹 Cleaning up temporary files...');
        $exitCode = Artisan::call('upload:cleanup-temp', $options);
        if ($exitCode !== 0) {
            $this->error('Failed to clean up temporary files');
            $overallSuccess = false;
        } else {
            $this->info('✅ Temporary files cleanup completed');
        }
        $this->newLine();

        // Display final summary
        if ($overallSuccess) {
            $this->info('🎉 Comprehensive cleanup completed successfully!');
            
            if (!$dryRun) {
                $this->info('💡 Tip: Set up a cron job to run this command regularly:');
                $this->line('   0 2 * * * cd /path/to/your/project && php artisan upload:cleanup-all --force');
            }
        } else {
            $this->error('❌ Some cleanup operations failed. Check the logs above.');
        }

        return $overallSuccess ? Command::SUCCESS : Command::FAILURE;
    }
}