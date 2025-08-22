#!/bin/bash

# Fucking File Hosting - cPanel Deployment Script
# This script helps prepare the application for cPanel shared hosting deployment

set -e

echo "🚀 Preparing Fucking File Hosting for cPanel deployment..."

# Check if we're in the Laravel root directory
if [ ! -f "artisan" ]; then
    echo "❌ Error: Please run this script from the Laravel root directory"
    exit 1
fi

# Create deployment directory
mkdir -p deployment/build

echo "📦 Installing production dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "🔧 Building production assets..."
npm ci
npm run build

echo "📁 Creating deployment structure..."

# Create the deployment build directory structure
mkdir -p deployment/build/public_html
mkdir -p deployment/build/laravel-app

# Copy Laravel application files (excluding public directory)
echo "📋 Copying application files..."
rsync -av --exclude='public' --exclude='node_modules' --exclude='.git' --exclude='deployment' --exclude='tests' . deployment/build/laravel-app/

# Copy public directory contents to public_html
echo "📋 Copying public files..."
cp -r public/* deployment/build/public_html/

# Copy the optimized .htaccess
cp public/.htaccess deployment/build/public_html/

# Create storage directories with proper structure
echo "📁 Setting up storage directories..."
mkdir -p deployment/build/laravel-app/storage/app/files
mkdir -p deployment/build/laravel-app/storage/framework/cache
mkdir -p deployment/build/laravel-app/storage/framework/sessions
mkdir -p deployment/build/laravel-app/storage/framework/views
mkdir -p deployment/build/laravel-app/storage/logs

# Copy environment template
cp deployment/.env.cpanel deployment/build/laravel-app/.env.example

# Create file permissions script
cat > deployment/build/set-permissions.sh << 'EOF'
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
EOF

chmod +x deployment/build/set-permissions.sh

# Create symlink setup script
cat > deployment/build/create-symlinks.sh << 'EOF'
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
EOF

chmod +x deployment/build/create-symlinks.sh

# Create post-deployment script
cat > deployment/build/post-deploy.sh << 'EOF'
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
EOF

chmod +x deployment/build/post-deploy.sh

# Create deployment instructions
cat > deployment/build/DEPLOYMENT_INSTRUCTIONS.md << 'EOF'
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
EOF

echo "✅ Deployment package created successfully!"
echo ""
echo "📁 Deployment files are in: deployment/build/"
echo ""
echo "📖 Next steps:"
echo "1. Review deployment/build/DEPLOYMENT_INSTRUCTIONS.md"
echo "2. Upload files to your cPanel hosting"
echo "3. Follow the deployment instructions"
echo ""
echo "🎉 Your Fucking File Hosting application is ready for deployment!"
