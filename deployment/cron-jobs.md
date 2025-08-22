# Cron Jobs Configuration for Shared Hosting

## Required Cron Jobs

Add these cron jobs in your cPanel or hosting control panel:

### 1. Laravel Task Scheduler (Required)

```bash
# Run every minute to handle Laravel scheduled tasks
* * * * * cd /path/to/laravel-app && php artisan schedule:run >> /dev/null 2>&1
```

### 2. File Cleanup (Daily)

```bash
# Clean up expired files daily at 2:00 AM
0 2 * * * cd /path/to/laravel-app && php artisan files:cleanup >> /dev/null 2>&1
```

### 3. Resource Monitoring (Every 15 minutes)

```bash
# Monitor system resources and perform cleanup if needed
*/15 * * * * cd /path/to/laravel-app && php artisan resources:monitor --cleanup >> /dev/null 2>&1
```

### 4. Cache Optimization (Every 6 hours)

```bash
# Clear and optimize caches every 6 hours
0 */6 * * * cd /path/to/laravel-app && php artisan config:cache && php artisan route:cache && php artisan view:cache >> /dev/null 2>&1
```

### 5. Log Cleanup (Weekly)

```bash
# Clean up old log files every Sunday at 3:00 AM
0 3 * * 0 cd /path/to/laravel-app && php artisan resources:monitor --cleanup --report >> /dev/null 2>&1
```

## Optional Cron Jobs

### Database Optimization (Weekly)

```bash
# Optimize database tables every Sunday at 4:00 AM
0 4 * * 0 cd /path/to/laravel-app && php artisan db:optimize >> /dev/null 2>&1
```

### Storage Statistics (Daily)

```bash
# Generate storage statistics report daily at 1:00 AM
0 1 * * * cd /path/to/laravel-app && php artisan storage:stats >> /path/to/laravel-app/storage/logs/storage-stats.log 2>&1
```

## Setting Up Cron Jobs in cPanel

1. **Access Cron Jobs**:
    - Log into your cPanel
    - Find and click on "Cron Jobs" in the Advanced section

2. **Add New Cron Job**:
    - Select the frequency or use "Common Settings"
    - Enter the command in the "Command" field
    - Click "Add New Cron Job"

3. **Important Notes**:
    - Replace `/path/to/laravel-app` with the actual path to your Laravel application
    - The path is usually something like `/home/username/laravel-app`
    - Make sure the `php` command is available (some hosts use `php81` or `php82`)
    - Test commands manually via SSH before adding to cron

## Verifying Cron Jobs

### Check if cron jobs are running:

```bash
# View cron job logs (if available)
tail -f /var/log/cron

# Check Laravel logs for scheduled task execution
tail -f /path/to/laravel-app/storage/logs/laravel.log
```

### Test commands manually:

```bash
# Test the scheduler
cd /path/to/laravel-app && php artisan schedule:list

# Test file cleanup
cd /path/to/laravel-app && php artisan files:cleanup --dry-run

# Test resource monitoring
cd /path/to/laravel-app && php artisan resources:monitor --report
```

## Troubleshooting

### Common Issues:

1. **Permission Denied**:
    - Ensure the Laravel application directory has proper permissions (755)
    - Check that the web server user can execute PHP

2. **Command Not Found**:
    - Use the full path to PHP: `/usr/bin/php` or `/usr/local/bin/php`
    - Check with your hosting provider for the correct PHP path

3. **Memory Errors**:
    - The resource monitoring should prevent this, but if it occurs:
    - Reduce the frequency of resource-intensive cron jobs
    - Contact your hosting provider about memory limits

4. **Execution Time Limits**:
    - Break large operations into smaller chunks
    - Use the `--limit` option on cleanup commands if available
    - Consider running intensive tasks during off-peak hours

### Getting Help:

- Check your hosting provider's documentation for cron job setup
- Contact support if you're unsure about PHP paths or permissions
- Monitor the Laravel logs for any cron job errors

## Performance Tips

1. **Stagger Cron Jobs**: Don't run multiple intensive jobs at the same time
2. **Use Quiet Mode**: Add `>> /dev/null 2>&1` to prevent email spam
3. **Monitor Resources**: The resource monitoring job will help prevent issues
4. **Log Important Events**: Keep logs for troubleshooting but clean them regularly
