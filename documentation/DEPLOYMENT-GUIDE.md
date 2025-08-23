# Fucking File Hosting - Shared Hosting Deployment Guide

## Quick Fix for "View [app] not found" Error

If you're seeing the "View [app] not found" error, run these commands on your hosting:

```bash
# 1. Run the fix script
php fix-hosting-issue.php

# 2. Clear and rebuild caches
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
php artisan view:clear

# 3. Set proper permissions
chmod -R 755 storage bootstrap/cache
```

## Complete Deployment Steps

### 1. Upload Files

Upload all files to your hosting's public_html directory (or subdirectory).

### 2. Environment Configuration

- Copy `.env.example` to `.env`
- Update database settings in `.env`
- Set `APP_ENV=production`
- Set `APP_DEBUG=false`
- Generate app key: `php artisan key:generate`

### 3. Database Setup

```bash
# For SQLite (recommended for shared hosting)
touch database/database.sqlite
chmod 664 database/database.sqlite

# Run migrations
php artisan migrate --force
```

### 4. Storage Setup

```bash
# Create storage link
php artisan storage:link

# Set permissions
chmod -R 755 storage
chmod -R 755 bootstrap/cache
```

### 5. Cache Optimization

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 6. File Upload Configuration

Update your `.env` for shared hosting limits:

```env
# File upload limits (adjust based on your hosting)
MAX_FILE_SIZE_MB=100
UPLOAD_MAX_FILESIZE=100M
POST_MAX_SIZE=100M
MEMORY_LIMIT=512M
MAX_EXECUTION_TIME=300
```

### 7. Security Configuration

For production, update `.env`:

```env
APP_ENV=production
APP_DEBUG=false
FORCE_HTTPS=true
SESSION_SECURE=true
```

## Troubleshooting Common Issues

### Issue: "View [app] not found"

**Solution:** Run `php fix-hosting-issue.php`

### Issue: File uploads fail

**Solution:** Check PHP limits in cPanel or contact hosting provider

### Issue: 500 Internal Server Error

**Solution:**

1. Check error logs in cPanel
2. Verify file permissions (755 for directories, 644 for files)
3. Clear all caches

### Issue: CSS/JS not loading

**Solution:**

1. Run `npm run build` locally
2. Upload the `public/build` directory
3. Clear browser cache

### Issue: Database connection failed

**Solution:**

1. Verify database credentials in `.env`
2. For SQLite, ensure file exists and is writable
3. For MySQL, check hosting database settings

## Performance Optimization

### 1. Enable OPcache (if available)

Add to `.htaccess` or ask hosting provider:

```apache
php_value opcache.enable 1
php_value opcache.memory_consumption 128
```

### 2. Configure Caching

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 3. Optimize Autoloader

```bash
composer install --optimize-autoloader --no-dev
```

## Security Checklist

- [ ] Set `APP_DEBUG=false` in production
- [ ] Use HTTPS (set `FORCE_HTTPS=true`)
- [ ] Secure file permissions (755/644)
- [ ] Hide `.env` file (already protected by `.htaccess`)
- [ ] Enable security headers (already in `.htaccess`)
- [ ] Set up regular backups

## Monitoring

### Check Application Health

Visit: `https://yourdomain.com/up`

### Monitor Error Logs

Check your hosting's error logs regularly for issues.

### File Cleanup

Set up a cron job to clean expired files:

```bash
# Add to cPanel cron jobs (daily at 2 AM)
0 2 * * * cd /path/to/your/app && php artisan files:cleanup
```

## Support

If you encounter issues:

1. Run the diagnostic script: `php debug-views.php`
2. Check hosting error logs
3. Verify all files uploaded correctly
4. Ensure proper file permissions
5. Contact your hosting provider if PHP limits need adjustment

## File Structure for Shared Hosting

```
public_html/
├── .htaccess (Laravel's public/.htaccess)
├── index.php (Laravel's public/index.php)
├── favicon.ico
├── build/ (Vite build assets)
├── app/
├── bootstrap/
├── config/
├── database/
├── resources/
├── routes/
├── storage/
├── vendor/
├── .env
└── artisan
```

**Important:** Make sure your hosting points to the root directory containing `index.php`, not a subdirectory called `public`.
