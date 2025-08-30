import { Toaster } from '@/components/ui/sonner';
import React, { useState } from 'react';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            <MetaTags title={title} description={description} image={image} url={url} />
            <div className="dark scrollbar-ffh min-h-screen bg-background text-foreground">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm">
                    <div className="container-responsive py-3 sm:py-4">
                        <div className="flex items-center justify-between">
                            {/* Logo */}
                            <div className="hover-lift flex cursor-pointer items-center space-x-2" onClick={() => (window.location.href = '/')}>
                                <div className="bg-gradient-primary gradient-hover flex h-8 w-8 items-center justify-center rounded-lg sm:h-10 sm:w-10">
                                    <span className="text-lg font-bold text-white sm:text-xl">F</span>
                                </div>
                                <h1 className="gradient-primary-text hidden text-lg font-bold sm:block sm:text-xl lg:text-2xl">
                                    Fucking File Hosting
                                </h1>
                                <h1 className="gradient-primary-text text-lg font-bold sm:hidden">Fucking File</h1>
                            </div>

                            {/* Desktop Navigation */}
                            <nav className="hidden items-center space-x-4 md:flex lg:space-x-6">
                                <a
                                    href="/"
                                    className="transition-all-smooth cursor-pointer rounded-md px-3 py-2 text-muted-foreground hover:scale-105 hover:bg-secondary/50 hover:text-foreground"
                                >
                                    Upload
                                </a>
                                <a
                                    href="#features"
                                    className="transition-all-smooth cursor-pointer rounded-md px-3 py-2 text-muted-foreground hover:scale-105 hover:bg-secondary/50 hover:text-foreground"
                                >
                                    Features
                                </a>
                                <a
                                    href="#api"
                                    className="transition-all-smooth cursor-pointer rounded-md px-3 py-2 text-muted-foreground hover:scale-105 hover:bg-secondary/50 hover:text-foreground"
                                >
                                    API
                                </a>
                            </nav>

                            {/* Mobile menu button */}
                            <button
                                type="button"
                                className="transition-all-smooth btn-hover-scale focus-ring cursor-pointer rounded-md p-2 hover:bg-secondary md:hidden"
                                aria-label="Toggle mobile menu"
                                onClick={toggleMobileMenu}
                            >
                                <svg
                                    className={`h-6 w-6 transition-transform duration-300 ${isMobileMenuOpen ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    {isMobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>

                        {/* Mobile Navigation */}
                        <div
                            className={`transition-all duration-300 ease-in-out md:hidden ${
                                isMobileMenuOpen ? 'mt-4 max-h-48 opacity-100' : 'max-h-0 overflow-hidden opacity-0'
                            }`}
                        >
                            <nav className="flex flex-col space-y-2 py-2">
                                <a
                                    href="/"
                                    className="transition-all-smooth slide-in-up cursor-pointer rounded-md px-4 py-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    onClick={closeMobileMenu}
                                >
                                    Upload
                                </a>
                                <a
                                    href="#features"
                                    className="transition-all-smooth slide-in-up cursor-pointer rounded-md px-4 py-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    onClick={closeMobileMenu}
                                >
                                    Features
                                </a>
                                <a
                                    href="#api"
                                    className="transition-all-smooth slide-in-up cursor-pointer rounded-md px-4 py-3 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                    onClick={closeMobileMenu}
                                >
                                    API
                                </a>
                            </nav>
                        </div>
                    </div>
                </header>

                {/* Main content */}
                <main className="min-h-[calc(100vh-200px)] flex-1">{children}</main>

                {/* Footer */}
                <footer className="mt-auto border-t border-border bg-card">
                    <div className="container-responsive py-8 sm:py-12">
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Brand */}
                            <div className="space-y-4 lg:col-span-1">
                                <div className="hover-lift flex cursor-pointer items-center space-x-2" onClick={() => (window.location.href = '/')}>
                                    <div className="bg-gradient-primary gradient-hover flex h-6 w-6 items-center justify-center rounded">
                                        <span className="text-sm font-bold text-white">F</span>
                                    </div>
                                    <span className="gradient-primary-text text-lg font-bold">Fucking File Hosting</span>
                                </div>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Blazing fast, privacy-first file hosting. No registration, no tracking, no bullshit.
                                </p>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Version 1.0.0 &copy; {new Date().getFullYear()}</p>
                                    <p className="text-xs text-muted-foreground">RELAXLIKES | All rights reserved.</p>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Features</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Up to 100 MB file uploads</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Zero speed limits</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Complete privacy</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>No registration required</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Cryptographic security</span>
                                    </li>
                                </ul>
                            </div>

                            {/* API */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Developer</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>RESTful API</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>curl integration</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>No authentication</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>JSON responses</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Rate limiting</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal */}
                            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
                                <h3 className="font-semibold text-foreground">Legal</h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li>
                                        <a 
                                            href="/terms" 
                                            className="flex cursor-pointer items-center space-x-2 transition-colors hover:text-primary"
                                        >
                                            <span className="text-primary">•</span>
                                            <span>Terms of Service</span>
                                        </a>
                                    </li>
                                    <li>
                                        <a 
                                            href="/privacy" 
                                            className="flex cursor-pointer items-center space-x-2 transition-colors hover:text-primary"
                                        >
                                            <span className="text-primary">•</span>
                                            <span>Privacy Policy</span>
                                        </a>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>No tracking</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Zero data collection</span>
                                    </li>
                                    <li className="flex cursor-default items-center space-x-2 transition-colors hover:text-foreground">
                                        <span className="text-primary">•</span>
                                        <span>Complete privacy</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-border pt-8 text-center">
                            <p className="text-sm text-muted-foreground">
                                Built with <span className="font-medium text-primary">Laravel</span> &{' '}
                                <span className="font-medium text-primary">React</span>. Privacy-first, speed-focused file hosting.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
            <Toaster />
        </>
    );
}
