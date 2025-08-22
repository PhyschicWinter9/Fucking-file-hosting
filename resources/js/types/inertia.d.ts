import { Config } from 'ziggy-js';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Auth {
  user: User | null;
}

export interface Flash {
  success?: string;
  error?: string;
  warning?: string;
  info?: string;
}

export interface Errors {
  [key: string]: string;
}

export interface SharedProps {
  auth: Auth;
  flash: Flash;
  errors: Errors;
  ziggy: Config;
}

export interface PageProps<T = Record<string, unknown>> extends SharedProps {
  [key: string]: unknown;
}

// Upload page props
export interface UploadPageProps extends PageProps {
  max_file_size: number;
  allowed_mime_types?: string[];
  chunk_size: number;
}

// File show page props
export interface FileShowPageProps extends PageProps {
  file: {
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
  };
}

declare global {
  interface Window {
    route: (name: string, params?: Record<string, any>) => string;
  }
}

declare module '@inertiajs/react' {
  interface PageProps extends SharedProps {}
}
