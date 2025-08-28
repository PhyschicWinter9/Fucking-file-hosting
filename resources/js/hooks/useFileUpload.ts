import { ApiClient, apiClient } from '@/lib/api';
import { ChunkUploadProgress, ChunkedUploadSession, UploadError, UploadOptions, UploadProgress, UploadResult } from '@/types/upload';
import { useCallback, useRef, useState } from 'react';

interface UseFileUploadReturn {
    uploadFile: (file: File, options?: UploadOptions) => Promise<UploadResult>;
    uploadFiles: (files: File[], options?: UploadOptions) => Promise<UploadResult[]>;
    cancelUpload: (file: File) => void;
    cancelAllUploads: () => void;
    resumeUpload: (file: File) => Promise<UploadResult>;
    getUploadProgress: (file: File) => UploadProgress | null;
    getAllUploadProgress: () => UploadProgress[];
    isUploading: boolean;
}

interface UploadState {
    [fileKey: string]: {
        progress: UploadProgress;
        controller: AbortController;
        session?: ChunkedUploadSession;
        chunks?: ChunkUploadProgress[];
        retryCount: number;
    };
}

// Configuration will be fetched from server
let uploadConfig: {
    chunk_size: number;
    max_file_size: number;
    chunk_threshold: number;
    session_timeout_hours: number;
    max_retries: number;
} | null = null;

/**
 * Get upload configuration from server (cached)
 */
async function getUploadConfig() {
    if (!uploadConfig) {
        const apiClient = ApiClient.getInstance();
        uploadConfig = await apiClient.getUploadConfig();
    }
    return uploadConfig;
}

/**
 * Calculate optimal chunk size based on file size and server config
 */
async function calculateOptimalChunkSize(fileSize: number): Promise<number> {
    const config = await getUploadConfig();
    const baseChunkSize = config.chunk_size;

    // For files larger than 5GB, use larger chunks (up to 2x base)
    if (fileSize > 5 * 1024 * 1024 * 1024) {
        return Math.min(baseChunkSize * 2, 20 * 1024 * 1024);
    }

    // For files larger than 1GB, use larger chunks (up to 1.5x base)
    if (fileSize > 1024 * 1024 * 1024) {
        return Math.min(baseChunkSize * 1.5, 15 * 1024 * 1024);
    }

    // For files larger than 100MB, use the base chunk size
    if (fileSize > 100 * 1024 * 1024) {
        return baseChunkSize;
    }

    // For smaller files, use smaller chunks to reduce memory usage
    if (fileSize < 50 * 1024 * 1024) {
        return Math.max(baseChunkSize / 2, 1 * 1024 * 1024); // Min 1MB chunks
    }

    return baseChunkSize;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function useFileUpload(): UseFileUploadReturn {
    const [uploadState, setUploadState] = useState<UploadState>({});
    const [isUploading, setIsUploading] = useState(false);
    const uploadStateRef = useRef<UploadState>({});

    // Keep ref in sync with state for access in callbacks
    uploadStateRef.current = uploadState;

    const generateFileKey = (file: File): string => {
        return `${file.name}-${file.size}-${file.lastModified}`;
    };

    const updateUploadProgress = useCallback((fileKey: string, updates: Partial<UploadProgress>) => {
        setUploadState((prev) => {
            const current = prev[fileKey];
            if (!current) return prev;

            const updatedProgress = { ...current.progress, ...updates };

            return {
                ...prev,
                [fileKey]: {
                    ...current,
                    progress: updatedProgress,
                },
            };
        });
    }, []);

    const calculateSpeed = (uploadedBytes: number, startTime: number): number => {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        return elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
    };

    const calculateETA = (uploadedBytes: number, totalBytes: number, speed: number): number => {
        const remainingBytes = totalBytes - uploadedBytes;
        return speed > 0 ? remainingBytes / speed : 0;
    };

    const uploadFileChunked = useCallback(
        async (file: File, fileKey: string, options: UploadOptions, startTime: number): Promise<UploadResult> => {
            const chunkSize = options.chunk_size || (await calculateOptimalChunkSize(file.size));
            const totalChunks = Math.ceil(file.size / chunkSize);

            // Initialize chunked upload
            const initResponse = await apiClient.initChunkedUpload(file, chunkSize, options.expiration_days);

            const session: ChunkedUploadSession = {
                session_id: initResponse.session_id,
                original_name: file.name,
                total_size: file.size,
                chunk_size: chunkSize,
                uploaded_chunks: [],
                next_chunk_index: 0,
                is_complete: false,
            };

            // Initialize chunk progress tracking
            const chunks: ChunkUploadProgress[] = Array.from({ length: totalChunks }, (_, i) => ({
                chunk_index: i,
                chunk_size: i === totalChunks - 1 ? file.size % chunkSize || chunkSize : chunkSize,
                uploaded: false,
                progress: 0,
            }));

            setUploadState((prev) => ({
                ...prev,
                [fileKey]: {
                    ...prev[fileKey],
                    session,
                    chunks,
                },
            }));

            // Upload chunks sequentially
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);

                try {
                    await apiClient.uploadChunk(session.session_id, chunkIndex, chunk, (chunkProgress) => {
                        // Update chunk progress
                        setUploadState((prev) => {
                            const current = prev[fileKey];
                            if (!current?.chunks) return prev;

                            const updatedChunks = [...current.chunks];
                            updatedChunks[chunkIndex] = {
                                ...updatedChunks[chunkIndex],
                                progress: chunkProgress,
                            };

                            return {
                                ...prev,
                                [fileKey]: {
                                    ...current,
                                    chunks: updatedChunks,
                                },
                            };
                        });

                        // Calculate overall progress
                        const uploadedBytes = start + (chunk.size * chunkProgress) / 100;
                        const overallProgress = (uploadedBytes / file.size) * 100;
                        const speed = calculateSpeed(uploadedBytes, startTime);
                        const eta = calculateETA(uploadedBytes, file.size, speed);

                        const progressUpdate: Partial<UploadProgress> = {
                            progress: overallProgress,
                            uploaded_bytes: uploadedBytes,
                            speed,
                            eta,
                        };

                        updateUploadProgress(fileKey, progressUpdate);
                        const currentProgress = uploadStateRef.current[fileKey]?.progress;
                        if (currentProgress) {
                            options.on_progress?.(currentProgress);
                        }

                        // Update chunk progress callback
                        options.on_chunk_progress?.({
                            chunk_index: chunkIndex,
                            chunk_size: chunk.size,
                            uploaded: chunkProgress === 100,
                            progress: chunkProgress,
                        });
                    });

                    // Mark chunk as uploaded
                    setUploadState((prev) => {
                        const current = prev[fileKey];
                        if (!current?.chunks) return prev;

                        const updatedChunks = [...current.chunks];
                        updatedChunks[chunkIndex] = {
                            ...updatedChunks[chunkIndex],
                            uploaded: true,
                            progress: 100,
                        };

                        return {
                            ...prev,
                            [fileKey]: {
                                ...current,
                                chunks: updatedChunks,
                            },
                        };
                    });
                } catch (error: unknown) {
                    // Mark chunk as failed and potentially retry
                    const currentState = uploadStateRef.current[fileKey];
                    const config = await getUploadConfig();
                    if (currentState && currentState.retryCount < (options.max_retries || config.max_retries)) {
                        // Increment retry count and retry this chunk
                        setUploadState((prev) => ({
                            ...prev,
                            [fileKey]: {
                                ...prev[fileKey],
                                retryCount: prev[fileKey].retryCount + 1,
                            },
                        }));

                        chunkIndex--; // Retry this chunk
                        continue;
                    }

                    throw error;
                }
            }

            // Finalize upload
            const finalizeResponse = await apiClient.finalizeChunkedUpload(session.session_id);

            return {
                success: true,
                file_id: finalizeResponse.file_id,
                download_url: finalizeResponse.download_url,
            };
        },
        [updateUploadProgress],
    );

    const uploadFileSimple = useCallback(
        async (file: File, fileKey: string, options: UploadOptions, startTime: number): Promise<UploadResult> => {
            const response = await apiClient.uploadFile(file, {
                expirationDays: options.expiration_days,
                onProgress: (progress) => {
                    const uploadedBytes = (progress / 100) * file.size;
                    const speed = calculateSpeed(uploadedBytes, startTime);
                    const eta = calculateETA(uploadedBytes, file.size, speed);

                    const progressUpdate: Partial<UploadProgress> = {
                        progress,
                        uploaded_bytes: uploadedBytes,
                        speed,
                        eta,
                    };

                    updateUploadProgress(fileKey, progressUpdate);
                    const currentProgress = uploadStateRef.current[fileKey]?.progress;
                    if (currentProgress) {
                        options.on_progress?.(currentProgress);
                    }
                },
            });

            return {
                success: true,
                file_id: response.file_id,
                download_url: response.download_url,
            };
        },
        [updateUploadProgress],
    );

    const uploadSingleFile = useCallback(
        async (file: File, options: UploadOptions = {}): Promise<UploadResult> => {
            const fileKey = generateFileKey(file);
            const controller = new AbortController();
            const startTime = Date.now();

            // Initialize upload state
            const initialProgress: UploadProgress = {
                file,
                progress: 0,
                status: 'pending',
                uploaded_bytes: 0,
                total_bytes: file.size,
                speed: 0,
                eta: 0,
            };

            setUploadState((prev) => ({
                ...prev,
                [fileKey]: {
                    progress: initialProgress,
                    controller,
                    retryCount: 0,
                },
            }));

            try {
                // Validate file size
                const config = await getUploadConfig();
                if (file.size > config.max_file_size) {
                    throw new Error(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(config.max_file_size)})`);
                }

                updateUploadProgress(fileKey, { status: 'uploading' });

                // Determine if we should use chunked upload
                
                const shouldUseChunkedUpload = file.size > config.chunk_threshold;

                let result: UploadResult;

                if (shouldUseChunkedUpload) {
                    result = await uploadFileChunked(file, fileKey, options, startTime);
                } else {
                    result = await uploadFileSimple(file, fileKey, options, startTime);
                }

                if (result.success) {
                    updateUploadProgress(fileKey, {
                        status: 'completed',
                        progress: 100,
                        uploaded_bytes: file.size,
                    });
                    options.on_complete?.(result.file_id!);
                } else {
                    updateUploadProgress(fileKey, {
                        status: 'error',
                        error: result.error?.message,
                    });
                    options.on_error?.(result.error!);
                }

                return result;
            } catch (error: unknown) {
                const uploadError: UploadError = {
                    code: (error as { code?: string })?.code || 'UPLOAD_FAILED',
                    message: error instanceof Error ? error.message : 'Upload failed',
                };

                updateUploadProgress(fileKey, {
                    status: 'error',
                    error: uploadError.message,
                });

                options.on_error?.(uploadError);

                return {
                    success: false,
                    error: uploadError,
                };
            } finally {
                // Clean up upload state after a delay
                setTimeout(() => {
                    setUploadState((prev) => {
                        const { [fileKey]: removed, ...rest } = prev;
                        return rest;
                    });
                }, 5000);
            }
        },
        [updateUploadProgress, uploadFileChunked, uploadFileSimple],
    );

    const uploadFile = useCallback(
        async (file: File, options: UploadOptions = {}): Promise<UploadResult> => {
            setIsUploading(true);
            try {
                return await uploadSingleFile(file, options);
            } finally {
                // Check if any uploads are still in progress
                const hasActiveUploads = Object.values(uploadStateRef.current).some((state) => state.progress.status === 'uploading');
                if (!hasActiveUploads) {
                    setIsUploading(false);
                }
            }
        },
        [uploadSingleFile],
    );

    const uploadFiles = useCallback(
        async (files: File[], options: UploadOptions = {}): Promise<UploadResult[]> => {
            setIsUploading(true);

            try {
                // Upload files in parallel
                const uploadPromises = files.map((file) => uploadSingleFile(file, options));
                return await Promise.all(uploadPromises);
            } finally {
                setIsUploading(false);
            }
        },
        [uploadSingleFile],
    );

    const cancelUpload = useCallback(
        (file: File) => {
            const fileKey = generateFileKey(file);
            const uploadInfo = uploadState[fileKey];

            if (uploadInfo) {
                uploadInfo.controller.abort();
                updateUploadProgress(fileKey, { status: 'cancelled' });
            }
        },
        [uploadState, updateUploadProgress],
    );

    const cancelAllUploads = useCallback(() => {
        Object.entries(uploadState).forEach(([fileKey, uploadInfo]) => {
            if (uploadInfo.progress.status === 'uploading') {
                uploadInfo.controller.abort();
                updateUploadProgress(fileKey, { status: 'cancelled' });
            }
        });
    }, [uploadState, updateUploadProgress]);

    const resumeUpload = useCallback(
        async (file: File): Promise<UploadResult> => {
            const fileKey = generateFileKey(file);
            const uploadInfo = uploadState[fileKey];

            if (!uploadInfo || !uploadInfo.session) {
                // No existing session, start fresh upload
                return uploadFile(file);
            }

            // Resume chunked upload from where it left off
            // This would require additional API support to get upload session state
            // For now, restart the upload
            return uploadFile(file);
        },
        [uploadState, uploadFile],
    );

    const getUploadProgress = useCallback(
        (file: File): UploadProgress | null => {
            const fileKey = generateFileKey(file);
            return uploadState[fileKey]?.progress || null;
        },
        [uploadState],
    );

    const getAllUploadProgress = useCallback((): UploadProgress[] => {
        return Object.values(uploadState).map((state) => state.progress);
    }, [uploadState]);

    return {
        uploadFile,
        uploadFiles,
        cancelUpload,
        cancelAllUploads,
        resumeUpload,
        getUploadProgress,
        getAllUploadProgress,
        isUploading,
    };
}
