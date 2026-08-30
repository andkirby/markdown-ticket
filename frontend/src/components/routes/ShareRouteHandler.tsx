import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authFetch, isBackendDownError, isBackendDownResponse } from '../../auth/authFetch'
import { useAuthSession } from '../../auth/AuthSessionContext'
import { buildProjectPath } from '../../routes'
import { syncSSEAccessMode } from '../../services/sseClient'
import { RouteErrorModal } from '../RouteErrorModal'

export function ShareRouteHandler() {
  const { shareId } = useParams<{ shareId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { markReadOnly, markBackendDown } = useAuthSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function exchangeShareSession(): Promise<void> {
      if (!shareId) {
        setError('Invalid share link')
        return
      }

      if (searchParams.has('code')) {
        window.history.replaceState(
          null,
          '',
          `/share/${encodeURIComponent(shareId)}`,
        )
      }

      try {
        const response = await authFetch(
          `/api/share/${encodeURIComponent(shareId)}/session`,
          { method: 'POST' },
        )

        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (isBackendDownResponse(response)) {
            markBackendDown()
            return
          }

          setError(
            response.status === 404
              ? 'Share link not found'
              : 'Share link could not be opened',
          )
          return
        }

        const data = (await response.json()) as {
          project?: { id?: string, project?: { code?: string } }
        }
        const projectCode = data.project?.project?.code || data.project?.id

        if (!projectCode) {
          setError('Share link returned no project')
          return
        }

        markReadOnly()
        syncSSEAccessMode('read-only', { forceReconnect: true })
        navigate(buildProjectPath(projectCode), { replace: true })
      }
      catch (err) {
        if (cancelled) {
          return
        }

        if (isBackendDownError(err)) {
          markBackendDown()
          return
        }

        setError('Share link could not be opened')
      }
    }

    void exchangeShareSession()

    return () => {
      cancelled = true
    }
  }, [markBackendDown, markReadOnly, navigate, searchParams, shareId])

  if (error) {
    return <RouteErrorModal error={error} />
  }

  return (
    <div
      data-testid="share-loading"
      className="min-h-[100dvh] bg-background flex items-center justify-center"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
