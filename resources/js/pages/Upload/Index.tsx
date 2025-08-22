import FileUploader from '@/components/FileUploader';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { Head } from '@inertiajs/react';
import { CheckCircle, Lock, Zap } from 'lucide-react';
import { useState } from 'react';

interface UploadIndexProps {
    // Add any props passed from Laravel controller here
}

export default function UploadIndex({}: UploadIndexProps) {
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

    return (
        <Layout>
            <Head title="Upload Files - Fucking File Hosting" />

            <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <h1 className="mb-4 text-4xl font-bold md:text-6xl">
                        <span className="gradient-primary-text">Fucking</span> File Hosting
                    </h1>
                    <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
                        Upload files up to 100MB instantly. No registration, no tracking, no bullshit. Just blazing fast file sharing with complete
                        privacy and download manager support.
                    </p>
                </div>

                {/* Upload Interface */}
                <div className="mb-16">
                    <FileUploader
                        onUploadStart={handleUploadStart}
                        onUploadComplete={handleUploadComplete}
                        onUploadError={handleUploadError}
                        maxFileSize={100 * 1024 * 1024} // 100MB (Cloudflare free plan limit)
                        multiple={true}
                        className="mx-auto max-w-4xl"
                    />
                </div>

                {/* Feature Showcase */}
                <section id="features" className="mb-16">
                    <div className="mx-auto max-w-6xl">
                        <h2 className="mb-12 text-center text-3xl font-bold">Why Choose Fucking File Hosting?</h2>

                        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                            {/* Speed Feature */}
                            <Card className="p-6 text-center">
                                <div className="mb-4 flex justify-center">
                                    <div className="bg-gradient-primary flex h-16 w-16 items-center justify-center rounded-full">
                                        <Zap className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-semibold">Blazing Speed</h3>
                                <p className="text-muted-foreground">
                                    No speed limits, no throttling. Upload and download at maximum speed with chunked uploads for files over 25MB.
                                    Compatible with IDM and other download managers.
                                </p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Upload Speed:</span>
                                        <span className="font-semibold text-primary">Unlimited</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Download Speed:</span>
                                        <span className="font-semibold text-primary">Unlimited</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Max File Size:</span>
                                        <span className="font-semibold text-primary">100MB</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Privacy Feature */}
                            <Card className="p-6 text-center">
                                <div className="mb-4 flex justify-center">
                                    <div className="bg-gradient-primary flex h-16 w-16 items-center justify-center rounded-full">
                                        <Lock className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-semibold">Complete Privacy</h3>
                                <p className="text-muted-foreground">
                                    Zero tracking, no IP logging, no personal data collection. Your files are secured with cryptographic IDs.
                                </p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>IP Logging:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>User Tracking:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Analytics:</span>
                                        <span className="font-semibold text-green-500">None</span>
                                    </div>
                                </div>
                            </Card>

                            {/* Simplicity Feature */}
                            <Card className="p-6 text-center">
                                <div className="mb-4 flex justify-center">
                                    <div className="bg-gradient-primary flex h-16 w-16 items-center justify-center rounded-full">
                                        <CheckCircle className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                                <h3 className="mb-3 text-xl font-semibold">Radical Simplicity</h3>
                                <p className="text-muted-foreground">
                                    No registration, no accounts, no complexity. Just drag, drop, and share. Get your download link instantly with
                                    preview and direct download options.
                                </p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Registration:</span>
                                        <span className="font-semibold text-green-500">Not Required</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Setup Time:</span>
                                        <span className="font-semibold text-primary">0 seconds</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Complexity:</span>
                                        <span className="font-semibold text-green-500">Zero</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* API Section */}
                <section id="api" className="mb-16">
                    <div className="mx-auto max-w-4xl">
                        <h2 className="mb-8 text-center text-3xl font-bold">Developer API</h2>

                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                            {/* Upload Example */}
                            <Card className="p-6">
                                <h3 className="mb-4 text-xl font-semibold">Upload via curl</h3>
                                <div className="rounded-lg bg-secondary p-4">
                                    <code className="text-sm">
                                        curl -X POST \<br />
                                        &nbsp;&nbsp;-F "file=@example.pdf" \<br />
                                        &nbsp;&nbsp;{window.location.origin}/api/upload
                                    </code>
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Returns JSON with file_id and download_url for immediate sharing.
                                </p>
                            </Card>

                            {/* Download Example */}
                            <Card className="p-6">
                                <h3 className="mb-4 text-xl font-semibold">Download Files</h3>
                                <div className="rounded-lg bg-secondary p-4">
                                    <code className="text-sm">
                                        curl -O \<br />
                                        &nbsp;&nbsp;{window.location.origin}/f/[file_id]
                                    </code>
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">Direct download with proper headers and range request support.</p>
                            </Card>
                        </div>

                        <div className="mt-8 text-center">
                            <Button variant="outline" asChild>
                                <a href="/api/docs" target="_blank" rel="noopener noreferrer">
                                    View Full API Documentation
                                </a>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Recent Uploads (if any) */}
                {uploadedFiles.length > 0 && (
                    <section className="mb-16">
                        <div className="mx-auto max-w-4xl">
                            <h2 className="mb-8 text-center text-2xl font-bold">Your Recent Uploads</h2>
                            <div className="space-y-4">
                                {uploadedFiles.map((fileId) => (
                                    <Card key={fileId} className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">File ID: {fileId}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Download URL: {window.location.origin}/f/{fileId}
                                                </p>
                                            </div>
                                            <Button variant="outline" asChild>
                                                <a href={`/file/${fileId}`} target="_blank" rel="noopener noreferrer">
                                                    View Details
                                                </a>
                                            </Button>
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
