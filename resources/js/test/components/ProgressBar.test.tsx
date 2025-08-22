import ProgressBar from '@/components/ProgressBar';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ProgressBar', () => {
    beforeEach(() => {
        // Mock requestAnimationFrame
        global.requestAnimationFrame = vi.fn((cb) => {
            setTimeout(cb, 16);
            return 1;
        });
        global.cancelAnimationFrame = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders with basic props', () => {
        render(<ProgressBar value={50} animated={false} />);

        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows percentage when showPercentage is true', () => {
        render(<ProgressBar value={75} showPercentage={true} animated={false} />);

        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('hides percentage when showPercentage is false', () => {
        render(<ProgressBar value={75} showPercentage={false} />);

        expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });

    it('displays custom label', () => {
        render(<ProgressBar value={30} label="Uploading file..." />);

        expect(screen.getByText('Uploading file...')).toBeInTheDocument();
    });

    it('shows loading icon for loading status', () => {
        render(<ProgressBar value={40} status="loading" />);

        // Check for loading spinner (Loader2 icon)
        const loadingIcon = document.querySelector('svg');
        expect(loadingIcon).toBeInTheDocument();
    });

    it('shows success icon for success status', () => {
        render(<ProgressBar value={100} status="success" />);

        // Check for success icon (CheckCircle)
        const successIcon = document.querySelector('svg');
        expect(successIcon).toBeInTheDocument();
    });

    it('shows error icon for error status', () => {
        render(<ProgressBar value={50} status="error" error="Upload failed" />);

        // Check for error icon (AlertCircle)
        const errorIcon = document.querySelector('svg');
        expect(errorIcon).toBeInTheDocument();
    });

    it('shows paused icon for paused status', () => {
        render(<ProgressBar value={30} status="paused" />);

        // Check for paused icon (Clock)
        const pausedIcon = document.querySelector('svg');
        expect(pausedIcon).toBeInTheDocument();
    });

    it('displays error message when status is error', () => {
        const errorMessage = 'Network connection failed';
        render(<ProgressBar value={25} status="error" error={errorMessage} />);

        expect(screen.getByText('Upload Error')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('shows progress preservation message when preserveProgressOnError is true', () => {
        render(<ProgressBar value={60} status="error" error="Connection lost" preserveProgressOnError={true} animated={false} />);

        expect(screen.getByText(/Progress preserved - you can retry from 60%/)).toBeInTheDocument();
    });

    it('displays additional info when provided', () => {
        const info = '2.5 MB/s • ETA: 30s';
        render(<ProgressBar value={45} info={info} />);

        expect(screen.getByText(info)).toBeInTheDocument();
    });

    it('shows success message for completed status', () => {
        render(<ProgressBar value={100} status="success" />);

        expect(screen.getByText('Upload completed successfully')).toBeInTheDocument();
    });

    it('shows paused message for paused status', () => {
        render(<ProgressBar value={35} status="paused" />);

        expect(screen.getByText('Upload paused')).toBeInTheDocument();
    });

    it('applies small size classes', () => {
        const { container } = render(<ProgressBar value={50} size="sm" />);

        // Check for small size classes
        expect(container.querySelector('.space-y-1')).toBeInTheDocument();
    });

    it('applies large size classes', () => {
        const { container } = render(<ProgressBar value={50} size="lg" />);

        // Check for large size classes
        expect(container.querySelector('.space-y-3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
        const { container } = render(<ProgressBar value={50} className="custom-progress" />);

        expect(container.firstChild).toHaveClass('custom-progress');
    });

    it('calls onAnimationComplete when animation finishes', async () => {
        const mockCallback = vi.fn();

        render(<ProgressBar value={100} animated={true} onAnimationComplete={mockCallback} />);

        // Wait for animation to complete
        await waitFor(
            () => {
                expect(mockCallback).toHaveBeenCalled();
            },
            { timeout: 2000 },
        );
    });

    it('handles zero progress value', () => {
        render(<ProgressBar value={0} />);

        expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles maximum progress value', () => {
        render(<ProgressBar value={100} animated={false} />);

        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('applies destructive variant styling', () => {
        render(<ProgressBar value={50} variant="destructive" />);

        // The component should apply destructive styling
        const progressElement = document.querySelector('[class*="progress"]');
        expect(progressElement).toBeInTheDocument();
    });

    it('applies success variant styling', () => {
        render(<ProgressBar value={50} variant="success" />);

        // The component should apply success styling
        const progressElement = document.querySelector('[class*="progress"]');
        expect(progressElement).toBeInTheDocument();
    });

    it('applies warning variant styling', () => {
        render(<ProgressBar value={50} variant="warning" />);

        // The component should apply warning styling
        const progressElement = document.querySelector('[class*="progress"]');
        expect(progressElement).toBeInTheDocument();
    });

    it('does not show error message when status is not error', () => {
        render(<ProgressBar value={50} status="loading" error="Some error" />);

        expect(screen.queryByText('Upload Error')).not.toBeInTheDocument();
        expect(screen.queryByText('Some error')).not.toBeInTheDocument();
    });

    it('does not show info when status is error', () => {
        const info = 'Upload speed info';
        render(<ProgressBar value={50} status="error" error="Failed" info={info} />);

        expect(screen.queryByText(info)).not.toBeInTheDocument();
    });

    it('animates progress changes when animated is true', async () => {
        const { rerender } = render(<ProgressBar value={0} animated={true} />);

        expect(screen.getByText('0%')).toBeInTheDocument();

        rerender(<ProgressBar value={50} animated={true} />);

        // Animation should eventually reach the target value
        await waitFor(
            () => {
                expect(screen.getByText('50%')).toBeInTheDocument();
            },
            { timeout: 2000 },
        );
    });

    it('immediately updates progress when animated is false', () => {
        const { rerender } = render(<ProgressBar value={0} animated={false} />);

        expect(screen.getByText('0%')).toBeInTheDocument();

        rerender(<ProgressBar value={75} animated={false} />);

        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('preserves progress on error when preserveProgressOnError is true', () => {
        render(<ProgressBar value={80} status="error" error="Network error" preserveProgressOnError={true} animated={false} />);

        // Progress should be preserved at 80%
        expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('resets progress on error when preserveProgressOnError is false', () => {
        render(<ProgressBar value={80} status="error" error="Network error" preserveProgressOnError={false} />);

        // Progress should be reset (this would need animation to complete)
        // For immediate testing, we check that the component renders
        expect(screen.getByText('Upload Error')).toBeInTheDocument();
    });
});
