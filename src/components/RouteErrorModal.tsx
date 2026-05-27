import { AlertTriangle, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui'
import { Modal, ModalBody, ModalFooter } from './ui/Modal'

interface RouteErrorModalProps {
  error: string
  title?: string
  onClose?: () => void
}

export function RouteErrorModal({ error, title = 'Page Not Found', onClose }: RouteErrorModalProps) {
  const navigate = useNavigate()

  const handleGoHome = () => {
    navigate('/')
    onClose?.()
  }

  return (
    <Modal isOpen={true} onClose={onClose ?? handleGoHome} size="sm" data-testid="route-error">
      <ModalBody>
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h2 className="modal__title">{title}</h2>
        </div>

        <p className="text-muted-foreground mb-6">{error}</p>

        <ModalFooter justify="start">
          <Button onClick={handleGoHome} className="flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </ModalFooter>
      </ModalBody>
    </Modal>
  )
}
