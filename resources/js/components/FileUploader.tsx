import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { FileValidation, UploadProgress } from '@/types/upload';
import { Clock, Copy, File, Upload, X } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import ProgressBar from './ProgressBar';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import UploadSuccess from './UploadSuccess';

interface FileUploaderProps {
    onUploadStart?: (files: File[]) => void;
    onUploadProgress?: (progress: UploadProgress[]) => void;
    onUploadComplete?: (fileIds: string[]) => void;
    onUploadError?: (error: string) => void;
    maxFileSize?: number; // in bytes, default 10GB
    allowedTypes?: string[];
    multiple?: boolean;
    className?: string;
    disabled?: boolean;
    showExpirationSelector?: boolean;
    defaultExpirationDays?: number;
    maxConcurrentUploads?: number; // Maximum parallel uploads
    enableBulkMode?: boolean; // Enable enhanced bulk upload features
}

interface FileUploadState {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
    error?: string;
    fileId?: string;
    downloadUrl?: string;
    previewUrl?: string;
    infoUrl?: string;
    expiresAt?: string;
    uploadedBytes: number;
    speed?: number;
    eta?: number;
    isDuplicate?: boolean;
    spaceSaved?: number;
}

interface CompletedFile {
    fileId: string;
    originalName: string;
    downloadUrl: string;
    previewUrl?: string;
    infoUrl?: string;
    expiresAt?: string;
    fileSize: number;
    mimeType: string;
    isDuplicate?: boolean;
    spaceSaved?: number;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
    maxFileSize = 100 * 1024 * 1024, // 100MB (Cloudflare free plan limit)
    allowedTypes,
    multiple = true,
    className,
    disabled = false,
    showExpirationSelector = true,
    defaultExpirationDays = 1,
    maxConcurrentUploads = 3,
    enableBulkMode = true,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadStates, setUploadStates] = useState<FileUploadState[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [expirationDays, setExpirationDays] = useState<number | null>(defaultExpirationDays);
    const [activeUploads, setActiveUploads] = useState(0);
    const [, setUploadQueue] = useState<number[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [completedFiles, setCompletedFiles] = useState<CompletedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Reset uploader for new upload
    const resetUploader = () => {
        setShowSuccess(false);
        setCompletedFiles([]);
        setUploadStates([]);
        setIsUploading(false);
        setActiveUploads(0);
        setUploadQueue([]);
    };

    // Validate files before upload
    const validateFiles = useCallback(
        (files: File[]): FileValidation => {
            const errors: string[] = [];

            for (const file of files) {
                // Check file size
                if (file.size > maxFileSize) {
                    errors.push(`${file.name} exceeds the maximum file size of ${formatFileSize(maxFileSize)}`);
                }

                // Check file type if allowedTypes is specified
                if (allowedTypes && allowedTypes.length > 0) {
                    const fileExtension = file.name.split('.').pop()?.toLowerCase();
                    const mimeType = file.type.toLowerCase();

                    const isAllowed = allowedTypes.some((type) => {
                        if (type.startsWith('.')) {
                            return fileExtension === type.slice(1);
                        }
                        return mimeType.startsWith(type);
                    });

                    if (!isAllowed) {
                        errors.push(`${file.name} is not an allowed file type`);
                    }
                }
            }

            return {
                is_valid: errors.length === 0,
                errors,
                max_size: maxFileSize,
                allowed_types: allowedTypes,
            };
        },
        [maxFileSize, allowedTypes],
    );

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Chunked upload for larger files
    const uploadFileChunked = useCallback(
        async (file: File, index: number, updateState: (updates: Partial<FileUploadState>) => void): Promise<void> => {
            const chunkSize = 2 * 1024 * 1024;
            const totalChunks = Math.ceil(file.size / chunkSize);
            let uploadedChunks = 0;

            const initResponse = await fetch('/api/upload/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    filename: file.name,
                    size: file.size,
                    chunk_size: chunkSize,
                }),
            });

            if (!initResponse.ok) {
                throw new Error('Failed to initialize chunked upload');
            }

            const { session_id } = await initResponse.json();

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('session_id', session_id);
                formData.append('chunk_index', chunkIndex.toString());
                formData.append('chunk', chunk);

                const chunkResponse = await fetch('/api/upload/chunk', {
                    method: 'POST',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: formData,
                });

                if (!chunkResponse.ok) {
                    throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
                }

                uploadedChunks++;
                const progress = (uploadedChunks / totalChunks) * 100;
                const uploadedBytes = uploadedChunks * chunkSize;

                updateState({
                    progress,
                    uploadedBytes: Math.min(uploadedBytes, file.size),
                });
            }

            const finalizeResponse = await fetch('/api/upload/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    session_id,
                    expiration_days: expirationDays,
                }),
            });

            if (!finalizeResponse.ok) {
                throw new Error('Failed to finalize upload');
            }

            const finalResult = await finalizeResponse.json();
            updateState({
                status: 'completed',
                progress: 100,
                fileId: finalResult.data.file_id,
                downloadUrl: finalResult.data.download_url,
                previewUrl: finalResult.data.preview_url,
                infoUrl: finalResult.data.info_url,
                expiresAt: finalResult.data.expires_at,
                uploadedBytes: file.size,
            });
        },
        [expirationDays],
    );

    // Simple upload for smaller files
    const uploadFileSimple = useCallback(
        async (file: File, index: number, updateState: (updates: Partial<FileUploadState>) => void): Promise<void> => {
            const formData = new FormData();
            formData.append('file', file);
            if (expirationDays !== null) {
                formData.append('expiration_days', expirationDays.toString());
            }

            const xhr = new XMLHttpRequest();

            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        const speed = event.loaded / ((Date.now() - startTime) / 1000);
                        const eta = (event.total - event.loaded) / speed;

                        updateState({
                            progress,
                            uploadedBytes: event.loaded,
                            speed,
                            eta,
                        });

                        // Call progress callback
                        setUploadStates((currentStates) => {
                            const updatedStates = currentStates.map((state, i) =>
                                i === index ? { ...state, progress, uploadedBytes: event.loaded, speed, eta } : state,
                            );

                            onUploadProgress?.(
                                updatedStates.map((state) => ({
                                    file: state.file,
                                    progress: state.progress,
                                    status: state.status,
                                    error: state.error,
                                    uploaded_bytes: state.uploadedBytes,
                                    total_bytes: state.file.size,
                                    speed: state.speed,
                                    eta: state.eta,
                                })),
                            );

                            return currentStates; // Don't actually update, just trigger callback
                        });
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                updateState({
                                    status: 'completed',
                                    progress: 100,
                                    fileId: response.data.file_id,
                                    downloadUrl: response.data.download_url,
                                    previewUrl: response.data.preview_url,
                                    infoUrl: response.data.info_url,
                                    expiresAt: response.data.expires_at,
                                    uploadedBytes: file.size,
                                    isDuplicate: response.data.is_duplicate,
                                    spaceSaved: response.data.space_saved,
                                });

                                if (response.data.is_duplicate) {
                                    toast({
                                        title: 'Duplicate File Detected',
                                        description: `This file already exists. Saved ${formatFileSize(response.data.space_saved)} of storage space.`,
                                        variant: 'default',
                                    });
                                }

                                resolve();
                            } else {
                                throw new Error(response.error?.message || 'Upload failed');
                            }
                        } catch (error) {
                            reject(error);
                        }
                    } else {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error occurred'));
                });

                xhr.open('POST', '/api/upload');
                xhr.setRequestHeader('X-CSRF-TOKEN', document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '');
                xhr.send(formData);
            });
        },
        [expirationDays, onUploadProgress, toast],
    );

    // Upload individual file
    const uploadFile = useCallback(
        async (file: File, index: number): Promise<void> => {
            const updateState = (updates: Partial<FileUploadState>) => {
                setUploadStates((prev) => prev.map((state, i) => (i === index ? { ...state, ...updates } : state)));
            };

            updateState({ status: 'uploading' });

            try {
                const shouldUseChunkedUpload = file.size > 25 * 1024 * 1024;

                if (shouldUseChunkedUpload) {
                    await uploadFileChunked(file, index, updateState);
                } else {
                    await uploadFileSimple(file, index, updateState);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                updateState({
                    status: 'error',
                    error: errorMessage,
                });
                throw error;
            }
        },
        [uploadFileChunked, uploadFileSimple],
    );

    // Process bulk uploads with parallel processing
    const processBulkUploads = useCallback(
        async (files: File[]): Promise<void> => {
            const fileIndices = files.map((_, index) => index);
            setUploadQueue(fileIndices);

            return new Promise((resolve, reject) => {
                let completedCount = 0;
                let hasError = false;

                const processNext = async () => {
                    if (hasError) return;

                    // Use functional update to get current state
                    let nextIndex: number | undefined;
                    setUploadStates((currentStates) => {
                        nextIndex = fileIndices.find((index) => {
                            const state = currentStates[index];
                            return state && state.status === 'pending';
                        });
                        return currentStates;
                    });

                    if (nextIndex === undefined) {
                        if (completedCount === files.length) {
                            resolve();
                        }
                        return;
                    }

                    setActiveUploads((prev) => {
                        if (prev >= maxConcurrentUploads) {
                            return prev;
                        }
                        return prev + 1;
                    });

                    try {
                        await uploadFile(files[nextIndex], nextIndex);
                        completedCount++;
                    } catch (error) {
                        hasError = true;
                        reject(error);
                        return;
                    } finally {
                        setActiveUploads((prev) => prev - 1);
                        setTimeout(processNext, 10);
                    }

                    // Start another upload if we have capacity
                    setActiveUploads((current) => {
                        if (current < maxConcurrentUploads - 1) {
                            setTimeout(processNext, 10);
                        }
                        return current;
                    });
                };

                // Start initial uploads up to the concurrent limit
                for (let i = 0; i < Math.min(maxConcurrentUploads, files.length); i++) {
                    setTimeout(processNext, i * 50);
                }
            });
        },
        [maxConcurrentUploads, uploadFile],
    );

    // Handle file selection
    const handleFiles = useCallback(
        async (files: FileList | File[]) => {
            if (disabled || isUploading) return;

            const fileArray = Array.from(files);

            // Validate files
            const validation = validateFiles(fileArray);
            if (!validation.is_valid) {
                validation.errors.forEach((error) => {
                    toast({
                        title: 'Upload Error',
                        description: error,
                        variant: 'destructive',
                    });
                });
                onUploadError?.(validation.errors.join(', '));
                return;
            }

            // Initialize upload states
            const initialStates: FileUploadState[] = fileArray.map((file) => ({
                file,
                progress: 0,
                status: 'pending',
                uploadedBytes: 0,
            }));

            setUploadStates(initialStates);
            setIsUploading(true);
            onUploadStart?.(fileArray);

            // Start uploads with parallel processing
            try {
                if (enableBulkMode && fileArray.length > 1) {
                    await processBulkUploads(fileArray);
                } else {
                    // Sequential upload for single files or when bulk mode is disabled
                    await Promise.all(fileArray.map((file, index) => uploadFile(file, index)));
                }

                // Wait a bit for state to update, then get completed files
                setTimeout(() => {
                    setUploadStates((currentStates) => {
                        const completedFileIds = currentStates
                            .filter((state) => state.status === 'completed' && state.fileId)
                            .map((state) => state.fileId!);
                        const completedFileData = currentStates
                            .filter((state) => state.status === 'completed' && state.fileId)
                            .map((state) => ({
                                fileId: state.fileId!,
                                originalName: state.file.name,
                                downloadUrl: state.downloadUrl!,
                                previewUrl: state.previewUrl,
                                infoUrl: state.infoUrl,
                                expiresAt: state.expiresAt,
                                fileSize: state.file.size,
                                mimeType: state.file.type,
                                isDuplicate: state.isDuplicate,
                                spaceSaved: state.spaceSaved,
                            }));

                        setCompletedFiles(completedFileData);
                        setShowSuccess(true);
                        onUploadComplete?.(completedFileIds);

                        toast({
                            title: 'Upload Complete',
                            description: `Successfully uploaded ${completedFileData.length} file(s)`,
                            variant: 'success',
                        });

                        return currentStates;
                    });
                }, 100);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Upload failed';
                onUploadError?.(errorMessage);
                toast({
                    title: 'Upload Failed',
                    description: errorMessage,
                    variant: 'destructive',
                });
            } finally {
                setIsUploading(false);
                setActiveUploads(0);
                setUploadQueue([]);
            }
        },
        [disabled, isUploading, validateFiles, onUploadStart, onUploadError, toast, enableBulkMode, processBulkUploads, uploadFile, onUploadComplete],
    );

    // Cancel upload
    const cancelUpload = (index: number) => {
        setUploadStates((prev) => prev.map((state, i) => (i === index ? { ...state, status: 'cancelled' } : state)));
    };

    // Remove file from list
    const removeFile = (index: number) => {
        setUploadStates((prev) => prev.filter((_, i) => i !== index));
    };

    // Bulk actions
    const cancelAllUploads = () => {
        setUploadStates((prev) =>
            prev.map((state) => (state.status === 'uploading' || state.status === 'pending' ? { ...state, status: 'cancelled' as const } : state)),
        );
        setActiveUploads(0);
        setUploadQueue([]);
    };

    const removeCompletedUploads = () => {
        setUploadStates((prev) => prev.filter((state) => state.status !== 'completed'));
    };

    const retryFailedUploads = async () => {
        const failedIndices = uploadStates
            .map((state, index) => ({ state, index }))
            .filter(({ state }) => state.status === 'error')
            .map(({ index }) => index);

        if (failedIndices.length === 0) return;

        // Reset failed uploads to pending
        setUploadStates((prev) =>
            prev.map((state, index) =>
                failedIndices.includes(index) ? { ...state, status: 'pending' as const, progress: 0, error: undefined } : state,
            ),
        );

        // Restart uploads for failed files
        const failedFiles = failedIndices.map((index) => uploadStates[index].file);

        try {
            if (enableBulkMode && failedFiles.length > 1) {
                await processBulkUploads(failedFiles);
            } else {
                await Promise.all(failedIndices.map((index) => uploadFile(uploadStates[index].file, index)));
            }
        } catch (error) {
            console.error('Retry failed:', error);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFiles(files);
            }
        },
        [handleFiles],
    );

    // Click to upload
    const handleClick = () => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    // Show success component if upload is complete
    if (showSuccess && completedFiles.length > 0) {
        console.log('Showing success with files:', completedFiles);
        return (
            <div className={cn('w-full', className)}>
                <UploadSuccess files={completedFiles} onNewUpload={resetUploader} className="space-y-6" />
            </div>
        );
    }

    return (
        <div className={cn('w-full', className)}>
            {/* Main upload area */}
            <Card
                className={cn(
                    'relative cursor-pointer border-2 border-dashed transition-all duration-200',
                    'hover:border-primary/50 hover:bg-primary/5',
                    isDragOver && 'border-primary bg-primary/10',
                    disabled && 'cursor-not-allowed opacity-50',
                    isUploading && 'cursor-not-allowed',
                )}
                style={{ minHeight: '60vh' }}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <div className={cn('mb-4 rounded-full p-4 transition-colors', isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        <Upload className="h-12 w-12" />
                    </div>

                    <h3 className="mb-2 text-2xl font-semibold">{isDragOver ? 'Drop files here' : 'Upload your files'}</h3>

                    <p className="mb-4 max-w-md text-muted-foreground">
                        Drag and drop files here, or click to select files.
                        {maxFileSize && ` Maximum file size: ${formatFileSize(maxFileSize)}`}
                    </p>

                    <Button variant="outline" disabled={disabled || isUploading} className="mb-4">
                        <File className="mr-2 h-4 w-4" />
                        Choose Files
                    </Button>

                    {/* Expiration selector */}
                    {showExpirationSelector && (
                        <div className="mb-4 flex flex-col items-center space-y-2">
                            <Label htmlFor="expiration-select" className="flex items-center text-sm font-medium">
                                <Clock className="mr-2 h-4 w-4" />
                                File Expiration
                            </Label>
                            <Select
                                value={expirationDays?.toString() || 'never'}
                                onValueChange={(value) => setExpirationDays(value === 'never' ? null : parseInt(value))}
                                disabled={disabled || isUploading}
                            >
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Select expiration" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-2xl">
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="14">14 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {allowedTypes && <p className="text-sm text-muted-foreground">Allowed types: {allowedTypes.join(', ')}</p>}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple={multiple}
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={disabled || isUploading}
                    aria-label={multiple ? 'Select files to upload' : 'Select file to upload'}
                />
            </Card>

            {/* Upload progress list */}
            {uploadStates.length > 0 && (
                <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">Upload Progress</h4>
                        {enableBulkMode && uploadStates.length > 1 && (
                            <BulkActions
                                states={uploadStates}
                                onCancelAll={cancelAllUploads}
                                onRemoveCompleted={removeCompletedUploads}
                                onRetryFailed={retryFailedUploads}
                            />
                        )}
                    </div>
                    {enableBulkMode && uploadStates.length > 1 && <BulkProgressSummary states={uploadStates} activeUploads={activeUploads} />}
                    {uploadStates.map((state, index) => (
                        <FileUploadItem
                            key={`${state.file.name}-${index}`}
                            state={state}
                            onCancel={() => cancelUpload(index)}
                            onRemove={() => removeFile(index)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Individual file upload item component
interface FileUploadItemProps {
    state: FileUploadState;
    onCancel: () => void;
    onRemove: () => void;
}

const FileUploadItem: React.FC<FileUploadItemProps> = ({ state, onCancel, onRemove }) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond?: number): string => {
        if (!bytesPerSecond) return '';
        return `${formatFileSize(bytesPerSecond)}/s`;
    };

    const formatETA = (seconds?: number): string => {
        if (!seconds || seconds === Infinity) return '';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    return (
        <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
                <div className="flex min-w-0 flex-1 items-center space-x-2">
                    <File className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate font-medium">{state.file.name}</span>
                    <span className="flex-shrink-0 text-sm text-muted-foreground">{formatFileSize(state.file.size)}</span>
                    {state.isDuplicate && (
                        <div className="flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <Copy className="h-3 w-3" />
                            <span>Duplicate</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {state.status === 'uploading' && (
                        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    )}

                    {(state.status === 'completed' || state.status === 'error' || state.status === 'cancelled') && (
                        <Button variant="ghost" size="sm" onClick={onRemove} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <ProgressBar
                value={state.progress}
                status={
                    state.status === 'uploading'
                        ? 'loading'
                        : state.status === 'completed'
                          ? 'success'
                          : state.status === 'error'
                            ? 'error'
                            : state.status === 'cancelled'
                              ? 'paused'
                              : 'idle'
                }
                error={state.error}
                showPercentage={true}
                animated={true}
                size="sm"
                info={
                    state.status === 'uploading' && (state.speed || state.eta)
                        ? `${state.speed ? formatSpeed(state.speed) : ''} ${state.eta ? `• ETA: ${formatETA(state.eta)}` : ''}`.trim()
                        : undefined
                }
                preserveProgressOnError={true}
            />
        </Card>
    );
};

// Bulk actions component
interface BulkActionsProps {
    states: FileUploadState[];
    onCancelAll: () => void;
    onRemoveCompleted: () => void;
    onRetryFailed: () => void;
}

const BulkActions: React.FC<BulkActionsProps> = ({ states, onCancelAll, onRemoveCompleted, onRetryFailed }) => {
    const hasUploading = states.some((state) => state.status === 'uploading' || state.status === 'pending');
    const hasCompleted = states.some((state) => state.status === 'completed');
    const hasFailed = states.some((state) => state.status === 'error');

    return (
        <div className="flex items-center space-x-2">
            {hasUploading && (
                <Button variant="outline" size="sm" onClick={onCancelAll}>
                    Cancel All
                </Button>
            )}
            {hasCompleted && (
                <Button variant="outline" size="sm" onClick={onRemoveCompleted}>
                    Clear Completed
                </Button>
            )}
            {hasFailed && (
                <Button variant="outline" size="sm" onClick={onRetryFailed}>
                    Retry Failed
                </Button>
            )}
        </div>
    );
};

// Bulk progress summary component
interface BulkProgressSummaryProps {
    states: FileUploadState[];
    activeUploads: number;
}

const BulkProgressSummary: React.FC<BulkProgressSummaryProps> = ({ states, activeUploads }) => {
    const totalFiles = states.length;
    const completedFiles = states.filter((state) => state.status === 'completed').length;
    const failedFiles = states.filter((state) => state.status === 'error').length;
    const uploadingFiles = states.filter((state) => state.status === 'uploading').length;
    const pendingFiles = states.filter((state) => state.status === 'pending').length;

    const totalBytes = states.reduce((sum, state) => sum + state.file.size, 0);
    const uploadedBytes = states.reduce((sum, state) => sum + state.uploadedBytes, 0);
    const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Card className="p-4">
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bulk Upload Progress</span>
                    <span className="text-sm text-muted-foreground">
                        {completedFiles}/{totalFiles} files completed
                    </span>
                </div>

                <ProgressBar
                    value={overallProgress}
                    status={failedFiles > 0 ? 'error' : uploadingFiles > 0 ? 'loading' : completedFiles === totalFiles ? 'success' : 'idle'}
                    showPercentage={true}
                    animated={uploadingFiles > 0}
                    size="sm"
                />

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Active uploads:</span>
                            <span className="font-medium text-primary">{activeUploads}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Pending:</span>
                            <span className="font-medium">{pendingFiles}</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <span>Completed:</span>
                            <span className="font-medium text-green-600">{completedFiles}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="font-medium text-red-600">{failedFiles}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                        {formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}
                    </span>
                    <span>{Math.round(overallProgress)}% complete</span>
                </div>
            </div>
        </Card>
    );
};

export default FileUploader;
