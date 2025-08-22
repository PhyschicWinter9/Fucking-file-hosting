import { UploadError } from '@/types/upload';

/**
 * Utility functions for API operations
 */

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: UploadError): boolean {
    const retryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'SERVER_ERROR',
        'RATE_LIMIT_EXCEEDED'
    ];
    
    return retryableCodes.includes(error.code);
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            
            if (attempt === maxRetries) {
                break;
            }
            
            // Check if error is retryable
            if (!isRetryableError(error)) {
                break;
            }
            
            const delay = calculateBackoffDelay(attempt, baseDelay);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError!;
}

/**
 * Create a timeout promise
 */
export function createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
}

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        createTimeoutPromise(timeoutMs)
    ]);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, maxSize: number = 10 * 1024 * 1024 * 1024): UploadError | null {
    // Check file size
    if (file.size > maxSize) {
        return {
            code: 'FILE_TOO_LARGE',
            message: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`,
            details: {
                file_size: file.size,
                max_size: maxSize
            }
        };
    }
    
    // Check if file is empty
    if (file.size === 0) {
        return {
            code: 'EMPTY_FILE',
            message: 'Cannot upload empty files'
        };
    }
    
    return null;
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse error response from server
 */
export function parseServerError(error: any): UploadError {
    if (error.response?.data?.error) {
        return {
            code: error.response.data.error.code || 'SERVER_ERROR',
            message: error.response.data.error.message || 'Server error occurred',
            details: error.response.data.error.details
        };
    }
    
    if (error.response?.status === 413) {
        return {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds server limits'
        };
    }
    
    if (error.response?.status === 429) {
        return {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: { retry_after: error.response.headers['retry-after'] }
        };
    }
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return {
            code: 'TIMEOUT_ERROR',
            message: 'Request timed out. Please try again.'
        };
    }
    
    if (!error.response) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Network error. Please check your connection.'
        };
    }
    
    return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred'
    };
}