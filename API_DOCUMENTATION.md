# FastFile API Documentation

## Overview

FastFile provides a RESTful API for file upload, download, and management operations. The API is designed for speed, privacy, and simplicity.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:8000/api
```

## Authentication

No authentication required. The API is designed for anonymous usage.

## Rate Limiting

- Upload endpoints: 10 requests per minute per IP
- Download endpoints: 60 requests per minute per IP
- General API: 100 requests per minute per IP

## File Upload

### Single File Upload

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `file` (required): The file to upload
- `expiration_days` (optional): Number of days until file expires (1-365, null for permanent)

**Request Example:**

```bash
curl -X POST \
  http://localhost:8000/api/upload \
  -F "file=@example.pdf" \
  -F "expiration_days=30"
```

**Response (Success):**

```json
{
    "success": true,
    "data": {
        "file_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "original_name": "example.pdf",
        "file_size": 1048576,
        "human_file_size": "1.00 MB",
        "mime_type": "application/pdf",
        "download_url": "https://your-domain.com/f/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "preview_url": "https://your-domain.com/p/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "info_url": "https://your-domain.com/file/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "expires_at": "2024-02-15T10:30:00Z",
        "is_duplicate": false,
        "space_saved": 0,
        "created_at": "2024-01-16T10:30:00Z"
    }
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": {
        "code": "FILE_TOO_LARGE",
        "message": "File size exceeds maximum limit of 100MB",
        "details": {
            "max_size": 104857600,
            "file_size": 209715200
        }
    }
}
```

### Chunked Upload (Large Files)

#### Initialize Chunked Upload

**Endpoint:** `POST /api/upload/init`

**Content-Type:** `application/json`

**Parameters:**

```json
{
    "filename": "large-file.zip",
    "size": 524288000,
    "chunk_size": 2097152,
    "expiration_days": 30
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "session_id": "upload_session_123456789",
        "chunk_size": 2097152,
        "total_chunks": 250,
        "expires_at": "2024-01-16T11:30:00Z"
    }
}
```

#### Upload Chunk

**Endpoint:** `POST /api/upload/chunk`

**Content-Type:** `multipart/form-data`

**Parameters:**

- `session_id`: Session ID from initialization
- `chunk_index`: Zero-based chunk index
- `chunk`: Binary chunk data

**Response:**

```json
{
    "success": true,
    "data": {
        "chunk_index": 0,
        "uploaded_chunks": 1,
        "total_chunks": 250,
        "progress": 0.4
    }
}
```

#### Finalize Upload

**Endpoint:** `POST /api/upload/finalize`

**Content-Type:** `application/json`

**Parameters:**

```json
{
    "session_id": "upload_session_123456789"
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "file_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "original_name": "large-file.zip",
        "file_size": 524288000,
        "human_file_size": "500.00 MB",
        "mime_type": "application/zip",
        "download_url": "https://your-domain.com/f/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "preview_url": null,
        "info_url": "https://your-domain.com/file/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "expires_at": "2024-02-15T10:30:00Z",
        "created_at": "2024-01-16T10:30:00Z"
    }
}
```

## File Information

### Get File Information

**Endpoint:** `GET /api/file/{file_id}/info`

**Response:**

```json
{
    "success": true,
    "data": {
        "file_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "original_name": "example.pdf",
        "file_size": 1048576,
        "human_file_size": "1.00 MB",
        "mime_type": "application/pdf",
        "download_url": "https://your-domain.com/f/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "preview_url": "https://your-domain.com/p/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "info_url": "https://your-domain.com/file/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "expires_at": "2024-02-15T10:30:00Z",
        "is_expired": false,
        "created_at": "2024-01-16T10:30:00Z",
        "can_delete": true
    }
}
```

## File Download

### Direct Download

**Endpoint:** `GET /f/{file_id}`

**Response:** Binary file content with appropriate headers

**Headers:**

- `Content-Type`: File MIME type
- `Content-Length`: File size in bytes
- `Content-Disposition`: attachment; filename="original-name.ext"
- `Accept-Ranges`: bytes (for resume support)

### File Preview

**Endpoint:** `GET /p/{file_id}`

**Response:** File content for inline viewing (images, videos, PDFs)

**Headers:**

- `Content-Type`: File MIME type
- `Content-Disposition`: inline; filename="original-name.ext"

## File Management

### Delete File (Owner Only)

**Endpoint:** `DELETE /api/file/{file_id}`

**Headers:**

- `X-Delete-Token`: Token provided during upload (if enabled)

**Response:**

```json
{
    "success": true,
    "message": "File deleted successfully"
}
```

### Bulk Operations

#### Get Upload Statistics

**Endpoint:** `GET /api/stats`

**Response:**

```json
{
    "success": true,
    "data": {
        "total_files": 1250,
        "total_size": 52428800000,
        "total_size_human": "48.83 GB",
        "files_today": 45,
        "size_today": 2147483648,
        "size_today_human": "2.00 GB"
    }
}
```

## Error Codes

| Code                  | Description                       |
| --------------------- | --------------------------------- |
| `FILE_TOO_LARGE`      | File exceeds maximum size limit   |
| `INVALID_FILE_TYPE`   | File type not allowed             |
| `FILE_NOT_FOUND`      | Requested file does not exist     |
| `FILE_EXPIRED`        | File has expired and been deleted |
| `UPLOAD_FAILED`       | General upload failure            |
| `CHUNK_UPLOAD_FAILED` | Chunked upload failure            |
| `SESSION_EXPIRED`     | Upload session has expired        |
| `INVALID_CHUNK`       | Chunk data is invalid             |
| `RATE_LIMIT_EXCEEDED` | Too many requests                 |
| `STORAGE_FULL`        | Server storage is full            |
| `PERMISSION_DENIED`   | Operation not allowed             |

## HTTP Status Codes

- `200 OK`: Successful operation
- `201 Created`: File uploaded successfully
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: File or resource not found
- `413 Payload Too Large`: File too large
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `507 Insufficient Storage`: Storage full

## Usage Examples

### JavaScript/Fetch API

```javascript
// Single file upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('expiration_days', '30');

const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
});

const result = await response.json();
if (result.success) {
    console.log('Download URL:', result.data.download_url);
}
```

### cURL Examples

```bash
# Upload file
curl -X POST \
  http://localhost:8000/api/upload \
  -F "file=@document.pdf" \
  -F "expiration_days=7"

# Get file info
curl -X GET \
  http://localhost:8000/api/file/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/info

# Download file
curl -X GET \
  http://localhost:8000/f/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 \
  -o downloaded-file.pdf

# Delete file
curl -X DELETE \
  http://localhost:8000/api/file/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 \
  -H "X-Delete-Token: delete_token_here"
```

### Python Example

```python
import requests

# Upload file
with open('example.pdf', 'rb') as f:
    files = {'file': f}
    data = {'expiration_days': 30}
    response = requests.post('http://localhost:8000/api/upload',
                           files=files, data=data)

if response.json()['success']:
    download_url = response.json()['data']['download_url']
    print(f'File uploaded: {download_url}')
```

## SDK and Libraries

### Official Libraries

- **JavaScript/Node.js**: `npm install fastfile-js`
- **Python**: `pip install fastfile-python`
- **PHP**: `composer require fastfile/php-sdk`

### Community Libraries

- **Go**: `go get github.com/fastfile/go-sdk`
- **Rust**: `cargo add fastfile-rust`
- **Java**: Available on Maven Central

## Webhooks (Optional)

Configure webhooks to receive notifications about file events:

**Webhook Events:**

- `file.uploaded`: File successfully uploaded
- `file.downloaded`: File downloaded
- `file.expired`: File expired and deleted
- `file.deleted`: File manually deleted

**Webhook Payload:**

```json
{
    "event": "file.uploaded",
    "timestamp": "2024-01-16T10:30:00Z",
    "data": {
        "file_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "original_name": "example.pdf",
        "file_size": 1048576,
        "mime_type": "application/pdf"
    }
}
```

## Security Considerations

- All file IDs are cryptographically secure and unguessable
- No personal data is logged or stored
- Files are served with appropriate security headers
- Rate limiting prevents abuse
- Optional virus scanning integration
- HTTPS enforcement in production

## Performance Notes

- Files under 25MB use single upload
- Files over 25MB automatically use chunked upload
- Chunked uploads support resume functionality
- Download streaming for memory efficiency
- CDN-ready architecture for global distribution

## Support

For API support and questions:

- Documentation: https://docs.fastfile.com
- GitHub Issues: https://github.com/fastfile/api/issues
- Email: api-support@fastfile.com
