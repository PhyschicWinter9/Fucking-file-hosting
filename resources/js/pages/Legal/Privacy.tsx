import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Database, Eye, Globe, Lock, Shield, UserCheck } from 'lucide-react';

export default function Privacy() {
    return (
        <Layout
            title="Privacy Policy - Fucking File Hosting"
            description="Privacy Policy for our zero-tracking file hosting service. Complete privacy guaranteed, no personal data collection."
        >
            <div className="container-responsive py-8 sm:py-12 lg:py-16">
                {/* Hero Section */}
                <div className="mb-8 text-center fade-in sm:mb-12 lg:mb-16">
                    <div className="mb-4 flex justify-center">
                        <div className="bg-gradient-primary gradient-hover flex h-16 w-16 items-center justify-center rounded-full sm:h-20 sm:w-20">
                            <Shield className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                        </div>
                    </div>
                    <h1 className="text-responsive-xl mb-3 leading-tight font-bold sm:mb-4 lg:mb-6">
                        Privacy <span className="gradient-primary-text">Policy</span>
                    </h1>
                    <p className="text-responsive-md mx-auto mb-4 max-w-2xl px-2 leading-relaxed text-muted-foreground sm:mb-6 sm:px-4">
                        Zero tracking, complete privacy. We don't collect, store, or share your personal information.
                    </p>
                    <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Privacy Content */}
                <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <Database className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">1. Information We Collect</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            We collect information you provide directly to us, such as when you upload files or use our services.
                        </p>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div>
                                <h3 className="mb-3 text-lg font-semibold">Information You Provide</h3>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>Files you upload to our service</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>File metadata (name, size, type, upload date)</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>IP address and browser information</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>Usage patterns and preferences</span>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="mb-3 text-lg font-semibold">Automatically Collected Information</h3>
                                <ul className="space-y-2 text-muted-foreground">
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>Log data (access times, pages viewed, IP address)</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>Device information (browser type, operating system)</span>
                                    </li>
                                    <li className="flex items-start space-x-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                        <span>Cookies and similar tracking technologies</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <Eye className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">2. How We Use Your Information</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">We use the information we collect to:</p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Provide, maintain, and improve our file hosting service</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Process and store your uploaded files</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Monitor and analyze usage patterns</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Detect and prevent abuse or illegal activity</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Comply with legal obligations</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span>Communicate with you about service updates</span>
                            </li>
                        </ul>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <Globe className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">3. Information Sharing and Disclosure</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            We do not sell, trade, or otherwise transfer your personal information to third parties except in the following
                            circumstances:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span>With your explicit consent</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                                <span>To comply with legal obligations or court orders</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                                <span>To protect our rights, property, or safety</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                                <span>In connection with a business transfer or merger</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                <span>With service providers who assist in our operations</span>
                            </li>
                        </ul>
                    </Card>

                    <Card className="card-interactive hover-lift p-6 sm:p-8">
                        <div className="mb-4 flex items-center space-x-3">
                            <div className="bg-gradient-primary flex h-10 w-10 items-center justify-center rounded-lg">
                                <Lock className="h-5 w-5 text-white" />
                            </div>
                            <h2 className="text-xl font-semibold sm:text-2xl">4. Data Security</h2>
                        </div>
                        <p className="mb-4 leading-relaxed text-muted-foreground">
                            We implement appropriate security measures to protect your information:
                        </p>
                        <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span>Encryption of data in transit and at rest</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span>Regular security audits and updates</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span>Access controls and authentication measures</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                <span>Secure server infrastructure</span>
                            </li>
                        </ul>
                        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                            However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee
                            absolute security.
                        </p>
                    </Card>

                    <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2">
                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">5. Data Retention</h2>
                            <p className="mb-4 leading-relaxed text-muted-foreground">
                                We retain your information for as long as necessary to provide our services and comply with legal obligations:
                            </p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Uploaded files may be automatically deleted after periods of inactivity</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Log data is typically retained for security and operational purposes</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>We may retain certain information to comply with legal requirements</span>
                                </li>
                            </ul>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <div className="mb-4 flex items-center space-x-3">
                                <div className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-lg">
                                    <UserCheck className="h-4 w-4 text-white" />
                                </div>
                                <h2 className="text-xl font-semibold sm:text-2xl">6. Your Rights</h2>
                            </div>
                            <p className="mb-4 leading-relaxed text-muted-foreground">
                                Depending on your location, you may have certain rights regarding your personal information:
                            </p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    <span>Access to your personal information</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    <span>Correction of inaccurate information</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    <span>Deletion of your information</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    <span>Data portability</span>
                                </li>
                            </ul>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">7. Cookies and Tracking</h2>
                            <p className="mb-4 leading-relaxed text-muted-foreground">We use cookies and similar technologies to:</p>
                            <ul className="space-y-2 text-muted-foreground">
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Remember your preferences and settings</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Analyze site usage and performance</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Provide security features</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    <span>Improve user experience</span>
                                </li>
                            </ul>
                        </Card>

                        <Card className="card-interactive hover-lift p-6 sm:p-8">
                            <h2 className="mb-4 text-xl font-semibold sm:text-2xl">8. Contact Us</h2>
                            <p className="leading-relaxed text-muted-foreground">
                                If you have any questions about this Privacy Policy or our privacy practices, please contact us through our support
                                channels.
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
