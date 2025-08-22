<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use PDO;
use Exception;

class SetupController extends Controller
{
    /**
     * Display the setup wizard.
     */
    public function index(): Response
    {
        // Check if setup is already completed
        $setupStatus = $this->getSetupStatus();

        return Inertia::render('Setup/Index', [
            'setupStatus' => $setupStatus,
            'phpInfo' => $this->getPhpInfo(),
            'systemRequirements' => $this->checkSystemRequirements(),
        ]);
    }

    /**
     * Get current setup status.
     */
    private function getSetupStatus(): array
    {
        $envPath = base_path('.env');
        $hasEnvFile = File::exists($envPath);

        $hasDatabase = false;
        $hasTables = false;

        if ($hasEnvFile) {
            try {
                // Test database connection
                DB::connection()->getPdo();
                $hasDatabase = true;

                // Check if required tables exist
                $hasTables = Schema::hasTable('files') &&
                           Schema::hasTable('upload_sessions') &&
                           Schema::hasTable('users');
            } catch (Exception $e) {
                $hasDatabase = false;
            }
        }

        return [
            'has_env_file' => $hasEnvFile,
            'has_database' => $hasDatabase,
            'has_tables' => $hasTables,
            'is_completed' => $hasEnvFile && $hasDatabase && $hasTables,
        ];
    }

    /**
     * Get PHP information for setup.
     */
    private function getPhpInfo(): array
    {
        return [
            'version' => PHP_VERSION,
            'extensions' => [
                'pdo' => extension_loaded('pdo'),
                'pdo_mysql' => extension_loaded('pdo_mysql'),
                'pdo_sqlite' => extension_loaded('pdo_sqlite'),
                'openssl' => extension_loaded('openssl'),
                'mbstring' => extension_loaded('mbstring'),
                'tokenizer' => extension_loaded('tokenizer'),
                'xml' => extension_loaded('xml'),
                'ctype' => extension_loaded('ctype'),
                'json' => extension_loaded('json'),
                'bcmath' => extension_loaded('bcmath'),
                'fileinfo' => extension_loaded('fileinfo'),
                'gd' => extension_loaded('gd'),
                'curl' => extension_loaded('curl'),
            ],
            'settings' => [
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'post_max_size' => ini_get('post_max_size'),
                'max_execution_time' => ini_get('max_execution_time'),
                'memory_limit' => ini_get('memory_limit'),
                'max_input_vars' => ini_get('max_input_vars'),
            ],
        ];
    }

    /**
     * Check system requirements.
     */
    private function checkSystemRequirements(): array
    {
        $requirements = [
            'php_version' => [
                'name' => 'PHP Version >= 8.2',
                'required' => true,
                'met' => version_compare(PHP_VERSION, '8.2.0', '>='),
                'current' => PHP_VERSION,
            ],
            'pdo_extension' => [
                'name' => 'PDO Extension',
                'required' => true,
                'met' => extension_loaded('pdo'),
                'current' => extension_loaded('pdo') ? 'Installed' : 'Missing',
            ],
            'openssl_extension' => [
                'name' => 'OpenSSL Extension',
                'required' => true,
                'met' => extension_loaded('openssl'),
                'current' => extension_loaded('openssl') ? 'Installed' : 'Missing',
            ],
            'mbstring_extension' => [
                'name' => 'Mbstring Extension',
                'required' => true,
                'met' => extension_loaded('mbstring'),
                'current' => extension_loaded('mbstring') ? 'Installed' : 'Missing',
            ],
            'fileinfo_extension' => [
                'name' => 'Fileinfo Extension',
                'required' => true,
                'met' => extension_loaded('fileinfo'),
                'current' => extension_loaded('fileinfo') ? 'Installed' : 'Missing',
            ],
            'writable_storage' => [
                'name' => 'Storage Directory Writable',
                'required' => true,
                'met' => is_writable(storage_path()),
                'current' => is_writable(storage_path()) ? 'Writable' : 'Not Writable',
            ],
            'writable_bootstrap_cache' => [
                'name' => 'Bootstrap Cache Writable',
                'required' => true,
                'met' => is_writable(base_path('bootstrap/cache')),
                'current' => is_writable(base_path('bootstrap/cache')) ? 'Writable' : 'Not Writable',
            ],
        ];

        return $requirements;
    }

    /**
     * Test database connection.
     */
    public function testDatabase(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'dbConnection' => 'required|string|in:mysql,sqlite',
            'dbHost' => 'required_if:dbConnection,mysql|string',
            'dbPort' => 'required_if:dbConnection,mysql|integer',
            'dbDatabase' => 'required|string',
            'dbUsername' => 'required_if:dbConnection,mysql|string',
            'dbPassword' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $config = $request->all();

            if ($config['dbConnection'] === 'mysql') {
                $dsn = "mysql:host={$config['dbHost']};port={$config['dbPort']};dbname={$config['dbDatabase']}";
                $pdo = new PDO($dsn, $config['dbUsername'], $config['dbPassword']);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                // Test the connection
                $pdo->query('SELECT 1');

                return response()->json([
                    'success' => true,
                    'message' => 'MySQL connection successful'
                ]);
            } else {
                // SQLite
                $dbPath = database_path($config['dbDatabase']);
                $dbDir = dirname($dbPath);

                // Create directory if it doesn't exist
                if (!is_dir($dbDir)) {
                    mkdir($dbDir, 0755, true);
                }

                $dsn = "sqlite:{$dbPath}";
                $pdo = new PDO($dsn);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                return response()->json([
                    'success' => true,
                    'message' => 'SQLite connection successful'
                ]);
            }
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Database connection failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save setup configuration.
     */
    public function save(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            // Database Configuration
            'dbConnection' => 'required|string|in:mysql,sqlite',
            'dbHost' => 'required_if:dbConnection,mysql|string',
            'dbPort' => 'required_if:dbConnection,mysql|integer',
            'dbDatabase' => 'required|string',
            'dbUsername' => 'required_if:dbConnection,mysql|string',
            'dbPassword' => 'nullable|string',

            // Basic Settings
            'appName' => 'required|string|max:255',
            'appUrl' => 'required|url',
            'appEnv' => 'required|string|in:local,production',
            'appDebug' => 'required|boolean',

            // Upload Settings
            'maxFileSize' => 'required|integer|min:1048576', // At least 1MB
            'maxFileSizeMB' => 'required|integer|min:1',
            'storageDisk' => 'required|string|in:local,public,s3',
            'filesStoragePath' => 'required|string',

            // Privacy Settings
            'disableIpLogging' => 'required|boolean',
            'disableUserTracking' => 'required|boolean',
            'privacyMode' => 'required|string|in:strict,moderate,minimal',

            // Security Settings
            'rateLimitingEnabled' => 'required|boolean',
            'rateLimitUploads' => 'required|integer|min:1|max:1000',
            'rateLimitDownloads' => 'required|integer|min:1|max:10000',

            // File Management
            'defaultExpirationDays' => 'required|integer|min:1|max:365',
            'allowOwnerDelete' => 'required|boolean',
            'enableFileInfoPage' => 'required|boolean',

            // Admin User
            'adminName' => 'required|string|max:255',
            'adminEmail' => 'required|email|max:255',
            'adminPassword' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $config = $request->all();

            // Step 1: Create/Update .env file
            $this->createEnvFile($config);

            // Step 2: Test database connection
            $this->testDatabaseConnection($config);

            // Step 3: Run migrations
            $this->runMigrations();

            // Step 4: Create admin user
            $this->createAdminUser($config);

            // Step 5: Create necessary directories
            $this->createDirectories($config);

            // Step 6: Generate application key if needed
            $this->generateAppKey();

            // Step 7: Clear caches
            $this->clearCaches();

            return response()->json([
                'success' => true,
                'message' => 'Setup completed successfully! Your file hosting application is ready to use.'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Setup failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update .env file.
     */
    private function createEnvFile(array $config): void
    {
        $envPath = base_path('.env');
        $envExamplePath = base_path('.env.example');

        // Start with .env.example if .env doesn't exist
        if (!File::exists($envPath) && File::exists($envExamplePath)) {
            File::copy($envExamplePath, $envPath);
        }

        $envContent = File::exists($envPath) ? File::get($envPath) : '';

        // Database configuration
        if ($config['dbConnection'] === 'mysql') {
            $envUpdates = [
                'DB_CONNECTION' => 'mysql',
                'DB_HOST' => $config['dbHost'],
                'DB_PORT' => $config['dbPort'],
                'DB_DATABASE' => $config['dbDatabase'],
                'DB_USERNAME' => $config['dbUsername'],
                'DB_PASSWORD' => $config['dbPassword'] ?? '',
            ];
        } else {
            $envUpdates = [
                'DB_CONNECTION' => 'sqlite',
                'DB_DATABASE' => database_path($config['dbDatabase']),
            ];
        }

        // Application configuration
        $envUpdates = array_merge($envUpdates, [
            'APP_NAME' => '"' . $config['appName'] . '"',
            'APP_ENV' => $config['appEnv'],
            'APP_DEBUG' => $config['appDebug'] ? 'true' : 'false',
            'APP_URL' => $config['appUrl'],

            // File hosting configuration
            'MAX_FILE_SIZE_MB' => $config['maxFileSizeMB'],
            'MAX_FILE_SIZE' => $config['maxFileSize'],
            'FILESYSTEM_DISK' => $config['storageDisk'],
            'FILES_STORAGE_PATH' => $config['filesStoragePath'],

            // Privacy configuration
            'DISABLE_IP_LOGGING' => $config['disableIpLogging'] ? 'true' : 'false',
            'DISABLE_USER_TRACKING' => $config['disableUserTracking'] ? 'true' : 'false',
            'PRIVACY_MODE' => $config['privacyMode'],

            // Security configuration
            'RATE_LIMITING_ENABLED' => $config['rateLimitingEnabled'] ? 'true' : 'false',
            'RATE_LIMIT_UPLOADS' => $config['rateLimitUploads'],
            'RATE_LIMIT_DOWNLOADS' => $config['rateLimitDownloads'],

            // File management
            'DEFAULT_EXPIRATION_DAYS' => $config['defaultExpirationDays'],
            'ALLOW_OWNER_DELETE' => $config['allowOwnerDelete'] ? 'true' : 'false',
            'ENABLE_FILE_INFO_PAGE' => $config['enableFileInfoPage'] ? 'true' : 'false',
        ]);

        // Update .env file
        foreach ($envUpdates as $key => $value) {
            $pattern = "/^{$key}=.*/m";
            $replacement = "{$key}={$value}";

            if (preg_match($pattern, $envContent)) {
                $envContent = preg_replace($pattern, $replacement, $envContent);
            } else {
                $envContent .= "\n{$replacement}";
            }
        }

        File::put($envPath, $envContent);
    }

    /**
     * Test database connection with new configuration.
     */
    private function testDatabaseConnection(array $config): void
    {
        if ($config['dbConnection'] === 'mysql') {
            $dsn = "mysql:host={$config['dbHost']};port={$config['dbPort']};dbname={$config['dbDatabase']}";
            $pdo = new PDO($dsn, $config['dbUsername'], $config['dbPassword']);
        } else {
            $dbPath = database_path($config['dbDatabase']);
            $dbDir = dirname($dbPath);

            if (!is_dir($dbDir)) {
                mkdir($dbDir, 0755, true);
            }

            $dsn = "sqlite:{$dbPath}";
            $pdo = new PDO($dsn);
        }

        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->query('SELECT 1'); // Test query
    }

    /**
     * Run database migrations.
     */
    private function runMigrations(): void
    {
        Artisan::call('migrate', ['--force' => true]);
    }

    /**
     * Create admin user.
     */
    private function createAdminUser(array $config): void
    {
        $userModel = config('auth.providers.users.model', 'App\\Models\\User');

        // Check if user already exists
        if ($userModel::where('email', $config['adminEmail'])->exists()) {
            return; // User already exists
        }

        $userModel::create([
            'name' => $config['adminName'],
            'email' => $config['adminEmail'],
            'password' => bcrypt($config['adminPassword']),
            'email_verified_at' => now(),
        ]);
    }

    /**
     * Create necessary directories.
     */
    private function createDirectories(array $config): void
    {
        $directories = [
            storage_path('app/files'),
            storage_path('app/chunks'),
            storage_path('logs'),
            public_path('storage'),
        ];

        foreach ($directories as $directory) {
            if (!is_dir($directory)) {
                mkdir($directory, 0755, true);
            }
        }

        // Create storage link if it doesn't exist
        if (!file_exists(public_path('storage'))) {
            Artisan::call('storage:link');
        }
    }

    /**
     * Generate application key if needed.
     */
    private function generateAppKey(): void
    {
        if (empty(config('app.key'))) {
            Artisan::call('key:generate', ['--force' => true]);
        }
    }

    /**
     * Clear application caches.
     */
    private function clearCaches(): void
    {
        Artisan::call('config:clear');
        Artisan::call('route:clear');
        Artisan::call('view:clear');

        if (function_exists('opcache_reset')) {
            opcache_reset();
        }
    }

    /**
     * Check if setup is required.
     */
    public function checkSetup(): JsonResponse
    {
        // Check if basic configuration exists
        $requiredSettings = [
            'APP_NAME',
            'MAX_FILE_SIZE_MB',
            'RATE_LIMITING_ENABLED'
        ];

        $missingSettings = [];
        foreach ($requiredSettings as $setting) {
            if (empty(env($setting))) {
                $missingSettings[] = $setting;
            }
        }

        return response()->json([
            'setup_required' => !empty($missingSettings),
            'missing_settings' => $missingSettings
        ]);
    }
}
