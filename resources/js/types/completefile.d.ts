interface CompletedFile {
    fileId: string;
    originalName: string;
    downloadUrl: string;
    previewUrl?: string;
    fileSize: number;
    mimeType: string;
    isDuplicate?: boolean;
    spaceSaved?: number;
}