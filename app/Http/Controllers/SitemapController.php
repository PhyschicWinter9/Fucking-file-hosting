<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;

class SitemapController extends Controller
{
    /**
     * Generate XML sitemap.
     */
    public function index(): Response
    {
        $sitemap = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $sitemap .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Main pages
        $pages = [
            [
                'url' => config('app.url'),
                'changefreq' => 'daily',
                'priority' => '1.0',
                'lastmod' => now()->toISOString()
            ],
            [
                'url' => config('app.url') . '/docs/api',
                'changefreq' => 'weekly',
                'priority' => '0.8',
                'lastmod' => now()->toISOString()
            ]
        ];

        foreach ($pages as $page) {
            $sitemap .= '  <url>' . "\n";
            $sitemap .= '    <loc>' . htmlspecialchars($page['url']) . '</loc>' . "\n";
            $sitemap .= '    <lastmod>' . $page['lastmod'] . '</lastmod>' . "\n";
            $sitemap .= '    <changefreq>' . $page['changefreq'] . '</changefreq>' . "\n";
            $sitemap .= '    <priority>' . $page['priority'] . '</priority>' . "\n";
            $sitemap .= '  </url>' . "\n";
        }

        $sitemap .= '</urlset>';

        return response($sitemap, 200, [
            'Content-Type' => 'application/xml',
            'Cache-Control' => 'public, max-age=3600'
        ]);
    }
}
