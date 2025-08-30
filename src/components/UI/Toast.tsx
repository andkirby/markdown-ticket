import React, { useEffect, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const toastVariants = cva(
  'fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-x-full',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200',
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
        info: 'bg-blue-50 border-blue-200',
      },
      size: {
        sm: 'p-3',
        default: 'p-4',
        lg: 'p-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: VariantProps<typeof toastVariants>['variant'];
  duration?: number;
  isClosable?: boolean;
  onClose?: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = 'default',
  duration = 3000,
  isClosable = true,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show toast
    setTimeout(() => setIsVisible(true), 10);

    // Auto hide
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(id), 300);
  };

  return (
    <div
      className={toastVariants({ 
        variant,
        className: `
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}
          ${isClosable ? 'cursor-pointer' : ''}
        `
      })}
      onClick={isClosable ? handleClose : undefined}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        {isClosable && (
          <button
            onClick={handleClose}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: ToastProps[];
  onRemoveToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={onRemoveToast}
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer, toastVariants };