import { useState, useCallback, useEffect, useRef } from 'react';
import { UploadProgress } from '@/types/upload';

interface ProgressState {
    [fileId: string]: {
        progress: UploadProgress;
        animatedProgress: number;
        startTime: number;
        lastUpdateTime: number;
    };
}

interface UseProgressReturn {
    addProgress: (fileId: string, progress: UploadProgress) => void;
    updateProgress: (fileId: string, updates: Partial<UploadProgress>) => void;
    removeProgress: (fileId: string) => void;
    getProgress: (fileId: string) => UploadProgress | null;
    getAnimatedProgress: (fileId: string) => number;
    getAllProgress: () => UploadProgress[];
    getOverallProgress: () => {
        totalFiles: number;
        completedFiles: number;
        failedFiles: number;
        uploadingFiles: number;
        overallProgress: number;
        totalBytes: number;
        uploadedBytes: number;
        averageSpeed: number;
        estimatedTimeRemaining: number;
    };
    clearCompleted: () => void;
    clearAll: () => void;
}

interface AnimationOptions {
    duration?: number; // Animation duration in ms
    easing?: (t: number) => number; // Easing function
    smoothingFactor?: number; // How much to smooth progress updates (0-1)
}

const defaultAnimationOptions: Required<AnimationOptions> = {
    duration: 300,
    easing: (t: number) => t * t * (3 - 2 * t), // Smooth step function
    smoothingFactor: 0.8,
};

export function useProgress(options: AnimationOptions = {}): UseProgressReturn {
    const [progressState, setProgressState] = useState<ProgressState>({});
    const animationFrameRef = useRef<number>();
    const optionsRef = useRef({ ...defaultAnimationOptions, ...options });

    // Update options ref when options change
    useEffect(() => {
        optionsRef.current = { ...defaultAnimationOptions, ...options };
    }, [options]);

    // Animation loop for smooth progress updates
    const animateProgress = useCallback(() => {
        const now = Date.now();
        
        setProgressState(prev => {
            const updated = { ...prev };
            let hasAnimations = false;

            Object.keys(updated).forEach(fileId => {
                const state = updated[fileId];
                const targetProgress = state.progress.progress;
                const currentAnimated = state.animatedProgress;
                
                if (Math.abs(targetProgress - currentAnimated) > 0.1) {
                    hasAnimations = true;
                    
                    // Calculate animation progress
                    const elapsed = now - state.lastUpdateTime;
                    const animationProgress = Math.min(elapsed / optionsRef.current.duration, 1);
                    const easedProgress = optionsRef.current.easing(animationProgress);
                    
                    // Smooth the progress update
                    const smoothingFactor = optionsRef.current.smoothingFactor;
                    const progressDiff = targetProgress - currentAnimated;
                    const smoothedDiff = progressDiff * smoothingFactor * easedProgress;
                    
                    updated[fileId] = {
                        ...state,
                        animatedProgress: Math.min(100, Math.max(0, currentAnimated + smoothedDiff)),
                    };
                } else {
                    // Snap to target if close enough
                    updated[fileId] = {
                        ...state,
                        animatedProgress: targetProgress,
                    };
                }
            });

            return updated;
        });

        // Continue animation if needed
        setProgressState(current => {
            const hasActiveAnimations = Object.values(current).some(
                state => Math.abs(state.progress.progress - state.animatedProgress) > 0.1
            );
            
            if (hasActiveAnimations) {
                animationFrameRef.current = requestAnimationFrame(animateProgress);
            }
            
            return current;
        });
    }, []);

    // Start animation when needed
    useEffect(() => {
        const hasActiveAnimations = Object.values(progressState).some(
            state => Math.abs(state.progress.progress - state.animatedProgress) > 0.1
        );

        if (hasActiveAnimations && !animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animateProgress);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = undefined;
            }
        };
    }, [progressState, animateProgress]);

    const generateFileId = useCallback((progress: UploadProgress): string => {
        return `${progress.file.name}-${progress.file.size}-${progress.file.lastModified}`;
    }, []);

    const addProgress = useCallback((fileId: string, progress: UploadProgress) => {
        const now = Date.now();
        
        setProgressState(prev => ({
            ...prev,
            [fileId]: {
                progress,
                animatedProgress: 0,
                startTime: now,
                lastUpdateTime: now,
            },
        }));
    }, []);

    const updateProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
        const now = Date.now();
        
        setProgressState(prev => {
            const existing = prev[fileId];
            if (!existing) return prev;

            const updatedProgress = { ...existing.progress, ...updates };
            
            // Calculate speed and ETA if not provided
            if (updates.uploaded_bytes !== undefined && !updates.speed) {
                const elapsed = (now - existing.startTime) / 1000; // seconds
                const speed = elapsed > 0 ? updates.uploaded_bytes / elapsed : 0;
                updatedProgress.speed = speed;
                
                if (!updates.eta && speed > 0) {
                    const remainingBytes = updatedProgress.total_bytes - updates.uploaded_bytes;
                    updatedProgress.eta = remainingBytes / speed;
                }
            }

            return {
                ...prev,
                [fileId]: {
                    ...existing,
                    progress: updatedProgress,
                    lastUpdateTime: now,
                },
            };
        });
    }, []);

    const removeProgress = useCallback((fileId: string) => {
        setProgressState(prev => {
            const { [fileId]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const getProgress = useCallback((fileId: string): UploadProgress | null => {
        return progressState[fileId]?.progress || null;
    }, [progressState]);

    const getAnimatedProgress = useCallback((fileId: string): number => {
        return progressState[fileId]?.animatedProgress || 0;
    }, [progressState]);

    const getAllProgress = useCallback((): UploadProgress[] => {
        return Object.values(progressState).map(state => state.progress);
    }, [progressState]);

    const getOverallProgress = useCallback(() => {
        const allProgress = Object.values(progressState);
        
        if (allProgress.length === 0) {
            return {
                totalFiles: 0,
                completedFiles: 0,
                failedFiles: 0,
                uploadingFiles: 0,
                overallProgress: 0,
                totalBytes: 0,
                uploadedBytes: 0,
                averageSpeed: 0,
                estimatedTimeRemaining: 0,
            };
        }

        const totalFiles = allProgress.length;
        const completedFiles = allProgress.filter(s => s.progress.status === 'completed').length;
        const failedFiles = allProgress.filter(s => s.progress.status === 'error').length;
        const uploadingFiles = allProgress.filter(s => s.progress.status === 'uploading').length;
        
        const totalBytes = allProgress.reduce((sum, s) => sum + s.progress.total_bytes, 0);
        const uploadedBytes = allProgress.reduce((sum, s) => sum + s.progress.uploaded_bytes, 0);
        
        const overallProgress = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
        
        // Calculate average speed from active uploads
        const activeUploads = allProgress.filter(s => 
            s.progress.status === 'uploading' && s.progress.speed && s.progress.speed > 0
        );
        
        const averageSpeed = activeUploads.length > 0
            ? activeUploads.reduce((sum, s) => sum + (s.progress.speed || 0), 0) / activeUploads.length
            : 0;
        
        // Calculate estimated time remaining
        const remainingBytes = totalBytes - uploadedBytes;
        const estimatedTimeRemaining = averageSpeed > 0 ? remainingBytes / averageSpeed : 0;

        return {
            totalFiles,
            completedFiles,
            failedFiles,
            uploadingFiles,
            overallProgress,
            totalBytes,
            uploadedBytes,
            averageSpeed,
            estimatedTimeRemaining,
        };
    }, [progressState]);

    const clearCompleted = useCallback(() => {
        setProgressState(prev => {
            const filtered: ProgressState = {};
            
            Object.entries(prev).forEach(([fileId, state]) => {
                if (state.progress.status !== 'completed') {
                    filtered[fileId] = state;
                }
            });
            
            return filtered;
        });
    }, []);

    const clearAll = useCallback(() => {
        setProgressState({});
    }, []);

    // Cleanup animation frame on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return {
        addProgress,
        updateProgress,
        removeProgress,
        getProgress,
        getAnimatedProgress,
        getAllProgress,
        getOverallProgress,
        clearCompleted,
        clearAll,
    };
}

// Utility hook for managing progress of multiple files with automatic cleanup
export function useMultiFileProgress(autoCleanupDelay: number = 5000) {
    const progress = useProgress();
    const cleanupTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    const addProgressWithCleanup = useCallback((fileId: string, progressData: UploadProgress) => {
        progress.addProgress(fileId, progressData);
        
        // Clear existing cleanup timeout if any
        const existingTimeout = cleanupTimeoutsRef.current.get(fileId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
    }, [progress]);

    const updateProgressWithCleanup = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
        progress.updateProgress(fileId, updates);
        
        // Schedule cleanup for completed or failed uploads
        if (updates.status === 'completed' || updates.status === 'error') {
            const timeout = setTimeout(() => {
                progress.removeProgress(fileId);
                cleanupTimeoutsRef.current.delete(fileId);
            }, autoCleanupDelay);
            
            cleanupTimeoutsRef.current.set(fileId, timeout);
        }
    }, [progress, autoCleanupDelay]);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            cleanupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            cleanupTimeoutsRef.current.clear();
        };
    }, []);

    return {
        ...progress,
        addProgress: addProgressWithCleanup,
        updateProgress: updateProgressWithCleanup,
    };
}