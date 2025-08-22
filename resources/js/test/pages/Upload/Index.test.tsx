import UploadIndex from '@/pages/Upload/Index';
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

// Mock Inertia Head component
vi.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
}));

// Mock FileUploader component
vi.mock('@/components/FileUploader', () => ({
    default: vi.fn(),
}));

// Mock Layout component
vi.mock('@/components/Layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe('UploadIndex', () => {
    const user = userEvent.setup();

    beforeEach(() => {
        mockToast.mockClear();
        mockFileUploader.mockImplementation(({ onUploadStart, onUploadComplete, onUploadError, ...props }) => (
            <div data-testid="file-uploader" {...props}>
                <button onClick={() => onUploadStart?.([new File(['test'], 'test.txt')])} data-testid="mock-upload-start">
                    Start Upload
                </button>
                <button onClick={() => onUploadComplete?.(['test-file-id'])} data-testid="mock-upload-complete">
                    Complete Upload
                </button>
                <button onClick={() => onUploadError?.('Upload failed')} data-testid="mock-upload-error">
                    Upload Error
                </button>
            </div>
        ));

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                origin: 'https://example.com',
            },
            writable: true,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the main upload interface', () => {
        render(<UploadIndex />);

        expect(screen.getByText('Fucking Fast File Hosting')).toBeInTheDocument();
        expect(screen.getByText(/Upload files up to 10GB instantly/)).toBeInTheDocument();
        expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
    });

    it('renders feature showcase section', () => {
        render(<UploadIndex />);

        expect(screen.getByText('Why Choose FuckingFast?')).toBeInTheDocument();
        expect(screen.getByText('Blazing Speed')).toBeInTheDocument();
        expect(screen.getByText('Complete Privacy')).toBeInTheDocument();
        expect(screen.getByText('Radical Simplicity')).toBeInTheDocument();
    });

    it('displays speed feature details', () => {
        render(<UploadIndex />);

        expect(screen.getByText(/No speed limits, no throttling/)).toBeInTheDocument();
        expect(screen.getByText('Upload Speed:')).toBeInTheDocument();
        expect(screen.getByText('Download Speed:')).toBeInTheDocument();
        expect(screen.getByText('Max File Size:')).toBeInTheDocument();
        expect(screen.getByText('10GB')).toBeInTheDocument();
    });

    it('displays privacy feature details', () => {
        render(<UploadIndex />);

        expect(screen.getByText(/Zero tracking, no IP logging/)).toBeInTheDocument();
        expect(screen.getByText('IP Logging:')).toBeInTheDocument();
        expect(screen.getByText('User Tracking:')).toBeInTheDocument();
        expect(screen.getByText('Analytics:')).toBeInTheDocument();
        expect(screen.getAllByText('None')).toHaveLength(3);
    });

    it('displays simplicity feature details', () => {
        render(<UploadIndex />);

        expect(screen.getByText(/No registration, no accounts/)).toBeInTheDocument();
        expect(screen.getByText('Registration:')).toBeInTheDocument();
        expect(screen.getByText('Not Required')).toBeInTheDocument();
        expect(screen.getByText('Setup Time:')).toBeInTheDocument();
        expect(screen.getByText('0 seconds')).toBeInTheDocument();
    });

    it('renders API documentation section', () => {
        render(<UploadIndex />);

        expect(screen.getByText('Developer API')).toBeInTheDocument();
        expect(screen.getByText('Upload via curl')).toBeInTheDocument();
        expect(screen.getByText('Download Files')).toBeInTheDocument();
        expect(screen.getByText('View Full API Documentation')).toBeInTheDocument();
    });

    it('displays curl upload example with correct URL', () => {
        render(<UploadIndex />);

        const codeElement = screen.getByText(/curl -X POST/);
        expect(codeElement).toBeInTheDocument();
        expect(codeElement.textContent).toContain('https://example.com/api/upload');
    });

    it('displays curl download example with correct URL', () => {
        render(<UploadIndex />);

        const codeElement = screen.getByText(/curl -O/);
        expect(codeElement).toBeInTheDocument();
        expect(codeElement.textContent).toContain('https://example.com/f/[file_id]');
    });

    it('handles upload start correctly', async () => {
        render(<UploadIndex />);

        const startButton = screen.getByTestId('mock-upload-start');
        await user.click(startButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Upload Started',
            description: 'Starting upload of 1 file(s)',
        });
    });

    it('handles upload completion correctly', async () => {
        render(<UploadIndex />);

        const completeButton = screen.getByTestId('mock-upload-complete');
        await user.click(completeButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Upload Complete',
            description: 'Successfully uploaded 1 file(s)',
            variant: 'default',
        });
    });

    it('handles upload error correctly', async () => {
        render(<UploadIndex />);

        const errorButton = screen.getByTestId('mock-upload-error');
        await user.click(errorButton);

        expect(mockToast).toHaveBeenCalledWith({
            title: 'Upload Failed',
            description: 'Upload failed',
            variant: 'destructive',
        });
    });

    it('shows recent uploads section after successful upload', async () => {
        render(<UploadIndex />);

        // Initially no recent uploads section
        expect(screen.queryByText('Your Recent Uploads')).not.toBeInTheDocument();

        // Complete an upload
        const completeButton = screen.getByTestId('mock-upload-complete');
        await user.click(completeButton);

        // Recent uploads section should appear
        await waitFor(() => {
            expect(screen.getByText('Your Recent Uploads')).toBeInTheDocument();
        });

        expect(screen.getByText('File ID: test-file-id')).toBeInTheDocument();
        expect(screen.getByText(/Download URL: https:\/\/example\.com\/f\/test-file-id/)).toBeInTheDocument();
        expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('accumulates multiple uploaded files', async () => {
        render(<UploadIndex />);

        const completeButton = screen.getByTestId('mock-upload-complete');

        // Upload first file
        await user.click(completeButton);

        // Mock second upload with different file ID
        mockFileUploader.mockImplementation(({ onUploadComplete, ...props }) => (
            <div data-testid="file-uploader" {...props}>
                <button onClick={() => onUploadComplete?.(['second-file-id'])} data-testid="mock-upload-complete">
                    Complete Upload
                </button>
            </div>
        ));

        // Re-render to get updated mock
        render(<UploadIndex />);

        // Upload second file
        const secondCompleteButton = screen.getByTestId('mock-upload-complete');
        await user.click(secondCompleteButton);

        await waitFor(() => {
            expect(screen.getByText('File ID: second-file-id')).toBeInTheDocument();
        });
    });

    it('passes correct props to FileUploader', () => {
        render(<UploadIndex />);

        expect(mockFileUploader).toHaveBeenCalledWith(
            expect.objectContaining({
                maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
                multiple: true,
                className: 'mx-auto max-w-4xl',
                onUploadStart: expect.any(Function),
                onUploadComplete: expect.any(Function),
                onUploadError: expect.any(Function),
            }),
            {},
        );
    });

    it('renders with correct page title', () => {
        render(<UploadIndex />);

        expect(document.title).toBe('Upload Files - FuckingFast');
    });

    it('renders within Layout component', () => {
        render(<UploadIndex />);

        expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    it('has proper responsive classes', () => {
        render(<UploadIndex />);

        const heroTitle = screen.getByText('Fucking Fast File Hosting');
        expect(heroTitle).toHaveClass('text-4xl', 'md:text-6xl');

        const heroDescription = screen.getByText(/Upload files up to 10GB instantly/);
        expect(heroDescription).toHaveClass('text-lg', 'md:text-xl');
    });

    it('displays gradient text styling', () => {
        render(<UploadIndex />);

        const gradientText = screen.getByText('Fucking Fast');
        expect(gradientText).toHaveClass('gradient-primary-text');
    });

    it('has proper feature card layout', () => {
        render(<UploadIndex />);

        const featureGrid = screen.getByText('Blazing Speed').closest('.grid');
        expect(featureGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });

    it('has proper API section layout', () => {
        render(<UploadIndex />);

        const apiGrid = screen.getByText('Upload via curl').closest('.grid');
        expect(apiGrid).toHaveClass('grid-cols-1', 'lg:grid-cols-2');
    });
});
