# Environment Configuration Guide

## Quick Setup for Different Environments

### Development Environment

```env
APP_NAME="Fucking File Hosting"
APP_ENV=local
APP_KEY=base64:YOUR_LOCAL_KEY
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

LOG_LEVEL=debug
FORCE_HTTPS=false
SESSION_SECURE=false
```

### Staging Environment

```env
APP_NAME="Fucking File Hosting - Staging"
APP_ENV=staging
APP_KEY=base64:YOUR_STAGING_KEY
APP_DEBUG=false
APP_URL=https://staging.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=staging_database
DB_USERNAME=staging_user
DB_PASSWORD=staging_password

LOG_LEVEL=info
FORCE_HTTPS=true
SESSION_SECURE=true
```

### Production Environment

```env
APP_NAME="Fucking File Hosting"
APP_ENV=production
APP_KEY=base64:YOUR_PRODUCTION_KEY
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=production_database
DB_USERNAME=production_user
DB_PASSWORD=secure_production_password

LOG_LEVEL=error
FORCE_HTTPS=true
SESSION_SECURE=true
CSRF_PROTECTION=true
```

## Security Configuration

### Required Security Settings

```env
# Force HTTPS in production
FORCE_HTTPS=true

# Secure session cookies
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict

# Enable CSRF protection
CSRF_PROTECTION=true

# Privacy settings
DISABLE_IP_LOGGING=true
DISABLE_USER_TRACKING=true
PRIVACY_MODE=strict
ANALYTICS_ENABLED=false
```

### File Security Settings

```env
# File validation
FILE_VALIDATION_STRICT=true
SECURE_FILE_STORAGE=true
SECURE_FILE_DELETION=true

# Auto-create .htaccess protection
AUTO_CREATE_HTACCESS=true

# Maximum file size (10GB in bytes)
MAX_FILE_SIZE=10737418240
```

## Performance Configuration

### Upload Optimization

```env
# File upload limits
UPLOAD_MAX_FILESIZE=10240M
POST_MAX_SIZE=10240M
MAX_EXECUTION_TIME=300
MEMORY_LIMIT=512M

# Chunked upload settings
CHUNK_SIZE=5242880
MAX_CHUNKS=2048
```

### Rate Limiting

```env
# Enable rate limiting
RATE_LIMITING_ENABLED=true

# Requests per minute
RATE_LIMIT_UPLOADS=10
RATE_LIMIT_DOWNLOADS=60
RATE_LIMIT_API=100
```

## Database Configuration

### MySQL (Recommended for Production)

```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
```

### SQLite (Development Only)

```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

## Storage Configuration

### Local Storage (Default)

```env
FILESYSTEM_DISK=local
FILES_STORAGE_PATH=storage/app/files
```

### S3 Storage (Optional)

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your_bucket_name
```

## Mail Configuration

### SMTP (Production)

```env
MAIL_MAILER=smtp
MAIL_HOST=your_smtp_host
MAIL_PORT=587
MAIL_USERNAME=your_email@domain.com
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@yourdomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Log (Development)

```env
MAIL_MAILER=log
```

## Caching Configuration

### File Cache (Shared Hosting)

```env
CACHE_STORE=file
```

### Database Cache

```env
CACHE_STORE=database
```

### Redis Cache (If Available)

```env
CACHE_STORE=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

## Session Configuration

### Database Sessions (Recommended)

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=true
```

### File Sessions

```env
SESSION_DRIVER=file
SESSION_LIFETIME=120
```

## Queue Configuration

### Database Queue (Shared Hosting)

```env
QUEUE_CONNECTION=database
```

### Sync Queue (Development)

```env
QUEUE_CONNECTION=sync
```

## Logging Configuration

### Production Logging

```env
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error
LOG_DEPRECATIONS_CHANNEL=null
```

### Development Logging

```env
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=debug
```

## Environment-Specific Commands

### Development Setup

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Install dependencies
npm install

# Start development server
php artisan serve
npm run dev
```

### Production Setup

```bash
# Copy production environment
cp .env.production .env

# Generate application key
php artisan key:generate

# Install production dependencies
composer install --no-dev --optimize-autoloader
npm ci

# Build assets
npm run build

# Cache configuration
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force
```

### Staging Setup

```bash
# Copy staging environment
cp .env.staging .env

# Generate application key
php artisan key:generate

# Install dependencies
composer install --optimize-autoloader
npm ci

# Build assets
npm run build

# Run migrations
php artisan migrate --force
```

## Validation Commands

### Check Configuration

```bash
# Verify environment
php artisan env

# Check database connection
php artisan tinker
DB::connection()->getPdo();

# Test file uploads
php artisan tinker
Storage::disk('local')->put('test.txt', 'Hello World');
Storage::disk('local')->exists('test.txt');
```

### Performance Testing

```bash
# Test upload limits
curl -X POST -F "file=@large_file.zip" http://localhost:8000/api/upload

# Test database performance
php artisan tinker
DB::table('files')->count();
```

### Security Testing

```bash
# Check HTTPS redirect
curl -I http://yourdomain.com

# Verify security headers
curl -I https://yourdomain.com

# Test CSRF protection
curl -X POST https://yourdomain.com/api/upload
```
