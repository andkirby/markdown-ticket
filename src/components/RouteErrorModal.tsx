import { AlertTriangle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteErrorModalProps {
  error: string;
  onClose?: () => void;
}

export function RouteErrorModal({ error, onClose }: RouteErrorModalProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h2 className="text-lg font-semibold">Page Not Found</h2>
        </div>
        
        <p className="text-muted-foreground mb-6">{error}</p>
        
        <div className="flex space-x-3">
          <button
            onClick={handleGoHome}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-outline"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
