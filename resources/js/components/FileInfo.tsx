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
    Video,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FileInfoProps {
    file: FileInfoType;
    showPreview?: boolean;
    showQRCode?: boolean;
    className?: string;
    onDownload?: (fileId: string) => void;
    onPreview?: (fileId: string) => void;
}

const FileInfo: React.FC<FileInfoProps> = ({ file, showQRCode = true, className, onDownload, onPreview }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (showQRCode && file.download_url) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(file.download_url)}`;
            setQrCodeUrl(qrUrl);
        }
    }, [file.download_url, showQRCode]);

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

    const getFileIcon = (mimeType: string, fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
        if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
        if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
        if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv'].includes(extension || ''))
            return <FileText className="h-5 w-5 text-yellow-500" />;
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) return <Archive className="h-5 w-5 text-orange-500" />;
        return <File className="h-5 w-5 text-gray-500" />;
    };

    const canPreview = (mimeType: string): boolean => {
        return (
            mimeType.startsWith('image/') ||
            mimeType.startsWith('video/') ||
            mimeType.startsWith('audio/') ||
            mimeType === 'application/pdf' ||
            mimeType.startsWith('text/')
        );
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopySuccess(true);
            toast({
                title: 'Copied!',
                description: `${label} copied to clipboard`,
                variant: 'default',
            });
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            toast({
                title: 'Copy Failed',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    const handleDownload = () => {
        onDownload?.(file.file_id);
        window.open(file.download_url, '_blank');
    };

    const handlePreview = () => {
        onPreview?.(file.file_id);
        if (file.preview_url) window.open(file.preview_url, '_blank');
    };

    const getExpirationStatus = () => {
        if (!file.expires_at) return { text: 'Permanent', color: 'bg-green-500' };
        const expirationDate = new Date(file.expires_at);
        const now = new Date();
        const diff = expirationDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));

        if (file.is_expired) return { text: 'Expired', color: 'bg-red-500' };
        if (daysLeft <= 1) return { text: 'Expires Soon', color: 'bg-yellow-500' };
        return { text: `${daysLeft} days left`, color: 'bg-blue-500' };
    };

    const expirationStatus = getExpirationStatus();

    return (
        <div className={cn('space-y-6', className)}>
            {/* File Header */}
            <Card className="p-6 shadow-sm">
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
                                <Badge className={cn('text-white', expirationStatus.color)}>{expirationStatus.text}</Badge>
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
                    <Button onClick={handleDownload} className="w-full" size="lg">
                        <Download className="mr-2 h-4 w-4" />
                        Direct Download
                    </Button>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {canPreview(file.mime_type) && file.preview_url && (
                            <Button onClick={handlePreview} variant="outline">
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                            </Button>
                        )}
                        <Button onClick={() => copyToClipboard(file.download_url, 'Download link')} variant="outline">
                            {copySuccess ? <CheckCircle className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copySuccess ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <Button onClick={() => window.open(file.download_url, '_blank')} variant="outline">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open in New Tab
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Share Link */}
            <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Share Link</h3>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={file.download_url}
                        readOnly
                        placeholder="No download link available"
                        className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm"
                    />
                    <Button onClick={() => copyToClipboard(file.download_url, 'Download link')} variant="outline" size="sm">
                        {copySuccess ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </Card>

            {/* QR Code */}
            {showQRCode && qrCodeUrl && (
                <Card className="p-6 text-center">
                    <h3 className="mb-4 text-lg font-semibold">QR Code for Mobile</h3>
                    <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6">
                        <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48 rounded-md border bg-white" />
                        <p className="text-sm text-muted-foreground">Scan this code to download on mobile.</p>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default FileInfo;
