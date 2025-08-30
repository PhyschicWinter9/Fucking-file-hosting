<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>File Not Found | {{ config('app.name', 'Fucking File Hosting') }}</title>

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
        </style>
    </head>
    <body class="font-sans antialiased bg-gray-900 text-white">
        <div id="app" data-page='{"component":"Errors/FileNotFound","props":{"fileId":"{{ $fileId ?? '' }}"},"url":"/","version":""}'>
            <!-- Fallback content for when JavaScript is disabled -->
            <div class="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <div class="text-center">
                    <h1 class="text-6xl font-bold text-orange-500 mb-4">File Not Found</h1>
                    <h2 class="text-2xl font-semibold mb-4">File ID: {{ $fileId ?? 'Unknown' }}</h2>
                    <p class="text-gray-400 mb-8">The file you're looking for doesn't exist or has expired.</p>
                    <a href="/" class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded">
                        Upload New File
                    </a>
                </div>
            </div>
        </div>
    </body>
</html>