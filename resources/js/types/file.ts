export interface File {
  id: number;
  file_id: string;
  original_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: number;
  session_id: string;
  original_name: string;
  total_size: number;
  chunk_size: number;
  uploaded_chunks: number[];
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface FileInfo {
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