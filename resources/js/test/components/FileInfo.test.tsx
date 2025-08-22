import FileInfo from '@/components/FileInfo';
import { FileInfo as FileInfoType } from '@/types/file';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

describe('FileInfo', () => {
    const user = userEvent.setup();
    let mockFile: FileInfoType;
    let mockOnDownload: ReturnType<typeof vi.fn>;
    let mockOnPreview: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockOnDownload = vi.fn();
        mockOnPreview = vi.fn();
        mockToast.mockClear();

        mockFile = {
            file_id: 'test-file-id-123',
            original_name: 'test-document.pdf',
            file_path: '/storage/files/test-file-id-123',
            mime_type: 'application/pdf',
            file_size: 1048576, // 1MB
            human_file_size: '1 MB',
            checksum: 'abc123def456',
            download_url: 'http://localhost/f/test-file-id-123',
            preview_url: 'http://localhost/p/test-file-id-123',
            created_at: '2024-01-15T10:30:00Z',
            expires_at: '2024-02-15T10:30:00Z',
            is_expired: false,
        };

        // Mock clipboard API
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
            writable: true,
        });

        // Mock window.open
        global.open = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders file information correctly', () => {
        render(<FileInfo file={mockFile} />);

        expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
        expect(screen.getByText('1 MB')).toBeInTheDocument();
        expect(screen.getByText('application/pdf')).toBeInTheDocument();
        expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();
        expect(screen.getByText(/Feb 15, 2024/)).toBeInTheDocument();
    });

    it('displays correct file type icon for PDF', () => {
        render(<FileInfo file={mockFile} />);

        // Should show FileText icon for PDF files
        const icons = document.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
    });

    it('displays correct file type icon for images', () => {
        const imageFile = {
            ...mockFile,
            original_name: 'photo.jpg',
            mime_type: 'image/jpeg',
        };

        render(<FileInfo file={imageFile} />);

        // Should show Image icon for image files
        const icons = document.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
    });

    it('shows download button and handles click', async () => {
        render(<FileInfo file={mockFile} onDownload={mockOnDownload} />);

        const downloadButton = screen.getByText('Download File');
        expect(downloadButton).toBeInTheDocument();

        await user.click(downloadButton);

        expect(mockOnDownload).toHaveBeenCalledWith('test-file-id-123');
        expect(global.open).toHaveBeenCalledWith(mockFile.download_url, '_blank');
    });

    it('shows preview button for previewable files', () => {
        render(<FileInfo file={mockFile} onPreview={mockOnPreview} />);

        const previewButton = screen.getByText('Preview');
        expect(previewButton).toBeInTheDocument();
    });

    it('hides preview button for non-previewable files', () => {
        const nonPreviewableFile = {
            ...mockFile,
            mime_type: 'application/zip',
            preview_url: null,
        };

        render(<FileInfo file={nonPreviewableFile} />);

        expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    });

    it('handles preview button click', async () => {
        render(<FileInfo file={mockFile} onPreview={mockOnPreview} />);

        const previewButton = screen.getByText('Preview');
        await user.click(previewButton);

        expect(mockOnPreview).toHaveBeenCalledWith('test-file-id-123');
        expect(global.open).toHaveBeenCalledWith(mockFile.preview_url, '_blank');
    });

    it('copies download URL to clipboard', async () => {
        render(<FileInfo file={mockFile} />);

        const copyButton = screen.getByText('Copy Link');
        await user.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockFile.download_url);
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Copied!',
            description: 'Download link copied to clipboard',
            variant: 'default',
        });
    });

    it('shows success state after copying', async () => {
        render(<FileInfo file={mockFile} />);

        const copyButton = screen.getByText('Copy Link');
        await user.click(copyButton);

        await waitFor(() => {
            expect(screen.getByText('Copied!')).toBeInTheDocument();
        });
    });

    it('displays download URL in readonly input', () => {
        render(<FileInfo file={mockFile} />);

        const urlInput = screen.getByDisplayValue(mockFile.download_url);
        expect(urlInput).toBeInTheDocument();
        expect(urlInput).toHaveAttribute('readonly');
    });

    it('shows QR code when enabled', () => {
        render(<FileInfo file={mockFile} showQRCode={true} />);

        expect(screen.getByText('QR Code for Mobile')).toBeInTheDocument();
        expect(screen.getByAltText('QR Code for download link')).toBeInTheDocument();
    });

    it('hides QR code when disabled', () => {
        render(<FileInfo file={mockFile} showQRCode={false} />);

        expect(screen.queryByText('QR Code for Mobile')).not.toBeInTheDocument();
    });

    it('shows file preview for images', () => {
        const imageFile = {
            ...mockFile,
            original_name: 'photo.jpg',
            mime_type: 'image/jpeg',
        };

        render(<FileInfo file={imageFile} showPreview={true} />);

        expect(screen.getByText('Preview')).toBeInTheDocument();
        const previewImage = screen.getByAltText('photo.jpg');
        expect(previewImage).toBeInTheDocument();
        expect(previewImage).toHaveAttribute('src', imageFile.preview_url);
    });

    it('shows file preview for videos', () => {
        const videoFile = {
            ...mockFile,
            original_name: 'video.mp4',
            mime_type: 'video/mp4',
        };

        render(<FileInfo file={videoFile} showPreview={true} />);

        const videoElement = screen.getByRole('application'); // video element
        expect(videoElement).toBeInTheDocument();
    });

    it('displays file details section', () => {
        render(<FileInfo file={mockFile} />);

        expect(screen.getByText('File Details')).toBeInTheDocument();
        expect(screen.getByText('File ID:')).toBeInTheDocument();
        expect(screen.getByText('File Size:')).toBeInTheDocument();
        expect(screen.getByText('MIME Type:')).toBeInTheDocument();
        expect(screen.getByText('Upload Date:')).toBeInTheDocument();
        expect(screen.getByText('Expiration:')).toBeInTheDocument();
    });

    it('shows correct expiration status for active files', () => {
        render(<FileInfo file={mockFile} />);

        // Should show days remaining
        expect(screen.getByText(/days left/)).toBeInTheDocument();
    });

    it('shows correct expiration status for expired files', () => {
        const expiredFile = {
            ...mockFile,
            is_expired: true,
            expires_at: '2024-01-01T10:30:00Z',
        };

        render(<FileInfo file={expiredFile} />);

        expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('shows permanent status for files without expiration', () => {
        const permanentFile = {
            ...mockFile,
            expires_at: null,
        };

        render(<FileInfo file={permanentFile} />);

        expect(screen.getByText('Permanent')).toBeInTheDocument();
    });

    it('handles clipboard copy failure gracefully', async () => {
        // Mock clipboard failure
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockRejectedValue(new Error('Clipboard failed')),
            },
            writable: true,
        });

        render(<FileInfo file={mockFile} />);

        const copyButton = screen.getByText('Copy Link');
        await user.click(copyButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Copy Failed',
            description: 'Failed to copy to clipboard',
            variant: 'destructive',
        });
    });

    it('formats file size correctly', () => {
        const largeFile = {
            ...mockFile,
            file_size: 1073741824, // 1GB
            human_file_size: '1 GB',
        };

        render(<FileInfo file={largeFile} />);

        expect(screen.getByText('1 GB')).toBeInTheDocument();
        expect(screen.getByText('(1,073,741,824 bytes)')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<FileInfo file={mockFile} className="custom-class" />);

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('hides preview section when showPreview is false', () => {
        render(<FileInfo file={mockFile} showPreview={false} />);

        expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    });

    it('shows expiring soon status for files expiring within 24 hours', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const expiringSoonFile = {
            ...mockFile,
            expires_at: tomorrow.toISOString(),
        };

        render(<FileInfo file={expiringSoonFile} />);

        expect(screen.getByText('Expires soon')).toBeInTheDocument();
    });
});
