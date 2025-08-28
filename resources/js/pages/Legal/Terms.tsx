import React from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Shield, AlertTriangle, Scale } from 'lucide-react';

export default function Terms() {
    return (
        <Layout
            title="Terms of Service - Fucking File Hosting"
            description="Terms of Service for our privacy-first file hosting service. No registration required, complete privacy guaranteed."
        >
            <div className="container-responsive py-8 sm:py-12 lg:py-16">
                {/* Hero Section */}
                <div className="mb-8 text-center fade-in sm:mb-12 lg:mb-16">
                    <div className="mb-4 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20">
                            <Scale className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                        </div>
                    </div>
                    <h1 className="text-responsive-xl mb-3 leading-tight font-bold sm:mb-4 lg:mb-6">
                        Terms of <span className="gradient-primary-text">Service</span>
                    </h1>
                    <p className="text-responsive-md mx-auto mb-4 max-w-2xl px-2 leading-relaxed text-muted-foreground sm:mb-6 sm:px-4">
                        Simple, transparent terms for our file hosting service. No hidden clauses, no legal jargon.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>
                </div>

                {/* Terms Content */}
                <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">1. Acceptance of Terms</h2>
                        </div>
                        <p className="leading-relaxed text-muted-foreground">
                            By accessing and using this file hosting service, you accept and agree to be bound by the terms and provision of this agreement.
                        </p>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <Shield className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">2. Use License</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            Permission is granted to temporarily use this service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Upload illegal, harmful, or copyrighted content without permission</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Use the service for commercial purposes without authorization</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Attempt to reverse engineer or compromise the service</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Upload malware, viruses, or other malicious content</span>
                            </li>
                        </ul>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <FileText className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">3. File Storage and Retention</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            Files uploaded to our service are subject to the following policies:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Files may be automatically deleted after a period of inactivity</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>We reserve the right to remove files that violate our terms</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Users are responsible for maintaining backups of important files</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>File availability is not guaranteed</span>
                            </li>
                        </ul>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">4. Prohibited Content</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            The following types of content are strictly prohibited:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span>Illegal content under applicable laws</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span>Copyrighted material without proper authorization</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span>Malicious software or code</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span>Content that violates privacy rights</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                <span>Spam or unsolicited promotional material</span>
                            </li>
                        </ul>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">5. Disclaimer</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                The materials on this service are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                            </p>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">6. Limitations</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                In no event shall our service or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this service, even if we or our authorized representative has been notified orally or in writing of the possibility of such damage.
                            </p>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">7. Revisions and Errata</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                The materials appearing on this service could include technical, typographical, or photographic errors. We do not warrant that any of the materials on its service are accurate, complete, or current. We may make changes to the materials contained on its service at any time without notice.
                            </p>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">8. Contact Information</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                If you have any questions about these Terms of Service, please contact us through our support channels.
                            </p>
                        </Card>
                    </div>

                    <div className="mt-8 text-center sm:mt-12">
                        <Button variant="outline" asChild className="btn-hover-scale focus-ring cursor-pointer">
                            <a href="/" className="inline-flex items-center space-x-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                <span>Back to Home</span>
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}