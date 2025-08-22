<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Upload rate limiting - 10 uploads per minute per IP
        RateLimiter::for('uploads', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Admin operations - 5 requests per minute per IP
        RateLimiter::for('admin', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // General API rate limiting - 60 requests per minute per IP
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
    }
}
