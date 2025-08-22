import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { Head, Link } from '@inertiajs/react';
import { Calendar, Clock, Copy, Download, Eye, FileText, HardDrive, QrCode, Share2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface FileInfo {
    file_id: string;
    original_name: string;
    file_size: number;
    human_file_size: string;
    mime_type: string;
    download_url: string;
    preview_url?: string;
    info_url: string;
    expires_at?: string;
    is_expired: boolean;
    created_at: string;
    can_delete: boolean;
    delete_token?: string;
}

interface FileShowPageProps {
    file: FileInfo;
}

export default function FileShow({ file }: FileShowPageProps) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: 'Copied!',
                description: `${label} copied to clipboard`,
                variant: 'default',
            });
        } catch (error) {
            toast({
                title: 'Copy failed',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async () => {
        if (!file.can_delete || !file.delete_token) {
            toast({
                title: 'Cannot delete',
                description: 'You do not have permission to delete this file',
                variant: 'destructive',
            });
            return;
        }

        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        try {
            const response = await fetch(`/api/file/${file.file_id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Delete-Token': file.delete_token,
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: 'File deleted',
                    description: 'The file has been permanently deleted',
                    variant: 'default',
                });
                // Redirect to home page after successful deletion
                window.location.href = '/';
            } else {
                throw new Error(result.error?.message || 'Failed to delete file');
            }
        } catch (error) {
            toast({
                title: 'Delete failed',
                description: error instanceof Error ? error.message : 'Failed to delete file',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
        if (mimeType.includes('text/') || mimeType.includes('json') || mimeType.includes('xml')) return '📝';
        return '📁';
    };

    const isPreviewable = (mimeType: string) => {
        const previewableMimes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'application/pdf',
            'text/plain',
            'text/html',
            'text/css',
            'text/javascript',
            'application/json',
            'application/xml',
            'text/xml',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
        ];
        return previewableMimes.includes(mimeType);
    };

    const generateQRCode = (url: string) => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    };

    if (file.is_expired) {
        return (
            <>
                <Head title="File Not Found" />
                <div className="flex min-h-screen items-center justify-center bg-background p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <CardTitle className="text-destructive">File Expired</CardTitle>
                            <CardDescription>This file has expired and is no longer available for download.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-center">
                            <Link href="/">
                                <Button>Upload New File</Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${file.original_name} - File Info`} />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <header className="border-b border-border bg-card">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="bg-gradient-primary bg-clip-text text-2xl font-bold text-transparent">
                                FastFile
                            </Link>
                            <Link href="/">
                                <Button variant="outline">Upload New File</Button>
                            </Link>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="container mx-auto px-4 py-8">
                    <div className="mx-auto max-w-4xl space-y-6">
                        {/* File Header */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-4xl">{getFileIcon(file.mime_type)}</div>
                                        <div>
                                            <CardTitle className="text-2xl break-all">{file.original_name}</CardTitle>
                                            <CardDescription className="mt-2 flex items-center space-x-4">
                                                <span className="flex items-center space-x-1">
                                                    <HardDrive className="h-4 w-4" />
                                                    <span>{file.human_file_size}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <FileText className="h-4 w-4" />
                                                    <span>{file.mime_type}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{formatDate(file.created_at)}</span>
                                                </span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {file.expires_at && (
                                        <Badge
                                            variant={
                                                new Date(file.expires_at) < new Date(Date.now() + 24 * 60 * 60 * 1000) ? 'destructive' : 'secondary'
                                            }
                                        >
                                            <Clock className="mr-1 h-3 w-3" />
                                            Expires {formatDate(file.expires_at)}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Download Button */}
                            <Card
                                className="cursor-pointer transition-shadow hover:shadow-lg"
                                onClick={() => window.open(file.download_url, '_blank')}
                            >
                                <CardContent className="p-6 text-center">
                                    <Download className="mx-auto mb-2 h-8 w-8 text-primary" />
                                    <h3 className="font-semibold">Download</h3>
                                    <p className="text-sm text-muted-foreground">Download file</p>
                                </CardContent>
                            </Card>

                            {/* Preview Button */}
                            {isPreviewable(file.mime_type) && file.preview_url && (
                                <Card
                                    className="cursor-pointer transition-shadow hover:shadow-lg"
                                    onClick={() => window.open(file.preview_url, '_blank')}
                                >
                                    <CardContent className="p-6 text-center">
                                        <Eye className="mx-auto mb-2 h-8 w-8 text-primary" />
                                        <h3 className="font-semibold">Preview</h3>
                                        <p className="text-sm text-muted-foreground">View in browser</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Copy Link Button */}
                            <Card
                                className="cursor-pointer transition-shadow hover:shadow-lg"
                                onClick={() => copyToClipboard(file.download_url, 'Download link')}
                            >
                                <CardContent className="p-6 text-center">
                                    <Copy className="mx-auto mb-2 h-8 w-8 text-primary" />
                                    <h3 className="font-semibold">Copy Link</h3>
                                    <p className="text-sm text-muted-foreground">Copy download URL</p>
                                </CardContent>
                            </Card>

                            {/* QR Code Button */}
                            <Card className="cursor-pointer transition-shadow hover:shadow-lg" onClick={() => setShowQR(!showQR)}>
                                <CardContent className="p-6 text-center">
                                    <QrCode className="mx-auto mb-2 h-8 w-8 text-primary" />
                                    <h3 className="font-semibold">QR Code</h3>
                                    <p className="text-sm text-muted-foreground">Share via QR</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* QR Code Display */}
                        {showQR && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <QrCode className="h-5 w-5" />
                                        <span>QR Code</span>
                                    </CardTitle>
                                    <CardDescription>Scan this QR code to download the file on mobile devices</CardDescription>
                                </CardHeader>
                                <CardContent className="text-center">
                                    <img
                                        src={generateQRCode(file.download_url)}
                                        alt="QR Code for file download"
                                        className="mx-auto rounded-lg border"
                                    />
                                    <p className="mt-4 text-sm break-all text-muted-foreground">{file.download_url}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* File Details */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* File Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>File Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">File ID:</span>
                                        <span className="font-mono text-sm break-all">{file.file_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Size:</span>
                                        <span>
                                            {file.human_file_size} ({file.file_size.toLocaleString()} bytes)
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type:</span>
                                        <span>{file.mime_type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Uploaded:</span>
                                        <span>{formatDate(file.created_at)}</span>
                                    </div>
                                    {file.expires_at && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Expires:</span>
                                            <span>{formatDate(file.expires_at)}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Share Options */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2">
                                        <Share2 className="h-5 w-5" />
                                        <span>Share Options</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Download URL</label>
                                        <div className="mt-1 flex">
                                            <input
                                                type="text"
                                                value={file.download_url}
                                                readOnly
                                                className="flex-1 rounded-l-md border border-border bg-muted px-3 py-2 text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-l-none"
                                                onClick={() => copyToClipboard(file.download_url, 'Download URL')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Info Page URL</label>
                                        <div className="mt-1 flex">
                                            <input
                                                type="text"
                                                value={file.info_url}
                                                readOnly
                                                className="flex-1 rounded-l-md border border-border bg-muted px-3 py-2 text-sm"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-l-none"
                                                onClick={() => copyToClipboard(file.info_url, 'Info page URL')}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Social Share Buttons */}
                                    <div className="border-t pt-4">
                                        <p className="mb-3 text-sm font-medium text-muted-foreground">Share on social media</p>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    window.open(
                                                        `https://twitter.com/intent/tweet?text=Check out this file: ${encodeURIComponent(file.original_name)}&url=${encodeURIComponent(file.download_url)}`,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                Twitter
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    window.open(
                                                        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(file.download_url)}`,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                Facebook
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    window.open(
                                                        `https://wa.me/?text=${encodeURIComponent(`Check out this file: ${file.original_name} ${file.download_url}`)}`,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                WhatsApp
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Delete Section */}
                        {file.can_delete && (
                            <Card className="border-destructive/20">
                                <CardHeader>
                                    <CardTitle className="flex items-center space-x-2 text-destructive">
                                        <Trash2 className="h-5 w-5" />
                                        <span>Delete File</span>
                                    </CardTitle>
                                    <CardDescription>Permanently delete this file. This action cannot be undone.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto">
                                        {isDeleting ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete File
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-16 border-t border-border bg-card">
                    <div className="container mx-auto px-4 py-8">
                        <div className="text-center text-muted-foreground">
                            <p>&copy; 2024 FastFile. Fast, private, and secure file hosting.</p>
                            <div className="mt-4 flex justify-center space-x-4">
                                <Link href="/privacy" className="hover:text-foreground">
                                    Privacy Policy
                                </Link>
                                <Link href="/terms" className="hover:text-foreground">
                                    Terms of Service
                                </Link>
                                <Link href="/api-docs" className="hover:text-foreground">
                                    API Documentation
                                </Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
