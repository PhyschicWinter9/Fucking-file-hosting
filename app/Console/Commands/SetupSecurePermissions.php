<?php

namespace App\Console\Commands;

use App\Services\SecurityService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class SetupSecurePermissions extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'security:setup-permissions 
                            {--force : Force setup even if files exist}
                            {--verify : Verify existing permissions}';

    /**
     * The console command description.
     */
    protected $description = 'Set up secure file permissions and directory structure for file hosting';

    private SecurityService $securityService;

    public function __construct(SecurityService $securityService)
    {
        parent::__construct();
        $this->securityService = $securityService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Setting up secure file permissions and directory structure...');

        if ($this->option('verify')) {
            return $this->verifyPermissions();
        }

        // Create secure directory structure
        $this->createSecureDirectories();

        // Set up file permissions
        $this->setupFilePermissions();

        // Create security .htaccess files
        $this->createSecurityHtaccess();

        // Verify setup
        $this->verifySetup();

        $this->info('✅ Secure permissions setup completed successfully!');
        return 0;
    }

    /**
     * Create secure directory structure.
     */
    private function createSecureDirectories(): void
    {
        $this->info('Creating secure directory structure...');

        $directories = [
            'storage/app/files',
            'storage/logs',
            'storage/framework/cache',
            'storage/framework/sessions',
            'storage/framework/views',
        ];

        foreach ($directories as $directory) {
            if (!is_dir($directory)) {
                mkdir($directory, 0750, true);
                $this->line("  ✓ Created directory: {$directory}");
            } else {
                chmod($directory, 0750);
                $this->line("  ✓ Updated permissions: {$directory}");
            }
        }
    }

    /**
     * Set up secure file permissions.
     */
    private function setupFilePermissions(): void
    {
        $this->info('Setting up secure file permissions...');

        $filePermissions = [
            '.env' => 0600,
            'artisan' => 0755,
            'composer.json' => 0644,
            'composer.lock' => 0644,
        ];

        foreach ($filePermissions as $file => $permission) {
            if (file_exists($file)) {
                chmod($file, $permission);
                $this->line("  ✓ Set permissions for: {$file} (" . decoct($permission) . ")");
            }
        }

        // Set permissions for storage directories
        $this->setStoragePermissions();

        // Set permissions for bootstrap cache
        if (is_dir('bootstrap/cache')) {
            chmod('bootstrap/cache', 0755);
            $this->line("  ✓ Set permissions for: bootstrap/cache");
        }
    }

    /**
     * Set permissions for storage directories.
     */
    private function setStoragePermissions(): void
    {
        $storageDirectories = [
            'storage/app' => 0755,
            'storage/app/files' => 0750,
            'storage/logs' => 0755,
            'storage/framework' => 0755,
            'storage/framework/cache' => 0755,
            'storage/framework/sessions' => 0755,
            'storage/framework/views' => 0755,
        ];

        foreach ($storageDirectories as $directory => $permission) {
            if (is_dir($directory)) {
                chmod($directory, $permission);
                $this->line("  ✓ Set permissions for: {$directory} (" . decoct($permission) . ")");
            }
        }
    }

    /**
     * Create security .htaccess files.
     */
    private function createSecurityHtaccess(): void
    {
        $this->info('Creating security .htaccess files...');

        $htaccessFiles = [
            'storage/.htaccess' => $this->getStorageHtaccess(),
            'storage/app/.htaccess' => $this->getStorageHtaccess(),
            'storage/app/files/.htaccess' => $this->getFilesHtaccess(),
            'storage/logs/.htaccess' => $this->getStorageHtaccess(),
            'bootstrap/cache/.htaccess' => $this->getStorageHtaccess(),
        ];

        foreach ($htaccessFiles as $file => $content) {
            if (!file_exists($file) || $this->option('force')) {
                // Ensure directory exists
                $directory = dirname($file);
                if (!is_dir($directory)) {
                    mkdir($directory, 0755, true);
                }

                file_put_contents($file, $content);
                chmod($file, 0644);
                $this->line("  ✓ Created: {$file}");
            } else {
                $this->line("  - Exists: {$file}");
            }
        }
    }

    /**
     * Get storage .htaccess content.
     */
    private function getStorageHtaccess(): string
    {
        return <<<'HTACCESS'
# Deny all access to storage directories
<Files "*">
    Order Deny,Allow
    Deny from all
</Files>

Options -Indexes
ServerSignature Off

<IfModule mod_headers.c>
    Header always set X-Robots-Tag "noindex, nofollow, noarchive, nosnippet"
</IfModule>
HTACCESS;
    }

    /**
     * Get files storage .htaccess content.
     */
    private function getFilesHtaccess(): string
    {
        return <<<'HTACCESS'
# Deny all direct access to uploaded files
# Files should only be accessed through the application

<Files "*">
    Order Deny,Allow
    Deny from all
</Files>

# Prevent directory browsing
Options -Indexes

# Disable server signature
ServerSignature Off

# Prevent access to sensitive files
<FilesMatch "\.(env|log|ini|conf|config|bak|backup|old|tmp|temp)$">
    Order Deny,Allow
    Deny from all
</FilesMatch>

# Security headers for any accidental access
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "no-referrer"
    Header always set Content-Security-Policy "default-src 'none'"
</IfModule>

# Disable PHP execution in upload directories
<IfModule mod_php7.c>
    php_flag engine off
</IfModule>
<IfModule mod_php8.c>
    php_flag engine off
</IfModule>

# Remove server information
<IfModule mod_headers.c>
    Header unset Server
    Header unset X-Powered-By
</IfModule>

# Force download for all files (security measure)
<IfModule mod_headers.c>
    Header set Content-Disposition "attachment"
    Header set Content-Type "application/octet-stream"
</IfModule>
HTACCESS;
    }

    /**
     * Verify the security setup.
     */
    private function verifySetup(): void
    {
        $this->info('Verifying security setup...');

        $checks = [
            'storage/app/files directory exists' => is_dir('storage/app/files'),
            'storage/app/files/.htaccess exists' => file_exists('storage/app/files/.htaccess'),
            '.env file is secure' => $this->checkFilePermissions('.env', 0600),
            'storage directories are secure' => $this->checkStoragePermissions(),
        ];

        foreach ($checks as $check => $result) {
            if ($result) {
                $this->line("  ✅ {$check}");
            } else {
                $this->error("  ❌ {$check}");
            }
        }
    }

    /**
     * Verify existing permissions.
     */
    private function verifyPermissions(): int
    {
        $this->info('Verifying existing file permissions...');

        $issues = 0;

        // Check critical files
        $criticalFiles = [
            '.env' => 0600,
            'storage/app/files/.htaccess' => 0644,
        ];

        foreach ($criticalFiles as $file => $expectedPermission) {
            if (file_exists($file)) {
                $actualPermission = fileperms($file) & 0777;
                if ($actualPermission !== $expectedPermission) {
                    $this->error("  ❌ {$file}: expected " . decoct($expectedPermission) . ", got " . decoct($actualPermission));
                    $issues++;
                } else {
                    $this->line("  ✅ {$file}: " . decoct($actualPermission));
                }
            } else {
                $this->warn("  ⚠️  {$file}: file not found");
                $issues++;
            }
        }

        // Check directories
        $criticalDirectories = [
            'storage/app/files' => 0750,
            'storage/logs' => 0755,
        ];

        foreach ($criticalDirectories as $directory => $expectedPermission) {
            if (is_dir($directory)) {
                $actualPermission = fileperms($directory) & 0777;
                if ($actualPermission !== $expectedPermission) {
                    $this->error("  ❌ {$directory}: expected " . decoct($expectedPermission) . ", got " . decoct($actualPermission));
                    $issues++;
                } else {
                    $this->line("  ✅ {$directory}: " . decoct($actualPermission));
                }
            } else {
                $this->warn("  ⚠️  {$directory}: directory not found");
                $issues++;
            }
        }

        if ($issues === 0) {
            $this->info('✅ All permissions are correctly configured!');
            return 0;
        } else {
            $this->error("❌ Found {$issues} permission issues. Run 'php artisan security:setup-permissions --force' to fix them.");
            return 1;
        }
    }

    /**
     * Check file permissions.
     */
    private function checkFilePermissions(string $file, int $expectedPermission): bool
    {
        if (!file_exists($file)) {
            return false;
        }

        $actualPermission = fileperms($file) & 0777;
        return $actualPermission === $expectedPermission;
    }

    /**
     * Check storage permissions.
     */
    private function checkStoragePermissions(): bool
    {
        $directories = [
            'storage/app/files' => 0750,
            'storage/logs' => 0755,
        ];

        foreach ($directories as $directory => $expectedPermission) {
            if (!is_dir($directory)) {
                return false;
            }

            $actualPermission = fileperms($directory) & 0777;
            if ($actualPermission !== $expectedPermission) {
                return false;
            }
        }

        return true;
    }
}