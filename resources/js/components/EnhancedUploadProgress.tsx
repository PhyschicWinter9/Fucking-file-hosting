import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Clock, Download, File, Loader2, Pause, Play, TrendingUp, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface EnhancedUploadProgressProps {
    /** File being uploaded */
    file: File;
    /** Progress value from 0 to 100 */
    progress: number;
    /** Current status of the upload */
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled' | 'paused';
    /** Error message if any */
    error?: string;
    /** Uploaded bytes */
    uploadedBytes: number;
    /** Upload speed in bytes per second */
    speed?: number;
    /** Estimated time remaining in seconds */
    eta?: number;
    /** Whether this is a chunked upload */
    isChunked?: boolean;
    /** Current chunk information for chunked uploads */
    chunkInfo?: {
        currentChunk: number;
        totalChunks: number;
        chunkSize: number;
    };
    /** File ID when completed */
    fileId?: string;
    /** Download URL when completed */
    downloadUrl?: string;
    /** Whether file is a duplicate */
    isDuplicate?: boolean;
    /** Space saved from deduplication */
    spaceSaved?: number;
    /** Callback to cancel upload */
    onCancel?: () => void;
    /** Callback to pause/resume upload */
    onPauseResume?: () => void;
    /** Callback to retry upload */
    onRetry?: () => void;
    /** Callback to remove from list */
    onRemove?: () => void;
    /** Custom className */
    className?: string;
}

const EnhancedUploadProgress: React.FC<EnhancedUploadProgressProps> = ({
    file,
    progress,
    status,
    error,
    uploadedBytes,
    speed,
    eta,
    isChunked = false,
    chunkInfo,
    fileId,
    downloadUrl,
    isDuplicate = false,
    spaceSaved,
    onCancel,
    onPauseResume,
    onRetry,
    onRemove,
    className,
}) => {
    const [displaySpeed, setDisplaySpeed] = useState<number>(0);
    const [displayEta, setDisplayEta] = useState<number>(0);
    const [averageSpeed, setAverageSpeed] = useState<number>(0);
    const [speedHistory, setSpeedHistory] = useState<number[]>([]);

    // Smooth speed and ETA updates
    useEffect(() => {
        if (speed !== undefined) {
            setSpeedHistory((prev) => {
                const newHistory = [...prev, speed].slice(-10); // Keep last 10 readings
                const avg = newHistory.reduce((sum, s) => sum + s, 0) / newHistory.length;
                setAverageSpeed(avg);
                return newHistory;
            });

            // Smooth speed transition
            const speedDiff = speed - displaySpeed;
            const speedStep = speedDiff * 0.3;
            setDisplaySpeed((prev) => prev + speedStep);
        }

        if (eta !== undefined) {
            // Smooth ETA transition
            const etaDiff = eta - displayEta;
            const etaStep = etaDiff * 0.2;
            setDisplayEta((prev) => Math.max(0, prev + etaStep));
        }
    }, [speed, eta, displaySpeed, displayEta]);

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

    // Get status color and icon
    const getStatusInfo = () => {
        switch (status) {
            case 'pending':
                return {
                    color: 'text-muted-foreground',
                    bgColor: 'bg-muted',
                    icon: <Clock className="h-4 w-4" />,
                    label: 'Pending',
                };
            case 'uploading':
                return {
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
                    icon: <Loader2 className="h-4 w-4 animate-spin" />,
                    label: 'Uploading',
                };
            case 'paused':
                return {
                    color: 'text-yellow-600',
                    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
                    icon: <Pause className="h-4 w-4" />,
                    label: 'Paused',
                };
            case 'completed':
                return {
                    color: 'text-green-600',
                    bgColor: 'bg-green-100 dark:bg-green-900/20',
                    icon: <CheckCircle className="h-4 w-4" />,
                    label: isDuplicate ? 'Duplicate Found' : 'Completed',
                };
            case 'error':
                return {
                    color: 'text-red-600',
                    bgColor: 'bg-red-100 dark:bg-red-900/20',
                    icon: <AlertCircle className="h-4 w-4" />,
                    label: 'Error',
                };
            case 'cancelled':
                return {
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
                    icon: <X className="h-4 w-4" />,
                    label: 'Cancelled',
                };
            default:
                return {
                    color: 'text-muted-foreground',
                    bgColor: 'bg-muted',
                    icon: <File className="h-4 w-4" />,
                    label: 'Unknown',
                };
        }
    };

    const statusInfo = getStatusInfo();

    return (
        <Card className={cn('transition-all duration-300', className)}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="mt-1 flex-shrink-0">
                            <File className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                                <h4 className="truncate text-sm font-medium" title={file.name}>
                                    {file.name}
                                </h4>
                                <Badge variant="secondary" className={cn('text-xs', statusInfo.bgColor, statusInfo.color)}>
                                    {statusInfo.icon}
                                    <span className="ml-1">{statusInfo.label}</span>
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{formatFileSize(file.size)}</span>
                                {isChunked && (
                                    <span className="flex items-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        Chunked Upload
                                    </span>
                                )}
                                {isDuplicate && <span className="font-medium text-green-600">Saved {formatFileSize(spaceSaved || 0)}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-shrink-0 items-center gap-1">
                        {status === 'uploading' && onPauseResume && (
                            <Button variant="ghost" size="sm" onClick={onPauseResume} className="h-8 w-8 p-0" title="Pause upload">
                                <Pause className="h-4 w-4" />
                            </Button>
                        )}

                        {status === 'paused' && onPauseResume && (
                            <Button variant="ghost" size="sm" onClick={onPauseResume} className="h-8 w-8 p-0" title="Resume upload">
                                <Play className="h-4 w-4" />
                            </Button>
                        )}

                        {(status === 'uploading' || status === 'pending') && onCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onCancel}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                title="Cancel upload"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}

                        {status === 'error' && onRetry && (
                            <Button variant="ghost" size="sm" onClick={onRetry} className="h-8 w-8 p-0" title="Retry upload">
                                <Play className="h-4 w-4" />
                            </Button>
                        )}

                        {status === 'completed' && downloadUrl && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(downloadUrl, '_blank')}
                                className="h-8 w-8 p-0"
                                title="Download file"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        )}

                        {(status === 'completed' || status === 'error' || status === 'cancelled') && onRemove && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRemove}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                title="Remove from list"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-0">
                {/* Progress bar */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                            {formatFileSize(uploadedBytes)} / {formatFileSize(file.size)}
                        </span>
                        <span className="font-mono font-medium">{Math.round(progress)}%</span>
                    </div>

                    <div className="relative">
                        <Progress value={progress} className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" />

                        {/* Custom gradient with animation */}
                        {status === 'uploading' && (
                            <div
                                className="absolute top-0 left-0 h-full overflow-hidden rounded-full"
                                style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #FE7131, #F88F21)',
                                    transition: 'width 0.3s ease',
                                }}
                            >
                                <div className="animate-shimmer absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.3)_0%,rgba(255,255,255,0)_50%,rgba(255,255,255,0.3)_100%)]" />
                            </div>
                        )}

                        {/* Completed state */}
                        {status === 'completed' && <div className="absolute top-0 left-0 h-full w-full rounded-full bg-green-500" />}

                        {/* Error state */}
                        {status === 'error' && (
                            <div className="absolute top-0 left-0 h-full rounded-full bg-red-500" style={{ width: `${progress}%` }} />
                        )}
                    </div>
                </div>

                {/* Upload statistics */}
                {(status === 'uploading' || status === 'paused') && (
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                <span>Speed</span>
                            </div>
                            <div className="font-mono font-medium">{displaySpeed > 0 ? formatSpeed(displaySpeed) : '—'}</div>
                            {/* {averageSpeed > 0 && averageSpeed !== displaySpeed && (
                                <div className="text-xs text-muted-foreground">
                                    Avg: {formatSpeed(averageSpeed)}
                                </div>
                            )} */}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>Time Left</span>
                            </div>
                            <div className="font-mono font-medium">{displayEta > 0 ? formatTime(displayEta) : '—'}</div>
                        </div>
                    </div>
                )}

                {/* Chunked upload info */}
                {isChunked && chunkInfo && status === 'uploading' && (
                    <div className="mt-4 rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Chunk Progress</span>
                            <span className="font-mono font-medium">
                                {chunkInfo.currentChunk} / {chunkInfo.totalChunks}
                            </span>
                        </div>
                        <div className="mt-2">
                            <Progress value={(chunkInfo.currentChunk / chunkInfo.totalChunks) * 100} className="h-1" />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Chunk size: {formatFileSize(chunkInfo.chunkSize)}</div>
                    </div>
                )}

                {/* Error message */}
                {status === 'error' && error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">Upload Failed</p>
                                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success message for duplicates */}
                {status === 'completed' && isDuplicate && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200">Duplicate File Detected</p>
                                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                                    This file already exists. Saved {formatFileSize(spaceSaved || 0)} of storage space.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EnhancedUploadProgress;
