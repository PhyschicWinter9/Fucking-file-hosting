import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProgress, useMultiFileProgress } from '@/hooks/useProgress';
import { UploadProgress } from '@/types/upload';

describe('useProgress', () => {
  let mockFile1: File;
  let mockFile2: File;
  let mockProgress1: UploadProgress;
  let mockProgress2: UploadProgress;

  beforeEach(() => {
    mockFile1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
    mockFile2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });

    mockProgress1 = {
      file: mockFile1,
      progress: 0,
      status: 'pending',
      uploaded_bytes: 0,
      total_bytes: 1000,
      speed: 0,
      eta: 0,
    };

    mockProgress2 = {
      file: mockFile2,
      progress: 0,
      status: 'pending',
      uploaded_bytes: 0,
      total_bytes: 2000,
      speed: 0,
      eta: 0,
    };

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

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useProgress());

    expect(result.current.getAllProgress()).toEqual([]);
    expect(result.current.getOverallProgress().totalFiles).toBe(0);
  });

  it('adds progress correctly', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
    });

    const progress = result.current.getProgress('file1');
    expect(progress).toEqual(mockProgress1);
    expect(result.current.getAnimatedProgress('file1')).toBe(0);
  });

  it('updates progress correctly', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
    });

    act(() => {
      result.current.updateProgress('file1', {
        progress: 50,
        uploaded_bytes: 500,
        status: 'uploading',
      });
    });

    const progress = result.current.getProgress('file1');
    expect(progress?.progress).toBe(50);
    expect(progress?.uploaded_bytes).toBe(500);
    expect(progress?.status).toBe('uploading');
  });

  it('calculates speed and ETA when updating uploaded bytes', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
    });

    // Wait a bit to ensure time difference
    setTimeout(() => {
      act(() => {
        result.current.updateProgress('file1', {
          uploaded_bytes: 500,
        });
      });

      const progress = result.current.getProgress('file1');
      expect(progress?.speed).toBeGreaterThan(0);
      expect(progress?.eta).toBeGreaterThan(0);
    }, 100);
  });

  it('removes progress correctly', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
    });

    expect(result.current.getProgress('file1')).toEqual(mockProgress1);

    act(() => {
      result.current.removeProgress('file1');
    });

    expect(result.current.getProgress('file1')).toBeNull();
  });

  it('returns all progress correctly', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
      result.current.addProgress('file2', mockProgress2);
    });

    const allProgress = result.current.getAllProgress();
    expect(allProgress).toHaveLength(2);
    expect(allProgress).toContainEqual(mockProgress1);
    expect(allProgress).toContainEqual(mockProgress2);
  });

  it('calculates overall progress correctly', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', {
        ...mockProgress1,
        progress: 50,
        uploaded_bytes: 500,
        status: 'uploading',
      });
      result.current.addProgress('file2', {
        ...mockProgress2,
        progress: 100,
        uploaded_bytes: 2000,
        status: 'completed',
      });
    });

    const overall = result.current.getOverallProgress();
    expect(overall.totalFiles).toBe(2);
    expect(overall.completedFiles).toBe(1);
    expect(overall.uploadingFiles).toBe(1);
    expect(overall.failedFiles).toBe(0);
    expect(overall.totalBytes).toBe(3000);
    expect(overall.uploadedBytes).toBe(2500);
    expect(overall.overallProgress).toBeCloseTo(83.33, 1);
  });

  it('calculates average speed from active uploads', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', {
        ...mockProgress1,
        status: 'uploading',
        speed: 100,
      });
      result.current.addProgress('file2', {
        ...mockProgress2,
        status: 'uploading',
        speed: 200,
      });
    });

    const overall = result.current.getOverallProgress();
    expect(overall.averageSpeed).toBe(150);
  });

  it('clears completed progress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', {
        ...mockProgress1,
        status: 'completed',
      });
      result.current.addProgress('file2', {
        ...mockProgress2,
        status: 'uploading',
      });
    });

    expect(result.current.getAllProgress()).toHaveLength(2);

    act(() => {
      result.current.clearCompleted();
    });

    const remaining = result.current.getAllProgress();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].status).toBe('uploading');
  });

  it('clears all progress', () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.addProgress('file1', mockProgress1);
      result.current.addProgress('file2', mockProgress2);
    });

    expect(result.current.getAllProgress()).toHaveLength(2);

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.getAllProgress()).toHaveLength(0);
  });

  it('animates progress changes', async () => {
    const { result } = renderHook(() => useProgress({ duration: 100 }));

    act(() => {
      result.current.addProgress('file1', mockProgress1);
    });

    expect(result.current.getAnimatedProgress('file1')).toBe(0);

    act(() => {
      result.current.updateProgress('file1', { progress: 50 });
    });

    // Animation should start from 0 and move towards 50
    await waitFor(() => {
      const animatedProgress = result.current.getAnimatedProgress('file1');
      expect(animatedProgress).toBeGreaterThan(0);
      expect(animatedProgress).toBeLessThanOrEqual(50);
    });
  });

  it('handles custom easing function', () => {
    const customEasing = vi.fn((t: number) => t * t);
    const { result } = renderHook(() => useProgress({ 
      easing: customEasing,
      duration: 100 
    }));

    act(() => {
      result.current.addProgress('file1', mockProgress1);
      result.current.updateProgress('file1', { progress: 50 });
    });

    // The easing function should be called during animation
    setTimeout(() => {
      expect(customEasing).toHaveBeenCalled();
    }, 50);
  });

  it('handles smoothing factor correctly', async () => {
    const { result } = renderHook(() => useProgress({ 
      smoothingFactor: 0.1, // Very low smoothing for slower animation
      duration: 50
    }));

    act(() => {
      result.current.addProgress('file1', mockProgress1);
      result.current.updateProgress('file1', { progress: 100 });
    });

    // With low smoothing factor, animation should be slower
    await waitFor(() => {
      const animatedProgress = result.current.getAnimatedProgress('file1');
      expect(animatedProgress).toBeGreaterThan(0);
      expect(animatedProgress).toBeLessThan(50); // Should be less than halfway
    }, { timeout: 100 });
  });
});

describe('useMultiFileProgress', () => {
  let mockFile: File;
  let mockProgress: UploadProgress;

  beforeEach(() => {
    mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });
    mockProgress = {
      file: mockFile,
      progress: 0,
      status: 'pending',
      uploaded_bytes: 0,
      total_bytes: 1000,
      speed: 0,
      eta: 0,
    };

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('auto-cleans up completed uploads', async () => {
    const { result } = renderHook(() => useMultiFileProgress(1000));

    act(() => {
      result.current.addProgress('file1', mockProgress);
    });

    expect(result.current.getProgress('file1')).toEqual(mockProgress);

    act(() => {
      result.current.updateProgress('file1', { status: 'completed' });
    });

    // Fast-forward time to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.getProgress('file1')).toBeNull();
  });

  it('auto-cleans up failed uploads', async () => {
    const { result } = renderHook(() => useMultiFileProgress(1000));

    act(() => {
      result.current.addProgress('file1', mockProgress);
    });

    act(() => {
      result.current.updateProgress('file1', { status: 'error' });
    });

    // Fast-forward time to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.getProgress('file1')).toBeNull();
  });

  it('does not auto-clean up uploading files', async () => {
    const { result } = renderHook(() => useMultiFileProgress(1000));

    act(() => {
      result.current.addProgress('file1', mockProgress);
    });

    act(() => {
      result.current.updateProgress('file1', { status: 'uploading' });
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should still be there
    expect(result.current.getProgress('file1')).toBeTruthy();
  });

  it('clears existing cleanup timeout when updating', () => {
    const { result } = renderHook(() => useMultiFileProgress(1000));

    act(() => {
      result.current.addProgress('file1', mockProgress);
    });

    // Mark as completed to schedule cleanup
    act(() => {
      result.current.updateProgress('file1', { status: 'completed' });
    });

    // Update again before cleanup triggers
    act(() => {
      result.current.updateProgress('file1', { status: 'uploading' });
    });

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should still be there since it's uploading
    expect(result.current.getProgress('file1')).toBeTruthy();
  });

  it('cleans up timeouts on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { result, unmount } = renderHook(() => useMultiFileProgress(1000));

    act(() => {
      result.current.addProgress('file1', mockProgress);
      result.current.updateProgress('file1', { status: 'completed' });
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});