import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { FileInfo as FileInfoType } from '@/types/file';
import {
    Archive,
    Calendar,
    CheckCircle,
    Clock,
    Copy,
    Download,
    ExternalLink,
    Eye,
    File,
    FileText,
    HardDrive,
    Image,
    Music,
    QrCode,
    Video,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FileInfoProps {
    /** File information object */
    file: FileInfoType;
    /** Whether to show the preview section */
    showPreview?: boolean;
    /** Whether to show QR code */
    showQRCode?: boolean;
    /** Custom className */
    className?: string;
    /** Callback when download is initiated */
    onDownload?: (fileId: string) => void;
    /** Callback when preview is requested */
    onPreview?: (fileId: string) => void;
}

const FileInfo: React.FC<FileInfoProps> = ({ file, showPreview = true, showQRCode = true, className, onDownload, onPreview }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState(false);
    const { toast } = useToast();

    // Generate QR code URL
    useEffect(() => {
        if (showQRCode && file.download_url) {
            // Using QR Server API for QR code generation
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(file.download_url)}`;
            setQrCodeUrl(qrUrl);
        }
    }, [file.download_url, showQRCode]);

    // Format file size
    // const formatFileSize = (bytes: number): string => {
    //     if (bytes === 0) return '0 Bytes';
    //     const k = 1024;
    //     const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    //     const i = Math.floor(Math.log(bytes) / Math.log(k));
    //     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    // };

    // Format date
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Get file type icon
    const getFileIcon = (mimeType: string, fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();

        if (mimeType.startsWith('image/')) {
            return <Image className="h-5 w-5 text-blue-500" />;
        }
        if (mimeType.startsWith('video/')) {
            return <Video className="h-5 w-5 text-purple-500" />;
        }
        if (mimeType.startsWith('audio/')) {
            return <Music className="h-5 w-5 text-green-500" />;
        }
        if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension || '')) {
            return <FileText className="h-5 w-5 text-yellow-500" />;
        }
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
            return <Archive className="h-5 w-5 text-orange-500" />;
        }

        return <File className="h-5 w-5 text-gray-500" />;
    };

    // Check if file can be previewed
    const canPreview = (mimeType: string): boolean => {
        return (
            mimeType.startsWith('image/') ||
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/') ||
            mimeType === 'application/pdf' ||
            mimeType.startsWith('text/')
        );
    };

    // Copy to clipboard functionality
    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            toast({
                title: 'Copied!',
                description: `${label} copied to clipboard`,
                variant: 'default',
            });

            // Reset copy success state after 2 seconds
            setTimeout(() => setCopySuccess(false), 2000);
        } catch  {
            toast({
                title: 'Copy Failed',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    // Handle download
    const handleDownload = () => {
        onDownload?.(file.file_id);
        window.open(file.download_url, '_blank');
    };

    // Handle preview
    const handlePreview = () => {
        onPreview?.(file.file_id);
        if (file.preview_url) {
            window.open(file.preview_url, '_blank');
        }
    };

    // Get expiration status
    const getExpirationStatus = () => {
        if (!file.expires_at) {
            return { status: 'permanent', text: 'Permanent', color: 'bg-green-500' };
        }

        const expirationDate = new Date(file.expires_at);
        const now = new Date();
        const timeDiff = expirationDate.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (file.is_expired) {
            return { status: 'expired', text: 'Expired', color: 'bg-red-500' };
        }

        if (daysDiff <= 1) {
            return { status: 'expiring', text: 'Expires soon', color: 'bg-yellow-500' };
        }

        return { status: 'active', text: `${daysDiff} days left`, color: 'bg-blue-500' };
    };

    const expirationStatus = getExpirationStatus();

    return (
        <div className={cn('space-y-6', className)}>
            {/* File Header */}
            <Card className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-start space-x-4">
                        <div className="flex-shrink-0">{getFileIcon(file.mime_type, file.original_name)}</div>

                        <div className="min-w-0 flex-1">
                            <h2 className="mb-2 truncate text-xl font-semibold">{file.original_name}</h2>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                    <HardDrive className="h-4 w-4" />
                                    <span>{file.human_file_size}</span>
                                </div>

                                <div className="flex items-center space-x-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>{formatDate(file.created_at)}</span>
                                </div>

                                {file.expires_at && (
                                    <div className="flex items-center space-x-1">
                                        <Clock className="h-4 w-4" />
                                        <span>Expires {formatDate(file.expires_at)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex items-center space-x-2">
                                <Badge variant="secondary" className={cn('text-white', expirationStatus.color)}>
                                    {expirationStatus.text}
                                </Badge>

                                <Badge variant="outline">{file.mime_type}</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Action Buttons */}
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Download Options</h3>

                <div className="space-y-4">
                    {/* Primary Download Button */}
                    <Button onClick={handleDownload} className="w-full" size="lg">
                        <Download className="mr-2 h-4 w-4" />
                        Direct Download
                    </Button>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Preview Button */}
                        {canPreview(file.mime_type) && file.preview_url && (
                            <Button onClick={handlePreview} variant="outline" className="w-full">
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                        )}

                        {/* Copy Link Button */}
                        <Button onClick={() => copyToClipboard(file.download_url, 'Download link')} variant="outline" className="w-full">
                            {copySuccess ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copySuccess ? 'Copied!' : 'Copy Link'}
                        </Button>

                        {/* Open in New Tab */}
                        <Button onClick={() => window.open(file.download_url, '_blank')} variant="outline" className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            New Tab
                        </Button>
                    </div>

                    {/* Download Manager Support */}
                    <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <div className="flex items-start space-x-3">
                            <Download className="mt-1 h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <div>
                                <h4 className="font-medium text-blue-800 dark:text-blue-200">Download Manager Support</h4>
                                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                                    This download link is compatible with IDM, JDownloader, Free Download Manager, and other download assistants.
                                    Right-click the download button and select "Copy Link Address" to use with your preferred download manager.
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(file.download_url, 'Download link for IDM')}
                                        className="text-xs"
                                    >
                                        Copy for IDM
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(`idm://${file.download_url}`, '_self')}
                                        className="text-xs"
                                    >
                                        Open in IDM
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Download URL Section */}
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Share Link</h3>

                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <div className="min-w-0 flex-1">
                            <input
                                type="text"
                                value={file.download_url}
                                readOnly
                                aria-label="Download URL for sharing"
                                className="w-full rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
                            />
                        </div>
                        <Button onClick={() => copyToClipboard(file.download_url, 'Download link')} variant="outline" size="sm">
                            {copySuccess ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Direct download link - no registration required</span>
                        <Button onClick={() => window.open(file.download_url, '_blank')} variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* QR Code Section */}
            {showQRCode && qrCodeUrl && (
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">QR Code for Mobile</h3>

                    <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
                        <div className="flex-shrink-0">
                            <div className="rounded-lg border bg-white p-4">
                                <img src={qrCodeUrl} alt="QR Code for download link" className="h-48 w-48" />
                            </div>
                        </div>

                        <div className="flex-1 text-center sm:text-left">
                            <p className="mb-4 text-muted-foreground">
                                Scan this QR code with your mobile device to quickly access the download link.
                            </p>

                            <Button onClick={() => copyToClipboard(file.download_url, 'Download link')} variant="outline" size="sm">
                                <QrCode className="mr-2 h-4 w-4" />
                                Copy Link for QR
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* File Preview Section */}
            {showPreview && canPreview(file.mime_type) && file.preview_url && (
                <Card className="p-6">
                    <h3 className="mb-4 text-lg font-semibold">Preview</h3>

                    <div className="overflow-hidden rounded-lg border bg-muted/50">
                        {file.mime_type.startsWith('image/') && (
                            <img src={file.preview_url} alt={file.original_name} className="h-auto max-h-96 w-full object-contain" loading="lazy" />
                        )}

                        {file.mime_type.startsWith('video/') && (
                            <video src={file.preview_url} controls className="h-auto max-h-96 w-full" preload="metadata">
                                Your browser does not support video playback.
                            </video>
                        )}

                        {file.mime_type.startsWith('audio/') && (
                            <div className="p-8 text-center">
                                <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <audio src={file.preview_url} controls className="mx-auto w-full max-w-md" preload="metadata">
                                    Your browser does not support audio playback.
                                </audio>
                            </div>
                        )}

                        {file.mime_type === 'application/pdf' && (
                            <div className="p-8 text-center">
                                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                                <p className="mb-4 text-muted-foreground">PDF Preview</p>
                                <Button onClick={() => window.open(file.preview_url, '_blank')} variant="outline">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open PDF
                                </Button>
                            </div>
                        )}

                        {file.mime_type.startsWith('text/') && (
                            <div className="p-4">
                                <iframe src={file.preview_url} className="h-64 w-full border-0" title={`Preview of ${file.original_name}`} />
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* File Details */}
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">File Details</h3>

                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                        <span className="font-medium text-muted-foreground">File ID:</span>
                        <p className="mt-1 font-mono text-xs break-all">{file.file_id}</p>
                    </div>

                    <div>
                        <span className="font-medium text-muted-foreground">File Size:</span>
                        <p className="mt-1">
                            {file.human_file_size} ({file.file_size.toLocaleString()} bytes)
                        </p>
                    </div>

                    <div>
                        <span className="font-medium text-muted-foreground">MIME Type:</span>
                        <p className="mt-1">{file.mime_type}</p>
                    </div>

                    <div>
                        <span className="font-medium text-muted-foreground">Upload Date:</span>
                        <p className="mt-1">{formatDate(file.created_at)}</p>
                    </div>

                    {file.expires_at && (
                        <div>
                            <span className="font-medium text-muted-foreground">Expiration:</span>
                            <p className="mt-1">{formatDate(file.expires_at)}</p>
                        </div>
                    )}

                    <div>
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <p className="mt-1">
                            <Badge variant="secondary" className={cn('text-white', expirationStatus.color)}>
                                {expirationStatus.text}
                            </Badge>
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default FileInfo;
