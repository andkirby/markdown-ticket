import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { normalizeTicketKey, findProjectByTicketKey } from '../utils/routing';
import { RouteErrorModal } from './RouteErrorModal';

export function DirectTicketAccess() {
  const { ticketKey } = useParams<{ ticketKey: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleTicketAccess = async () => {
      if (!ticketKey) {
        setError('Invalid ticket key');
        setLoading(false);
        return;
      }

      try {
        const normalizedKey = normalizeTicketKey(ticketKey);
        const projectCode = await findProjectByTicketKey(normalizedKey);
        
        if (!projectCode) {
          setError(`Ticket '${ticketKey}' not found in any project`);
          setLoading(false);
          return;
        }

        // Redirect to project with ticket modal
        navigate(`/prj/${projectCode}/ticket/${normalizedKey}`, { replace: true });
      } catch (err) {
        setError('Failed to find ticket');
        setLoading(false);
      }
    };

    handleTicketAccess();
  }, [ticketKey, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding ticket {ticketKey}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <RouteErrorModal error={error} />;
  }

  return null;
}
