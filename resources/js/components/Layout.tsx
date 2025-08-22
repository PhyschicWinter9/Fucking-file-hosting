import { Toaster } from '@/components/ui/sonner';
import React from 'react';
import MetaTags from './MetaTags';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export default function Layout({
    children,
    title = 'Fucking File Hosting - Blazing Fast, Privacy-First File Sharing',
    description,
    image,
    url,
}: LayoutProps) {
    return (
        <>
            <MetaTags title={title} description={description} image={image} url={url} />
            <div className="dark min-h-screen bg-background text-foreground">
                {/* Header */}
                <header className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            {/* Logo */}
                            <div className="flex items-center space-x-2">
                                <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-lg">
                                    <span className="text-lg font-bold text-white">F</span>
                                </div>
                                <h1 className="gradient-primary-text text-xl font-bold">Fucking File Hosting</h1>
                            </div>

                            {/* Navigation */}
                            <nav className="hidden items-center space-x-6 md:flex">
                                <a href="/" className="text-muted-foreground transition-colors hover:text-foreground">
                                    Upload
                                </a>
                                <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
                                    Features
                                </a>
                                <a href="#api" className="text-muted-foreground transition-colors hover:text-foreground">
                                    API
                                </a>
                            </nav>

                            {/* Mobile menu button */}
                            <button type="button" className="rounded-md p-2 hover:bg-secondary md:hidden" aria-label="Open mobile menu">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1">{children}</main>

                {/* Footer */}
                <footer className="mt-auto border-t border-border bg-card">
                    <div className="container mx-auto px-4 py-8">
                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            {/* Brand */}
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <div className="bg-gradient-primary flex h-6 w-6 items-center justify-center rounded">
                                        <span className="text-sm font-bold text-white">F</span>
                                    </div>
                                    <span className="gradient-primary-text font-bold">Fucking File Hosting</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Blazing fast, privacy-first file hosting. No registration, no tracking, no bullshit.
                                </p>
                            </div>

                            {/* Features */}
                            <div className="space-y-4">
                                <h3 className="font-semibold">Features</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• Up to 100MB file uploads</li>
                                    <li>• Zero speed limits</li>
                                    <li>• Complete privacy</li>
                                    <li>• No registration required</li>
                                    <li>• Cryptographic security</li>
                                </ul>
                            </div>

                            {/* API */}
                            <div className="space-y-4">
                                <h3 className="font-semibold">Developer</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>• RESTful API</li>
                                    <li>• curl integration</li>
                                    <li>• No authentication</li>
                                    <li>• JSON responses</li>
                                    <li>• Rate limiting</li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
                            <p>Built with Laravel & React. Privacy-first, speed-focused file hosting.</p>
                        </div>
                    </div>
                </footer>
            </div>
            <Toaster />
        </>
    );
}
