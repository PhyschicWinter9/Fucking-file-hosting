import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { Head, router } from '@inertiajs/react';
import { CheckCircle, HardDrive, Lock, Server, Settings, Upload } from 'lucide-react';
import { useState } from 'react';

interface SetupStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
}

interface SetupConfig {
    // Database Settings
    dbConnection: string;
    dbHost: string;
    dbPort: number;
    dbDatabase: string;
    dbUsername: string;
    dbPassword: string;

    // Basic Settings
    appName: string;
    appUrl: string;
    appEnv: string;
    appDebug: boolean;

    // Upload Settings
    maxFileSize: number;
    maxFileSizeMB: number;

    // Storage Settings
    storageDisk: string;
    filesStoragePath: string;

    // Privacy Settings
    disableIpLogging: boolean;
    disableUserTracking: boolean;
    privacyMode: string;

    // Security Settings
    rateLimitingEnabled: boolean;
    rateLimitUploads: number;
    rateLimitDownloads: number;

    // File Management
    defaultExpirationDays: number;
    allowOwnerDelete: boolean;
    enableFileInfoPage: boolean;

    // Admin User
    adminName: string;
    adminEmail: string;
    adminPassword: string;
}

interface SetupPageProps {
    setupStatus: {
        has_env_file: boolean;
        has_database: boolean;
        has_tables: boolean;
        is_completed: boolean;
    };
    phpInfo: {
        version: string;
        extensions: Record<string, boolean>;
        settings: Record<string, string>;
    };
    systemRequirements: Record<
        string,
        {
            name: string;
            required: boolean;
            met: boolean;
            current: string;
        }
    >;
}

export default function SetupIndex({ setupStatus, phpInfo, systemRequirements }: SetupPageProps) {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [config, setConfig] = useState<SetupConfig>({
        // Database Settings
        dbConnection: 'sqlite',
        dbHost: 'localhost',
        dbPort: 3306,
        dbDatabase: 'database.sqlite',
        dbUsername: '',
        dbPassword: '',

        // Basic Settings
        appName: 'Fast File Hosting',
        appUrl: window.location.origin,
        appEnv: 'production',
        appDebug: false,

        // Upload Settings
        maxFileSize: 104857600, // 100MB
        maxFileSizeMB: 100,

        // Storage Settings
        storageDisk: 'local',
        filesStoragePath: 'storage/app/files',

        // Privacy Settings
        disableIpLogging: true,
        disableUserTracking: true,
        privacyMode: 'strict',

        // Security Settings
        rateLimitingEnabled: true,
        rateLimitUploads: 10,
        rateLimitDownloads: 60,

        // File Management
        defaultExpirationDays: 1,
        allowOwnerDelete: true,
        enableFileInfoPage: true,

        // Admin User
        adminName: '',
        adminEmail: '',
        adminPassword: '',
    });

    const steps: SetupStep[] = [
        {
            id: 'requirements',
            title: 'System Requirements',
            description: 'Check system requirements and PHP configuration',
            icon: <Server className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'database',
            title: 'Database Configuration',
            description: 'Configure your database connection',
            icon: <HardDrive className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'basic',
            title: 'Basic Configuration',
            description: 'Configure your application settings',
            icon: <Settings className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'upload',
            title: 'Upload Settings',
            description: 'Set file size limits and upload configuration',
            icon: <Upload className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'privacy',
            title: 'Privacy & Security',
            description: 'Configure privacy and security settings',
            icon: <Lock className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'admin',
            title: 'Admin Account',
            description: 'Create your administrator account',
            icon: <Settings className="h-6 w-6" />,
            completed: false,
        },
        {
            id: 'complete',
            title: 'Complete Setup',
            description: 'Review and apply configuration',
            icon: <CheckCircle className="h-6 w-6" />,
            completed: false,
        },
    ];

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const testDatabaseConnection = async () => {
        setIsLoading(true);
        setDbTestResult(null);

        try {
            const response = await fetch('/api/setup/test-database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    dbConnection: config.dbConnection,
                    dbHost: config.dbHost,
                    dbPort: config.dbPort,
                    dbDatabase: config.dbDatabase,
                    dbUsername: config.dbUsername,
                    dbPassword: config.dbPassword,
                }),
            });

            const result = await response.json();
            setDbTestResult(result);

            if (result.success) {
                toast({
                    title: 'Database Connection Successful',
                    description: result.message,
                    variant: 'success',
                });
            } else {
                toast({
                    title: 'Database Connection Failed',
                    description: result.message,
                    variant: 'destructive',
                });
            }
        } catch {
            const errorMessage = 'Failed to test database connection';
            setDbTestResult({ success: false, message: errorMessage });
            toast({
                title: 'Connection Test Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/setup/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify(config),
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'Setup Complete!',
                    description: result.message,
                    variant: 'success',
                });

                // Redirect to main page after successful setup
                setTimeout(() => {
                    router.visit('/');
                }, 3000);
            } else {
                throw new Error(result.message || 'Failed to save configuration');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration. Please try again.';
            toast({
                title: 'Setup Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (steps[currentStep].id) {
            case 'requirements':
                return (
                    <div className="space-y-6">
                        <div className="mb-6 text-center">
                            <h3 className="mb-2 text-xl font-semibold">System Requirements Check</h3>
                            <p className="text-muted-foreground">Please ensure all requirements are met before proceeding.</p>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(systemRequirements).map(([key, requirement]) => (
                                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <div className="font-medium">{requirement.name}</div>
                                        <div className="text-sm text-muted-foreground">Current: {requirement.current}</div>
                                    </div>
                                    <div
                                        className={`rounded-full px-3 py-1 text-sm ${
                                            requirement.met ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {requirement.met ? '✓ Met' : '✗ Failed'}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-lg bg-blue-50 p-4">
                            <h4 className="mb-2 font-medium">PHP Information</h4>
                            <div className="space-y-1 text-sm">
                                <div>Version: {phpInfo.version}</div>
                                <div>Upload Max Filesize: {phpInfo.settings.upload_max_filesize}</div>
                                <div>Post Max Size: {phpInfo.settings.post_max_size}</div>
                                <div>Memory Limit: {phpInfo.settings.memory_limit}</div>
                            </div>
                        </div>
                    </div>
                );

            case 'database':
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="dbConnection">Database Type</Label>
                            <Select value={config.dbConnection} onValueChange={(value) => setConfig({ ...config, dbConnection: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sqlite">SQLite (Recommended for shared hosting)</SelectItem>
                                    <SelectItem value="mysql">MySQL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {config.dbConnection === 'mysql' && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="dbHost">Database Host</Label>
                                        <Input
                                            id="dbHost"
                                            value={config.dbHost}
                                            onChange={(e) => setConfig({ ...config, dbHost: e.target.value })}
                                            placeholder="localhost"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="dbPort">Port</Label>
                                        <Input
                                            id="dbPort"
                                            type="number"
                                            value={config.dbPort}
                                            onChange={(e) => setConfig({ ...config, dbPort: parseInt(e.target.value) })}
                                            placeholder="3306"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="dbUsername">Database Username</Label>
                                    <Input
                                        id="dbUsername"
                                        value={config.dbUsername}
                                        onChange={(e) => setConfig({ ...config, dbUsername: e.target.value })}
                                        placeholder="username"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="dbPassword">Database Password</Label>
                                    <Input
                                        id="dbPassword"
                                        type="password"
                                        value={config.dbPassword}
                                        onChange={(e) => setConfig({ ...config, dbPassword: e.target.value })}
                                        placeholder="password"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <Label htmlFor="dbDatabase">{config.dbConnection === 'mysql' ? 'Database Name' : 'Database File Name'}</Label>
                            <Input
                                id="dbDatabase"
                                value={config.dbDatabase}
                                onChange={(e) => setConfig({ ...config, dbDatabase: e.target.value })}
                                placeholder={config.dbConnection === 'mysql' ? 'filehosting' : 'database.sqlite'}
                            />
                        </div>

                        <div className="flex items-center space-x-4">
                            <Button onClick={testDatabaseConnection} disabled={isLoading} variant="outline">
                                {isLoading ? 'Testing...' : 'Test Connection'}
                            </Button>

                            {dbTestResult && (
                                <div
                                    className={`rounded-full px-3 py-1 text-sm ${
                                        dbTestResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}
                                >
                                    {dbTestResult.success ? '✓ Connected' : '✗ Failed'}
                                </div>
                            )}
                        </div>

                        {dbTestResult && !dbTestResult.success && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-sm text-red-800">{dbTestResult.message}</p>
                            </div>
                        )}
                    </div>
                );

            case 'basic':
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="appName">Application Name</Label>
                            <Input
                                id="appName"
                                value={config.appName}
                                onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                                placeholder="Fast File Hosting"
                            />
                        </div>
                        <div>
                            <Label htmlFor="appUrl">Application URL</Label>
                            <Input
                                id="appUrl"
                                value={config.appUrl}
                                onChange={(e) => setConfig({ ...config, appUrl: e.target.value })}
                                placeholder="https://yoursite.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="appEnv">Environment</Label>
                            <Select value={config.appEnv} onValueChange={(value) => setConfig({ ...config, appEnv: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="production">Production</SelectItem>
                                    <SelectItem value="local">Local Development</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="appDebug"
                                checked={config.appDebug}
                                onChange={(e) => setConfig({ ...config, appDebug: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="appDebug">Enable Debug Mode (only for development)</Label>
                        </div>
                    </div>
                );

            case 'upload':
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="maxFileSizeMB">Maximum File Size (MB)</Label>
                            <Select
                                value={config.maxFileSizeMB.toString()}
                                onValueChange={(value) => {
                                    const mb = parseInt(value);
                                    setConfig({
                                        ...config,
                                        maxFileSizeMB: mb,
                                        maxFileSize: mb * 1024 * 1024,
                                    });
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10 MB</SelectItem>
                                    <SelectItem value="25">25 MB</SelectItem>
                                    <SelectItem value="50">50 MB</SelectItem>
                                    <SelectItem value="100">100 MB</SelectItem>
                                    <SelectItem value="500">500 MB</SelectItem>
                                    <SelectItem value="1024">1 GB</SelectItem>
                                    <SelectItem value="5120">5 GB</SelectItem>
                                    <SelectItem value="10240">10 GB</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="mt-2 text-sm text-muted-foreground">Current limit: {formatFileSize(config.maxFileSize)}</p>
                        </div>
                        <div>
                            <Label htmlFor="defaultExpiration">Default File Expiration (Days)</Label>
                            <Select
                                value={config.defaultExpirationDays.toString()}
                                onValueChange={(value) => setConfig({ ...config, defaultExpirationDays: parseInt(value) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 Day</SelectItem>
                                    <SelectItem value="7">7 Days</SelectItem>
                                    <SelectItem value="14">14 Days</SelectItem>
                                    <SelectItem value="30">30 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'privacy':
                return (
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="storageDisk">Storage Disk</Label>
                            <Select value={config.storageDisk} onValueChange={(value) => setConfig({ ...config, storageDisk: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">Local Storage</SelectItem>
                                    <SelectItem value="public">Public Storage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="filesStoragePath">Files Storage Path</Label>
                            <Input
                                id="filesStoragePath"
                                value={config.filesStoragePath}
                                onChange={(e) => setConfig({ ...config, filesStoragePath: e.target.value })}
                                placeholder="storage/app/files"
                            />
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="mb-4 font-medium">Privacy Settings</h4>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="disableIpLogging"
                                        checked={config.disableIpLogging}
                                        onChange={(e) => setConfig({ ...config, disableIpLogging: e.target.checked })}
                                        className="rounded"
                                    />
                                    <Label htmlFor="disableIpLogging">Disable IP Logging</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="disableUserTracking"
                                        checked={config.disableUserTracking}
                                        onChange={(e) => setConfig({ ...config, disableUserTracking: e.target.checked })}
                                        className="rounded"
                                    />
                                    <Label htmlFor="disableUserTracking">Disable User Tracking</Label>
                                </div>
                                <div>
                                    <Label htmlFor="privacyMode">Privacy Mode</Label>
                                    <Select value={config.privacyMode} onValueChange={(value) => setConfig({ ...config, privacyMode: value })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="strict">Strict (No logging)</SelectItem>
                                            <SelectItem value="moderate">Moderate (Basic logs)</SelectItem>
                                            <SelectItem value="minimal">Minimal (Error logs only)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="mb-4 font-medium">Security & Rate Limiting</h4>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="rateLimitingEnabled"
                                        checked={config.rateLimitingEnabled}
                                        onChange={(e) => setConfig({ ...config, rateLimitingEnabled: e.target.checked })}
                                        className="rounded"
                                    />
                                    <Label htmlFor="rateLimitingEnabled">Enable Rate Limiting</Label>
                                </div>
                                {config.rateLimitingEnabled && (
                                    <>
                                        <div>
                                            <Label htmlFor="rateLimitUploads">Upload Rate Limit (per minute)</Label>
                                            <Input
                                                id="rateLimitUploads"
                                                type="number"
                                                value={config.rateLimitUploads}
                                                onChange={(e) => setConfig({ ...config, rateLimitUploads: parseInt(e.target.value) })}
                                                min="1"
                                                max="100"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="rateLimitDownloads">Download Rate Limit (per minute)</Label>
                                            <Input
                                                id="rateLimitDownloads"
                                                type="number"
                                                value={config.rateLimitDownloads}
                                                onChange={(e) => setConfig({ ...config, rateLimitDownloads: parseInt(e.target.value) })}
                                                min="1"
                                                max="1000"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'admin':
                return (
                    <div className="space-y-6">
                        <div className="mb-6 text-center">
                            <h3 className="mb-2 text-xl font-semibold">Create Administrator Account</h3>
                            <p className="text-muted-foreground">This account will have full access to manage your file hosting service.</p>
                        </div>

                        <div>
                            <Label htmlFor="adminName">Full Name</Label>
                            <Input
                                id="adminName"
                                value={config.adminName}
                                onChange={(e) => setConfig({ ...config, adminName: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="adminEmail">Email Address</Label>
                            <Input
                                id="adminEmail"
                                type="email"
                                value={config.adminEmail}
                                onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                                placeholder="admin@yoursite.com"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="adminPassword">Password</Label>
                            <Input
                                id="adminPassword"
                                type="password"
                                value={config.adminPassword}
                                onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
                                placeholder="Enter a strong password"
                                minLength={8}
                                required
                            />
                            <p className="mt-1 text-sm text-muted-foreground">Password must be at least 8 characters long.</p>
                        </div>
                    </div>
                );

            case 'complete':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
                            <h3 className="mb-2 text-2xl font-bold">Setup Complete!</h3>
                            <p className="mb-6 text-muted-foreground">
                                Review your configuration below and click "Apply Configuration" to complete the setup.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                <div>
                                    <strong>App Name:</strong> {config.appName}
                                </div>
                                <div>
                                    <strong>Environment:</strong> {config.appEnv}
                                </div>
                                <div>
                                    <strong>Database:</strong> {config.dbConnection.toUpperCase()}
                                </div>
                                <div>
                                    <strong>Max File Size:</strong> {formatFileSize(config.maxFileSize)}
                                </div>
                                <div>
                                    <strong>Storage:</strong> {config.storageDisk}
                                </div>
                                <div>
                                    <strong>Privacy Mode:</strong> {config.privacyMode}
                                </div>
                                <div>
                                    <strong>Rate Limiting:</strong> {config.rateLimitingEnabled ? 'Enabled' : 'Disabled'}
                                </div>
                                <div>
                                    <strong>Default Expiration:</strong> {config.defaultExpirationDays} days
                                </div>
                                <div>
                                    <strong>Admin Email:</strong> {config.adminEmail}
                                </div>
                            </div>

                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                <h4 className="mb-2 font-medium text-yellow-800">Important Notes:</h4>
                                <ul className="space-y-1 text-sm text-yellow-700">
                                    <li>• The setup will create database tables and configure your application</li>
                                    <li>• Your admin account will be created with the provided credentials</li>
                                    <li>• Make sure to backup your database before making changes</li>
                                    <li>• You can modify these settings later through the admin panel</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // Show completion message if setup is already done
    if (setupStatus.is_completed) {
        return (
            <Layout>
                <Head title="Setup Complete" />
                <div className="container mx-auto max-w-2xl px-4 py-8 text-center">
                    <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
                    <h1 className="mb-4 text-3xl font-bold">Setup Already Complete</h1>
                    <p className="mb-6 text-muted-foreground">Your file hosting application is already configured and ready to use.</p>
                    <Button onClick={() => router.visit('/')}>Go to Application</Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head title="Setup Wizard" />

            <div className="container mx-auto max-w-4xl px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="mb-2 text-3xl font-bold">Setup Wizard</h1>
                    <p className="text-muted-foreground">Configure your file hosting application in a few simple steps</p>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="mb-4 flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
                                <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                        index <= currentStep
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-muted-foreground text-muted-foreground'
                                    }`}
                                >
                                    {index < currentStep ? <CheckCircle className="h-5 w-5" /> : step.icon}
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`mx-4 h-0.5 flex-1 ${index < currentStep ? 'bg-primary' : 'bg-muted'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
                        <p className="text-muted-foreground">{steps[currentStep].description}</p>
                    </div>
                </div>

                {/* Step Content */}
                <Card className="mb-8 p-6">{renderStepContent()}</Card>

                {/* Navigation */}
                <div className="flex justify-between">
                    <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0 || isLoading}>
                        Previous
                    </Button>

                    {currentStep === steps.length - 1 ? (
                        <Button onClick={handleSaveConfig} disabled={isLoading} className="bg-gradient-primary">
                            {isLoading ? 'Setting up...' : 'Complete Setup'}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={isLoading}>
                            Next
                        </Button>
                    )}
                </div>
            </div>
        </Layout>
    );
}
