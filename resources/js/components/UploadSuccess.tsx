import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { CheckCircle, Copy, Download, ExternalLink, Eye, File, Share2 } from 'lucide-react';
import React, { useState } from 'react';

interface UploadedFile {
    fileId: string;
    originalName: string;
    downloadUrl: string;
    previewUrl?: string;
    infoUrl?: string;
    fileSize: number;
    mimeType: string;
    isDuplicate?: boolean;
    spaceSaved?: number;
    deleteToken?: string;
    expiresAt?: string;
}

interface UploadSuccessProps {
    files: UploadedFile[];
    onNewUpload?: () => void;
    className?: string;
}

const UploadSuccess: React.FC<UploadSuccessProps> = ({ files, onNewUpload, className }) => {
    const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    console.log('UploadSuccess received files:', files);

    // Format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Copy to clipboard
    const copyToClipboard = async (url: string, fileName: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrls((prev) => new Set(prev).add(url));

            toast({
                title: 'Copied!',
                description: `Download link for ${fileName} copied to clipboard`,
                variant: 'default',
            });

            // Reset copied state after 3 seconds
            setTimeout(() => {
                setCopiedUrls((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(url);
                    return newSet;
                });
            }, 3000);
        } catch {
            toast({
                title: 'Copy Failed',
                description: 'Failed to copy to clipboard',
                variant: 'destructive',
            });
        }
    };

    // Share file
    const shareFile = async (file: UploadedFile) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Download ${file.originalName}`,
                    text: `Download ${file.originalName} from Fucking File Hosting`,
                    url: file.downloadUrl,
                });
            } catch {
                // Fallback to clipboard
                await copyToClipboard(file.downloadUrl, file.originalName);
            }
        } else {
            await copyToClipboard(file.downloadUrl, file.originalName);
        }
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

    // Get file icon
    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.startsWith('text/')) return '📄';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
        return '📁';
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Success Header */}
            <Card className="p-6 text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                </div>

                <h2 className="mb-2 text-2xl font-bold">Upload Complete!</h2>
                <p className="text-muted-foreground">
                    {files.length === 1 ? 'Your file has been uploaded successfully' : `All ${files.length} files have been uploaded successfully`}
                </p>
            </Card>

            {/* Files List */}
            <div className="space-y-4">
                {files.map((file) => (
                    <Card key={file.fileId} className="p-6">
                        <div className="space-y-4">
                            {/* File Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex min-w-0 flex-1 items-start space-x-3">
                                    <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-semibold">{file.originalName}</h3>
                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                            <span>{formatFileSize(file.fileSize)}</span>
                                            <span>{file.mimeType}</span>
                                            {file.isDuplicate && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Duplicate - Saved {formatFileSize(file.spaceSaved || 0)}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Download URL */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Direct Download Link:</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={file.downloadUrl}
                                        readOnly
                                        className="min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
                                    />
                                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(file.downloadUrl, file.originalName)}>
                                        {copiedUrls.has(file.downloadUrl) ? (
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {/* Direct Download */}
                                <Button
                                    onClick={() => window.open(file.downloadUrl, '_blank')}
                                    className="flex-1 bg-green-400 shadow-sm hover:bg-green-500 sm:flex-none"
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>

                                {/* Preview */}
                                {canPreview(file.mimeType) && file.previewUrl && (
                                    <Button variant="outline" onClick={() => window.open(file.previewUrl, '_blank')} className="flex-1 sm:flex-none">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Preview
                                    </Button>
                                )}

                                {/* Share */}
                                <Button variant="outline" onClick={() => shareFile(file)} className="flex-1 sm:flex-none">
                                    <Share2 className="mr-2 h-4 w-4" />
                                    Share
                                </Button>

                                {/* File Details Page */}
                                <Button
                                    variant="outline"
                                    onClick={() => window.open(file.infoUrl || `/file/${file.fileId}`, '_blank')}
                                    className="flex-1 sm:flex-none"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    File Info
                                </Button>
                            </div>

                            {/* File Information */}
                            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                    <div className="flex items-start space-x-2">
                                        <Download className="mt-0.5 h-4 w-4 text-black" />
                                        <div>
                                            <p className="font-medium text-black">Download Manager Support</p>
                                            <p className="text-black">Works with IDM, JDownloader, and other download managers.</p>
                                        </div>
                                    </div>
                                </div>

                                {file.expiresAt && (
                                    <div className="rounded-lg bg-red-400 p-3 dark:bg-red-900/20">
                                        <div className="flex items-start space-x-2">
                                            <ExternalLink className="mt-0.5 h-4 w-4 text-black" />
                                            <div>
                                                <p className="font-medium text-black">Expires</p>
                                                {/* <p className="text-red-600">{new Date(file.expiresAt).toLocaleDateString()}</p> */}
                                                <p className="text-black">
                                                    This file will expire on {new Date(file.expiresAt).toLocaleDateString()} at{' '}
                                                    {new Date(file.expiresAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {file.deleteToken && (
                                    <div className="rounded-lg bg-red-50 p-3 sm:col-span-2 dark:bg-red-900/20">
                                        <div className="flex items-start space-x-2">
                                            <ExternalLink className="mt-0.5 h-4 w-4 text-red-600 dark:text-red-400" />
                                            <div>
                                                <p className="font-medium text-red-800 dark:text-red-200">Owner Controls</p>
                                                <p className="text-red-700 dark:text-red-300">
                                                    You can delete this file anytime from the file info page. Keep this link safe!
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Upload Another File */}
            <Card className="p-6 text-center">
                <h3 className="mb-3 text-lg font-semibold">Upload Another File?</h3>
                <p className="mb-4 text-muted-foreground">Upload more files with zero registration and complete privacy.</p>
                <Button onClick={onNewUpload} variant="outline">
                    <File className="mr-2 h-4 w-4" />
                    Upload New File
                </Button>
            </Card>

            {/* Privacy Notice */}
            <Card className="border-muted bg-muted/20 p-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium">🔒 Privacy & Security:</p>
                    <ul className="space-y-1 pl-4">
                        <li>• Files are secured with cryptographic IDs</li>
                        <li>• No IP addresses or personal data logged</li>
                        <li>• Share links only with trusted people</li>
                        <li>• Files auto-delete after expiration</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default UploadSuccess;
