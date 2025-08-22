import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useClipboard, useFileUrlClipboard, useAdvancedClipboard } from '@/hooks/useClipboard';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('useClipboard', () => {
  beforeEach(() => {
    mockToast.mockClear();
    vi.useFakeTimers();

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });

    // Mock execCommand
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useClipboard());

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSupported).toBe(true);
  });

  it('copies text successfully using clipboard API', async () => {
    const { result } = renderHook(() => useClipboard());

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy('test text');
    });

    expect(copyResult).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Copied to clipboard!',
      variant: 'default',
    });
  });

  it('falls back to execCommand when clipboard API fails', async () => {
    // Mock clipboard API to fail
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => useClipboard());

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy('test text');
    });

    expect(copyResult).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('handles copy failure gracefully', async () => {
    // Mock clipboard API to fail
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Copy failed')),
      },
      writable: true,
    });

    const { result } = renderHook(() => useClipboard());

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy('test text');
    });

    expect(copyResult).toBe(false);
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe('Failed to copy to clipboard');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to copy to clipboard',
      variant: 'destructive',
    });
  });

  it('resets copied state after timeout', async () => {
    const { result } = renderHook(() => useClipboard({ timeout: 1000 }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('calls custom success callback', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useClipboard({ onSuccess }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(onSuccess).toHaveBeenCalledWith('test text');
  });

  it('calls custom error callback', async () => {
    const onError = vi.fn();
    
    // Mock clipboard API to fail
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Copy failed')),
      },
      writable: true,
    });

    const { result } = renderHook(() => useClipboard({ onError }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('uses custom success and error messages', async () => {
    const { result } = renderHook(() => useClipboard({
      successMessage: 'Custom success!',
      errorMessage: 'Custom error!',
    }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Custom success!',
      variant: 'default',
    });
  });

  it('disables toast notifications when showToast is false', async () => {
    const { result } = renderHook(() => useClipboard({ showToast: false }));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('handles unsupported clipboard gracefully', async () => {
    // Mock unsupported environment
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });
    document.execCommand = undefined as any;

    const { result } = renderHook(() => useClipboard());

    expect(result.current.isSupported).toBe(false);

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy('test text');
    });

    expect(copyResult).toBe(false);
    expect(result.current.error).toBe('Failed to copy to clipboard');
  });

  it('clears existing timeout when copying again', async () => {
    const { result } = renderHook(() => useClipboard({ timeout: 1000 }));

    await act(async () => {
      await result.current.copy('first text');
    });

    expect(result.current.copied).toBe(true);

    // Copy again before timeout
    await act(async () => {
      await result.current.copy('second text');
    });

    expect(result.current.copied).toBe(true);

    // Advance time by original timeout
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should still be true because new timeout was set
    expect(result.current.copied).toBe(false);
  });
});

describe('useFileUrlClipboard', () => {
  beforeEach(() => {
    mockToast.mockClear();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });

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

  it('copies download URL correctly', async () => {
    const { result } = renderHook(() => useFileUrlClipboard());

    await act(async () => {
      await result.current.copyDownloadUrl('test-file-id');
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/f/test-file-id');
  });

  it('copies download URL with custom base URL', async () => {
    const { result } = renderHook(() => useFileUrlClipboard());

    await act(async () => {
      await result.current.copyDownloadUrl('test-file-id', 'https://custom.com');
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://custom.com/f/test-file-id');
  });

  it('copies preview URL correctly', async () => {
    const { result } = renderHook(() => useFileUrlClipboard());

    await act(async () => {
      await result.current.copyPreviewUrl('test-file-id');
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/p/test-file-id');
  });

  it('copies file info correctly', async () => {
    const { result } = renderHook(() => useFileUrlClipboard());

    await act(async () => {
      await result.current.copyFileInfo('test.txt', '1 MB', 'https://example.com/f/test-file-id');
    });

    const expectedInfo = 'File: test.txt\nSize: 1 MB\nDownload: https://example.com/f/test-file-id';
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expectedInfo);
  });
});

describe('useAdvancedClipboard', () => {
  beforeEach(() => {
    mockToast.mockClear();
    vi.useFakeTimers();

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('tracks what was copied with identifier', async () => {
    const { result } = renderHook(() => useAdvancedClipboard());

    await act(async () => {
      await result.current.copy('test text', { identifier: 'test-id' });
    });

    expect(result.current.copied).toBe('test-id');
    expect(result.current.isCopied('test-id')).toBe(true);
    expect(result.current.isCopied('other-id')).toBe(false);
  });

  it('uses custom success and error messages per operation', async () => {
    const { result } = renderHook(() => useAdvancedClipboard());

    await act(async () => {
      await result.current.copy('test text', {
        successMessage: 'Custom success message!',
        errorMessage: 'Custom error message!',
      });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Custom success message!',
      variant: 'default',
    });
  });

  it('can disable toast per operation', async () => {
    const { result } = renderHook(() => useAdvancedClipboard());

    await act(async () => {
      await result.current.copy('test text', { showToast: false });
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it('uses text substring as default identifier', async () => {
    const { result } = renderHook(() => useAdvancedClipboard());

    await act(async () => {
      await result.current.copy('this is a very long text that should be truncated');
    });

    expect(result.current.copied).toBe('this is a very long ');
  });

  it('resets copied state after timeout', async () => {
    const { result } = renderHook(() => useAdvancedClipboard());

    await act(async () => {
      await result.current.copy('test text', { identifier: 'test-id' });
    });

    expect(result.current.isCopied('test-id')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBeNull();
    expect(result.current.isCopied('test-id')).toBe(false);
  });

  it('handles copy failure with custom error message', async () => {
    // Mock clipboard API to fail
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Copy failed')),
      },
      writable: true,
    });

    const { result } = renderHook(() => useAdvancedClipboard());

    let copyResult;
    await act(async () => {
      copyResult = await result.current.copy('test text', {
        errorMessage: 'Custom error occurred!',
      });
    });

    expect(copyResult).toBe(false);
    expect(result.current.error).toBe('Custom error occurred!');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Custom error occurred!',
      variant: 'destructive',
    });
  });
});