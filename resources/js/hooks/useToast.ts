import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

// Track active toasts to prevent duplicates
const activeToasts = new Set<string>();

function toast({ title, description, variant = 'default', duration = 4000 }: ToastOptions) {
  const message = title || description || ''
  const fullMessage = title && description ? `${title}: ${description}` : message

  // Create a unique key for this toast to prevent duplicates
  const toastKey = `${variant}-${fullMessage}`;

  // If this exact toast is already showing, don't show another
  if (activeToasts.has(toastKey)) {
    return;
  }

  // Add to active toasts
  activeToasts.add(toastKey);

  // Remove from active toasts after duration
  setTimeout(() => {
    activeToasts.delete(toastKey);
  }, duration);

  const toastOptions = {
    duration,
    position: 'top-right' as const,
  };

  switch (variant) {
    case 'destructive':
      return sonnerToast.error(fullMessage, toastOptions)
    case 'success':
      return sonnerToast.success(fullMessage, toastOptions)
    default:
      return sonnerToast(fullMessage, toastOptions)
  }
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}

export { useToast, toast }
