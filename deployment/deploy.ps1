# Fucking File Hosting - cPanel Deployment Script (PowerShell)
# This script helps prepare the application for cPanel shared hosting deployment

Write-Host "🚀 Preparing Fucking File Hosting for cPanel deployment..." -ForegroundColor Green

# Check if we're in the Laravel root directory
if (-not (Test-Path "artisan")) {
    Write-Host "❌ Error: Please run this script from the Laravel root directory" -ForegroundColor Red
    exit 1
}

# Create deployment directory
New-Item -ItemType Directory -Force -Path "deployment\build" | Out-Null

Write-Host "📦 Installing production dependencies..." -ForegroundColor Yellow
composer install --no-dev --optimize-autoloader --no-interaction

Write-Host "🔧 Building production assets..." -ForegroundColor Yellow
npm ci
npm run build

Write-Host "📁 Creating deployment structure..." -ForegroundColor Yellow

# Create the deployment build directory structure
New-Item -ItemType Directory -Force -Path "deployment\build\public_html" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app" | Out-Null

# Copy Laravel application files (excluding specific directories)
Write-Host "📋 Copying application files..." -ForegroundColor Yellow

$excludeDirs = @('public', 'node_modules', '.git', 'deployment', 'tests')
Get-ChildItem -Path . -Exclude $excludeDirs | Copy-Item -Destination "deployment\build\laravel-app" -Recurse -Force

# Copy public directory contents to public_html
Write-Host "📋 Copying public files..." -ForegroundColor Yellow
Copy-Item -Path "public\*" -Destination "deployment\build\public_html" -Recurse -Force

# Create storage directories with proper structure
Write-Host "📁 Setting up storage directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app\storage\app\files" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app\storage\framework\cache" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app\storage\framework\sessions" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app\storage\framework\views" | Out-Null
New-Item -ItemType Directory -Force -Path "deployment\build\laravel-app\storage\logs" | Out-Null

# Copy environment template
Copy-Item -Path "deployment\.env.cpanel" -Destination "deployment\build\laravel-app\.env.example" -Force

# Create file permissions script for Linux
@'
#!/bin/bash
# Set proper file permissions for shared hosting

echo "Setting file permissions..."

# Set directory permissions
find . -type d -exec chmod 755 {} \;

# Set file permissions
find . -type f -exec chmod 644 {} \;

# Set executable permissions
chmod 755 laravel-app/artisan

# Set storage permissions
chmod -R 775 laravel-app/storage
chmod -R 775 laravel-app/bootstrap/cache

# Secure .env file
chmod 600 laravel-app/.env

echo "Permissions set successfully!"
'@ | Out-File -FilePath "deployment\build\set-permissions.sh" -Encoding UTF8

# Create symlink setup script
@'
#!/bin/bash
# Create necessary symlinks for cPanel deployment

echo "Creating symlinks..."

cd public_html

# Remove existing symlinks if they exist
rm -f storage files

# Create symlinks to storage directories
ln -sf ../laravel-app/storage/app/public storage
ln -sf ../laravel-app/storage/app/files files

echo "Symlinks created successfully!"
'@ | Out-File -FilePath "deployment\build\create-symlinks.sh" -Encoding UTF8

# Create post-deployment script
@'
#!/bin/bash
# Post-deployment setup for cPanel

echo "Running post-deployment setup..."

cd laravel-app

# Generate application key if not set
if ! grep -q "APP_KEY=base64:" .env; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# Clear and cache configuration
echo "Optimizing application..."
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan route:cache
php artisan view:clear
php artisan view:cache

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Create storage link if it doesn't exist
php artisan storage:link

echo "Post-deployment setup completed!"
'@ | Out-File -FilePath "deployment\build\post-deploy.sh" -Encoding UTF8

# Create deployment instructions
@'
# cPanel Deployment Instructions

## Prerequisites

1. cPanel hosting account with PHP 8.2+ support
2. MySQL database created in cPanel
3. FTP/SFTP access to your hosting account

## Deployment Steps

### 1. Upload Files

Upload the contents of this directory to your hosting account:
- Upload `laravel-app/` directory to a location ABOVE your document root (e.g., `/home/username/laravel-app/`)
- Upload `public_html/` contents to your document root (usually `/public_html/`)

### 2. Set File Permissions

Run the permissions script:
```bash
chmod +x set-permissions.sh
./set-permissions.sh
```

Or set permissions manually:
- Directories: 755
- Files: 644
- Storage directories: 775
- .env file: 600

### 3. Configure Environment

1. Copy `.env.example` to `.env` in the `laravel-app` directory
2. Edit `.env` with your database credentials and domain settings
3. Set `APP_URL` to your domain
4. Configure database settings (DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD)

### 4. Create Symlinks

Run the symlink script from your document root:
```bash
cd public_html
chmod +x ../create-symlinks.sh
../create-symlinks.sh
```

### 5. Post-Deployment Setup

Run the post-deployment script:
```bash
cd laravel-app
chmod +x ../post-deploy.sh
../post-deploy.sh
```

### 6. Set Up Cron Jobs

In cPanel, add this cron job to run every minute:
```
* * * * * cd /path/to/laravel-app && php artisan schedule:run >> /dev/null 2>&1
```

Add this cron job to run daily for file cleanup:
```
0 2 * * * cd /path/to/laravel-app && php artisan files:cleanup >> /dev/null 2>&1
```

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check file permissions
   - Verify .env configuration
   - Check error logs in cPanel

2. **Database Connection Error**
   - Verify database credentials in .env
   - Ensure database exists and user has proper permissions

3. **File Upload Issues**
   - Check PHP upload limits in .htaccess
   - Verify storage directory permissions
   - Check available disk space

4. **Assets Not Loading**
   - Verify symlinks are created correctly
   - Check file permissions on build directory
   - Ensure APP_URL is set correctly

### Support

For additional support, check the Laravel documentation or contact your hosting provider for PHP/MySQL configuration assistance.
'@ | Out-File -FilePath "deployment\build\DEPLOYMENT_INSTRUCTIONS.md" -Encoding UTF8

Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Deployment files are in: deployment\build\" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Next steps:" -ForegroundColor Yellow
Write-Host "1. Review deployment\build\DEPLOYMENT_INSTRUCTIONS.md"
Write-Host "2. Upload files to your cPanel hosting"
Write-Host "3. Follow the deployment instructions"
Write-Host ""
Write-Host "🎉 Your Fucking File Hosting application is ready for deployment!" -ForegroundColor Green
