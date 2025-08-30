<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>Under Maintenance | {{ config('app.name', 'Fucking File Hosting') }}</title>

        <!-- Favicon -->
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        <!-- Styles & Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx'])

        <!-- Dark theme styles -->
        <style>
            html {
                background-color: #0a0a0a;
                color: #ffffff;
            }
            
            /* Custom animations */
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
            
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.3); }
                50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.6), 0 0 60px rgba(239, 68, 68, 0.3); }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            .float-animation {
                animation: float 3s ease-in-out infinite;
            }
            
            .glow-animation {
                animation: glow 2s ease-in-out infinite;
            }
            
            .shimmer-text {
                background: linear-gradient(90deg, #f97316, #ef4444, #ec4899, #ef4444, #f97316);
                background-size: 200% 100%;
                background-clip: text;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: shimmer 3s ease-in-out infinite;
            }
            
            .progress-bar {
                background: linear-gradient(90deg, #f97316, #ef4444);
                position: relative;
                overflow: hidden;
            }
            
            .progress-bar::after {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 2s infinite;
            }
        </style>
    </head>
    <body class="font-sans antialiased bg-gray-900 text-white">
        <div id="app" data-page='{"component":"Maintenance","props":{"message":"{{ config('app.maintenance_message') }}"},"url":"/","version":""}'>
            <!-- Fallback content for when JavaScript is disabled -->
            <div class="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div class="text-center max-w-md mx-auto px-4">
                    <div class="mb-8">
                        <div class="bg-gradient-to-r from-orange-500 to-red-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                        </div>
                        <h1 class="text-4xl font-bold text-orange-500 mb-4">Under Maintenance</h1>
                        <p class="text-gray-400 mb-6">{{ config('app.maintenance_message', "Quick server upgrade in progress. We'll be back with even faster fucking file hosting!") }}</p>

                    </div>
                </div>
            </div>
        </div>
    </body>
</html>