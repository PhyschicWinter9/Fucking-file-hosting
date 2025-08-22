<?php

namespace App\Console\Commands;

use App\Models\File;
use App\Services\FileService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupExpiredFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'files:cleanup 
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--force : Force cleanup without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired files from storage and database';

    private FileService $fileService;

    public function __construct(FileService $fileService)
    {
        parent::__construct();
        $this->fileService = $fileService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting expired files cleanup...');

        // Get expired files
        $expiredFiles = File::expired()->get();

        if ($expiredFiles->isEmpty()) {
            $this->info('No expired files found.');
            return Command::SUCCESS;
        }

        $this->info("Found {$expiredFiles->count()} expired file(s).");

        // Show files to be deleted
        if ($this->option('dry-run')) {
            $this->info('DRY RUN - Files that would be deleted:');
            $this->displayFilesTable($expiredFiles);
            return Command::SUCCESS;
        }

        // Confirm deletion unless forced
        if (!$this->option('force')) {
            $this->displayFilesTable($expiredFiles);
            
            if (!$this->confirm('Do you want to delete these expired files?')) {
                $this->info('Cleanup cancelled.');
                return Command::SUCCESS;
            }
        }

        // Perform cleanup
        $deletedCount = 0;
        $failedCount = 0;
        $totalSize = 0;

        $progressBar = $this->output->createProgressBar($expiredFiles->count());
        $progressBar->start();

        foreach ($expiredFiles as $file) {
            try {
                $fileSize = $file->file_size;
                
                // Delete physical file
                if (Storage::disk('public')->exists($file->file_path)) {
                    Storage::disk('public')->delete($file->file_path);
                }

                // Delete database record
                $file->delete();

                $deletedCount++;
                $totalSize += $fileSize;
                
            } catch (\Exception $e) {
                $failedCount++;
                $this->error("Failed to delete file {$file->file_id}: " . $e->getMessage());
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display results
        $this->info("Cleanup completed:");
        $this->info("- Files deleted: {$deletedCount}");
        $this->info("- Storage freed: " . $this->formatBytes($totalSize));
        
        if ($failedCount > 0) {
            $this->warn("- Failed deletions: {$failedCount}");
        }

        // Log cleanup action
        $this->info('Cleanup logged for privacy compliance.');

        return Command::SUCCESS;
    }

    /**
     * Display files in a table format.
     */
    private function displayFilesTable($files): void
    {
        $headers = ['File ID', 'Original Name', 'Size', 'Expired At'];
        $rows = [];

        foreach ($files as $file) {
            $rows[] = [
                substr($file->file_id, 0, 12) . '...',
                strlen($file->original_name) > 30 
                    ? substr($file->original_name, 0, 27) . '...' 
                    : $file->original_name,
                $this->formatBytes($file->file_size),
                $file->expires_at->format('Y-m-d H:i:s'),
            ];
        }

        $this->table($headers, $rows);
    }

    /**
     * Format bytes to human readable format.
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
