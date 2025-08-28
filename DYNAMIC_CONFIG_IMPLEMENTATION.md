# Dynamic Configuration Implementation

## Problem Solved
Instead of hardcoding chunk sizes in the frontend, the system now dynamically fetches configuration from the server, ensuring consistency between backend and frontend settings.

## Implementation Overview

### 1. Backend API Endpoint
**Route**: `GET /api/upload/config`
**Controller**: `FileUploadController::getUploadConfig()`

Returns upload configuration from server:
```json
{
  "success": true,
  "data": {
    "chunk_size": 2097152,
    "max_file_size": 1073741824,
    "chunk_threshold": 26214400,
    "session_timeout_hours": 48,
    "max_retries": 3
  }
}
```

### 2. Frontend API Client
**File**: `resources/js/lib/api.ts`
**Method**: `getUploadConfig()`

Fetches configuration from server with proper TypeScript types:
```typescript
async getUploadConfig(): Promise<{
    chunk_size: number;
    max_file_size: number;
    chunk_threshold: number;
    session_timeout_hours: number;
    max_retries: number;
}>
```

### 3. Dynamic Configuration Usage

#### useFileUpload Hook
- Fetches config once and caches it
- Uses server chunk size for optimal chunk size calculation
- Uses server threshold for chunked upload decision

```typescript
// Before (hardcoded)
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;
const CHUNKED_UPLOAD_THRESHOLD = 25 * 1024 * 1024;

// After (dynamic)
const config = await getUploadConfig();
const baseChunkSize = config.chunk_size;
const shouldUseChunkedUpload = file.size > config.chunk_threshold;
```

#### FileUploader Component
- Fetches config once per upload session
- Passes chunk size to chunked upload function
- Uses server threshold for upload method selection

```typescript
// Before (hardcoded)
const chunkSize = 2 * 1024 * 1024;
const shouldUseChunkedUpload = file.size > 25 * 1024 * 1024;

// After (dynamic)
const config = await apiClient.getUploadConfig();
const chunkSize = config.chunk_size;
const shouldUseChunkedUpload = file.size > config.chunk_threshold;
```

## Benefits Achieved

### 1. Single Source of Truth
- All chunk size configuration comes from `config/filehosting.php`
- Environment variable `CHUNK_SIZE` controls both backend and frontend
- No more hardcoded values scattered across the codebase

### 2. Consistency Guaranteed
- Frontend always uses the same chunk size as backend
- Configuration changes in `.env` automatically apply to both sides
- No need to rebuild frontend when changing chunk size

### 3. Environment Flexibility
- Development, staging, and production can have different chunk sizes
- Easy to optimize for different server capabilities
- Hardware upgrades only require environment variable changes

### 4. Type Safety
- TypeScript ensures proper data types
- API returns integers, not strings
- Compile-time checking for configuration usage

## Configuration Flow

```
.env file
    ↓
config/filehosting.php
    ↓
FileUploadController::getUploadConfig()
    ↓
/api/upload/config endpoint
    ↓
Frontend ApiClient::getUploadConfig()
    ↓
Cached in frontend for performance
    ↓
Used by upload components and hooks
```

## Performance Optimizations

### 1. Frontend Caching
- Configuration fetched once and cached
- Subsequent calls return cached value
- Reduces API calls during upload sessions

### 2. Efficient API Design
- Single endpoint returns all upload configuration
- Minimal payload size
- Fast response times

### 3. Smart Usage
- Config fetched only when needed
- Shared between multiple upload components
- No redundant API calls

## Testing the Implementation

### 1. Verify API Endpoint
```bash
curl -X GET "http://localhost:8000/api/upload/config" -H "Accept: application/json"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "chunk_size": 2097152,
    "max_file_size": 1073741824,
    "chunk_threshold": 26214400,
    "session_timeout_hours": 48,
    "max_retries": 3
  }
}
```

### 2. Verify Configuration Command
```bash
php artisan upload:chunk-config
```

Should show: "Chunk Size: 2 MB (2097152 bytes)"

### 3. Test Upload Behavior
When uploading a file, the frontend will:
1. Fetch config from `/api/upload/config`
2. Use `chunk_size: 2097152` for chunked uploads
3. Use `chunk_threshold: 26214400` to decide upload method

## Environment Variable Control

Change chunk size by updating `.env`:
```env
# 2MB chunks (current)
CHUNK_SIZE=2097152

# 5MB chunks (for better hardware)
CHUNK_SIZE=5242880

# 10MB chunks (for high-performance servers)
CHUNK_SIZE=10485760
```

Changes take effect immediately without code changes or frontend rebuilds.

## Migration from Hardcoded Values

### Files Updated
- ✅ `resources/js/hooks/useFileUpload.ts` - Dynamic config fetching
- ✅ `resources/js/components/FileUploader.tsx` - Server config usage
- ✅ `resources/js/lib/api.ts` - Config API client method
- ✅ `app/Http/Controllers/FileUploadController.php` - Config endpoint
- ✅ `routes/api.php` - Config route registration

### Hardcoded Values Removed
- ❌ `DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024`
- ❌ `CHUNKED_UPLOAD_THRESHOLD = 25 * 1024 * 1024`
- ❌ `const chunkSize = 2 * 1024 * 1024`
- ❌ `file.size > 25 * 1024 * 1024`

### Dynamic Values Added
- ✅ `config.chunk_size` from server
- ✅ `config.chunk_threshold` from server
- ✅ Cached configuration fetching
- ✅ Type-safe API responses

## Result

The system now has a truly dynamic configuration where:
1. **Backend controls all settings** via environment variables
2. **Frontend fetches settings** from backend API
3. **No hardcoded values** in the frontend code
4. **Single source of truth** for all upload configuration
5. **Easy environment-specific tuning** without code changes

This solves the original problem of hardcoded values and provides a maintainable, flexible configuration system.