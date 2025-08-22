# Fast File Hosting - Troubleshooting Guide

## Common Issues and Solutions

### 1. Upload Issues

#### Problem: "File too large" error

**Symptoms:**

- Upload fails immediately
- Error message about file size limit

**Solutions:**

1. **Check PHP Configuration**

    ```apache
    # Add to .htaccess
    php_value upload_max_filesize 10240M
    php_value post_max_size 10240M
    php_value memory_limit 512M
    php_value max_execution_time 300
    ```

2. **Check Web Server Limits**

    ```apache
    # For Apache (in .htaccess)
    LimitRequestBody 10737418240
    ```

3. **Check Application Configuration**
    ```env
    # In .env file
    MAX_FILE_SIZE=10737418240
    ```

#### Problem: Upload timeout

**Symptoms:**

- Upload starts but fails after some time
- Gateway timeout errors

**Solutions:**

1. **Increase Execution Time**

    ```apache
    php_value max_execution_time 600
    php_value max_input_time 600
    ```

2. **Enable Chunked Upload**
    - Verify chunked upload is working for files > 100MB
    - Check browser console for JavaScript errors

#### Problem: Chunked upload fails

**Symptoms:**

- Large files fail to upload
- Upload progress stops at certain percentage

**Solutions:**

1. **Check Chunk Size Configuration**

    ```javascript
    // In FileUploader component
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    ```

2. **Verify Session Storage**

    ```bash
    # Check if upload_sessions table exists
    php artisan migrate:status
    ```

3. **Check Temporary Directory Permissions**
    ```bash
    chmod 755 storage/app/temp/
    ```

### 2. Download Issues

#### Problem: Files not found (404)

**Symptoms:**

- Download links return 404 error
- File exists in database but not accessible

**Solutions:**

1. **Check File Storage Path**

    ```bash
    # Verify files exist
    ls -la storage/app/files/
    ```

2. **Check Storage Symlink**

    ```bash
    # From public_html directory
    ls -la storage
    # Should point to ../laravel_app/storage/app/public
    ```

3. **Verify Route Configuration**
    ```php
    // Check routes/web.php
    Route::get('/f/{id}', [FileDownloadController::class, 'download']);
    ```

#### Problem: Slow download speeds

**Symptoms:**

- Downloads are slower than expected
- Large files timeout during download

**Solutions:**

1. **Enable Streaming**

    ```php
    // In FileDownloadController
    return response()->stream(function () use ($filePath) {
        $stream = fopen($filePath, 'rb');
        fpassthru($stream);
        fclose($stream);
    });
    ```

2. **Check Server Resources**
    ```bash
    # Monitor server load
    top
    # Check disk I/O
    iostat -x 1
    ```

### 3. Database Issues

#### Problem: Connection refused

**Symptoms:**

- "Connection refused" error
- Application cannot connect to database

**Solutions:**

1. **Verify Database Credentials**

    ```env
    # Check .env file
    DB_CONNECTION=mysql
    DB_HOST=localhost
    DB_PORT=3306
    DB_DATABASE=your_database_name
    DB_USERNAME=your_username
    DB_PASSWORD=your_password
    ```

2. **Test Database Connection**

    ```bash
    php artisan tinker
    DB::connection()->getPdo();
    ```

3. **Check MySQL Service**
    ```bash
    # On shared hosting, contact support if MySQL is down
    mysql -u username -p -h localhost
    ```

#### Problem: Migration failures

**Symptoms:**

- Migrations fail to run
- Table creation errors

**Solutions:**

1. **Check Database Permissions**

    ```sql
    SHOW GRANTS FOR 'username'@'localhost';
    ```

2. **Run Migrations Step by Step**

    ```bash
    php artisan migrate:status
    php artisan migrate --step
    ```

3. **Reset Migrations (Development Only)**
    ```bash
    php artisan migrate:fresh
    ```

### 4. Performance Issues

#### Problem: Slow page loading

**Symptoms:**

- Pages take long time to load
- High server response times

**Solutions:**

1. **Enable Laravel Caching**

    ```bash
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    ```

2. **Optimize Database Queries**

    ```bash
    # Enable query logging
    php artisan tinker
    DB::enableQueryLog();
    # Run your operations
    DB::getQueryLog();
    ```

3. **Check Server Resources**
    ```bash
    # Check memory usage
    free -m
    # Check CPU usage
    top
    ```

#### Problem: High memory usage

**Symptoms:**

- Out of memory errors
- Server becomes unresponsive

**Solutions:**

1. **Increase Memory Limit**

    ```apache
    php_value memory_limit 1024M
    ```

2. **Optimize File Processing**
    ```php
    // Use streaming for large files
    // Implement garbage collection
    gc_collect_cycles();
    ```

### 5. Security Issues

#### Problem: Files accessible without proper URLs

**Symptoms:**

- Files can be accessed directly
- Security bypass possible

**Solutions:**

1. **Check .htaccess Protection**

    ```apache
    # In storage/.htaccess
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
    <IfModule !mod_authz_core.c>
        Order deny,allow
        Deny from all
    </IfModule>
    ```

2. **Verify File Storage Location**
    ```bash
    # Files should be outside public_html
    ls -la storage/app/files/
    ```

#### Problem: CSRF token mismatch

**Symptoms:**

- Form submissions fail
- CSRF token errors

**Solutions:**

1. **Check CSRF Configuration**

    ```env
    CSRF_PROTECTION=true
    ```

2. **Verify Meta Tag**

    ```html
    <!-- In app.blade.php -->
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    ```

3. **Check Axios Configuration**
    ```javascript
    // In app.tsx
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    ```

### 6. Shared Hosting Specific Issues

#### Problem: Composer dependencies missing

**Symptoms:**

- Class not found errors
- Vendor directory issues

**Solutions:**

1. **Install Dependencies Locally**

    ```bash
    composer install --no-dev --optimize-autoloader
    ```

2. **Upload Vendor Directory**
    ```bash
    # Upload entire vendor/ directory via FTP
    ```

#### Problem: Artisan commands not working

**Symptoms:**

- Cannot run php artisan commands
- Permission denied errors

**Solutions:**

1. **Check PHP Path**

    ```bash
    which php
    /usr/local/bin/php artisan migrate
    ```

2. **Use Full Paths**
    ```bash
    cd /home/username/laravel_app
    /usr/local/bin/php artisan migrate
    ```

#### Problem: Cron jobs not running

**Symptoms:**

- Scheduled tasks not executing
- File cleanup not working

**Solutions:**

1. **Check Cron Job Syntax**

    ```bash
    # Correct format
    0 2 * * * cd /home/username/laravel_app && /usr/local/bin/php artisan files:cleanup
    ```

2. **Test Cron Job Manually**

    ```bash
    cd /home/username/laravel_app
    /usr/local/bin/php artisan files:cleanup
    ```

3. **Check Cron Logs**
    ```bash
    # Check cPanel cron job logs
    tail -f /var/log/cron
    ```

### 7. Frontend Issues

#### Problem: JavaScript errors

**Symptoms:**

- Upload functionality not working
- Console errors in browser

**Solutions:**

1. **Check Build Assets**

    ```bash
    npm run build
    # Verify assets are generated
    ls -la public/build/
    ```

2. **Check Vite Configuration**
    ```javascript
    // In vite.config.ts
    export default defineConfig({
        build: {
            manifest: true,
            outDir: 'public/build',
        },
    });
    ```

#### Problem: Styles not loading

**Symptoms:**

- Page appears unstyled
- CSS not loading

**Solutions:**

1. **Check Asset Compilation**

    ```bash
    npm run build
    ```

2. **Verify Vite Directives**
    ```php
    <!-- In app.blade.php -->
    @vite(['resources/js/app.tsx', 'resources/css/app.css'])
    ```

### 8. File System Issues

#### Problem: Permission denied errors

**Symptoms:**

- Cannot write files
- Storage errors

**Solutions:**

1. **Set Correct Permissions**

    ```bash
    chmod -R 755 storage/
    chmod -R 755 bootstrap/cache/
    ```

2. **Check Ownership**
    ```bash
    chown -R www-data:www-data storage/
    # Or your web server user
    ```

#### Problem: Disk space full

**Symptoms:**

- Upload failures
- Cannot write logs

**Solutions:**

1. **Check Disk Usage**

    ```bash
    df -h
    du -sh storage/app/files/
    ```

2. **Clean Up Old Files**

    ```bash
    php artisan files:cleanup
    ```

3. **Implement File Rotation**
    ```bash
    # Add to cron jobs
    find storage/app/files/ -mtime +30 -delete
    ```

## Debugging Tools

### 1. Enable Debug Mode (Development Only)

```env
APP_DEBUG=true
LOG_LEVEL=debug
```

### 2. Check Laravel Logs

```bash
tail -f storage/logs/laravel.log
```

### 3. Database Query Logging

```php
// In AppServiceProvider
if (app()->environment('local')) {
    DB::listen(function ($query) {
        Log::info($query->sql, $query->bindings);
    });
}
```

### 4. Performance Profiling

```bash
# Install Laravel Debugbar (development only)
composer require barryvdh/laravel-debugbar --dev
```

## Getting Help

### 1. Check System Requirements

- PHP 8.2+
- MySQL 8.0+
- Composer 2.0+
- Node.js 18+

### 2. Verify Installation

```bash
php --version
mysql --version
composer --version
node --version
npm --version
```

### 3. Contact Support

- Check hosting provider documentation
- Contact hosting support for server-specific issues
- Review Laravel documentation for framework issues

### 4. Community Resources

- Laravel Community Forum
- Stack Overflow
- GitHub Issues

## Prevention Tips

### 1. Regular Maintenance

- Monitor disk usage
- Check error logs regularly
- Update dependencies
- Backup database and files

### 2. Performance Monitoring

- Set up uptime monitoring
- Monitor response times
- Track error rates
- Monitor resource usage

### 3. Security Best Practices

- Keep Laravel updated
- Use strong passwords
- Enable HTTPS
- Regular security audits
- Monitor access logs
