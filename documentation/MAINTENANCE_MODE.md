# Maintenance Mode Documentation

This document explains how to use the maintenance mode feature for your Fucking File Hosting application.

## Features Overview

### Maintenance Mode
- Shows a maintenance page to all users
- Customizable message
- Bypass option for administrators
- Automatic fallback for JavaScript-disabled browsers

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Maintenance Mode
MAINTENANCE_MODE_ENABLED=false
MAINTENANCE_MESSAGE="We're making some fucking awesome improvements. Be back soon!"
MAINTENANCE_BYPASS_TOKEN=your_secret_bypass_token
```

## Command Line Management

### Maintenance Mode Commands

```bash
# Enable maintenance mode
php artisan maintenance enable

# Enable with custom message
php artisan maintenance enable --message="Upgrading servers"

# Disable maintenance mode
php artisan maintenance disable

# Check maintenance status
php artisan maintenance status
```

## Usage Examples

### Scenario 1: Scheduled Maintenance

```bash
# Before maintenance
php artisan maintenance enable --message="Upgrading to faster servers"

# After maintenance
php artisan maintenance disable
```

### Scenario 2: Emergency Maintenance

```bash
# Quick maintenance mode
php artisan maintenance enable --message="Emergency maintenance in progress"

# Check status
php artisan maintenance status

# Disable when fixed
php artisan maintenance disable
```

## Access Methods

### For Maintenance Mode

1. **Regular users**: See maintenance page
2. **Administrators**: Add `?bypass=your_bypass_token` to any URL
3. **API requests**: Receive 503 status with JSON response

## Integration with Your Application

### Checking Status in Code

```php
// Check if maintenance mode is active
if (config('app.maintenance_mode_enabled')) {
    // Handle maintenance mode
}
```

## Security Considerations

### Maintenance Mode
- Use a strong bypass token
- Don't expose the bypass token in client-side code
- Consider IP whitelisting for additional security

## Testing

### Manual Testing

```bash
php artisan maintenance enable
# Visit your site - should show maintenance page
# Visit with bypass: yoursite.com?bypass=your_token
php artisan maintenance disable
```

## Troubleshooting

### Common Issues

1. **Maintenance page not showing**:
   - Check middleware is registered in `bootstrap/app.php`
   - Verify `MAINTENANCE_MODE_ENABLED=true` in `.env`
   - Clear config cache: `php artisan config:clear`

2. **Bypass not working**:
   - Verify bypass token matches `MAINTENANCE_BYPASS_TOKEN`
   - Check URL parameter format: `?bypass=token`

### Debug Commands

```bash
# Check current configuration
php artisan config:show app.maintenance_mode_enabled

# Clear caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

## Best Practices

1. **Communication**:
   - Notify users before enabling maintenance mode
   - Provide realistic time estimates
   - Use clear, helpful messages

2. **Security**:
   - Use environment-specific tokens
   - Don't commit tokens to version control
   - Rotate tokens regularly

3. **Monitoring**:
   - Monitor application during maintenance
   - Test bypass access before maintenance
   - Have rollback plan ready

## API Integration

### Maintenance Mode Response

```json
{
    "message": "Service temporarily unavailable for maintenance.",
    "maintenance": true
}
```

### Handling in Frontend

```javascript
// Check API responses
if (response.status === 503 && response.data.maintenance) {
    // Show maintenance message
}
```

---

**Last Updated**: December 2024  
**Version**: 2.0.0  
**Maintainer**: Development Team