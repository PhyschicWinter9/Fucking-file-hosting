import FileUploader from '@/components/FileUploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import UploadStatistics from '@/components/UploadStatistics';
import { useUploadStatistics } from '@/hooks/useUploadStatistics';
import { Activity, FileText, Settings, Upload } from 'lucide-react';
import React, { useState } from 'react';

const UploadDemo: React.FC = () => {
    const [enableRealTimeStats, setEnableRealTimeStats] = useState(false);
    const [enableBulkMode, setEnableBulkMode] = useState(true);
    const [maxConcurrentUploads, setMaxConcurrentUploads] = useState(3);
    const [showDetailedStats, setShowDetailedStats] = useState(true);

    const {
        metrics,
        isLoading: metricsLoading,
        error: metricsError,
        fetchMetrics,
        clearError,
    } = useUploadStatistics({
        autoFetch: enableRealTimeStats,
        fetchInterval: 3000, // 3 seconds
    });

    const handleUploadStart = (files: File[]) => {
        console.log('Upload started:', files);
    };

    const handleUploadProgress = (progress: any[]) => {
        console.log('Upload progress:', progress);
    };

    const handleUploadComplete = (fileIds: string[]) => {
        console.log('Upload completed:', fileIds);
        // Refresh metrics after upload completion
        if (enableRealTimeStats) {
            setTimeout(fetchMetrics, 1000);
        }
    };

    const handleUploadError = (error: string) => {
        console.error('Upload error:', error);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-6xl px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="mb-2 text-3xl font-bold">Enhanced Upload Progress Demo</h1>
                    <p className="text-muted-foreground">
                        Experience the improved upload progress section with detailed statistics, real-time speed monitoring, and enhanced visual
                        feedback.
                    </p>
                </div>

                {/* Settings Panel */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Demo Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="real-time-stats" checked={enableRealTimeStats} onCheckedChange={setEnableRealTimeStats} />
                                <Label htmlFor="real-time-stats">Real-time Statistics</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch id="bulk-mode" checked={enableBulkMode} onCheckedChange={setEnableBulkMode} />
                                <Label htmlFor="bulk-mode">Bulk Upload Mode</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch id="detailed-stats" checked={showDetailedStats} onCheckedChange={setShowDetailedStats} />
                                <Label htmlFor="detailed-stats">Detailed Statistics</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Label htmlFor="concurrent-uploads">Max Concurrent:</Label>
                                <select
                                    id="concurrent-uploads"
                                    value={maxConcurrentUploads}
                                    onChange={(e) => setMaxConcurrentUploads(Number(e.target.value))}
                                    className="rounded border px-2 py-1"
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                </select>
                            </div>
                        </div>

                        {metricsError && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-red-800 dark:text-red-200">Error fetching metrics: {metricsError}</p>
                                    <Button variant="ghost" size="sm" onClick={clearError} className="text-red-600 hover:text-red-700">
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Main Upload Area */}
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    File Upload
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FileUploader
                                    onUploadStart={handleUploadStart}
                                    onUploadProgress={handleUploadProgress}
                                    onUploadComplete={handleUploadComplete}
                                    onUploadError={handleUploadError}
                                    maxFileSize={10 * 1024 * 1024 * 1024} // 10GB
                                    multiple={true}
                                    enableBulkMode={enableBulkMode}
                                    maxConcurrentUploads={maxConcurrentUploads}
                                    showExpirationSelector={true}
                                    defaultExpirationDays={7}
                                />
                            </CardContent>
                        </Card>

                        {/* Features Showcase */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Enhanced Features
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <h4 className="font-medium">Progress Enhancements</h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li>• Real-time upload speed display</li>
                                            <li>• Estimated time remaining (ETA)</li>
                                            <li>• Detailed chunk progress for large files</li>
                                            <li>• Visual progress animations</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">Control Features</h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li>• Pause/Resume uploads</li>
                                            <li>• Cancel individual uploads</li>
                                            <li>• Retry failed uploads</li>
                                            <li>• Bulk actions for multiple files</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">Statistics</h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li>• Overall upload progress</li>
                                            <li>• Speed history visualization</li>
                                            <li>• Server performance metrics</li>
                                            <li>• Space saved from deduplication</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">Visual Improvements</h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            <li>• Modern card-based design</li>
                                            <li>• Smooth animations and transitions</li>
                                            <li>• Status badges and icons</li>
                                            <li>• Responsive mobile layout</li>
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Statistics Sidebar */}
                    <div className="space-y-6">
                        {/* Server Metrics */}
                        {enableRealTimeStats && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Server Metrics
                                        {metricsLoading && (
                                            <div className="ml-auto">
                                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                                            </div>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {metrics ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Active Sessions</p>
                                                    <p className="font-semibold">{metrics.active_sessions}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Server Load</p>
                                                    <p className="font-semibold">{metrics.server_load}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Memory Usage</p>
                                                    <p className="font-semibold">{metrics.memory_usage_percent.toFixed(1)}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Disk Usage</p>
                                                    <p className="font-semibold">{metrics.disk_usage_percent.toFixed(1)}%</p>
                                                </div>
                                            </div>

                                            <Separator />

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Can Accept Uploads:</span>
                                                    <span className={`font-medium ${metrics.can_accept_uploads ? 'text-green-600' : 'text-red-600'}`}>
                                                        {metrics.can_accept_uploads ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Recommended Chunk Size:</span>
                                                    <span className="font-medium">{(metrics.recommended_chunk_size / 1024 / 1024).toFixed(1)}MB</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center">
                                            <p className="text-sm text-muted-foreground">Enable real-time statistics to see server metrics</p>
                                            <Button variant="outline" size="sm" onClick={fetchMetrics} className="mt-2" disabled={metricsLoading}>
                                                Fetch Metrics
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Demo Upload Statistics */}
                        <UploadStatistics
                            totalFiles={0}
                            completedFiles={0}
                            failedFiles={0}
                            activeUploads={0}
                            totalBytes={0}
                            uploadedBytes={0}
                            showDetailed={showDetailedStats}
                        />

                        {/* Instructions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>How to Test</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <h4 className="mb-1 font-medium">Small Files (&lt;25MB)</h4>
                                        <p className="text-muted-foreground">Use regular upload with real-time progress and speed display.</p>
                                    </div>

                                    <div>
                                        <h4 className="mb-1 font-medium">Large Files (&gt;25MB)</h4>
                                        <p className="text-muted-foreground">Automatically use chunked upload with detailed chunk progress.</p>
                                    </div>

                                    <div>
                                        <h4 className="mb-1 font-medium">Multiple Files</h4>
                                        <p className="text-muted-foreground">Enable bulk mode to see parallel upload statistics and controls.</p>
                                    </div>

                                    <div>
                                        <h4 className="mb-1 font-medium">Real-time Stats</h4>
                                        <p className="text-muted-foreground">Enable to see live server metrics and performance data.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDemo;
