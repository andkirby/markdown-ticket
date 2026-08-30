import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Modal, ModalBody } from '../ui/Modal'

interface TraceGraphShellProps {
  isOpen: boolean
  projectCode: string
  ticketCode: string
  error?: string | null
  onClose: () => void
}

export function TraceGraphShell({
  isOpen,
  projectCode,
  ticketCode,
  error,
  onClose,
}: TraceGraphShellProps) {
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      embedded: '1',
      project: projectCode,
      ticket: ticketCode,
    })

    return `/spec-trace/trace-dashboard.html?${params.toString()}`
  }, [projectCode, ticketCode])

  useEffect(() => {
    if (!isOpen)
      return

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin)
        return
      if (event.data?.type !== 'spec-trace:close')
        return

      onClose()
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isOpen, onClose])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      closeOnOverlayClick={false}
      overlayClassName="modal--viewport"
      className="trace-graph-shell__modal"
      data-testid="trace-graph-shell"
    >
      <ModalBody className="trace-graph-shell">
        <button
          type="button"
          className="trace-graph-shell__back"
          aria-label="Back to ticket"
          onClick={onClose}
        >
          <ArrowLeft aria-hidden="true" />
          <span>Back</span>
        </button>

        <div className="trace-graph-shell__content">
          {error
            ? (
                <div className="trace-graph-shell__error" role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <h2>Trace store unavailable</h2>
                  <p>{error}</p>
                </div>
              )
            : (
                <iframe
                  className="trace-graph-shell__frame"
                  src={iframeSrc}
                  title={`${ticketCode} Trace Graph`}
                />
              )}
        </div>
      </ModalBody>
    </Modal>
  )
}
