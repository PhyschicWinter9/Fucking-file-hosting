<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\PerformanceOptimizer;

class PerformanceServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->singleton(PerformanceOptimizer::class, function ($app) {
            return new PerformanceOptimizer();
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Register console commands
        if ($this->app->runningInConsole()) {
            $this->commands([
                \App\Console\Commands\MonitorResources::class,
            ]);
        }
    }
}