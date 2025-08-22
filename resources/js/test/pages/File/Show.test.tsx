import FileShow from '@/pages/File/Show';
import { FileInfo } from '@/types/file';
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

// Mock Inertia components
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

// Mock FileInfo component
const mockFileInfo = vi.fn();
vi.mock('@/components/FileInfo', () => ({
    default: mockFileInfo,
}));

// Mock Layout component
vi.mock('@/components/Layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe('FileShow', () => {
    const user = userEvent.setup();
    let mockFile: FileInfo;

    beforeEach(() => {
        mockToast.mockClear();
        mockFileInfo.mockImplementation(({ file, onDownload, onPreview, ...props }) => (
            <div data-testid="file-info" {...props}>
                <div>File: {file.original_name}</div>
                <button onClick={() => onDownload?.(file.file_id)} data-testid="file-info-download">
                    Download from FileInfo
                </button>
                <button onClick={() => onPreview?.(file.file_id)} data-testid="file-info-preview">
                    Preview from FileInfo
                </button>
            </div>
        ));

        mockFile = {
            file_id: 'test-file-id-123',
            original_name: 'test-document.pdf',
            file_path: '/storage/files/test-file-id-123',
            mime_type: 'application/pdf',
            file_size: 1048576,
            human_file_size: '1 MB',
            checksum: 'abc123def456',
            download_url: 'https://example.com/f/test-file-id-123',
            preview_url: 'https://example.com/p/test-file-id-123',
            created_at: '2024-01-15T10:30:00Z',
            expires_at: '2024-02-15T10:30:00Z',
            is_expired: false,
        };

        // Mock navigator.share
        Object.defineProperty(navigator, 'share', {
            value: vi.fn().mockResolvedValue(undefined),
            writable: true,
        });

        // Mock navigator.clipboard
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

    it('renders file information when file exists', () => {
        render(<FileShow file={mockFile} />);

        expect(screen.getByText('test-document.pdf - FuckingFast')).toBeInTheDocument();
        expect(screen.getByText('Back to Upload')).toBeInTheDocument();
        expect(screen.getByText('Download')).toBeInTheDocument();
        expect(screen.getByText('Share')).toBeInTheDocument();
        expect(screen.getByTestId('file-info')).toBeInTheDocument();
    });

    it('renders error state when file not found', () => {
        render(<FileShow file={null as any} error="File not found" />);

        expect(screen.getByText('File Not Found - FuckingFast')).toBeInTheDocument();
        expect(screen.getByText('File Not Found')).toBeInTheDocument();
        expect(screen.getByText('File not found')).toBeInTheDocument();
        expect(screen.getByText('Upload New File')).toBeInTheDocument();
    });

    it('renders expired file state', () => {
        const expiredFile = { ...mockFile, is_expired: true };
        render(<FileShow file={expiredFile} />);

        expect(screen.getByText('File Expired')).toBeInTheDocument();
        expect(screen.getByText('This file has expired and is no longer available for download.')).toBeInTheDocument();
        expect(screen.getByText('Upload New File')).toBeInTheDocument();
    });

    it('renders loading state when no file data', () => {
        render(<FileShow file={null as any} />);

        expect(screen.getByText('Loading... - FuckingFast')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    it('handles download button click', async () => {
        render(<FileShow file={mockFile} />);

        const downloadButton = screen.getByText('Download');
        await user.click(downloadButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Download Started',
            description: 'Your file download has begun',
            variant: 'default',
        });
    });

    it('handles download from FileInfo component', async () => {
        render(<FileShow file={mockFile} />);

        const fileInfoDownload = screen.getByTestId('file-info-download');
        await user.click(fileInfoDownload);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Download Started',
            description: 'Your file download has begun',
            variant: 'default',
        });
    });

    it('handles preview from FileInfo component', async () => {
        render(<FileShow file={mockFile} />);

        const fileInfoPreview = screen.getByTestId('file-info-preview');
        await user.click(fileInfoPreview);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Opening Preview',
            description: 'Opening file preview in new tab',
            variant: 'default',
        });
    });

    it('handles share with native Web Share API', async () => {
        render(<FileShow file={mockFile} />);

        const shareButton = screen.getByText('Share');
        await user.click(shareButton);

        expect(navigator.share).toHaveBeenCalledWith({
            title: 'Download test-document.pdf',
            text: 'Download test-document.pdf from FuckingFast',
            url: mockFile.download_url,
        });

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Shared Successfully',
            description: 'File link shared',
            variant: 'default',
        });
    });

    it('falls back to clipboard when Web Share API fails', async () => {
        // Mock navigator.share to fail
        Object.defineProperty(navigator, 'share', {
            value: vi.fn().mockRejectedValue(new Error('Share failed')),
            writable: true,
        });

        render(<FileShow file={mockFile} />);

        const shareButton = screen.getByText('Share');
        await user.click(shareButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockFile.download_url);
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Link Copied',
            description: 'Download link copied to clipboard',
            variant: 'default',
        });
    });

    it('falls back to clipboard when Web Share API not available', async () => {
        // Mock navigator.share as undefined
        Object.defineProperty(navigator, 'share', {
            value: undefined,
            writable: true,
        });

        render(<FileShow file={mockFile} />);

        const shareButton = screen.getByText('Share');
        await user.click(shareButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockFile.download_url);
        expect(mockToast).toHaveBeenCalledWith({
            title: 'Link Copied',
            description: 'Download link copied to clipboard',
            variant: 'default',
        });
    });

    it('handles clipboard failure gracefully', async () => {
        // Mock both share and clipboard to fail
        Object.defineProperty(navigator, 'share', {
            value: undefined,
            writable: true,
        });
        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: vi.fn().mockRejectedValue(new Error('Clipboard failed')),
            },
            writable: true,
        });

        render(<FileShow file={mockFile} />);

        const shareButton = screen.getByText('Share');
        await user.click(shareButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Share Failed',
            description: 'Failed to copy link to clipboard',
            variant: 'destructive',
        });
    });

    it('shows download button as disabled while downloading', async () => {
        render(<FileShow file={mockFile} />);

        const downloadButton = screen.getByText('Download');
        await user.click(downloadButton);

        // Button should show "Downloading..." and be disabled
        await waitFor(() => {
            expect(screen.getByText('Downloading...')).toBeInTheDocument();
        });
    });

    it('passes correct props to FileInfo component', () => {
        render(<FileShow file={mockFile} />);

        expect(mockFileInfo).toHaveBeenCalledWith(
            expect.objectContaining({
                file: mockFile,
                showPreview: true,
                showQRCode: true,
                onDownload: expect.any(Function),
                onPreview: expect.any(Function),
                className: 'space-y-6',
            }),
            {},
        );
    });

    it('renders mobile quick actions section', () => {
        render(<FileShow file={mockFile} />);

        expect(screen.getByText('Quick Actions')).toBeInTheDocument();

        // Should have mobile-specific buttons
        const mobileButtons = screen.getAllByText('Download');
        expect(mobileButtons.length).toBeGreaterThan(1); // One in header, one in mobile section
    });

    it('renders privacy notice section', () => {
        render(<FileShow file={mockFile} />);

        expect(screen.getByText('Privacy & Security')).toBeInTheDocument();
        expect(screen.getByText(/This file is secured with a cryptographic ID/)).toBeInTheDocument();
        expect(screen.getByText(/No personal information or IP addresses are logged/)).toBeInTheDocument();
        expect(screen.getByText(/Files are automatically deleted after expiration/)).toBeInTheDocument();
        expect(screen.getByText(/Share this link only with people you trust/)).toBeInTheDocument();
    });

    it('renders upload another file CTA', () => {
        render(<FileShow file={mockFile} />);

        expect(screen.getByText('Need to upload another file?')).toBeInTheDocument();
        expect(screen.getByText('Upload files up to 10GB with zero registration and complete privacy.')).toBeInTheDocument();
        expect(screen.getByText('Upload New File')).toBeInTheDocument();
    });

    it('has correct back to upload link', () => {
        render(<FileShow file={mockFile} />);

        const backLinks = screen.getAllByText('Back to Upload');
        backLinks.forEach((link) => {
            expect(link.closest('a')).toHaveAttribute('href', '/');
        });
    });

    it('has correct upload new file links', () => {
        render(<FileShow file={mockFile} />);

        const uploadLinks = screen.getAllByText('Upload New File');
        uploadLinks.forEach((link) => {
            expect(link.closest('a')).toHaveAttribute('href', '/');
        });
    });

    it('renders with correct page title for valid file', () => {
        render(<FileShow file={mockFile} />);

        expect(document.title).toBe('test-document.pdf - FuckingFast');
    });

    it('renders with correct page title for error state', () => {
        render(<FileShow file={null as any} error="File not found" />);

        expect(document.title).toBe('File Not Found - FuckingFast');
    });

    it('renders with correct page title for loading state', () => {
        render(<FileShow file={null as any} />);

        expect(document.title).toBe('Loading... - FuckingFast');
    });

    it('shows preview button in mobile actions when preview URL exists', () => {
        render(<FileShow file={mockFile} />);

        const previewButtons = screen.getAllByText('Preview');
        expect(previewButtons.length).toBeGreaterThan(0);
    });

    it('handles mobile preview button click', async () => {
        render(<FileShow file={mockFile} />);

        // Find preview button in mobile section
        const mobilePreviewButton = screen.getAllByText('Preview').find((button) => button.closest('.grid')?.classList.contains('grid-cols-2'));

        if (mobilePreviewButton) {
            await user.click(mobilePreviewButton);
            expect(global.open).toHaveBeenCalledWith(mockFile.preview_url, '_blank');
        }
    });

    it('handles mobile copy link button click', async () => {
        render(<FileShow file={mockFile} />);

        const copyLinkButton = screen.getByText('Copy Link');
        await user.click(copyLinkButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockFile.download_url);
    });

    it('shows expired file notice in error state', () => {
        const expiredFile = { ...mockFile, is_expired: true };
        render(<FileShow file={expiredFile} />);

        expect(screen.getByText(/Files are automatically deleted after their expiration date/)).toBeInTheDocument();
    });
});
