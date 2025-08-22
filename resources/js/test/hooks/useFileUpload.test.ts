import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useFileUpload } from '@/hooks/useFileUpload';

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    uploadFile: vi.fn(),
    initChunkedUpload: vi.fn(),
    uploadChunk: vi.fn(),
    finalizeChunkedUpload: vi.fn(),
  },
}));

describe('useFileUpload', () => {
  let mockFile: File;
  let mockLargeFile: File;
  let mockApiClient: any;

  beforeEach(async () => {
    // Get the mocked API client
    const { apiClient } = await import('@/lib/api');
    mockApiClient = apiClient;

    mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    mockLargeFile = new File(['x'.repeat(200 * 1024 * 1024)], 'large.bin', { type: 'application/octet-stream' });

    // Mock successful API responses
    mockApiClient.uploadFile.mockResolvedValue({
      file_id: 'test-file-id',
      download_url: 'http://localhost/f/test-file-id',
    });

    mockApiClient.initChunkedUpload.mockResolvedValue({
      session_id: 'test-session-id',
    });

    mockApiClient.uploadChunk.mockResolvedValue({
      success: true,
    });

    mockApiClient.finalizeChunkedUpload.mockResolvedValue({
      file_id: 'test-large-file-id',
      download_url: 'http://localhost/f/test-large-file-id',
    });

    // Mock AbortController
    global.AbortController = vi.fn(() => ({
      abort: vi.fn(),
      signal: {},
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);
    expect(result.current.getAllUploadProgress()).toEqual([]);
  });

  it('uploads a single file successfully', async () => {
    const { result } = renderHook(() => useFileUpload());

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(mockFile);
    });

    expect(uploadResult).toEqual({
      success: true,
      file_id: 'test-file-id',
      download_url: 'http://localhost/f/test-file-id',
    });

    expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        onProgress: expect.any(Function),
      })
    );
  });

  it('uploads multiple files successfully', async () => {
    const { result } = renderHook(() => useFileUpload());

    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    ];

    let uploadResults;
    await act(async () => {
      uploadResults = await result.current.uploadFiles(files);
    });

    expect(uploadResults).toHaveLength(2);
    expect(uploadResults[0]).toEqual({
      success: true,
      file_id: 'test-file-id',
      download_url: 'http://localhost/f/test-file-id',
    });
    expect(mockApiClient.uploadFile).toHaveBeenCalledTimes(2);
  });

  it('handles chunked upload for large files', async () => {
    const { result } = renderHook(() => useFileUpload());

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(mockLargeFile);
    });

    expect(uploadResult).toEqual({
      success: true,
      file_id: 'test-large-file-id',
      download_url: 'http://localhost/f/test-large-file-id',
    });

    expect(mockApiClient.initChunkedUpload).toHaveBeenCalledWith(
      mockLargeFile,
      expect.any(Number),
      undefined
    );
    expect(mockApiClient.uploadChunk).toHaveBeenCalled();
    expect(mockApiClient.finalizeChunkedUpload).toHaveBeenCalledWith('test-session-id');
  });

  it('tracks upload progress correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockOnProgress = vi.fn();

    await act(async () => {
      await result.current.uploadFile(mockFile, {
        on_progress: mockOnProgress,
      });
    });

    // Verify that progress callback was set up
    expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        onProgress: expect.any(Function),
      })
    );
  });

  it('handles upload options correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    const options = {
      expiration_days: 7,
      on_complete: vi.fn(),
      on_error: vi.fn(),
      on_progress: vi.fn(),
    };

    await act(async () => {
      await result.current.uploadFile(mockFile, options);
    });

    expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
      mockFile,
      expect.objectContaining({
        expirationDays: 7,
        onProgress: expect.any(Function),
      })
    );

    expect(options.on_complete).toHaveBeenCalledWith('test-file-id');
  });

  it('handles upload errors gracefully', async () => {
    const { result } = renderHook(() => useFileUpload());

    const error = new Error('Upload failed');
    mockApiClient.uploadFile.mockRejectedValue(error);

    const mockOnError = vi.fn();

    let uploadResult;
    await act(async () => {
      uploadResult = await result.current.uploadFile(mockFile, {
        on_error: mockOnError,
      });
    });

    expect(uploadResult).toEqual({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: 'Upload failed',
      },
    });

    expect(mockOnError).toHaveBeenCalledWith({
      code: 'UPLOAD_FAILED',
      message: 'Upload failed',
    });
  });

  it('cancels upload correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    // Start upload
    act(() => {
      result.current.uploadFile(mockFile);
    });

    // Cancel upload
    act(() => {
      result.current.cancelUpload(mockFile);
    });

    // Check that progress is updated to cancelled
    const progress = result.current.getUploadProgress(mockFile);
    expect(progress?.status).toBe('cancelled');
  });

  it('cancels all uploads correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    ];

    // Start uploads
    act(() => {
      files.forEach(file => result.current.uploadFile(file));
    });

    // Cancel all uploads
    act(() => {
      result.current.cancelAllUploads();
    });

    // Check that all uploads are cancelled
    files.forEach(file => {
      const progress = result.current.getUploadProgress(file);
      expect(progress?.status).toBe('cancelled');
    });
  });

  it('gets upload progress for specific file', async () => {
    const { result } = renderHook(() => useFileUpload());

    // Initially no progress
    expect(result.current.getUploadProgress(mockFile)).toBeNull();

    // Start upload
    act(() => {
      result.current.uploadFile(mockFile);
    });

    // Should have progress now
    const progress = result.current.getUploadProgress(mockFile);
    expect(progress).toBeDefined();
    expect(progress?.file).toBe(mockFile);
  });

  it('gets all upload progress', async () => {
    const { result } = renderHook(() => useFileUpload());

    const files = [
      new File(['content1'], 'file1.txt', { type: 'text/plain' }),
      new File(['content2'], 'file2.txt', { type: 'text/plain' }),
    ];

    // Start uploads
    act(() => {
      files.forEach(file => result.current.uploadFile(file));
    });

    const allProgress = result.current.getAllUploadProgress();
    expect(allProgress).toHaveLength(2);
    expect(allProgress[0].file).toBe(files[0]);
    expect(allProgress[1].file).toBe(files[1]);
  });

  it('sets isUploading state correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    expect(result.current.isUploading).toBe(false);

    // Start upload
    const uploadPromise = act(async () => {
      return result.current.uploadFile(mockFile);
    });

    expect(result.current.isUploading).toBe(true);

    await uploadPromise;

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });

  it('handles chunked upload progress correctly', async () => {
    const { result } = renderHook(() => useFileUpload());

    const mockOnChunkProgress = vi.fn();

    await act(async () => {
      await result.current.uploadFile(mockLargeFile, {
        on_chunk_progress: mockOnChunkProgress,
      });
    });

    // Verify chunked upload was initiated
    expect(mockApiClient.initChunkedUpload).toHaveBeenCalled();
    expect(mockApiClient.uploadChunk).toHaveBeenCalled();
    expect(mockApiClient.finalizeChunkedUpload).toHaveBeenCalled();
  });

  it('retries failed chunks up to max retries', async () => {
    const { result } = renderHook(() => useFileUpload());

    // Mock chunk upload to fail initially
    mockApiClient.uploadChunk
      .mockRejectedValueOnce(new Error('Chunk failed'))
      .mockRejectedValueOnce(new Error('Chunk failed'))
      .mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.uploadFile(mockLargeFile, {
        max_retries: 3,
      });
    });

    // Should have retried the failed chunk
    expect(mockApiClient.uploadChunk).toHaveBeenCalledTimes(3);
  });

  it('resumes upload (currently restarts)', async () => {
    const { result } = renderHook(() => useFileUpload());

    // Start and cancel upload
    act(() => {
      result.current.uploadFile(mockFile);
    });

    act(() => {
      result.current.cancelUpload(mockFile);
    });

    // Resume upload (currently restarts)
    let resumeResult;
    await act(async () => {
      resumeResult = await result.current.resumeUpload(mockFile);
    });

    expect(resumeResult).toEqual({
      success: true,
      file_id: 'test-file-id',
      download_url: 'http://localhost/f/test-file-id',
    });
  });

  it('handles custom chunk size', async () => {
    const { result } = renderHook(() => useFileUpload());

    const customChunkSize = 10 * 1024 * 1024; // 10MB

    await act(async () => {
      await result.current.uploadFile(mockLargeFile, {
        chunk_size: customChunkSize,
      });
    });

    expect(mockApiClient.initChunkedUpload).toHaveBeenCalledWith(
      mockLargeFile,
      customChunkSize,
      undefined
    );
  });
});