import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import {
    UploadProgress,
    UploadOptions,
    UploadResult,
    UploadError,
    ChunkUploadProgress,
    ChunkedUploadSession,
} from '@/types/upload';

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks (matches backend default)
const MAX_RETRIES = 3;
const CHUNKED_UPLOAD_THRESHOLD = 25 * 1024 * 1024; // 25MB (Cloudflare compatibility)

/**
 * Calculate optimal chunk size based on file size (matches backend logic)
 */
function calculateOptimalChunkSize(fileSize: number): number {
    const baseChunkSize = 1024 * 1024; // 1MB

    // For files larger than 1GB, use 5MB chunks
    if (fileSize > 1024 * 1024 * 1024) {
        return baseChunkSize * 5;
    }

    // For files larger than 500MB, use 2MB chunks
    if (fileSize > 500 * 1024 * 1024) {
        return baseChunkSize * 2;
    }

    // Default 1MB chunks
    return baseChunkSize;
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

    const updateUploadProgress = useCallback((
        fileKey: string,
        updates: Partial<UploadProgress>
    ) => {
        setUploadState(prev => {
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

    const calculateSpeed = (
        uploadedBytes: number,
        startTime: number
    ): number => {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        return elapsedTime > 0 ? uploadedBytes / elapsedTime : 0;
    };

    const calculateETA = (
        uploadedBytes: number,
        totalBytes: number,
        speed: number
    ): number => {
        const remainingBytes = totalBytes - uploadedBytes;
        return speed > 0 ? remainingBytes / speed : 0;
    };

    const uploadSingleFile = async (
        file: File,
        options: UploadOptions = {}
    ): Promise<UploadResult> => {
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

        setUploadState(prev => ({
            ...prev,
            [fileKey]: {
                progress: initialProgress,
                controller,
                retryCount: 0,
            },
        }));

        try {
            updateUploadProgress(fileKey, { status: 'uploading' });

            // Determine if we should use chunked upload
            const shouldUseChunkedUpload = file.size > CHUNKED_UPLOAD_THRESHOLD;

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

        } catch (error: any) {
            const uploadError: UploadError = {
                code: error.code || 'UPLOAD_FAILED',
                message: error.message || 'Upload failed',
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
                setUploadState(prev => {
                    const { [fileKey]: removed, ...rest } = prev;
                    return rest;
                });
            }, 5000);
        }
    };

    const uploadFileSimple = async (
        file: File,
        fileKey: string,
        options: UploadOptions,
        startTime: number
    ): Promise<UploadResult> => {
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
                options.on_progress?.(uploadStateRef.current[fileKey]?.progress!);
            },
        });

        return {
            success: true,
            file_id: response.file_id,
            download_url: response.download_url,
        };
    };

    const uploadFileChunked = async (
        file: File,
        fileKey: string,
        options: UploadOptions,
        startTime: number
    ): Promise<UploadResult> => {
        // Use backend's optimal chunk size calculation
        const chunkSize = options.chunk_size || calculateOptimalChunkSize(file.size);
        const totalChunks = Math.ceil(file.size / chunkSize);

        // Initialize chunked upload
        const initResponse = await apiClient.initChunkedUpload(
            file,
            chunkSize,
            options.expiration_days
        );

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

        setUploadState(prev => ({
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
                await apiClient.uploadChunk(
                    session.session_id,
                    chunkIndex,
                    chunk,
                    (chunkProgress) => {
                        // Update chunk progress
                        setUploadState(prev => {
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
                        const uploadedBytes = start + (chunk.size * chunkProgress / 100);
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
                        options.on_progress?.(uploadStateRef.current[fileKey]?.progress!);

                        // Update chunk progress callback
                        options.on_chunk_progress?.({
                            chunk_index: chunkIndex,
                            chunk_size: chunk.size,
                            uploaded: chunkProgress === 100,
                            progress: chunkProgress,
                        });
                    }
                );

                // Mark chunk as uploaded
                setUploadState(prev => {
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

            } catch (error: any) {
                // Mark chunk as failed and potentially retry
                const currentState = uploadStateRef.current[fileKey];
                if (currentState && currentState.retryCount < (options.max_retries || MAX_RETRIES)) {
                    // Increment retry count and retry this chunk
                    setUploadState(prev => ({
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
    };

    const uploadFile = useCallback(async (
        file: File,
        options: UploadOptions = {}
    ): Promise<UploadResult> => {
        setIsUploading(true);
        try {
            return await uploadSingleFile(file, options);
        } finally {
            // Check if any uploads are still in progress
            const hasActiveUploads = Object.values(uploadStateRef.current).some(
                state => state.progress.status === 'uploading'
            );
            if (!hasActiveUploads) {
                setIsUploading(false);
            }
        }
    }, [updateUploadProgress]);

    const uploadFiles = useCallback(async (
        files: File[],
        options: UploadOptions = {}
    ): Promise<UploadResult[]> => {
        setIsUploading(true);

        try {
            // Upload files in parallel
            const uploadPromises = files.map(file => uploadSingleFile(file, options));
            return await Promise.all(uploadPromises);
        } finally {
            setIsUploading(false);
        }
    }, [uploadSingleFile]);

    const cancelUpload = useCallback((file: File) => {
        const fileKey = generateFileKey(file);
        const uploadInfo = uploadState[fileKey];

        if (uploadInfo) {
            uploadInfo.controller.abort();
            updateUploadProgress(fileKey, { status: 'cancelled' });
        }
    }, [uploadState, updateUploadProgress]);

    const cancelAllUploads = useCallback(() => {
        Object.entries(uploadState).forEach(([fileKey, uploadInfo]) => {
            if (uploadInfo.progress.status === 'uploading') {
                uploadInfo.controller.abort();
                updateUploadProgress(fileKey, { status: 'cancelled' });
            }
        });
    }, [uploadState, updateUploadProgress]);

    const resumeUpload = useCallback(async (file: File): Promise<UploadResult> => {
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
    }, [uploadState, uploadFile]);

    const getUploadProgress = useCallback((file: File): UploadProgress | null => {
        const fileKey = generateFileKey(file);
        return uploadState[fileKey]?.progress || null;
    }, [uploadState]);

    const getAllUploadProgress = useCallback((): UploadProgress[] => {
        return Object.values(uploadState).map(state => state.progress);
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
