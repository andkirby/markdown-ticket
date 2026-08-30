import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { isBackendDownError } from '../../auth/authFetch'
import { useAuthSession } from '../../auth/AuthSessionContext'
import { buildProjectPath } from '../../routes'
import { syncSSEAccessMode } from '../../services/sseClient'
import { exchangeInviteCode } from './inviteExchange'

export function InviteRouteHandler() {
  const { code: pathCode } = useParams<{ code: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { markReadOnly, markBackendDown } = useAuthSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function exchangeInviteSession(): Promise<void> {
      const code = searchParams.get('code') || pathCode
      if (!code) {
        setError('Invite link was not accepted')
        return
      }

      try {
        const response = await exchangeInviteCode(code)

        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (response.backendDown) {
            markBackendDown()
            return
          }

          window.history.replaceState(null, '', '/invite/error')
          setError(`Invite link was not accepted (${response.status})`)
          return
        }

        const projectCode = response.projectRefs[0]
        if (!projectCode) {
          setError('Invite link returned no project')
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

        setError('Invite link was not accepted')
      }
    }

    void exchangeInviteSession()

    return () => {
      cancelled = true
    }
  }, [markBackendDown, markReadOnly, navigate, pathCode, searchParams])

  if (error) {
    return (
      <div
        data-testid="sharing-invite-error"
        className="min-h-[100dvh] bg-background flex items-center justify-center p-6 text-sm text-destructive"
      >
        {error}
      </div>
    )
  }

  return (
    <div
      data-testid="invite-loading"
      className="min-h-[100dvh] bg-background flex items-center justify-center"
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
