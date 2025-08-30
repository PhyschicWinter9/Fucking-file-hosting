<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip maintenance check for certain routes
        if ($this->shouldSkipMaintenanceCheck($request)) {
            return $next($request);
        }

        // Check if maintenance mode is enabled
        if (config('app.maintenance_mode_enabled', false)) {
            // Allow access with maintenance bypass token
            $bypassToken = config('app.maintenance_bypass_token');
            if ($bypassToken && $request->get('bypass') === $bypassToken) {
                return $next($request);
            }

            // Show maintenance page
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Service temporarily unavailable for maintenance.',
                    'maintenance' => true
                ], 503);
            }

            return Inertia::render('Maintenance', [
                'message' => config('app.maintenance_message', "We're making some fucking awesome improvements. Be back soon!"),
                'estimatedTime' => config('app.maintenance_estimated_time', '30 minutes')
            ])->toResponse($request)->setStatusCode(503);
        }

        return $next($request);
    }

    /**
     * Determine if maintenance check should be skipped for this request
     */
    private function shouldSkipMaintenanceCheck(Request $request): bool
    {
        $skipRoutes = [
            'maintenance',
            'health-check'
        ];

        $currentRoute = $request->route()?->getName();
        
        return in_array($currentRoute, $skipRoutes) || 
               str_starts_with($request->path(), 'api/health');
    }
}