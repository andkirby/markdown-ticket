import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'
import * as React from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

const modalVariants = cva(
  'modal-content',
  {
    variants: {
      size: {
        sm: 'sm:max-w-lg',
        md: 'sm:max-w-xl',
        lg: 'sm:max-w-3xl',
        xl: 'sm:max-w-5xl',
        full: 'sm:max-w-full',
      },
      variant: {
        default: 'bg-white',
        dark: 'bg-gray-800',
        success: 'bg-green-50',
        warning: 'bg-yellow-50',
        error: 'bg-red-50',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
)

interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof modalVariants> {
  isOpen: boolean
  onClose: () => void
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  overlayClassName?: string
  children: React.ReactNode
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    className,
    size,
    variant,
    isOpen,
    onClose,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    overlayClassName,
    children,
    ...props
  }, _ref) => { // ref not used
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }, [isOpen, closeOnEscape, onClose])

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          closeOnOverlayClick
          && modalRef.current
          && !modalRef.current.contains(event.target as Node)
        ) {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen, closeOnOverlayClick, onClose])

    if (!isOpen)
      return null

    const modalContent = (
      <div className={cn('modal', overlayClassName)}>
        <div className="flex min-h-[100dvh] items-center justify-center p-4">
          {/* Background overlay */}
          <div
            className="modal-overlay"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal content */}
          <div
            ref={modalRef}
            className={cn(modalVariants({ size, variant }), 'relative', className)}
            {...props}
          >
            {children}
          </div>
        </div>
      </div>
    )

    return createPortal(modalContent, document.body)
  },
)

Modal.displayName = 'Modal'

interface ModalHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  onClose?: () => void
  showCloseButton?: boolean
  closeTestId?: string
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({
    className,
    title,
    description,
    onClose,
    showCloseButton = true,
    closeTestId,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('modal__header', className)}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="modal__title">
              {title}
            </h3>
          )}
          {description && (
            <p className="modal__description">
              {description}
            </p>
          )}
          {children}
        </div>
        {showCloseButton && (
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            {...(closeTestId && { 'data-testid': closeTestId })}
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    )
  },
)

ModalHeader.displayName = 'ModalHeader'

interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('modal__body', className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

ModalBody.displayName = 'ModalBody'

interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between'
}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, justify = 'end', children, ...props }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }

    return (
      <div
        ref={ref}
        className={cn('modal__footer', justifyClasses[justify], className)}
        {...props}
      >
        {children}
      </div>
    )
  },
)

ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalBody, ModalFooter, ModalHeader }
