import FileInfo from '@/components/FileInfo';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { FileInfo as FileInfoType } from '@/types/file';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, Download, ExternalLink, Share2 } from 'lucide-react';
import { useState } from 'react';

interface FileShowProps {
    /** File information passed from Laravel controller */
    file: FileInfoType;
    /** Error message if file not found or expired */
    error?: string;
}

export default function FileShow({ file, error }: FileShowProps) {
    const [downloadCount, setDownloadCount] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    // Handle download tracking
    const handleDownload = async (fileId: string) => {
        setIsDownloading(true);
        setDownloadCount((prev) => prev + 1);

        try {
            // Track download (optional - could be disabled for privacy)
            // await fetch(`/api/file/${fileId}/download`, { method: 'POST' });

            toast({
                title: 'Download Started',
                description: 'Your file download has begun',
                variant: 'default',
            });
        } catch (error) {
            toast({
                title: 'Download Error',
                description: 'Failed to start download',
                variant: 'destructive',
            });
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle preview
    const handlePreview = (fileId: string) => {
        toast({
            title: 'Opening Preview',
            description: 'Opening file preview in new tab',
            variant: 'default',
        });
    };

    // Handle sharing
    const handleShare = async () => {
        if (navigator.share && file) {
            try {
                await navigator.share({
                    title: `Download ${file.original_name}`,
                    text: `Download ${file.original_name} from Fucking File Hosting`,
                    url: file.download_url,
                });

                toast({
                    title: 'Shared Successfully',
                    description: 'File link shared',
                    variant: 'default',
                });
            } catch (error) {
                // Fallback to clipboard copy
                await navigator.clipboard.writeText(file.download_url);
                toast({
                    title: 'Link Copied',
                    description: 'Download link copied to clipboard',
                    variant: 'default',
                });
            }
        } else if (file) {
            // Fallback to clipboard copy
            try {
                await navigator.clipboard.writeText(file.download_url);
                toast({
                    title: 'Link Copied',
                    description: 'Download link copied to clipboard',
                    variant: 'default',
                });
            } catch (error) {
                toast({
                    title: 'Share Failed',
                    description: 'Failed to copy link to clipboard',
                    variant: 'destructive',
                });
            }
        }
    };

    // Check if file is expired or has error
    if (error || (file && file.is_expired)) {
        return (
            <Layout>
                <Head title="File Not Found - Fucking File Hosting" />

                <div className="container mx-auto px-4 py-8">
                    <div className="mx-auto max-w-2xl">
                        {/* Back to upload button */}
                        <div className="mb-8">
                            <Button variant="ghost" asChild>
                                <Link href="/">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Upload
                                </Link>
                            </Button>
                        </div>

                        {/* Error card */}
                        <Card className="p-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>

                            <h1 className="mb-4 text-2xl font-bold">{file?.is_expired ? 'File Expired' : 'File Not Found'}</h1>

                            <p className="mb-6 text-muted-foreground">
                                {file?.is_expired
                                    ? 'This file has expired and is no longer available for download.'
                                    : error || "The file you're looking for doesn't exist or has been removed."}
                            </p>

                            <div className="space-y-4">
                                <Button asChild className="w-full sm:w-auto">
                                    <Link href="/">Upload New File</Link>
                                </Button>

                                {file?.is_expired && (
                                    <p className="text-sm text-muted-foreground">
                                        Files are automatically deleted after their expiration date for privacy and storage optimization.
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </Layout>
        );
    }

    // If no file data, show loading or error
    if (!file) {
        return (
            <Layout>
                <Head title="Loading... - Fucking File Hosting" />

                <div className="container mx-auto px-4 py-8">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-8">
                            <Button variant="ghost" asChild>
                                <Link href="/">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Upload
                                </Link>
                            </Button>
                        </div>

                        <Card className="p-8 text-center">
                            <div className="animate-pulse space-y-4">
                                <div className="mx-auto h-16 w-16 rounded-full bg-muted"></div>
                                <div className="mx-auto h-6 w-48 rounded bg-muted"></div>
                                <div className="mx-auto h-4 w-32 rounded bg-muted"></div>
                            </div>
                        </Card>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head title={`${file.original_name} - Fucking File Hosting`} />

            <div className="container mx-auto px-4 py-8">
                <div className="mx-auto max-w-4xl">
                    {/* Header with navigation and actions */}
                    <div className="mb-8 flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
                        <Button variant="ghost" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Upload
                            </Link>
                        </Button>

                        <div className="flex space-x-2">
                            {/* Quick download button */}
                            <Button onClick={() => handleDownload(file.file_id)} disabled={isDownloading} className="min-w-[120px]">
                                <Download className="mr-2 h-4 w-4" />
                                {isDownloading ? 'Downloading...' : 'Download'}
                            </Button>

                            {/* Share button */}
                            <Button variant="outline" onClick={handleShare}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                            </Button>
                        </div>
                    </div>

                    {/* File information component */}
                    <FileInfo
                        file={file}
                        showPreview={true}
                        showQRCode={true}
                        onDownload={handleDownload}
                        onPreview={handlePreview}
                        className="space-y-6"
                    />

                    {/* Additional mobile-optimized actions */}
                    <div className="mt-8 block sm:hidden">
                        <Card className="p-4">
                            <h3 className="mb-4 font-semibold">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <Button onClick={() => handleDownload(file.file_id)} disabled={isDownloading} size="sm" className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>

                                <Button variant="outline" onClick={handleShare} size="sm" className="w-full">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share
                                </Button>

                                {file.preview_url && (
                                    <Button variant="outline" onClick={() => window.open(file.preview_url, '_blank')} size="sm" className="w-full">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Preview
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    onClick={() => navigator.clipboard.writeText(file.download_url)}
                                    size="sm"
                                    className="w-full"
                                >
                                    Copy Link
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Privacy notice */}
                    <Card className="mt-8 border-muted bg-muted/20 p-6">
                        <h3 className="mb-3 font-semibold">Privacy & Security</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>• This file is secured with a cryptographic ID and cannot be guessed or enumerated</p>
                            <p>• No personal information or IP addresses are logged during downloads</p>
                            <p>• Files are automatically deleted after expiration for privacy protection</p>
                            <p>• Share this link only with people you trust - anyone with the link can download the file</p>
                        </div>
                    </Card>

                    {/* Upload another file CTA */}
                    <div className="mt-8 text-center">
                        <Card className="p-6">
                            <h3 className="mb-3 text-lg font-semibold">Need to upload another file?</h3>
                            <p className="mb-4 text-muted-foreground">Upload files up to 100MB with zero registration and complete privacy.</p>
                            <Button asChild>
                                <Link href="/">Upload New File</Link>
                            </Button>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
