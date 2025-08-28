import axios, { AxiosProgressEvent, AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
    ApiResponse,
    UploadResponse,
    ChunkedUploadInitResponse,
    ChunkedUploadChunkResponse,
    ChunkedUploadFinalizeResponse,
    FileInfoResponse,
} from '@/types/api';
import { UploadError } from '@/types/upload';
import { parseServerError, validateFile, generateRequestId } from '@/utils/apiHelpers';

// Configure axios defaults
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Add CSRF token if available
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (csrfToken) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

export class ApiClient {
    private static instance: ApiClient;
    private baseURL: string;
    private axiosInstance: AxiosInstance;
    private maxRetries: number = 3;
    private retryDelay: number = 1000; // 1 second

    private constructor() {
        this.baseURL = '/api';
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 300000, // 5 minutes for large file uploads
        });

        this.setupInterceptors();
    }

    public static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    /**
     * Setup request and response interceptors
     */
    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            (config) => {
                // Add timestamp to prevent caching
                if (config.method === 'get') {
                    config.params = { ...config.params, _t: Date.now() };
                }
                
                // Log request for debugging (only in development)
                if (process.env.NODE_ENV === 'development') {
                    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
                }
                
                return config;
            },
            (error) => {
                console.error('Request interceptor error:', error);
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => {
                // Log successful responses in development
                if (process.env.NODE_ENV === 'development') {
                    console.log(`API Response: ${response.status} ${response.config.url}`);
                }
                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as any;

                // Log errors in development
                if (process.env.NODE_ENV === 'development') {
                    console.error(`API Error: ${error.response?.status} ${error.config?.url}`, error);
                }

                // Handle specific error cases
                if (error.response?.status === 401) {
                    // Handle unauthorized - could redirect to login if needed
                    console.warn('Unauthorized request');
                }

                if (error.response?.status === 429) {
                    // Handle rate limiting
                    const retryAfter = error.response.headers['retry-after'];
                    if (retryAfter && !originalRequest._retry) {
                        originalRequest._retry = true;
                        await this.delay(parseInt(retryAfter) * 1000);
                        return this.axiosInstance(originalRequest);
                    }
                }

                // Retry logic for network errors and 5xx errors
                if (this.shouldRetry(error) && !originalRequest._retry) {
                    originalRequest._retry = true;
                    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

                    if (originalRequest._retryCount <= this.maxRetries) {
                        const delay = this.retryDelay * Math.pow(2, originalRequest._retryCount - 1); // Exponential backoff
                        await this.delay(delay);
                        return this.axiosInstance(originalRequest);
                    }
                }

                return Promise.reject(error);
            }
        );
    }

    /**
     * Determine if a request should be retried
     */
    private shouldRetry(error: AxiosError): boolean {
        // Retry on network errors
        if (!error.response) {
            return true;
        }

        // Retry on 5xx server errors
        if (error.response.status >= 500) {
            return true;
        }

        // Retry on specific 4xx errors that might be temporary
        if (error.response.status === 408 || error.response.status === 429) {
            return true;
        }

        return false;
    }

    /**
     * Delay utility for retry logic
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Upload a single file
     */
    async uploadFile(
        file: File,
        options?: {
            expirationDays?: number | null;
            onProgress?: (progress: number) => void;
        }
    ): Promise<UploadResponse> {
        // Validate file before upload
        const validationError = this.validateFile(file);
        if (validationError) {
            throw validationError;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('request_id', generateRequestId());
        
        if (options?.expirationDays !== undefined) {
            formData.append('expiration_days', String(options.expirationDays));
        }

        try {
            const response = await this.axiosInstance.post<ApiResponse<UploadResponse>>(
                '/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        if (progressEvent.total && options?.onProgress) {
                            const progress = (progressEvent.loaded / progressEvent.total) * 100;
                            options.onProgress(progress);
                        }
                    },
                }
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Upload failed');
            }

            return response.data.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Get upload configuration from server
     */
    async getUploadConfig(): Promise<{
        chunk_size: number;
        max_file_size: number;
        chunk_threshold: number;
        session_timeout_hours: number;
        max_retries: number;
    }> {
        const response = await this.axiosInstance.get('/upload/config');
        return response.data.data;
    }

    /**
     * Initialize chunked upload (using the chunk endpoint with init data)
     */
    async initChunkedUpload(
        file: File,
        chunkSize: number,
        expirationDays?: number | null
    ): Promise<ChunkedUploadInitResponse> {
        try {
            const formData = new FormData();
            formData.append('action', 'init');
            formData.append('original_name', file.name);
            formData.append('total_size', String(file.size));
            formData.append('mime_type', file.type);
            formData.append('chunk_size', String(chunkSize));
            
            if (expirationDays !== null && expirationDays !== undefined) {
                formData.append('expiration_days', String(expirationDays));
            }

            const response = await this.axiosInstance.post<ApiResponse<ChunkedUploadInitResponse>>(
                '/upload/chunk',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Failed to initialize upload');
            }

            return response.data.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Upload a file chunk
     */
    async uploadChunk(
        sessionId: string,
        chunkIndex: number,
        chunk: Blob,
        onProgress?: (progress: number) => void
    ): Promise<ChunkedUploadChunkResponse> {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('chunk_index', String(chunkIndex));
        formData.append('chunk', chunk);

        try {
            const response = await this.axiosInstance.post<ApiResponse<ChunkedUploadChunkResponse>>(
                '/upload/chunk',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                        if (progressEvent.total && onProgress) {
                            const progress = (progressEvent.loaded / progressEvent.total) * 100;
                            onProgress(progress);
                        }
                    },
                }
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Chunk upload failed');
            }

            return response.data.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Finalize chunked upload
     */
    async finalizeChunkedUpload(sessionId: string): Promise<ChunkedUploadFinalizeResponse> {
        try {
            const response = await this.axiosInstance.post<ApiResponse<ChunkedUploadFinalizeResponse>>(
                '/upload/finalize',
                { session_id: sessionId }
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Failed to finalize upload');
            }

            return response.data.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Get file information
     */
    async getFileInfo(fileId: string): Promise<FileInfoResponse> {
        try {
            const response = await this.axiosInstance.get<ApiResponse<FileInfoResponse>>(
                `/file/${fileId}/info`
            );

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error?.message || 'Failed to get file info');
            }

            return response.data.data;
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Cancel all pending requests
     */
    public cancelAllRequests(): void {
        // Create a new axios instance to effectively cancel all pending requests
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 300000,
        });
        this.setupInterceptors();
    }

    /**
     * Set custom timeout for requests
     */
    public setTimeout(timeout: number): void {
        this.axiosInstance.defaults.timeout = timeout;
    }

    /**
     * Set custom retry configuration
     */
    public setRetryConfig(maxRetries: number, retryDelay: number): void {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
    }



    /**
     * Health check endpoint
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.axiosInstance.get('/health');
            return response.status === 200;
        } catch  {
            return false;
        }
    }

    /**
     * Validate file before upload
     */
    public validateFile(file: File): UploadError | null {
        return validateFile(file);
    }

    /**
     * Handle API errors and convert to UploadError
     */
    private handleError(error: any): UploadError {
        return parseServerError(error);
    }
}

export const apiClient = ApiClient.getInstance();