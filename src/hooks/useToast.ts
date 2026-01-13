import { useCallback } from 'react'
import { toast } from 'sonner'

interface ToastOptions {
  description?: string;
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
}

export const useToast = () => {
  const success = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.success(title, {
        description: options?.description,
        duration: options?.duration || 3000,
        position: options?.position || 'bottom-right',
      });
    },
    []
  );

  const error = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.error(title, {
        description: options?.description,
        duration: options?.duration || 5000,
        position: options?.position || 'bottom-right',
      });
    },
    []
  );

  const warning = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.warning(title, {
        description: options?.description,
        duration: options?.duration || 4000,
        position: options?.position || 'bottom-right',
      });
    },
    []
  );

  const info = useCallback(
    (title: string, options?: ToastOptions) => {
      return toast.info(title, {
        description: options?.description,
        duration: options?.duration || 4000,
        position: options?.position || 'bottom-right',
      });
    },
    []
  );

  const dismiss = useCallback((toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  return {
    success,
    error,
    warning,
    info,
    dismiss,
  };
};