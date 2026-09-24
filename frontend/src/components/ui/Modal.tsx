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
  split: 'modal-content--split',
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
          // Radix menus (dropdown/context) render in a portal on document.body;
          // interacting with one is not an overlay click.
          if ((event.target as HTMLElement).closest?.('[data-radix-popper-content-wrapper]'))
            return
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

interface ModalCloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void
}

/* The single × source for every modal surface (header chrome, ticket viewer,
   side pane). One component, one style (.modal__close); positioning variants
   like --absolute / --split are passed via className and only place it. */
const ModalCloseButton = React.forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  ({ onClose, className, 'aria-label': ariaLabel = 'Close', ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={cn('modal__close', className)}
      onClick={onClose}
      {...props}
    >
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  ),
)
ModalCloseButton.displayName = 'ModalCloseButton'

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
          <ModalCloseButton
            onClose={onClose ?? (() => {})}
            className="modal__close--absolute"
            tabIndex={closeButtonTabIndex}
            {...(closeTestId && { 'data-testid': closeTestId })}
          />
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

export { Modal, ModalBody, ModalCloseButton, ModalFooter, ModalHeader }
