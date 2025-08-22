import { toast as sonnerToast } from "sonner"

interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

function toast({ title, description, variant = 'default' }: ToastOptions) {
  const message = title || description || ''
  const fullMessage = title && description ? `${title}: ${description}` : message

  switch (variant) {
    case 'destructive':
      return sonnerToast.error(fullMessage)
    case 'success':
      return sonnerToast.success(fullMessage)
    default:
      return sonnerToast(fullMessage)
  }
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}

export { useToast, toast }