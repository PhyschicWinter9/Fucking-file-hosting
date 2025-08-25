<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Illuminate\Support\Facades\Schema;

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
        $this->configureInertia();
        Schema::defaultStringLength(191);
    }

    /**
     * Configure Inertia.js settings.
     */
    protected function configureInertia(): void
    {
        Inertia::share([
            'auth' => function () {
                return [
                    'user' => auth()->user(),
                ];
            },
            'flash' => function () {
                return [
                    'message' => session('message'),
                    'error' => session('error'),
                ];
            },
        ]);
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        // Upload rate limiting - configurable (0 = no limit)
        RateLimiter::for('uploads', function (Request $request) {
            $uploadLimit = config('filehosting.rate_limit_uploads', 0);

            // Convert to integer and check if limit is 0 or null to disable rate limiting
            $uploadLimit = (int) $uploadLimit;
            if ($uploadLimit === 0) {
                // No rate limiting - allow unlimited requests
                return Limit::perMinute(999999)->by($request->ip());
            }

            return Limit::perMinute($uploadLimit)->by($request->ip());
        });

        // Chunked upload rate limiting - very high limit for chunk uploads
        RateLimiter::for('chunked-uploads', function (Request $request) {
            // Allow 1000 chunk uploads per minute (should be enough for any reasonable upload)
            return Limit::perMinute(1000)->by($request->ip());
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
