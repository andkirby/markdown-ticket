import type { AccessMode, SessionStatus } from '@mdt/domain-contracts'
import { useEffect, useRef, useState } from 'react'
import { authFetch } from '../../../auth/authFetch'
import { syncSSEAccessMode } from '../../../services/sseClient'

export interface UseAuthGateParams {
  accessMode: AccessMode
  sessionStatus: SessionStatus
  unlock: (token: string) => Promise<unknown>
  lock: () => Promise<unknown>
  markLocked: () => void
  markOwnerAdmin: () => void
  refreshProjects: () => Promise<unknown>
  /**
   * Shell-side side effect run BEFORE `lock()` in handleLock — the shell
   * closes its overlays (add/edit project, settings) first. Preserves the
   * original close-then-lock ordering (ProjectRouteHandler L193–201 pre-3d).
   */
  onBeforeLock: () => void
}

/**
 * Auth gate for the project route (controlled refactor 3d).
 *
 * Owns the session-unlock error, the owner-unlock modal state, the
 * owner-admin refresh-once guard (`ownerRefreshRef`), and the auth refresh
 * in-flight flag. Effects 1–2 (owner-admin refresh, unlock-error sync) and
 * all four handlers moved verbatim from ProjectRouteHandler.
 *
 * This hook must be the FIRST of the route hooks (its effects are effects 1–2
 * of the pinned order, before useProjectRouteValidation — plan INV-6).
 */
export function useAuthGate({
  accessMode,
  sessionStatus,
  unlock,
  lock,
  markLocked,
  markOwnerAdmin,
  refreshProjects,
  onBeforeLock,
}: UseAuthGateParams) {
  const [unlockError, setUnlockError] = useState<string | null>(null)
  const [authRefreshInFlight, setAuthRefreshInFlight] = useState(false)
  const [showOwnerUnlock, setShowOwnerUnlock] = useState(false)
  const [ownerUnlockError, setOwnerUnlockError] = useState<string | null>(null)
  const ownerRefreshRef = useRef(false)

  const handleUnlock = async (token: string) => {
    setUnlockError(null)
    await unlock(token)
  }

  const handleLock = async () => {
    onBeforeLock()
    await lock()
    await refreshProjects().catch((err) => {
      console.error('Failed to refresh projects after lock:', err)
    })
  }

  const handleUnlockClick = () => {
    if (accessMode === 'read-only') {
      setOwnerUnlockError(null)
      setShowOwnerUnlock(true)
      return
    }

    const tokenInput = document.querySelector<HTMLInputElement>(
      '[data-testid="auth-token-input"]',
    )
    if (tokenInput) {
      tokenInput.focus()
      return
    }

    markLocked()
  }

  const handleOwnerUnlock = async (token: string) => {
    setOwnerUnlockError(null)
    try {
      const response = await authFetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        setOwnerUnlockError('Owner token was not accepted.')
        return
      }

      markOwnerAdmin()
      syncSSEAccessMode('owner-admin', { forceReconnect: true })
      setShowOwnerUnlock(false)
    }
    catch {
      setOwnerUnlockError('Owner token was not accepted.')
    }
  }

  useEffect(() => {
    if (accessMode !== 'owner-admin') {
      ownerRefreshRef.current = false
      return
    }

    if (ownerRefreshRef.current)
      return

    ownerRefreshRef.current = true
    setAuthRefreshInFlight(true)
    refreshProjects()
      .catch((err) => {
        console.error('Failed to refresh projects after unlock:', err)
      })
      .finally(() => setAuthRefreshInFlight(false))
  }, [accessMode, refreshProjects])

  useEffect(() => {
    if (accessMode === 'locked' && sessionStatus === 'error') {
      setUnlockError('Token was not accepted.')
      return
    }

    if (sessionStatus !== 'error') {
      setUnlockError(null)
    }
  }, [accessMode, sessionStatus])

  return {
    unlockError,
    ownerUnlockError,
    showOwnerUnlock,
    setShowOwnerUnlock,
    authRefreshInFlight,
    handleUnlock,
    handleLock,
    handleUnlockClick,
    handleOwnerUnlock,
  }
}
