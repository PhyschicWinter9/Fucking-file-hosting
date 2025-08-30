<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class MaintenanceMode extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'maintenance {action : enable/disable/status} 
                           {--message= : Custom maintenance message}';

    /**
     * The console command description.
     */
    protected $description = 'Manage maintenance mode for the application';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $action = $this->argument('action');
        
        switch ($action) {
            case 'enable':
                $this->enableMaintenance();
                break;
            case 'disable':
                $this->disableMaintenance();
                break;
            case 'status':
                $this->showStatus();
                break;
            default:
                $this->error('Invalid action. Use: enable, disable, or status');
                return 1;
        }

        return 0;
    }

    /**
     * Enable maintenance mode
     */
    private function enableMaintenance()
    {
        $message = $this->option('message') ?? "We're making some fucking awesome improvements. Be back soon!";

        $this->updateEnvFile([
            'MAINTENANCE_MODE_ENABLED' => 'true',
            'MAINTENANCE_MESSAGE' => '"' . $message . '"'
        ]);

        $this->info('✅ Maintenance mode enabled');
        $this->line("Message: {$message}");
        $this->newLine();
        $this->warn('🚨 Your application is now in maintenance mode!');
    }

    /**
     * Disable maintenance mode
     */
    private function disableMaintenance()
    {
        $this->updateEnvFile([
            'MAINTENANCE_MODE_ENABLED' => 'false'
        ]);

        $this->info('✅ Maintenance mode disabled');
        $this->line('Your application is now accessible to all users.');
    }

    /**
     * Show current maintenance status
     */
    private function showStatus()
    {
        $enabled = env('MAINTENANCE_MODE_ENABLED', false);
        $privateEnabled = env('PRIVATE_SERVICE_ENABLED', false);

        $this->info('=== Service Status ===');
        $this->line('Maintenance Mode: ' . ($enabled ? '🔴 ENABLED' : '🟢 DISABLED'));
        $this->line('Private Service: ' . ($privateEnabled ? '🔒 ENABLED' : '🔓 DISABLED'));

        if ($enabled) {
            $this->newLine();
            $this->warn('Maintenance Details:');
            $this->line('Message: ' . env('MAINTENANCE_MESSAGE', 'Default message'));
        }

        if ($privateEnabled) {
            $this->newLine();
            $this->warn('Private Service Details:');
            $this->line('Message: ' . env('PRIVATE_SERVICE_MESSAGE', 'Default message'));
            $this->line('Contact: ' . env('PRIVATE_SERVICE_CONTACT_EMAIL', 'admin@example.com'));
            $tokenCount = count(array_filter(explode(',', env('AUTHORIZED_TOKENS', ''))));
            $this->line('Authorized Tokens: ' . $tokenCount);
        }
    }

    /**
     * Update environment file
     */
    private function updateEnvFile(array $values)
    {
        $envFile = base_path('.env');
        
        if (!File::exists($envFile)) {
            $this->error('.env file not found');
            return;
        }

        $envContent = File::get($envFile);

        foreach ($values as $key => $value) {
            $pattern = "/^{$key}=.*/m";
            $replacement = "{$key}={$value}";

            if (preg_match($pattern, $envContent)) {
                $envContent = preg_replace($pattern, $replacement, $envContent);
            } else {
                $envContent .= "\n{$replacement}";
            }
        }

        File::put($envFile, $envContent);
    }
}