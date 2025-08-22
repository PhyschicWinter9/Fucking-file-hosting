import React, { useState, useCallback, useRef } from 'react';
import { useToast } from './useToast';

interface UseClipboardOptions {
    timeout?: number; // How long to show success state (ms)
    successMessage?: string;
    errorMessage?: string;
    showToast?: boolean; // Whether to show toast notifications
    onSuccess?: (text: string) => void;
    onError?: (error: Error) => void;
}

interface UseClipboardReturn {
    copy: (text: string) => Promise<boolean>;
    copied: boolean;
    error: string | null;
    isSupported: boolean;
}

const defaultOptions: Required<UseClipboardOptions> = {
    timeout: 2000,
    successMessage: 'Copied to clipboard!',
    errorMessage: 'Failed to copy to clipboard',
    showToast: true,
    onSuccess: () => {},
    onError: () => {},
};

export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const { toast } = useToast();
    
    const opts = { ...defaultOptions, ...options };

    // Check if clipboard API is supported
    const isSupported = Boolean(
        typeof navigator !== 'undefined' &&
        (navigator.clipboard?.writeText || document.execCommand)
    );

    const resetState = useCallback(() => {
        setCopied(false);
        setError(null);
    }, []);

    const copy = useCallback(async (text: string): Promise<boolean> => {
        if (!isSupported) {
            const error = new Error('Clipboard not supported');
            setError(opts.errorMessage);
            opts.onError(error);
            
            if (opts.showToast) {
                toast({
                    title: 'Error',
                    description: opts.errorMessage,
                    variant: 'destructive',
                });
            }
            
            return false;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        try {
            // Reset previous state
            resetState();

            // Try modern clipboard API first
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback to execCommand for older browsers
                await copyTextFallback(text);
            }

            // Set success state
            setCopied(true);
            setError(null);
            
            // Call success callback
            opts.onSuccess(text);
            
            // Show success toast
            if (opts.showToast) {
                toast({
                    title: 'Success',
                    description: opts.successMessage,
                    variant: 'default',
                });
            }

            // Reset copied state after timeout
            timeoutRef.current = setTimeout(() => {
                setCopied(false);
            }, opts.timeout);

            return true;

        } catch (err: any) {
            const error = err instanceof Error ? err : new Error('Copy failed');
            
            setCopied(false);
            setError(opts.errorMessage);
            
            // Call error callback
            opts.onError(error);
            
            // Show error toast
            if (opts.showToast) {
                toast({
                    title: 'Error',
                    description: opts.errorMessage,
                    variant: 'destructive',
                });
            }

            return false;
        }
    }, [isSupported, opts, toast, resetState]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        copy,
        copied,
        error,
        isSupported,
    };
}

/**
 * Fallback copy method using execCommand for older browsers
 */
async function copyTextFallback(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create a temporary textarea element
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        textarea.setAttribute('readonly', '');
        
        document.body.appendChild(textarea);
        
        try {
            // Select the text
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices
            
            // Copy the text
            const successful = document.execCommand('copy');
            
            if (successful) {
                resolve();
            } else {
                reject(new Error('execCommand copy failed'));
            }
        } catch (err) {
            reject(err);
        } finally {
            // Clean up
            document.body.removeChild(textarea);
        }
    });
}

/**
 * Hook for copying file download URLs with specific formatting
 */
export function useFileUrlClipboard() {
    const clipboard = useClipboard({
        successMessage: 'Download URL copied to clipboard!',
        errorMessage: 'Failed to copy download URL',
        timeout: 3000,
    });

    const copyDownloadUrl = useCallback(async (fileId: string, baseUrl?: string): Promise<boolean> => {
        const url = baseUrl ? `${baseUrl}/f/${fileId}` : `${window.location.origin}/f/${fileId}`;
        return clipboard.copy(url);
    }, [clipboard]);

    const copyPreviewUrl = useCallback(async (fileId: string, baseUrl?: string): Promise<boolean> => {
        const url = baseUrl ? `${baseUrl}/p/${fileId}` : `${window.location.origin}/p/${fileId}`;
        return clipboard.copy(url);
    }, [clipboard]);

    const copyFileInfo = useCallback(async (
        fileName: string,
        fileSize: string,
        downloadUrl: string
    ): Promise<boolean> => {
        const info = `File: ${fileName}\nSize: ${fileSize}\nDownload: ${downloadUrl}`;
        return clipboard.copy(info);
    }, [clipboard]);

    return {
        ...clipboard,
        copyDownloadUrl,
        copyPreviewUrl,
        copyFileInfo,
    };
}

/**
 * Hook for copying with custom success/error messages per operation
 */
export function useAdvancedClipboard() {
    const [copied, setCopied] = useState<string | null>(null); // Track what was copied
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const { toast } = useToast();

    const isSupported = Boolean(
        typeof navigator !== 'undefined' &&
        (navigator.clipboard?.writeText || document.execCommand)
    );

    const copy = useCallback(async (
        text: string,
        options: {
            successMessage?: string;
            errorMessage?: string;
            showToast?: boolean;
            identifier?: string; // Unique identifier for this copy operation
        } = {}
    ): Promise<boolean> => {
        const {
            successMessage = 'Copied to clipboard!',
            errorMessage = 'Failed to copy to clipboard',
            showToast = true,
            identifier = text.substring(0, 20),
        } = options;

        if (!isSupported) {
            setError(errorMessage);
            
            if (showToast) {
                toast({
                    title: 'Error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }
            
            return false;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        try {
            // Try modern clipboard API first
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback to execCommand
                await copyTextFallback(text);
            }

            // Set success state
            setCopied(identifier);
            setError(null);
            
            // Show success toast
            if (showToast) {
                toast({
                    title: 'Success',
                    description: successMessage,
                    variant: 'default',
                });
            }

            // Reset copied state after timeout
            timeoutRef.current = setTimeout(() => {
                setCopied(null);
            }, 2000);

            return true;

        } catch (err: any) {
            setCopied(null);
            setError(errorMessage);
            
            // Show error toast
            if (showToast) {
                toast({
                    title: 'Error',
                    description: errorMessage,
                    variant: 'destructive',
                });
            }

            return false;
        }
    }, [isSupported, toast]);

    const isCopied = useCallback((identifier: string): boolean => {
        return copied === identifier;
    }, [copied]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        copy,
        copied,
        isCopied,
        error,
        isSupported,
    };
}