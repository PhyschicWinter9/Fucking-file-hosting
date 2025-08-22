# Design Document

## Overview

The FuckingFast File Hosting Service is a Laravel 12-based web application designed for shared hosting environments with cPanel support. The system prioritizes speed, privacy, and simplicity while handling file uploads up to 10GB with zero user tracking. The architecture follows Laravel best practices while being optimized for shared hosting constraints.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Laravel App    │    │   MySQL DB      │
│ (React + Inertia)│◄──►│ (Controllers)    │◄──►│   (Files Meta)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  File Storage   │
                       │  (public/files) │
                       └─────────────────┘
```

### Technology Stack

- **Backend Framework**: Laravel 12 with PHP 8.2+
- **Frontend Integration**: Inertia.js with React 19 starter kit 
- **Database**: MySQL 8.0+ with InnoDB storage engine
- **Frontend**: React 19 with TypeScript
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite (Laravel's default)
- **File Storage**: Local filesystem with Laravel Storage facade
- **Web Server**: Apache with .htaccess (shared hosting)
- **Deployment**: cPanel-compatible structure

### Inertia.js Integration

- **Page Rendering**: Server-side data preparation with client-side React rendering
- **State Management**: Inertia's built-in state management for page data
- **Form Handling**: Inertia forms for seamless file uploads with progress tracking
- **Navigation**: SPA-like navigation without API complexity
- **Error Handling**: Unified error handling between Laravel and React

### Shared Hosting Optimizations

- **Memory Management**: Chunked file processing to stay within PHP memory limits
- **Execution Time**: Background processing for large file operations
- **File Permissions**: Proper 644/755 permissions for shared hosting
- **Database**: Optimized queries with proper indexing for shared MySQL
- **Caching**: File-based caching to avoid Redis/Memcached dependencies

## Components and Interfaces

### Core Components

#### 1. File Upload Component

```php
class FileUploadController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Upload/Index');
    }

    public function upload(Request $request): JsonResponse
    public function chunkedUpload(Request $request): JsonResponse
    public function finalizeUpload(Request $request): JsonResponse

    public function show(string $fileId): Response
    {
        return Inertia::render('File/Show', [
            'file' => $this->fileService->retrieve($fileId)
        ]);
    }
}
```

**Responsibilities:**

- Render Inertia pages for upload interface
- Handle single and chunked file uploads via AJAX
- Generate cryptographic file identifiers
- Validate file size and type
- Store file metadata in database
- Return file data to React components

#### 2. File Download Component

```php
class FileDownloadController extends Controller
{
    public function download(string $fileId): StreamedResponse
    public function preview(string $fileId): Response
    public function info(string $fileId): JsonResponse
}
```

**Responsibilities:**

- Serve files with proper headers
- Handle range requests for large files
- Provide file previews for media
- Stream files efficiently
- Return 404 for missing files

#### 3. File Management Service

```php
class FileService
{
    public function store(UploadedFile $file, ?int $expirationDays = null): FileModel
    public function retrieve(string $fileId): ?FileModel
    public function delete(string $fileId): bool
    public function cleanup(): int
    public function generateSecureId(): string
}
```

**Responsibilities:**

- Business logic for file operations
- Cryptographic ID generation using SHA-256
- File expiration management
- Duplicate detection via checksums
- Storage optimization

#### 4. Privacy Manager

```php
class PrivacyManager
{
    public function sanitizeRequest(Request $request): void
    public function preventLogging(): void
    public function generateAnonymousId(): string
}
```

**Responsibilities:**

- Strip personal data from requests
- Prevent IP logging
- Generate anonymous session identifiers
- Ensure GDPR compliance

### Database Schema

#### Files Table

```sql
CREATE TABLE files (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(64) UNIQUE NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_file_id (file_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_checksum (checksum)
);
```

### Routes and Endpoints

#### Inertia Routes (Web)

- `GET /` - Upload interface (Inertia page)
- `GET /file/{id}` - File information page (Inertia page)

#### AJAX API Endpoints

- `POST /api/upload` - Single file upload
- `POST /api/upload/chunk` - Chunked upload
- `POST /api/upload/finalize` - Finalize chunked upload
- `GET /api/file/{id}/info` - File information (JSON)

#### Direct File Routes

- `GET /f/{id}` - Download file
- `GET /p/{id}` - Preview file

#### Internal API

- `DELETE /api/cleanup` - Cleanup expired files (cron)
- `GET /api/stats` - Storage statistics (admin)

## Data Models

### File Model

```php
class File extends Model
{
    protected $fillable = [
        'file_id', 'original_name', 'file_path',
        'mime_type', 'file_size', 'checksum', 'expires_at'
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'file_size' => 'integer'
    ];

    public function isExpired(): bool
    public function getDownloadUrl(): string
    public function getPreviewUrl(): string
    public function getHumanFileSize(): string
}
```

### Upload Session Model (for chunked uploads)

```php
class UploadSession extends Model
{
    protected $fillable = [
        'session_id', 'original_name', 'total_size',
        'chunk_size', 'uploaded_chunks', 'expires_at'
    ];

    public function isComplete(): bool
    public function getNextChunkIndex(): int
    public function addChunk(int $chunkIndex): void
}
```

## User Interface Design

### Frontend Architecture

#### Component Structure (Inertia + React 19)

```
resources/
├── js/
│   ├── app.tsx (Inertia app setup)
│   ├── Pages/ (Inertia pages)
│   │   ├── Upload/
│   │   │   └── Index.tsx (main upload page)
│   │   └── File/
│   │       └── Show.tsx (file info page)
│   ├── Components/
│   │   ├── ui/ (shadcn/ui components)
│   │   │   ├── button.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── card.tsx
│   │   │   ├── toast.tsx
│   │   │   └── dialog.tsx
│   │   ├── FileUploader.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── FileInfo.tsx
│   │   ├── FilePreview.tsx
│   │   └── Layout.tsx
│   ├── Hooks/
│   │   ├── useFileUpload.ts
│   │   ├── useProgress.ts
│   │   ├── useClipboard.ts
│   │   └── useToast.ts
│   ├── Types/
│   │   ├── file.ts
│   │   ├── upload.ts
│   │   ├── api.ts
│   │   └── inertia.d.ts
│   ├── Utils/
│   │   ├── api.ts
│   │   ├── fileUtils.ts
│   │   ├── formatters.ts
│   │   └── cn.ts (class name utility)
│   └── Lib/
│       └── utils.ts
├── css/
│   └── app.css (Tailwind imports + custom styles)
└── views/
    └── app.blade.php (Inertia root template)
```

#### Key UI Components

**1. Upload Interface**

- Large drag-and-drop zone (60% of viewport height)
- Click-to-upload fallback
- Real-time progress bars with percentage
- Multiple file support with individual progress
- Error handling with user-friendly messages

**2. File Information Display**

- File name, size, and type
- Upload date and expiration
- Copy-to-clipboard download URL
- QR code for mobile sharing
- Preview for supported formats

**3. Dark Theme Specifications (Tailwind CSS)**

```css
/* Custom Tailwind theme configuration */
theme: {
  extend: {
    colors: {
      background: '#1a1a1a',
      secondary: '#2d2d2d',
      foreground: '#ffffff',
      muted: '#cccccc',
      primary: {
        DEFAULT: '#ff6b35',
        foreground: '#ffffff'
      },
      accent: {
        DEFAULT: '#f7931e',
        foreground: '#ffffff'
      },
      destructive: '#f44336',
      success: '#4caf50',
      warning: '#ff9800'
    },
    backgroundImage: {
      'gradient-primary': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)'
    }
  }
}
```

### Responsive Design

#### Breakpoints

- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

#### Mobile Optimizations

- Touch-friendly upload area
- Simplified progress indicators
- Optimized file previews
- Reduced animation complexity

## Error Handling

### Error Categories

#### 1. Upload Errors

- File too large (> 10GB)
- Invalid file type
- Network interruption
- Server storage full
- PHP execution timeout

#### 2. Download Errors

- File not found (404)
- File expired
- Corrupted file
- Server unavailable

#### 3. System Errors

- Database connection failure
- File system permissions
- Memory limit exceeded
- Disk space insufficient

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File size exceeds 10GB limit",
    "details": {
      "max_size": "10737418240",
      "file_size": "12884901888"
    }
  }
}
```

### User-Friendly Error Messages

- Technical errors translated to simple language
- Actionable suggestions for resolution
- Progress preservation on recoverable errors
- Graceful degradation for unsupported features

## Security Considerations

### File Security

- Cryptographic file IDs (SHA-256 + random salt)
- MIME type validation and sanitization
- File extension whitelist/blacklist
- Virus scanning integration (optional)
- Content-Security-Policy headers

### Privacy Protection

- No IP address logging
- No user agent storage
- No referrer tracking
- No analytics or tracking scripts
- Minimal data retention

### Shared Hosting Security

- .htaccess protection for sensitive directories
- Environment variable protection
- Database credential security
- File permission hardening
- HTTPS enforcement

## Performance Optimizations

### Upload Performance

- Chunked uploads for files > 100MB
- Parallel chunk processing
- Resume capability for interrupted uploads
- Client-side file validation
- Compression for text files

### Download Performance

- HTTP range request support
- Proper caching headers
- Content-Disposition optimization
- Streaming for large files
- CDN-ready architecture

### Database Performance

- Proper indexing strategy
- Query optimization
- Connection pooling
- Automated cleanup procedures
- Partitioning for large datasets

### Shared Hosting Optimizations

- Memory-efficient file processing
- Execution time management
- Resource usage monitoring
- Graceful degradation
- Background task processing

## Testing Strategy

### Unit Testing

- File upload/download logic
- Cryptographic ID generation
- File validation functions
- Privacy protection mechanisms
- Error handling scenarios

### Integration Testing

- API endpoint functionality
- Database operations
- File system interactions
- Chunked upload process
- Cleanup procedures

### Performance Testing

- Large file upload/download
- Concurrent user simulation
- Memory usage monitoring
- Database query performance
- Shared hosting limits

### Security Testing

- File type validation bypass attempts
- Path traversal prevention
- Privacy leak detection
- CSRF protection verification
- SQL injection prevention

### Browser Testing

- Cross-browser compatibility
- Mobile device testing
- Progressive enhancement
- Accessibility compliance
- Performance on slow connections

## Deployment Architecture

### Shared Hosting Structure

```
public_html/
├── index.php (Laravel entry point)
├── .htaccess (URL rewriting)
├── assets/ (CSS, JS, images)
├── storage/
│   ├── app/files/ (uploaded files)
│   ├── logs/
│   └── cache/
├── vendor/ (Composer dependencies)
├── app/ (Laravel application)
├── config/
├── database/
└── .env (environment configuration)
```

### Environment Configuration

- Production-ready .env template
- Database connection optimization
- File storage path configuration
- Upload limit settings
- Security key generation

### Cron Job Setup

```bash
# Cleanup expired files daily at 2 AM
0 2 * * * cd /path/to/app && php artisan files:cleanup
```

### Monitoring and Maintenance

- Storage usage tracking
- Error log monitoring
- Performance metrics collection
- Automated backup procedures
- Health check endpoints
