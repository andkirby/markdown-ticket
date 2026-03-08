import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { findProjectByTicketKey, normalizeTicketKey } from '../utils/routing'
import { extractSubDocPath, validateSubDocPath } from '../utils/subdocPathValidation'
import { RouteErrorModal } from './RouteErrorModal'

export function DirectTicketAccess() {
  const { ticketKey } = useParams<{ ticketKey: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleTicketAccess = async () => {
      if (!ticketKey) {
        setError('Invalid ticket key')
        setLoading(false)
        return
      }

      try {
        const normalizedKey = normalizeTicketKey(ticketKey)
        const projectCode = await findProjectByTicketKey(normalizedKey)

        if (!projectCode) {
          setError(`Ticket '${ticketKey}' not found in any project`)
          setLoading(false)
          return
        }

        // MDT-094: Check if there's a sub-document path in the URL
        // The wildcard route captures everything after /ticket/:ticketKey/
        // We need to check the current pathname to extract the sub-document path
        const pathname = window.location.pathname
        const subDocPath = extractSubDocPath(pathname, normalizedKey)

        // Redirect to project with ticket modal and optional sub-document path
        const targetPath = subDocPath
          ? `/prj/${projectCode}/ticket/${normalizedKey}/${subDocPath}`
          : `/prj/${projectCode}/ticket/${normalizedKey}`

        navigate(targetPath, { replace: true })
      }
      catch {
        setError('Failed to find ticket')
        setLoading(false)
      }
    }

    handleTicketAccess()
  }, [ticketKey, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Finding ticket
            {ticketKey}
            ...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return <RouteErrorModal error={error} />
  }

  return null
}
