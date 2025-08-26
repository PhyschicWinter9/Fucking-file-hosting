import { useCallback, useEffect, useRef, useState } from 'react';

export interface UploadMetrics {
    active_sessions: number;
    total_active_bytes: number;
    total_uploaded_bytes: number;
    average_progress: number;
    server_load: number;
    memory_usage_percent: number;
    disk_usage_percent: number;
    can_accept_uploads: boolean;
    recommended_chunk_size: number;
}

export interface SessionDetails {
    session_id: string;
    original_name: string;
    total_size: number;
    chunk_size: number;
    total_chunks: number;
    uploaded_chunks: number;
    uploaded_bytes: number;
    remaining_bytes: number;
    progress: number;
    is_complete: boolean;
    next_chunk: number | null;
    missing_chunks: number[];
    session_duration: number;
    average_speed: number;
    estimated_time_remaining: number | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
}

export interface UseUploadStatisticsOptions {
    /** Whether to automatically fetch metrics */
    autoFetch?: boolean;
    /** Interval for fetching metrics in milliseconds */
    fetchInterval?: number;
    /** Whether to fetch session details for active sessions */
    fetchSessionDetails?: boolean;
}

export interface UseUploadStatisticsReturn {
    /** Current upload metrics */
    metrics: UploadMetrics | null;
    /** Session details for active sessions */
    sessionDetails: Record<string, SessionDetails>;
    /** Whether metrics are being fetched */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Manually fetch metrics */
    fetchMetrics: () => Promise<void>;
    /** Fetch details for a specific session */
    fetchSessionDetails: (sessionId: string) => Promise<SessionDetails | null>;
    /** Clear error state */
    clearError: () => void;
}

export const useUploadStatistics = (
    options: UseUploadStatisticsOptions = {}
): UseUploadStatisticsReturn => {
    const {
        autoFetch = false,
        fetchInterval = 5000, // 5 seconds
        fetchSessionDetails: autoFetchSessionDetails = false,
    } = options;

    const [metrics, setMetrics] = useState<UploadMetrics | null>(null);
    const [sessionDetails, setSessionDetails] = useState<Record<string, SessionDetails>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Fetch upload metrics
    const fetchMetrics = useCallback(async (): Promise<void> => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/upload/metrics', {
                signal: abortControllerRef.current.signal,
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch metrics');
            }

            setMetrics(data.data);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                return; // Request was aborted, don't set error
            }
            
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch upload metrics';
            setError(errorMessage);
            console.error('Failed to fetch upload metrics:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch session details
    const fetchSessionDetailsForId = useCallback(async (sessionId: string): Promise<SessionDetails | null> => {
        try {
            const response = await fetch(`/api/upload/session/${sessionId}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // Session not found, remove from state
                    setSessionDetails(prev => {
                        const newDetails = { ...prev };
                        delete newDetails[sessionId];
                        return newDetails;
                    });
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Failed to fetch session details');
            }

            const details = data.data as SessionDetails;
            
            setSessionDetails(prev => ({
                ...prev,
                [sessionId]: details,
            }));

            return details;
        } catch (err) {
            console.error(`Failed to fetch session details for ${sessionId}:`, err);
            return null;
        }
    }, []);

    // Clear error state
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Set up auto-fetch interval
    useEffect(() => {
        if (!autoFetch) return;

        // Initial fetch
        fetchMetrics();

        // Set up interval
        intervalRef.current = setInterval(fetchMetrics, fetchInterval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [autoFetch, fetchInterval, fetchMetrics]);

    // Auto-fetch session details when metrics change
    useEffect(() => {
        if (!autoFetchSessionDetails || !metrics) return;

        // For now, we don't have a way to get active session IDs from metrics
        // This would need to be added to the backend metrics endpoint
        // or we could track session IDs from the upload components
    }, [autoFetchSessionDetails, metrics]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    return {
        metrics,
        sessionDetails,
        isLoading,
        error,
        fetchMetrics,
        fetchSessionDetails: fetchSessionDetailsForId,
        clearError,
    };
};