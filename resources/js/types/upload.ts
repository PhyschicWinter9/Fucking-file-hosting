export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  uploaded_bytes: number;
  total_bytes: number;
  speed?: number; // bytes per second
  eta?: number; // estimated time remaining in seconds
}

export interface ChunkUploadProgress {
  chunk_index: number;
  chunk_size: number;
  uploaded: boolean;
  progress: number;
  error?: string;
}

export interface UploadError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface UploadOptions {
  chunk_size?: number;
  max_retries?: number;
  expiration_days?: number | null;
  on_progress?: (progress: UploadProgress) => void;
  on_chunk_progress?: (chunk: ChunkUploadProgress) => void;
  on_error?: (error: UploadError) => void;
  on_complete?: (file_id: string) => void;
}

export interface UploadResult {
  success: boolean;
  file_id?: string;
  download_url?: string;
  error?: UploadError;
}

export interface ChunkedUploadSession {
  session_id: string;
  original_name: string;
  total_size: number;
  chunk_size: number;
  uploaded_chunks: number[];
  next_chunk_index: number;
  is_complete: boolean;
}

export interface FileValidation {
  is_valid: boolean;
  errors: string[];
  max_size: number;
  allowed_types?: string[];
}