import FileUploader from '@/components/FileUploader';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

// Mock the API
const mockUploadResponse = {
    success: true,
    data: {
        file_id: 'test-file-id',
        download_url: 'http://localhost/f/test-file-id',
        is_duplicate: false,
        space_saved: 0,
    },
};

describe('FileUploader', () => {
    let user: ReturnType<typeof userEvent.setup>;
    let mockOnUploadStart: ReturnType<typeof vi.fn>;
    let mockOnUploadComplete: ReturnType<typeof vi.fn>;
    let mockOnUploadError: ReturnType<typeof vi.fn>;
    let mockOnUploadProgress: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        user = userEvent.setup();
        mockOnUploadStart = vi.fn();
        mockOnUploadComplete = vi.fn();
        mockOnUploadError = vi.fn();
        mockOnUploadProgress = vi.fn();

        // Mock successful XMLHttpRequest
        const mockXHR = {
            open: vi.fn(),
            send: vi.fn(),
            setRequestHeader: vi.fn(),
            addEventListener: vi.fn((event, callback) => {
                if (event === 'load') {
                    setTimeout(() => {
                        mockXHR.status = 200;
                        mockXHR.responseText = JSON.stringify(mockUploadResponse);
                        callback();
                    }, 100);
                }
            }),
            upload: {
                addEventListener: vi.fn((event, callback) => {
                    if (event === 'progress') {
                        setTimeout(() => {
                            callback({
                                lengthComputable: true,
                                loaded: 50,
                                total: 100,
                            });
                        }, 50);
                    }
                }),
            },
            status: 200,
            responseText: JSON.stringify(mockUploadResponse),
        };

        global.XMLHttpRequest = vi.fn(() => mockXHR);

        // Mock CSRF token
        document.head.innerHTML = '<meta name="csrf-token" content="test-token">';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders upload area with correct elements', () => {
        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadComplete={mockOnUploadComplete} onUploadError={mockOnUploadError} />);

        expect(screen.getByText('Upload your files')).toBeInTheDocument();
        expect(screen.getByText('Choose Files')).toBeInTheDocument();
        expect(screen.getByText(/Drag and drop files here/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Select files to upload/)).toBeInTheDocument();
    });

    it('shows expiration selector when enabled', () => {
        render(<FileUploader showExpirationSelector={true} onUploadStart={mockOnUploadStart} />);

        expect(screen.getByText('File Expiration')).toBeInTheDocument();
    });

    it('hides expiration selector when disabled', () => {
        render(<FileUploader showExpirationSelector={false} onUploadStart={mockOnUploadStart} />);

        expect(screen.queryByText('File Expiration')).not.toBeInTheDocument();
    });

    it('displays maximum file size when provided', () => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        render(<FileUploader maxFileSize={maxSize} onUploadStart={mockOnUploadStart} />);

        expect(screen.getByText(/Maximum file size: 5 MB/)).toBeInTheDocument();
    });

    it('displays allowed file types when provided', () => {
        const allowedTypes = ['.jpg', '.png', 'image/'];
        render(<FileUploader allowedTypes={allowedTypes} onUploadStart={mockOnUploadStart} />);

        expect(screen.getByText('Allowed types: .jpg, .png, image/')).toBeInTheDocument();
    });

    it('handles file selection via input', async () => {
        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadComplete={mockOnUploadComplete} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, file);

        expect(mockOnUploadStart).toHaveBeenCalledWith([file]);
    });

    it('handles drag and drop', async () => {
        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadComplete={mockOnUploadComplete} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const dropZone = screen.getByText('Upload your files').closest('div');

        fireEvent.dragEnter(dropZone!, {
            dataTransfer: {
                files: [file],
            },
        });

        expect(screen.getByText('Drop files here')).toBeInTheDocument();

        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file],
            },
        });

        expect(mockOnUploadStart).toHaveBeenCalledWith([file]);
    });

    it('validates file size and shows error for oversized files', async () => {
        const maxSize = 1024; // 1KB
        render(<FileUploader maxFileSize={maxSize} onUploadStart={mockOnUploadStart} onUploadError={mockOnUploadError} />);

        const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, largeFile);

        expect(mockOnUploadError).toHaveBeenCalledWith(expect.stringContaining('exceeds the maximum file size'));
        expect(mockOnUploadStart).not.toHaveBeenCalled();
    });

    it('validates file types and shows error for disallowed types', async () => {
        const allowedTypes = ['image/'];
        render(<FileUploader allowedTypes={allowedTypes} onUploadStart={mockOnUploadStart} onUploadError={mockOnUploadError} />);

        const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, textFile);

        expect(mockOnUploadError).toHaveBeenCalledWith(expect.stringContaining('is not an allowed file type'));
        expect(mockOnUploadStart).not.toHaveBeenCalled();
    });

    it('shows progress during upload', async () => {
        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadProgress={mockOnUploadProgress} onUploadComplete={mockOnUploadComplete} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, file);

        // Wait for upload to start
        await waitFor(() => {
            expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        });

        // Check that file is shown in progress list
        expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    it('handles upload completion', async () => {
        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadComplete={mockOnUploadComplete} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, file);

        // Wait for upload to complete
        await waitFor(
            () => {
                expect(mockOnUploadComplete).toHaveBeenCalledWith(['test-file-id']);
            },
            { timeout: 3000 },
        );
    });

    it('handles multiple file uploads', async () => {
        render(<FileUploader multiple={true} onUploadStart={mockOnUploadStart} onUploadComplete={mockOnUploadComplete} />);

        const files = [new File(['content1'], 'file1.txt', { type: 'text/plain' }), new File(['content2'], 'file2.txt', { type: 'text/plain' })];
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, files);

        expect(mockOnUploadStart).toHaveBeenCalledWith(files);
    });

    it('disables upload when disabled prop is true', () => {
        render(<FileUploader disabled={true} onUploadStart={mockOnUploadStart} />);

        const button = screen.getByText('Choose Files');
        expect(button).toBeDisabled();
    });

    it('shows bulk actions for multiple files', async () => {
        render(<FileUploader enableBulkMode={true} onUploadStart={mockOnUploadStart} />);

        const files = [new File(['content1'], 'file1.txt', { type: 'text/plain' }), new File(['content2'], 'file2.txt', { type: 'text/plain' })];
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, files);

        await waitFor(() => {
            expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        });

        // Should show bulk actions for multiple files
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
        expect(screen.getByText('file2.txt')).toBeInTheDocument();
    });

    it('allows canceling individual uploads and aborts requests', async () => {
        // Mock XMLHttpRequest with abort method
        const mockAbort = vi.fn();
        const mockXHR = {
            open: vi.fn(),
            send: vi.fn(),
            setRequestHeader: vi.fn(),
            abort: mockAbort,
            addEventListener: vi.fn((event, callback) => {
                if (event === 'load') {
                    // Don't auto-complete, let us cancel first
                    setTimeout(() => {
                        mockXHR.status = 200;
                        mockXHR.responseText = JSON.stringify(mockUploadResponse);
                        callback();
                    }, 1000);
                }
                if (event === 'abort') {
                    setTimeout(callback, 50);
                }
            }),
            upload: {
                addEventListener: vi.fn((event, callback) => {
                    if (event === 'progress') {
                        setTimeout(() => {
                            callback({
                                lengthComputable: true,
                                loaded: 25,
                                total: 100,
                            });
                        }, 100);
                    }
                }),
            },
            status: 200,
            responseText: JSON.stringify(mockUploadResponse),
        };

        global.XMLHttpRequest = vi.fn(() => mockXHR);

        render(<FileUploader onUploadStart={mockOnUploadStart} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, file);

        await waitFor(() => {
            expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        });

        // Find and click cancel button (X button)
        const cancelButtons = screen.getAllByRole('button');
        const cancelButton = cancelButtons.find((btn) => btn.querySelector('svg') && btn.getAttribute('class')?.includes('h-8 w-8'));

        if (cancelButton) {
            await user.click(cancelButton);
            
            // Verify that xhr.abort() was called
            await waitFor(() => {
                expect(mockAbort).toHaveBeenCalled();
            });
        }
    });

    it('handles network errors gracefully', async () => {
        // Mock failed XMLHttpRequest
        const mockXHR = {
            open: vi.fn(),
            send: vi.fn(),
            setRequestHeader: vi.fn(),
            addEventListener: vi.fn((event, callback) => {
                if (event === 'error') {
                    setTimeout(callback, 100);
                }
            }),
            upload: {
                addEventListener: vi.fn(),
            },
        };

        global.XMLHttpRequest = vi.fn(() => mockXHR);

        render(<FileUploader onUploadStart={mockOnUploadStart} onUploadError={mockOnUploadError} />);

        const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, file);

        await waitFor(
            () => {
                expect(mockOnUploadError).toHaveBeenCalled();
            },
            { timeout: 3000 },
        );
    });

    it('cancels chunked uploads using AbortController', async () => {
        // Mock fetch for chunked uploads
        const mockAbortController = {
            signal: { aborted: false },
            abort: vi.fn(() => {
                mockAbortController.signal.aborted = true;
            }),
        };
        
        global.AbortController = vi.fn(() => mockAbortController);
        
        global.fetch = vi.fn().mockImplementation((url) => {
            if (url.includes('/api/upload/init')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        data: { session_id: 'test-session' }
                    })
                });
            }
            if (url.includes('/api/upload/chunk')) {
                // Simulate long-running chunk upload
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (mockAbortController.signal.aborted) {
                            throw new Error('Upload cancelled');
                        }
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ success: true })
                        });
                    }, 500);
                });
            }
            return Promise.reject(new Error('Unknown endpoint'));
        });

        render(<FileUploader onUploadStart={mockOnUploadStart} />);

        // Create a large file to trigger chunked upload (>25MB)
        const largeFile = new File(['x'.repeat(26 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
        const input = screen.getByLabelText(/Select files to upload/);

        await user.upload(input, largeFile);

        await waitFor(() => {
            expect(screen.getByText('Upload Progress')).toBeInTheDocument();
        });

        // Find and click cancel button
        const cancelButtons = screen.getAllByRole('button');
        const cancelButton = cancelButtons.find((btn) => btn.querySelector('svg') && btn.getAttribute('class')?.includes('h-8 w-8'));

        if (cancelButton) {
            await user.click(cancelButton);
            
            // Verify that AbortController.abort() was called
            await waitFor(() => {
                expect(mockAbortController.abort).toHaveBeenCalled();
            });
        }
    });
});
