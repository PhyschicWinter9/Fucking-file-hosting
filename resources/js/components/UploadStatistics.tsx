import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
    Activity,
    CheckCircle,
    Clock,
    Database,
    FileText,
    TrendingUp,
    Upload,
    Zap
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface UploadStatisticsProps {
    /** Total files being uploaded */
    totalFiles: number;
    /** Completed files */
    completedFiles: number;
    /** Failed files */
    failedFiles: number;
    /** Currently uploading files */
    activeUploads: number;
    /** Total bytes to upload */
    totalBytes: number;
    /** Total uploaded bytes */
    uploadedBytes: number;
    /** Current overall upload speed */
    overallSpeed?: number;
    /** Estimated time remaining for all uploads */
    overallEta?: number;
    /** Number of chunked uploads */
    chunkedUploads?: number;
    /** Total space saved from deduplication */
    spaceSaved?: number;
    /** Whether to show detailed statistics */
    showDetailed?: boolean;
    /** Custom className */
    className?: string;
}

const UploadStatistics: React.FC<UploadStatisticsProps> = ({
    totalFiles,
    completedFiles,
    failedFiles,
    activeUploads,
    totalBytes,
    uploadedBytes,
    overallSpeed,
    overallEta,
    chunkedUploads = 0,
    spaceSaved = 0,
    showDetailed = true,
    className,
}) => {
    const [displaySpeed, setDisplaySpeed] = useState<number>(0);
    const [displayEta, setDisplayEta] = useState<number>(0);
    const [speedHistory, setSpeedHistory] = useState<number[]>([]);

    // Smooth speed updates
    useEffect(() => {
        if (overallSpeed !== undefined) {
            setSpeedHistory(prev => {
                const newHistory = [...prev, overallSpeed].slice(-20); // Keep last 20 readings
                return newHistory;
            });
            
            // Smooth speed transition
            const speedDiff = overallSpeed - displaySpeed;
            const speedStep = speedDiff * 0.2;
            setDisplaySpeed(prev => Math.max(0, prev + speedStep));
        }
        
        if (overallEta !== undefined) {
            // Smooth ETA transition
            const etaDiff = overallEta - displayEta;
            const etaStep = etaDiff * 0.15;
            setDisplayEta(prev => Math.max(0, prev + etaStep));
        }
    }, [overallSpeed, overallEta, displaySpeed, displayEta]);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    // Format speed
    const formatSpeed = (bytesPerSecond: number): string => {
        return `${formatFileSize(bytesPerSecond)}/s`;
    };

    // Format time
    const formatTime = (seconds: number): string => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
        return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    // Calculate progress
    const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
    const fileProgress = totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

    // Get peak speed from history
    const peakSpeed = speedHistory.length > 0 ? Math.max(...speedHistory) : 0;
    const averageSpeed = speedHistory.length > 0 
        ? speedHistory.reduce((sum, speed) => sum + speed, 0) / speedHistory.length 
        : 0;

    return (
        <Card className={cn('', className)}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="h-5 w-5" />
                    Upload Statistics
                    {activeUploads > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                            <Upload className="h-3 w-3 mr-1" />
                            {activeUploads} active
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
                {/* Overall Progress */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm font-mono">
                            {Math.round(overallProgress)}%
                        </span>
                    </div>
                    <div className="relative">
                        <Progress value={overallProgress} className="h-3" />
                        {activeUploads > 0 && (
                            <div 
                                className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary to-accent"
                                style={{ width: `${overallProgress}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}</span>
                        <span>{completedFiles} / {totalFiles} files</span>
                    </div>
                </div>

                {/* File Progress */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">File Progress</span>
                        <span className="text-sm font-mono">
                            {Math.round(fileProgress)}%
                        </span>
                    </div>
                    <Progress value={fileProgress} className="h-2" />
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Current Speed */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Current Speed</span>
                        </div>
                        <div className="text-lg font-mono font-semibold">
                            {displaySpeed > 0 ? formatSpeed(displaySpeed) : '—'}
                        </div>
                        {/* {showDetailed && averageSpeed > 0 && (
                            <div className="text-xs text-muted-foreground">
                                Avg: {formatSpeed(averageSpeed)}
                            </div>
                        )} */}
                    </div>

                    {/* Time Remaining */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>Time Left</span>
                        </div>
                        <div className="text-lg font-mono font-semibold">
                            {displayEta > 0 ? formatTime(displayEta) : '—'}
                        </div>
                    </div>

                    {/* Active Uploads */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            <span>Active</span>
                        </div>
                        <div className="text-lg font-semibold">
                            {activeUploads}
                        </div>
                    </div>

                    {/* Completed */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4" />
                            <span>Completed</span>
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                            {completedFiles}
                        </div>
                    </div>
                </div>

                {/* Detailed Statistics */}
                {showDetailed && (
                    <div className="pt-4 border-t space-y-4">
                        <h4 className="font-medium text-sm">Detailed Statistics</h4>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {/* Peak Speed */}
                            {peakSpeed > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Peak Speed:</span>
                                    <span className="font-mono">{formatSpeed(peakSpeed)}</span>
                                </div>
                            )}

                            {/* Chunked Uploads */}
                            {chunkedUploads > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Chunked:
                                    </span>
                                    <span className="font-mono">{chunkedUploads}</span>
                                </div>
                            )}

                            {/* Failed Uploads */}
                            {failedFiles > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Failed:</span>
                                    <span className="font-mono text-red-600">{failedFiles}</span>
                                </div>
                            )}

                            {/* Space Saved */}
                            {spaceSaved > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Database className="h-3 w-3" />
                                        Space Saved:
                                    </span>
                                    <span className="font-mono text-green-600">
                                        {formatFileSize(spaceSaved)}
                                    </span>
                                </div>
                            )}

                            {/* Total Size */}
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Total Size:
                                </span>
                                <span className="font-mono">{formatFileSize(totalBytes)}</span>
                            </div>

                            {/* Efficiency */}
                            {totalBytes > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Efficiency:</span>
                                    <span className="font-mono">
                                        {Math.round((uploadedBytes / totalBytes) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Speed Chart Visualization */}
                        {speedHistory.length > 5 && (
                            <div className="space-y-2">
                                <span className="text-sm text-muted-foreground">Speed History</span>
                                <div className="flex items-end gap-1 h-12">
                                    {speedHistory.slice(-20).map((speed, index) => {
                                        const height = peakSpeed > 0 ? (speed / peakSpeed) * 100 : 0;
                                        return (
                                            <div
                                                key={index}
                                                className="bg-primary/60 rounded-t-sm flex-1 min-w-[2px] transition-all duration-300"
                                                style={{ height: `${height}%` }}
                                                title={formatSpeed(speed)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default UploadStatistics;