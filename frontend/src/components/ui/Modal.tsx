import * as React from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

/* Width tiers own their CSS in modal.css (.modal-content--*); `size` just
   picks the modifier. sm = Tailwind's 640px breakpoint. */
const MODAL_SIZE_CLASS = {
  sm: 'modal-content--sm',
  md: 'modal-content--md',
  lg: 'modal-content--lg',
  xl: 'modal-content--xl',
  full: 'modal-content--full',
} as const

type ModalSize = keyof typeof MODAL_SIZE_CLASS

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean
  onClose: () => void
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  showCloseButton?: boolean
  overlayClassName?: string
  size?: ModalSize
  children: React.ReactNode
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    className,
    size = 'xl',
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
        <div className="modal__container">
          {/* Background overlay */}
          <div
            className="modal-overlay"
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Modal content */}
          <div
            ref={modalRef}
            className={cn('modal-content', size && MODAL_SIZE_CLASS[size], className)}
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
  closeButtonTabIndex?: number
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({
    className,
    title,
    description,
    onClose,
    showCloseButton = true,
    closeTestId,
    closeButtonTabIndex,
    children,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('modal__header', className)}
        {...props}
      >
        {title && (
          <h1 className="modal__headline">
            {title}
          </h1>
        )}
        {description && (
          <p className="modal__description">
            {description}
          </p>
        )}
        {children}
        {showCloseButton && (
          <button
            type="button"
            aria-label="Close"
            className="modal__close--absolute"
            onClick={onClose}
            tabIndex={closeButtonTabIndex}
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
