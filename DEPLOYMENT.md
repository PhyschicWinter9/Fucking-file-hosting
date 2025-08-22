# Fast File Hosting - Shared Hosting Deployment Guide

## Prerequisites

- cPanel hosting account with PHP 8.2+ support
- MySQL database access
- SSH access (optional but recommended)
- Node.js for building assets (local development)

## Deployment Steps

### 1. Prepare Local Environment

```bash
# Install dependencies
composer install --no-dev --optimize-autoloader
npm install
npm run build

# Generate application key
php artisan key:generate
```

### 2. Database Setup

1. Create a MySQL database in cPanel
2. Create a database user and assign to the database
3. Note down the database credentials

### 3. Environment Configuration

1. Copy `.env.example` to `.env`
2. Update the following variables:

```env
APP_NAME="Fast File Hosting"
APP_ENV=production
APP_KEY=base64:YOUR_GENERATED_KEY_HERE
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password

# File Storage Configuration
FILESYSTEM_DISK=local
FILES_STORAGE_PATH=storage/app/files
MAX_FILE_SIZE=10737418240

# Privacy Configuration
DISABLE_IP_LOGGING=true
DISABLE_USER_TRACKING=true
```

### 4. File Upload

Upload all files to your hosting account:

```
public_html/
├── (Laravel public folder contents)
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

### 5. File Permissions

Set the following permissions:

- `storage/` and all subdirectories: 755
- `bootstrap/cache/`: 755
- `.env`: 644

### 6. Database Migration

Run migrations via SSH or create a temporary migration script:

```bash
php artisan migrate --force
```

### 7. Storage Setup

Create the files storage directory:

```bash
mkdir -p storage/app/files
chmod 755 storage/app/files
```

### 8. Cron Job Setup

Add the following cron job in cPanel:

```bash
# Run every day at 2 AM to cleanup expired files
0 2 * * * cd /path/to/your/app && php artisan files:cleanup
```

### 9. .htaccess Configuration

Ensure the `.htaccess` file in the public directory has the correct configuration for your hosting provider.

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
    - Check file permissions
    - Verify `.env` configuration
    - Check error logs in cPanel

2. **Database Connection Issues**
    - Verify database credentials
    - Check if database server is accessible
    - Ensure database user has proper permissions

3. **File Upload Issues**
    - Check PHP upload limits in `.htaccess`
    - Verify storage directory permissions
    - Check available disk space

### Performance Optimization

1. **Enable OPcache** (if available)
2. **Use file-based caching** for sessions and cache
3. **Optimize database queries** with proper indexing
4. **Enable gzip compression** in `.htaccess`

## Security Considerations

1. **SSL Certificate**: Always use HTTPS in production
2. **File Permissions**: Never set 777 permissions
3. **Environment Variables**: Keep `.env` secure and never commit to version control
4. **Regular Updates**: Keep Laravel and dependencies updated
5. **Backup Strategy**: Implement regular database and file backups

## Monitoring

- Monitor disk space usage
- Check error logs regularly
- Monitor database performance
- Track file upload/download statistics (without personal data)
