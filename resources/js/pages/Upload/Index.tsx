import FileUploader from '@/components/FileUploader';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { CheckCircle, Copy, Lock, Zap } from 'lucide-react';
import { useState } from 'react';

interface UploadIndexProps {
    maxFileSize?: number;
}

export default function UploadIndex({ maxFileSize = 100 * 1024 * 1024 }: UploadIndexProps) {
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const { toast } = useToast();

    const handleUploadStart = (files: File[]) => {
        toast({
            title: 'Upload Started',
            description: `Starting upload of ${files.length} file(s)`,
        });
    };

    const handleUploadComplete = (fileIds: string[]) => {
        setUploadedFiles((prev) => [...prev, ...fileIds]);
        toast({
            title: 'Upload Complete',
            description: `Successfully uploaded ${fileIds.length} file(s)`,
            variant: 'default',
        });
    };

    const handleUploadError = (error: string) => {
        toast({
            title: 'Upload Failed',
            description: error,
            variant: 'destructive',
        });
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Layout
            title="Fucking File - Upload Files Instantly, No Registration Required"
            description={`Upload files up to ${formatFileSize(maxFileSize)} instantly with complete privacy. No registration, no tracking, no bullshit. Secure anonymous file hosting with cryptographic protection.`}
            image="/images/og-upload.png"
        >
            <div className="container-responsive py-8 sm:py-12 lg:py-16">
                {/* Hero Section */}
                <div className="mb-8 text-center fade-in sm:mb-12 lg:mb-16">
                    <h1 className="text-responsive-xl mb-3 leading-tight font-bold sm:mb-4 lg:mb-6">
                        <span className="gradient-primary-text">Fucking</span> File Hosting
                    </h1>
                    <p className="text-responsive-md mx-auto mb-4 max-w-2xl px-2 leading-relaxed text-muted-foreground sm:mb-6 sm:px-4">
                        Upload files up to <span className="font-semibold text-primary">{formatFileSize(maxFileSize)}</span> instantly. No
                        registration, no tracking, no bullshit. Just blazing fast file sharing with complete privacy and download manager support.
                    </p>

                    {/* Quick stats */}
                    <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm lg:gap-6">
                        <div className="flex cursor-default items-center space-x-1.5 transition-colors hover:text-foreground sm:space-x-2">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 sm:h-2 sm:w-2"></div>
                            <span>Unlimited Speed</span>
                        </div>
                        <div className="flex cursor-default items-center space-x-1.5 transition-colors hover:text-foreground sm:space-x-2">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 sm:h-2 sm:w-2"></div>
                            <span>Zero Tracking</span>
                        </div>
                        <div className="flex cursor-default items-center space-x-1.5 transition-colors hover:text-foreground sm:space-x-2">
                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 sm:h-2 sm:w-2"></div>
                            <span>No Registration</span>
                        </div>
                    </div>
                </div>

                {/* Upload Interface */}
                <div className="mb-12 sm:mb-16 lg:mb-20">
                    <FileUploader
                        onUploadStart={handleUploadStart}
                        onUploadComplete={handleUploadComplete}
                        onUploadError={handleUploadError}
                        maxFileSize={maxFileSize}
                        defaultExpirationDays={1}
                        multiple={true}
                        className="slide-in-up mx-auto max-w-5xl"
                    />
                </div>

                {/* Feature Showcase */}
                <section id="features" className="mb-12 sm:mb-16 lg:mb-20">
                    <div className="mx-auto max-w-7xl">
                        <h2 className="text-responsive-lg mb-6 text-center font-bold sm:mb-8 lg:mb-12">
                            Why Choose <span className="gradient-primary-text">Fucking File Hosting</span>?
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {/* Speed Feature */}
                            <Card className="card-interactive hover-lift group p-4 text-center sm:p-6 lg:p-8">
                                <div className="mb-3 flex justify-center sm:mb-4 lg:mb-6">
                                    <div className="bg-gradient-primary gradient-hover group-hover:pulse-glow flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
                                        <Zap className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                                    </div>
                                </div>
                                <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary sm:mb-3 sm:text-xl lg:mb-4 lg:text-2xl">
                                    Blazing Speed
                                </h3>
                                <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:mb-4 sm:text-base lg:mb-6">
                                    No speed limits, no throttling. Upload and download at maximum speed with chunked uploads for files over 25MB.
                                    Compatible with IDM and other download managers.
                                </p>
                                <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Upload Speed:</span>
                                        <span className="font-semibold text-primary">Unlimited</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Download Speed:</span>
                                        <span className="font-semibold text-primary">Unlimited</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Max File Size:</span>
                                        <span className="font-semibold text-primary">{formatFileSize(maxFileSize)}</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Privacy Feature */}
                            <Card className="card-interactive hover-lift group p-4 text-center sm:p-6 lg:p-8">
                                <div className="mb-3 flex justify-center sm:mb-4 lg:mb-6">
                                    <div className="bg-gradient-primary gradient-hover group-hover:pulse-glow flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
                                        <Lock className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                                    </div>
                                </div>
                                <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary sm:mb-3 sm:text-xl lg:mb-4 lg:text-2xl">
                                    Complete Privacy
                                </h3>
                                <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:mb-4 sm:text-base lg:mb-6">
                                    Zero tracking, no IP logging, no personal data collection. Your files are secured with cryptographic IDs.
                                </p>
                                <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>IP Logging:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>User Tracking:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Analytics:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Simplicity Feature */}
                            <Card className="card-interactive hover-lift group p-4 text-center sm:p-6 lg:p-8 md:col-span-2 lg:col-span-1">
                                <div className="mb-3 flex justify-center sm:mb-4 lg:mb-6">
                                    <div className="bg-gradient-primary gradient-hover group-hover:pulse-glow flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 sm:h-16 sm:w-16 lg:h-20 lg:w-20">
                                        <CheckCircle className="h-6 w-6 text-white transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                                    </div>
                                </div>
                                <h3 className="mb-2 text-lg font-semibold transition-colors group-hover:text-primary sm:mb-3 sm:text-xl lg:mb-4 lg:text-2xl">
                                    Radical Simplicity
                                </h3>
                                <p className="mb-3 text-sm leading-relaxed text-muted-foreground sm:mb-4 sm:text-base lg:mb-6">
                                    No registration, no accounts, no complexity. Just drag, drop, and share. Get your download link instantly with
                                    preview and direct download options.
                                </p>
                                <div className="space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Registration:</span>
                                        <span className="font-semibold text-green-500">Not Required</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Setup Time:</span>
                                        <span className="font-semibold text-primary">0 seconds</span>
                                    </div>
                                    <div className="flex cursor-default items-center justify-between rounded px-2 py-1 transition-colors hover:bg-secondary/50">
                                        <span>Complexity:</span>
                                        <span className="font-semibold text-green-500">Zero</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* API Section */}
                <section id="api" className="mb-12 sm:mb-16 lg:mb-20">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="text-responsive-lg mb-6 text-center font-bold sm:mb-8 lg:mb-12">
                            Developer <span className="gradient-primary-text">API</span>
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                            {/* Upload Example */}
                            <Card className="card-interactive hover-lift group p-4 sm:p-6 lg:p-8">
                                <h3 className="mb-3 text-lg font-semibold transition-colors group-hover:text-primary sm:mb-4 sm:text-xl lg:mb-6 lg:text-2xl">
                                    Upload via curl
                                </h3>
                                <div className="cursor-pointer rounded-lg bg-secondary/80 p-3 transition-colors duration-200 group-hover:scale-[1.02] hover:bg-secondary sm:p-4 lg:p-6">
                                    <code className="font-mono text-xs leading-relaxed sm:text-sm lg:text-base">
                                        <span className="text-primary">curl</span> -X POST \<br />
                                        &nbsp;&nbsp;-F <span className="text-green-400">"file=@example.pdf"</span> \<br />
                                        &nbsp;&nbsp;
                                        <span className="text-blue-400">
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/upload
                                        </span>
                                    </code>
                                </div>
                                <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm lg:mt-6 lg:text-base">
                                    Returns JSON with <span className="font-medium text-primary">file_id</span> and{' '}
                                    <span className="font-medium text-primary">download_url</span> for immediate sharing.
                                </p>
                            </Card>

                            {/* Download Example */}
                            <Card className="card-interactive hover-lift group p-4 sm:p-6 lg:p-8">
                                <h3 className="mb-3 text-lg font-semibold transition-colors group-hover:text-primary sm:mb-4 sm:text-xl lg:mb-6 lg:text-2xl">
                                    Download Files
                                </h3>
                                <div className="cursor-pointer rounded-lg bg-secondary/80 p-3 transition-colors duration-200 group-hover:scale-[1.02] hover:bg-secondary sm:p-4 lg:p-6">
                                    <code className="font-mono text-xs leading-relaxed sm:text-sm lg:text-base">
                                        <span className="text-primary">curl</span> -O \<br />
                                        &nbsp;&nbsp;
                                        <span className="text-blue-400">
                                            {typeof window !== 'undefined' ? window.location.origin : ''}/f/[file_id]
                                        </span>
                                    </code>
                                </div>
                                <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm lg:mt-6 lg:text-base">
                                    Direct download with proper headers and <span className="font-medium text-primary">range request</span> support.
                                </p>
                            </Card>
                        </div>

                        <div className="mt-8 text-center sm:mt-12">
                            <Button variant="outline" asChild className="btn-hover-scale focus-ring cursor-pointer">
                                <a href="/docs/api" target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2">
                                    <span>View Full API Documentation</span>
                                    <svg
                                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                    </svg>
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Recent Uploads (if any) */}
                {uploadedFiles.length > 0 && (
                    <section className="slide-in-up mb-16 sm:mb-20 lg:mb-24">
                        <div className="mx-auto max-w-5xl">
                            <h2 className="text-responsive-lg mb-8 text-center font-bold sm:mb-12">
                                Your Recent <span className="gradient-primary-text">Uploads</span>
                            </h2>
                            <div className="space-y-4 sm:space-y-6">
                                {uploadedFiles.map((fileId, index) => (
                                    <Card
                                        key={fileId}
                                        className={`card-interactive hover-lift p-4 fade-in sm:p-6`}
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                            <div className="min-w-0 flex-1">
                                                <p className="mb-2 text-lg font-medium">
                                                    File ID: <span className="font-mono text-primary">{fileId}</span>
                                                </p>
                                                <p className="text-sm break-all text-muted-foreground">
                                                    <span className="font-medium">Download URL:</span>
                                                    <span className="ml-2 text-primary">
                                                        {typeof window !== 'undefined' ? window.location.origin : ''}/f/{fileId}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex gap-2 sm:gap-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                    className="btn-hover-scale focus-ring cursor-pointer"
                                                    onClick={() =>
                                                        navigator.clipboard.writeText(
                                                            `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${fileId}`,
                                                        )
                                                    }
                                                >
                                                    <button type="button" className="inline-flex items-center space-x-2">
                                                        <Copy className="h-4 w-4" />
                                                        <span>Copy</span>
                                                    </button>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild className="btn-hover-scale focus-ring cursor-pointer">
                                                    <a
                                                        href={`/file/${fileId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center space-x-2"
                                                    >
                                                        <span>View Details</span>
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                                            />
                                                        </svg>
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    );
}
