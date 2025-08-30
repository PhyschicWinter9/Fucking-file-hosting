<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>503 - Service Unavailable | {{ config('app.name', 'Fucking File Hosting') }}</title>

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
        <div id="app" data-page='{"component":"Errors/503","props":{},"url":"/","version":""}'></div>
    </body>
</html>