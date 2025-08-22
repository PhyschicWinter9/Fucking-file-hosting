export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface UploadResponse {
  file_id: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
  preview_url?: string;
  expires_at: string | null;
}

export interface ChunkedUploadInitResponse {
  session_id: string;
  chunk_size: number;
  total_chunks: number;
}

export interface ChunkedUploadChunkResponse {
  chunk_index: number;
  uploaded: boolean;
  next_chunk_index?: number;
}

export interface ChunkedUploadFinalizeResponse {
  file_id: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  download_url: string;
  preview_url?: string;
  expires_at: string | null;
}

export interface FileInfoResponse {
  file_id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  human_file_size: string;
  expires_at: string | null;
  created_at: string;
  download_url: string;
  preview_url?: string;
  is_expired: boolean;
}

export interface ValidationErrorResponse {
  message: string;
  errors: Record<string, string[]>;
}

export interface RateLimitResponse {
  message: string;
  retry_after: number;
}