# cPanel Deployment Structure

## Recommended Directory Structure

```
public_html/                    (Document root)
├── index.php                   (Laravel entry point)
├── .htaccess                   (Web server configuration)
├── build/                      (Compiled assets from Vite)
│   ├── assets/
│   │   ├── app-[hash].js
│   │   ├── app-[hash].css
│   │   └── manifest.json
├── storage/                    (Symlinked to ../storage)
└── files/                      (Public file storage - symlinked)

laravel-app/                    (Above document root for security)
├── app/
├── bootstrap/
├── config/
├── database/
├── resources/
├── routes/
├── storage/
│   ├── app/
│   │   └── files/              (Actual file storage)
│   ├── framework/
│   └── logs/
├── vendor/
├── .env
├── artisan
├── composer.json
└── composer.lock
```

## Security Benefits

1. **Application Code Protection**: Laravel application files are above document root
2. **Environment Security**: .env file is not web-accessible
3. **Vendor Protection**: Composer dependencies are protected
4. **Storage Security**: Files served through application, not directly

## File Permissions

- Directories: 755
- Files: 644
- Storage directories: 775
- .env file: 600
- Executable files (artisan): 755

## Symlink Setup

```bash
# From public_html directory
ln -sf ../laravel-app/storage/app/public storage
ln -sf ../laravel-app/storage/app/files files
```
