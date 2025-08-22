<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class CheckSetupMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip setup check for setup routes and API routes
        if ($request->is('setup*') || $request->is('api/setup*')) {
            return $next($request);
        }

        // Check if setup is required
        if ($this->setupRequired()) {
            return redirect()->route('setup.index');
        }

        return $next($request);
    }

    /**
     * Check if setup is required.
     */
    private function setupRequired(): bool
    {
        try {
            // Check if we can connect to database
            DB::connection()->getPdo();

            // Check if required tables exist
            return !(Schema::hasTable('files') &&
                    Schema::hasTable('upload_sessions') &&
                    Schema::hasTable('users'));
        } catch (\Exception $e) {
            return true;
        }
    }
}
