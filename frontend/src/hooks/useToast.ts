import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

interface ToastOptions {
  description?: string
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
}

export function useToast() {
  const success = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.success(title, {
        description: options?.description,
        duration: options?.duration || 3000,
        position: options?.position || 'bottom-right',
      })
    },
    [],
  )

  const error = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.error(title, {
        description: options?.description,
        duration: options?.duration || 5000,
        position: options?.position || 'bottom-right',
      })
    },
    [],
  )

  const warning = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.warning(title, {
        description: options?.description,
        duration: options?.duration || 4000,
        position: options?.position || 'bottom-right',
      })
    },
    [],
  )

  const info = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.info(title, {
        description: options?.description,
        duration: options?.duration || 4000,
        position: options?.position || 'bottom-right',
      })
    },
    [],
  )

  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId)
    }
    else {
      toast.dismiss()
    }
  }, [])

  // Stable identity: the individual callbacks never change, so the object is
  // memoized once — consumers may safely keep the returned api in effect deps
  // (a fresh literal per render caused an infinite refetch+toast loop in the
  // MDT-248 pane's failure path).
  return useMemo(() => ({
    success,
    error,
    warning,
    info,
    dismiss,
  }), [success, error, warning, info, dismiss])
}
