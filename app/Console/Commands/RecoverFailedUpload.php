<?php

namespace App\Console\Commands;

use App\Services\ChunkedUploadService;
use App\Models\UploadSession;
use Illuminate\Console\Command;

class RecoverFailedUpload extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'upload:recover {session_id? : The session ID to recover}';

    /**
     * The console command description.
     */
    protected $description = 'Recover and display information about failed chunked uploads';

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
        $sessionId = $this->argument('session_id');

        if ($sessionId) {
            return $this->recoverSpecificSession($sessionId);
        } else {
            return $this->listActiveSessions();
        }
    }

    /**
     * Recover a specific session.
     */
    private function recoverSpecificSession(string $sessionId): int
    {
        try {
            $session = UploadSession::findBySessionId($sessionId);

            if (!$session) {
                $this->error("Upload session '{$sessionId}' not found.");
                return Command::FAILURE;
            }

            $this->info("Upload Session Information:");
            $this->line("Session ID: {$session->session_id}");
            $this->line("Original Name: {$session->original_name}");
            $this->line("Total Size: " . number_format($session->total_size / 1024 / 1024, 2) . " MB");
            $this->line("Chunk Size: " . number_format($session->chunk_size / 1024 / 1024, 2) . " MB");
            $this->line("Progress: " . number_format($session->getProgress(), 2) . "%");
            $this->line("Expires At: {$session->expires_at}");
            $this->line("Is Complete: " . ($session->isComplete() ? 'Yes' : 'No'));

            if (!$session->isComplete()) {
                $missingChunks = $session->getMissingChunks();
                $this->line("Missing Chunks: " . count($missingChunks));
                
                if (count($missingChunks) <= 10) {
                    $this->line("Missing Chunk Indexes: " . implode(', ', $missingChunks));
                } else {
                    $this->line("Missing Chunk Indexes: " . implode(', ', array_slice($missingChunks, 0, 10)) . "... (and " . (count($missingChunks) - 10) . " more)");
                }

                if ($session->expires_at->isPast()) {
                    $this->warn("This session has expired and will be cleaned up.");
                } else {
                    $this->info("This session is still active. You can resume the upload.");
                }
            } else {
                $this->info("This upload is complete and ready for finalization.");
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Failed to recover session: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * List all active sessions.
     */
    private function listActiveSessions(): int
    {
        try {
            $activeSessions = UploadSession::where('expires_at', '>', now())->get();
            $expiredSessions = UploadSession::where('expires_at', '<=', now())->get();

            $this->info("Active Upload Sessions:");
            
            if ($activeSessions->isEmpty()) {
                $this->line("No active upload sessions found.");
            } else {
                $headers = ['Session ID', 'Original Name', 'Size (MB)', 'Progress', 'Expires At'];
                $rows = [];

                foreach ($activeSessions as $session) {
                    $rows[] = [
                        $session->session_id,
                        substr($session->original_name, 0, 30),
                        number_format($session->total_size / 1024 / 1024, 2),
                        number_format($session->getProgress(), 1) . '%',
                        $session->expires_at->diffForHumans(),
                    ];
                }

                $this->table($headers, $rows);
            }

            if (!$expiredSessions->isEmpty()) {
                $this->warn("\nFound " . $expiredSessions->count() . " expired sessions that can be cleaned up.");
                $this->line("Run 'php artisan upload:cleanup-sessions' to clean them up.");
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Failed to list sessions: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}