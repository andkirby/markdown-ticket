import { useEffect } from 'react'
import { useAuthSession } from '../auth/AuthSessionContext'
import { loadTicketKeyOptions } from '../config/ticketKeyConfig'

/**
 * MDT-244: one shared read of the ticket-key display options once the
 * session is owner-capable. GET /api/config/selector is owner-gated
 * server-side (OwnerOnlyApiPrefix.CONFIG), so sessions without owner
 * capability never fetch and simply keep defaults — no owner-only
 * endpoint probes from viewer sessions (MDT-177 read-access contract).
 */
export function TicketKeyOptionsLoader() {
  const { canUseOwnerEndpoints } = useAuthSession()
  useEffect(() => {
    if (canUseOwnerEndpoints)
      void loadTicketKeyOptions()
  }, [canUseOwnerEndpoints])
  return null
}
