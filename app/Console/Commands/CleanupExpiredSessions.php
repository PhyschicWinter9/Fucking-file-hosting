<?php

namespace App\Console\Commands;

use App\Services\ChunkedUploadService;
use Illuminate\Console\Command;

class CleanupExpiredSessions extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'upload:cleanup-sessions';

    /**
     * The console command description.
     */
    protected $description = 'Clean up expired chunked upload sessions and their associated chunks';

    private ChunkedUploadService $chunkedUploadService;

    public function __construct(ChunkedUploadService $chunkedUploadService)
    {
        parent::__construct();
        $this->chunkedUploadService = $chunkedUploadService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting cleanup of expired upload sessions...');

        try {
            $cleanedCount = $this->chunkedUploadService->cleanupExpiredSessions();
            
            if ($cleanedCount > 0) {
                $this->info("Successfully cleaned up {$cleanedCount} expired upload sessions.");
            } else {
                $this->info('No expired upload sessions found.');
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Failed to clean up expired sessions: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}