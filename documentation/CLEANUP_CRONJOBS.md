# Cleanup Cron Jobs Configuration

This document explains how to configure cron jobs for automatic cleanup of temporary files, expired uploads, and system maintenance.

## Automatic Scheduling (Laravel Scheduler)

The application includes built-in scheduling via Laravel's task scheduler. To enable automatic cleanup, add this single cron job to your server:

```bash
* * * * * cd /path/to/your/project && php artisan schedule:run >> /dev/null 2>&1
```

This will automatically run the following cleanup tasks:

### Scheduled Cleanup Tasks

| Task | Frequency | Command | Description |
|------|-----------|---------|-------------|
| **Upload Sessions** | Every 6 hours | `upload:cleanup-sessions` | Cleans expired chunked upload sessions |
| **Expired Files** | Daily at 2 AM | `files:cleanup --force` | Removes expired files from storage |
| **Temporary Files** | Twice daily (2 AM, 2 PM) | `upload:cleanup-temp --force` | Cleans temp chunks, failed uploads, orphaned files |
| **Comprehensive** | Weekly (Sunday 3 AM) | `upload:cleanup-all --force` | Runs all cleanup operations |

## Manual Cron Job Configuration

If you prefer manual cron job setup instead of Laravel scheduler, add these entries to your crontab:

```bash
# Edit crontab
crontab -e

# Add these lines:
# Clean expired upload sessions every 6 hours
0 */6 * * * cd /path/to/your/project && php artisan upload:cleanup-sessions

# Clean expired files daily at 2 AM
0 2 * * * cd /path/to/your/project && php artisan files:cleanup --force

# Clean temporary files twice daily
0 2,14 * * * cd /path/to/your/project && php artisan upload:cleanup-temp --force

# Comprehensive cleanup weekly on Sunday at 3 AM
0 3 * * 0 cd /path/to/your/project && php artisan upload:cleanup-all --force
```

## Available Cleanup Commands

### 1. Expired Files Cleanup
```bash
# Clean expired files
php artisan files:cleanup

# Options:
--dry-run    # Show what would be deleted without deleting
--force      # Skip confirmation prompts
```

### 2. Upload Sessions Cleanup
```bash
# Clean expired upload sessions and chunks
php artisan upload:cleanup-sessions
```

### 3. Temporary Files Cleanup
```bash
# Clean all temporary files
php artisan upload:cleanup-temp

# Clean specific types:
php artisan upload:cleanup-temp --chunks        # Only temp chunks
php artisan upload:cleanup-temp --failed        # Only failed uploads
php artisan upload:cleanup-temp --orphaned      # Only orphaned files
php artisan upload:cleanup-temp --empty-dirs    # Only empty directories

# Options:
--dry-run    # Show what would be deleted without deleting
--force      # Skip confirmation prompts
```

### 4. Comprehensive Cleanup
```bash
# Run all cleanup operations
php artisan upload:cleanup-all

# Options:
--dry-run    # Show what would be deleted without deleting
--force      # Skip confirmation prompts
```

## Configuration Options

All cleanup behavior can be configured via environment variables:

### Chunk Upload Settings
```env
# 2MB chunks recommended for shared hosting
CHUNK_SIZE=2097152
CHUNKED_UPLOAD_SESSION_TIMEOUT_HOURS=48
CHUNKED_UPLOAD_CLEANUP_INTERVAL_HOURS=6
CHUNKED_UPLOAD_MAX_RETRIES=3

# Future hardware upgrade note:
# CHUNK_SIZE_FUTURE_UPGRADE=10485760  # 10MB for better hardware
```

### Cleanup Settings
```env
# Enable/disable cleanup operations
CLEANUP_TEMP_CHUNKS_ENABLED=true
CLEANUP_FAILED_UPLOADS_ENABLED=true
CLEANUP_ORPHANED_FILES_ENABLED=true
CLEANUP_EMPTY_DIRECTORIES_ENABLED=true

# Cleanup age thresholds
CLEANUP_TEMP_CHUNKS_AGE_HOURS=24      # Clean chunks older than 24 hours
CLEANUP_FAILED_UPLOADS_AGE_HOURS=72   # Clean failed uploads older than 72 hours
```

## Shared Hosting Considerations

### Memory Optimization
- **2MB chunks** use less memory per operation
- Reduces server load during uploads
- Better compatibility with shared hosting limits

### Inode Optimization
- **2MB chunks** create fewer files on disk
- Saves inodes (important on shared hosting)
- Reduces filesystem overhead

### Cloudflare Compatibility
- **2MB chunks** work well with Cloudflare's limits
- Reduces timeout issues during uploads
- Better reliability for large files

## Monitoring Cleanup Operations

### Check Cleanup Status
```bash
# View recent cleanup activity
php artisan upload:cleanup-all --dry-run

# Check system resources
php artisan filehosting:monitor
```

### Log Files
Cleanup operations are logged to Laravel's standard log files:
- `storage/logs/laravel.log`
- Check for cleanup success/failure messages

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod -R 755 storage/
   chown -R www-data:www-data storage/
   ```

2. **Memory Limits**
   ```bash
   # Increase PHP memory limit temporarily
   php -d memory_limit=1G artisan upload:cleanup-all
   ```

3. **Timeout Issues**
   ```bash
   # Run cleanup in smaller batches
   php artisan upload:cleanup-temp --chunks
   php artisan upload:cleanup-temp --failed
   php artisan upload:cleanup-temp --orphaned
   ```

### Disk Space Monitoring
```bash
# Check disk usage
df -h

# Check storage directory size
du -sh storage/

# Check specific directories
du -sh storage/app/chunks/
du -sh storage/app/public/files/
```

## Future Hardware Upgrades

When upgrading to better hardware, consider these optimizations:

1. **Increase Chunk Size**
   ```env
   # From 2MB to 10MB or higher
   CHUNK_SIZE=10485760  # 10MB
   ```

2. **Adjust Cleanup Intervals**
   ```env
   # Less frequent cleanup with better hardware
   CHUNKED_UPLOAD_CLEANUP_INTERVAL_HOURS=12
   CLEANUP_TEMP_CHUNKS_AGE_HOURS=48
   ```

3. **Enable More Aggressive Optimizations**
   ```env
   # Better hardware can handle more concurrent operations
   CHUNKED_UPLOAD_ASSEMBLY_MEMORY_LIMIT=2G
   ```

The configuration includes comments to guide these future upgrades without requiring extensive code changes.