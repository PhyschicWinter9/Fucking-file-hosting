import { Head } from '@inertiajs/react';

interface MetaTagsProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    keywords?: string;
}

export default function MetaTags({
    title = 'Fucking File Hosting - Blazing Fast, Privacy-First File Sharing',
    description = 'Upload and share files instantly with zero registration. Up to 100MB uploads, complete privacy, no speed limits, no bullshit. Secure, anonymous file hosting with cryptographic protection.',
    image = '/images/og-image.png',
    url,
    type = 'website',
    keywords = 'file hosting, file sharing, upload files, anonymous upload, privacy file sharing, secure file hosting, no registration file upload, fast file sharing, temporary file hosting, drag and drop upload, no bullshit file hosting',
}: MetaTagsProps) {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const siteName = 'Fucking File Hosting';

    return (
        <Head>
            {/* Basic Meta Tags */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <meta name="author" content="Fucking File Hosting" />
            <meta name="robots" content="index, follow" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:locale" content="en_US" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:url" content={currentUrl} />
            <meta name="twitter:site" content="@fuckingfilehosting" />
            <meta name="twitter:creator" content="@fuckingfilehosting" />

            {/* Additional Meta Tags */}
            <meta name="msapplication-navbutton-color" content="#ff6b35" />
            <meta name="msapplication-TileColor" content="#ff6b35" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="apple-mobile-web-app-title" content={siteName} />

            {/* Favicon and Icons */}
            <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="manifest" href="/site.webmanifest" />

            {/* Canonical URL */}
            <link rel="canonical" href={currentUrl} />

            {/* Preconnect for performance */}
            <link rel="preconnect" href="https://fonts.bunny.net" />

            {/* JSON-LD Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'WebApplication',
                    name: siteName,
                    description: description,
                    url: currentUrl,
                    applicationCategory: 'UtilityApplication',
                    operatingSystem: 'Web Browser',
                    offers: {
                        '@type': 'Offer',
                        price: '0',
                        priceCurrency: 'USD',
                    },
                    featureList: [
                        'Anonymous file uploads up to 100MB',
                        'Zero speed limits for downloads',
                        'Complete privacy protection',
                        'No registration required',
                        'Cryptographic security',
                        'RESTful API access',
                        'Drag and drop interface',
                        'Temporary file hosting',
                    ],
                    screenshot: image,
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: '4.8',
                        ratingCount: '1250',
                    },
                })}
            </script>
        </Head>
    );
}
