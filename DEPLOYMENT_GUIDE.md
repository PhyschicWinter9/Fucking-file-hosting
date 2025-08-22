# Fast File Hosting - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Fast File Hosting application to shared hosting environments with cPanel support.

## Prerequisites

- Shared hosting account with cPanel access
- PHP 8.2+ support
- MySQL 8.0+ database
- SSH access (optional but recommended)
- FTP/SFTP access

## Pre-Deployment Checklist

### 1. Build Production Assets

```bash
# Install dependencies
npm install

# Build production assets
npm run build

# Verify build output
ls -la public/build/
```

### 2. Optimize Laravel for Production

```bash
# Clear and cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize autoloader
composer install --optimize-autoloader --no-dev
```

## cPanel Deployment Instructions

### Step 1: Database Setup

1. **Create MySQL Database**
    - Log into cPanel
    - Navigate to "MySQL Databases"
    - Create a new database: `your_username_fastfile`
    - Create a database user with full privileges
    - Note down the database credentials

2. **Import Database Schema**

    ```bash
    # Run migrations locally first to generate schema
    php artisan migrate --force

    # Export schema (if needed)
    mysqldump -u username -p database_name > schema.sql
    ```

### Step 2: File Upload Structure

#### Option A: Traditional cPanel Structure

```
public_html/
├── index.php (Laravel public/index.php)
├── .htaccess (Laravel public/.htaccess)
├── build/ (Vite assets from public/build/)
├── favicon.ico
├── favicon.svg
├── apple-touch-icon.png
├── robots.txt
└── storage/ (symlink to ../storage/app/public)

laravel_app/ (outside public_html)
├── app/
├── bootstrap/
├── config/
├── database/
├── resources/
├── routes/
├── storage/
├── vendor/
├── .env
├── artisan
├── composer.json
└── composer.lock
```

#### Option B: Subdomain Structure

```
yourdomain.com/
├── public_html/ (main domain)
└── fastfile/ (subdomain)
    ├── public_html/
    │   ├── index.php
    │   ├── .htaccess
    │   └── build/
    └── laravel_app/
        ├── app/
        ├── config/
        └── ...
```

### Step 3: Upload Files

1. **Upload Laravel Application**

    ```bash
    # Using SFTP/FTP
    # Upload entire project except public/ folder to laravel_app/

    # Upload public/ contents to public_html/
    ```

2. **Set File Permissions**

    ```bash
    # Laravel app directories
    chmod 755 laravel_app/
    chmod -R 755 laravel_app/bootstrap/cache/
    chmod -R 755 laravel_app/storage/

    # Public files
    chmod 644 public_html/index.php
    chmod 644 public_html/.htaccess
    ```

### Step 4: Configuration

1. **Update index.php**

    ```php
    <?php

    use Illuminate\Contracts\Http\Kernel;
    use Illuminate\Http\Request;

    define('LARAVEL_START', microtime(true));

    // Adjust paths for cPanel structure
    require __DIR__.'/../laravel_app/vendor/autoload.php';

    $app = require_once __DIR__.'/../laravel_app/bootstrap/app.php';

    $kernel = $app->make(Kernel::class);

    $response = $kernel->handle(
        $request = Request::capture()
    )->send();

    $kernel->terminate($request, $response);
    ```

2. **Configure Environment**

    ```bash
    # Copy production environment
    cp .env.production .env

    # Update database credentials
    DB_CONNECTION=mysql
    DB_HOST=localhost
    DB_PORT=3306
    DB_DATABASE=your_username_fastfile
    DB_USERNAME=your_username_dbuser
    DB_PASSWORD=your_secure_password

    # Update app URL
    APP_URL=https://yourdomain.com

    # Generate application key
    php artisan key:generate
    ```

3. **Update .htaccess**

    ```apache
    <IfModule mod_rewrite.c>
        <IfModule mod_negotiation.c>
            Options -MultiViews -Indexes
        </IfModule>

        RewriteEngine On

        # Handle Authorization Header
        RewriteCond %{HTTP:Authorization} .
        RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

        # Redirect Trailing Slashes If Not A Folder...
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_URI} (.+)/$
        RewriteRule ^ %1 [L,R=301]

        # Send Requests To Front Controller...
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteRule ^ index.php [L]
    </IfModule>

    # Security Headers
    <IfModule mod_headers.c>
        Header always set X-Content-Type-Options nosniff
        Header always set X-Frame-Options DENY
        Header always set X-XSS-Protection "1; mode=block"
        Header always set Referrer-Policy "strict-origin-when-cross-origin"
        Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"
    </IfModule>

    # File Upload Limits
    php_value upload_max_filesize 10240M
    php_value post_max_size 10240M
    php_value max_execution_time 300
    php_value memory_limit 512M
    php_value max_input_time 300

    # Disable access to sensitive files
    <Files ".env">
        Order allow,deny
        Deny from all
    </Files>

    <Files "composer.json">
        Order allow,deny
        Deny from all
    </Files>

    <Files "composer.lock">
        Order allow,deny
        Deny from all
    </Files>
    ```

### Step 5: Storage Setup

1. **Create Storage Directories**

    ```bash
    mkdir -p storage/app/files
    mkdir -p storage/logs
    mkdir -p storage/framework/cache
    mkdir -p storage/framework/sessions
    mkdir -p storage/framework/views

    chmod -R 755 storage/
    ```

2. **Create Storage Symlink**
    ```bash
    # From public_html directory
    ln -s ../laravel_app/storage/app/public storage
    ```

### Step 6: Database Migration

```bash
# Run migrations
php artisan migrate --force

# Seed database (if needed)
php artisan db:seed --force
```

### Step 7: Cron Jobs Setup

1. **Access cPanel Cron Jobs**
    - Navigate to "Cron Jobs" in cPanel
    - Add the following cron job:

2. **File Cleanup Cron**

    ```bash
    # Run daily at 2:00 AM
    0 2 * * * cd /home/username/laravel_app && php artisan files:cleanup
    ```

3. **Laravel Scheduler (Optional)**
    ```bash
    # Run every minute
    * * * * * cd /home/username/laravel_app && php artisan schedule:run >> /dev/null 2>&1
    ```

## Environment Configuration Guide

### Production Environment Variables

```env
# Application
APP_NAME="Fast File Hosting"
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_KEY
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# Security
FORCE_HTTPS=true
SESSION_SECURE=true
CSRF_PROTECTION=true

# File Storage
MAX_FILE_SIZE=10737418240
FILES_STORAGE_PATH=storage/app/files

# Privacy
DISABLE_IP_LOGGING=true
DISABLE_USER_TRACKING=true
PRIVACY_MODE=strict
```

### Security Configuration

1. **SSL Certificate**
    - Enable SSL through cPanel or Let's Encrypt
    - Set `FORCE_HTTPS=true` in .env
    - Update `SESSION_SECURE=true`

2. **File Permissions**

    ```bash
    # Application files
    find laravel_app/ -type f -exec chmod 644 {} \;
    find laravel_app/ -type d -exec chmod 755 {} \;

    # Executable files
    chmod 755 laravel_app/artisan

    # Storage directories
    chmod -R 755 laravel_app/storage/
    chmod -R 755 laravel_app/bootstrap/cache/
    ```

3. **Protect Sensitive Files**

    ```apache
    # Add to .htaccess
    <FilesMatch "^\.">
        Order allow,deny
        Deny from all
    </FilesMatch>

    <FilesMatch "\.(env|log|sql)$">
        Order allow,deny
        Deny from all
    </FilesMatch>
    ```

## Performance Optimization

### 1. PHP Configuration

```ini
# Add to .htaccess or php.ini
memory_limit = 512M
max_execution_time = 300
upload_max_filesize = 10240M
post_max_size = 10240M
max_input_time = 300
max_file_uploads = 20
```

### 2. Laravel Optimization

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer dump-autoload --optimize
```

### 3. Database Optimization

```sql
-- Add indexes for performance
ALTER TABLE files ADD INDEX idx_file_id (file_id);
ALTER TABLE files ADD INDEX idx_expires_at (expires_at);
ALTER TABLE files ADD INDEX idx_checksum (checksum);
ALTER TABLE files ADD INDEX idx_created_at (created_at);
```

## Monitoring and Maintenance

### 1. Log Monitoring

```bash
# Check Laravel logs
tail -f storage/logs/laravel.log

# Check web server logs (cPanel)
# Access through cPanel > Error Logs
```

### 2. Storage Monitoring

```bash
# Check disk usage
du -sh storage/app/files/

# Check database size
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'your_database_name'
GROUP BY table_schema;
```

### 3. Backup Strategy

```bash
# Database backup
mysqldump -u username -p database_name > backup_$(date +%Y%m%d).sql

# File backup
tar -czf files_backup_$(date +%Y%m%d).tar.gz storage/app/files/
```

## Testing Deployment

### 1. Basic Functionality Test

1. **Upload Test**
    - Visit your domain
    - Try uploading a small file
    - Verify download link works

2. **Large File Test**
    - Upload a file > 100MB
    - Verify chunked upload works
    - Test download performance

3. **Privacy Test**
    - Check that no IP addresses are logged
    - Verify no tracking scripts are loaded
    - Test anonymous file access

### 2. Performance Test

```bash
# Test upload speed
curl -X POST -F "file=@testfile.zip" https://yourdomain.com/api/upload

# Test download speed
curl -o downloaded_file.zip https://yourdomain.com/f/FILE_ID
```

### 3. Security Test

1. **File Access Test**
    - Try accessing .env file directly
    - Verify sensitive directories are protected
    - Test CSRF protection

2. **SSL Test**
    - Verify HTTPS redirect works
    - Check SSL certificate validity
    - Test security headers

## Backup and Recovery

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh - Add to cron jobs

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/username/backups"

# Database backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz storage/app/files/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 2. Recovery Procedures

```bash
# Database recovery
mysql -u username -p database_name < backup_file.sql

# Files recovery
tar -xzf files_backup.tar.gz -C /path/to/restore/
```

## Troubleshooting

See TROUBLESHOOTING.md for common issues and solutions.

## Support

For technical support and updates, visit:

- GitHub Repository: [Your Repository URL]
- Documentation: [Your Documentation URL]
- Issues: [Your Issues URL]
