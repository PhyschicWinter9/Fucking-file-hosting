import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { ApiClient } from '@/lib/api';
import { FileValidation, UploadProgress } from '@/types/upload';
import { Clock, LoaderCircle, Upload } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import EnhancedUploadProgress from './EnhancedUploadProgress';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import UploadStatistics from './UploadStatistics';
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
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled' | 'paused';
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
    abortController?: AbortController;
    xhr?: XMLHttpRequest;
    isChunked?: boolean;
    chunkInfo?: {
        currentChunk: number;
        totalChunks: number;
        chunkSize: number;
        sessionId?: string;
    };
    startTime?: number;
    lastProgressTime?: number;
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

    // Monitor upload states and automatically reset uploading state
    useEffect(() => {
        if (uploadStates.length > 0) {
            const hasActiveUploads = uploadStates.some((state) => state.status === 'uploading' || state.status === 'pending');

            if (!hasActiveUploads && isUploading) {
                setIsUploading(false);
                setActiveUploads(0);
                setUploadQueue([]);
            }
        }
    }, [uploadStates, isUploading]);

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
        async (file: File, index: number, updateState: (updates: Partial<FileUploadState>) => void, chunkSize: number): Promise<void> => {
            const totalChunks = Math.ceil(file.size / chunkSize);
            let uploadedChunks = 0;
            const startTime = Date.now();

            // Create abort controller for this upload
            const abortController = new AbortController();
            updateState({
                abortController,
                isChunked: true,
                chunkInfo: {
                    currentChunk: 0,
                    totalChunks,
                    chunkSize,
                },
                startTime,
            });

            const initResponse = await fetch('/api/upload/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    action: 'initialize',
                    original_name: file.name,
                    total_size: file.size,
                    chunk_size: chunkSize,
                }),
                signal: abortController.signal,
            });

            if (!initResponse.ok) {
                const errorData = await initResponse.json();
                throw new Error(errorData.error?.message || 'Failed to initialize chunked upload');
            }

            const initData = await initResponse.json();
            if (!initData.success) {
                throw new Error(initData.error?.message || 'Failed to initialize chunked upload');
            }

            const { session_id } = initData.data;

            // Update chunk info with session ID
            updateState({
                chunkInfo: {
                    currentChunk: 0,
                    totalChunks,
                    chunkSize,
                    sessionId: session_id,
                },
            });

            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                // Check if upload was cancelled
                if (abortController.signal.aborted) {
                    throw new Error('Upload cancelled');
                }

                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                // const chunkStartTime = Date.now();

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
                    signal: abortController.signal,
                });

                if (!chunkResponse.ok) {
                    throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}`);
                }

                uploadedChunks++;
                const progress = (uploadedChunks / totalChunks) * 100;
                // Calculate actual uploaded bytes more accurately
                const uploadedBytes = chunkIndex === totalChunks - 1 ? file.size : Math.min(uploadedChunks * chunkSize, file.size);

                // Calculate speed and ETA
                const currentTime = Date.now();
                const elapsedTime = (currentTime - startTime) / 1000; // in seconds
                // const chunkTime = (currentTime - chunkStartTime) / 1000;
                const speed = elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
                const remainingBytes = file.size - uploadedBytes;
                const eta = speed > 0 ? remainingBytes / speed : 0;

                updateState({
                    progress,
                    uploadedBytes,
                    speed,
                    eta,
                    chunkInfo: {
                        currentChunk: uploadedChunks,
                        totalChunks,
                        chunkSize,
                        sessionId: session_id,
                    },
                    lastProgressTime: currentTime,
                });
            }

            // Keep progress at 100% during finalization
            updateState({
                progress: 100,
                status: 'uploading',
            });

            // Show toast for large files
            if (file.size > 100 * 1024 * 1024) {
                // 100MB
                toast({
                    title: 'Processing Large File',
                    description: 'Finalizing upload... This may take a few minutes for very large files.',
                    variant: 'default',
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
                signal: abortController.signal,
            });

            if (!finalizeResponse.ok) {
                if (finalizeResponse.status === 524) {
                    throw new Error(
                        'Upload finalization timed out. This can happen with very large files. Please try again or contact support if the issue persists.',
                    );
                }

                // Try to get error details from response
                try {
                    const errorData = await finalizeResponse.json();
                    throw new Error(errorData.error?.message || 'Failed to finalize upload');
                } catch {
                    throw new Error(`Failed to finalize upload (HTTP ${finalizeResponse.status})`);
                }
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
        [expirationDays, toast],
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
            const startTime = Date.now();

            // Store xhr reference for cancellation
            updateState({
                xhr,
                isChunked: false,
                startTime,
            });

            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const currentTime = Date.now();
                        const elapsedTime = (currentTime - startTime) / 1000; // in seconds
                        const progress = (event.loaded / event.total) * 100;
                        const speed = elapsedTime > 0 ? event.loaded / elapsedTime : 0;
                        const remainingBytes = event.total - event.loaded;
                        const eta = speed > 0 ? remainingBytes / speed : 0;

                        updateState({
                            progress,
                            uploadedBytes: event.loaded,
                            speed,
                            eta,
                            lastProgressTime: currentTime,
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

                xhr.addEventListener('abort', () => {
                    reject(new Error('Upload cancelled'));
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
                // Get configuration and determine if we should use chunked upload
                const apiClient = ApiClient.getInstance();
                const config = await apiClient.getUploadConfig();
                const shouldUseChunkedUpload = file.size > config.chunk_threshold;

                if (shouldUseChunkedUpload) {
                    await uploadFileChunked(file, index, updateState, config.chunk_size);
                } else {
                    await uploadFileSimple(file, index, updateState);
                }
            } catch (error) {
                // Check if it's an abort error
                if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Upload cancelled')) {
                    updateState({
                        status: 'cancelled',
                    });
                    return; // Don't throw for cancelled uploads
                }

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
                // Only reset if there are no active uploads remaining
                setTimeout(() => {
                    setUploadStates((currentStates) => {
                        const hasActiveUploads = currentStates.some((state) => state.status === 'uploading' || state.status === 'pending');

                        if (!hasActiveUploads) {
                            setIsUploading(false);
                            setActiveUploads(0);
                            setUploadQueue([]);
                        }

                        return currentStates;
                    });
                }, 100);
            }
        },
        [disabled, isUploading, validateFiles, onUploadStart, onUploadError, toast, enableBulkMode, processBulkUploads, uploadFile, onUploadComplete],
    );

    // Cancel upload
    const cancelUpload = (index: number) => {
        setUploadStates((prev) => {
            const newStates = prev.map((state, i) => {
                if (i === index) {
                    // Abort ongoing requests
                    if (state.abortController) {
                        state.abortController.abort();
                    }
                    if (state.xhr) {
                        state.xhr.abort();
                    }
                    return { ...state, status: 'cancelled' as const };
                }
                return state;
            });
            return newStates;
        });

        // Check if all uploads are cancelled or completed, then reset uploading state
        setTimeout(() => {
            setUploadStates((currentStates) => {
                const hasActiveUploads = currentStates.some((state) => state.status === 'uploading' || state.status === 'pending');

                if (!hasActiveUploads) {
                    setIsUploading(false);
                    setActiveUploads(0);
                    setUploadQueue([]);
                }

                return currentStates;
            });
        }, 100);
    };

    // Pause/Resume upload
    const pauseResumeUpload = (index: number) => {
        setUploadStates((prev) => {
            const newStates = prev.map((state, i) => {
                if (i === index) {
                    if (state.status === 'uploading') {
                        // Pause upload
                        if (state.abortController) {
                            state.abortController.abort();
                        }
                        if (state.xhr) {
                            state.xhr.abort();
                        }
                        return { ...state, status: 'paused' as const };
                    } else if (state.status === 'paused') {
                        // Resume upload - this would need to be implemented with resume logic
                        return { ...state, status: 'pending' as const };
                    }
                }
                return state;
            });
            return newStates;
        });
    };

    // Retry upload
    const retryUpload = async (index: number) => {
        const state = uploadStates[index];
        if (!state || state.status !== 'error') return;

        // Reset state to pending
        setUploadStates((prev) =>
            prev.map((s, i) =>
                i === index
                    ? {
                          ...s,
                          status: 'pending' as const,
                          progress: 0,
                          error: undefined,
                          uploadedBytes: 0,
                          speed: undefined,
                          eta: undefined,
                      }
                    : s,
            ),
        );

        // Restart upload
        try {
            await uploadFile(state.file, index);
        } catch (error) {
            console.error('Retry failed:', error);
        }
    };

    // Remove file from list
    const removeFile = (index: number) => {
        setUploadStates((prev) => {
            const newStates = prev.filter((_, i) => i !== index);

            // If no files left, reset uploading state
            if (newStates.length === 0) {
                setIsUploading(false);
                setActiveUploads(0);
                setUploadQueue([]);
            }

            return newStates;
        });
    };

    // Bulk actions
    const cancelAllUploads = () => {
        setUploadStates((prev) =>
            prev.map((state) => {
                if (state.status === 'uploading' || state.status === 'pending') {
                    // Abort ongoing requests
                    if (state.abortController) {
                        state.abortController.abort();
                    }
                    if (state.xhr) {
                        state.xhr.abort();
                    }
                    return { ...state, status: 'cancelled' as const };
                }
                return state;
            }),
        );
        setIsUploading(false);
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
                className={`relative transition-all duration-300 ease-in-out ${isDragOver ? 'scale-[1.02] border-primary bg-primary/5 shadow-lg' : 'hover:border-primary/50 hover:shadow-md'} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <div className="p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Upload className="h-6 w-6 text-primary" />
                    </div>

                    <h3 className="mb-2 text-lg font-semibold">{isDragOver ? 'Drop files here' : 'Upload your files'}</h3>

                    <p className="mb-4 text-sm text-muted-foreground">
                        {isDragOver
                            ? 'Release to upload'
                            : `Drag and drop files here, or click to browse. Max file size: ${formatFileSize(maxFileSize)}`}
                    </p>

                    {/* File input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple={multiple}
                        accept={allowedTypes?.join(',')}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={disabled || isUploading}
                    />

                    {/* Upload button */}
                    <Button
                        variant="outline"
                        disabled={disabled || isUploading}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClick();
                        }}
                    >
                        {isUploading ? (
                            <>
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Choose Files
                            </>
                        )}
                    </Button>

                    {/* Expiration selector */}
                    {showExpirationSelector && !isUploading && (
                        <div className="col mt-4 flex flex-col content-center items-center justify-center space-x-2">
                            {/* <Label htmlFor="expiration" className="text-sm">
                               <Clock/> File expiration
                            </Label> */}
                            <div className="row mb-2 flex items-center">
                                <Clock size={16} />
                                <Label htmlFor="expiration" className="ml-2 text-sm">
                                    File expiration
                                </Label>
                            </div>
                            <Select
                                value={expirationDays?.toString() || 'never'}
                                onValueChange={(value) => setExpirationDays(value === 'never' ? null : parseInt(value))}
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 day</SelectItem>
                                    <SelectItem value="7">7 days</SelectItem>
                                    <SelectItem value="14">14 days</SelectItem>
                                    <SelectItem value="30">30 days</SelectItem>
                                    {/* <SelectItem value="90">90 days</SelectItem>
                                    <SelectItem value="never">Never</SelectItem> */}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </Card>

            {/* Upload progress section */}
            {uploadStates.length > 0 && (
                <div className="mt-6 space-y-4">
                    {/* Upload statistics */}
                    {uploadStates.length > 1 && <BulkProgressSummary states={uploadStates} activeUploads={activeUploads} />}

                    {/* Bulk actions */}
                    {uploadStates.length > 1 && (
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Upload Progress</h3>
                            <BulkActions
                                states={uploadStates}
                                onCancelAll={cancelAllUploads}
                                onRemoveCompleted={removeCompletedUploads}
                                onRetryFailed={retryFailedUploads}
                            />
                        </div>
                    )}

                    {/* Individual file progress */}
                    <div className="space-y-3">
                        {uploadStates.map((state, index) => (
                            <FileUploadItem
                                key={`${state.file.name}-${index}`}
                                state={state}
                                onCancel={() => cancelUpload(index)}
                                onRemove={() => removeFile(index)}
                                onPauseResume={() => pauseResumeUpload(index)}
                                onRetry={() => retryUpload(index)}
                                className="fade-in"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            />
                        ))}
                    </div>
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
    onPauseResume?: () => void;
    onRetry?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

const FileUploadItem: React.FC<FileUploadItemProps> = ({ state, onCancel, onRemove, onPauseResume, onRetry, className, style }) => {
    return (
        <div className={className} style={style}>
            <EnhancedUploadProgress
                file={state.file}
                progress={state.progress}
                status={state.status}
                error={state.error}
                uploadedBytes={state.uploadedBytes}
                speed={state.speed}
                eta={state.eta}
                isChunked={state.isChunked}
                chunkInfo={state.chunkInfo}
                fileId={state.fileId}
                downloadUrl={state.downloadUrl}
                isDuplicate={state.isDuplicate}
                spaceSaved={state.spaceSaved}
                onCancel={onCancel}
                onPauseResume={onPauseResume}
                onRetry={onRetry}
                onRemove={onRemove}
            />
        </div>
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
    // const uploadingFiles = states.filter((state) => state.status === 'uploading').length;

    const totalBytes = states.reduce((sum, state) => sum + state.file.size, 0);
    const uploadedBytes = states.reduce((sum, state) => sum + state.uploadedBytes, 0);

    // Calculate overall speed and ETA
    const uploadingSpeeds = states.filter((state) => state.status === 'uploading' && state.speed).map((state) => state.speed!);
    const overallSpeed = uploadingSpeeds.length > 0 ? uploadingSpeeds.reduce((sum, speed) => sum + speed, 0) : undefined;

    const remainingBytes = totalBytes - uploadedBytes;
    const overallEta = overallSpeed && overallSpeed > 0 ? remainingBytes / overallSpeed : undefined;

    // Calculate chunked uploads and space saved
    const chunkedUploads = states.filter((state) => state.isChunked).length;
    const spaceSaved = states.reduce((sum, state) => sum + (state.spaceSaved || 0), 0);

    return (
        <UploadStatistics
            totalFiles={totalFiles}
            completedFiles={completedFiles}
            failedFiles={failedFiles}
            activeUploads={activeUploads}
            totalBytes={totalBytes}
            uploadedBytes={uploadedBytes}
            overallSpeed={overallSpeed}
            overallEta={overallEta}
            chunkedUploads={chunkedUploads}
            spaceSaved={spaceSaved}
            showDetailed={true}
        />
    );
};

export default FileUploader;
