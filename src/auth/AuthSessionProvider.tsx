import type { ReactNode } from 'react'
import type { AccessMode, AuthSessionContextValue, SessionStatus } from './AuthSessionContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { syncSSEAccessMode } from '../services/sseClient'
import { authFetch, isAuthRequiredResponse, isBackendDownError, isBackendDownResponse } from './authFetch'
import { AuthSessionContext } from './AuthSessionContext'

type AuthEndpointState = 'checking' | 'enabled' | 'disabled' | 'unsupported'

interface SessionResponse {
  authEnabled?: boolean
  authenticated?: boolean
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [accessMode, setAccessMode] = useState<AccessMode>('unknown')
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking')
  const [authEndpointState, setAuthEndpointState] = useState<AuthEndpointState>('checking')

  const markLocked = useCallback(() => {
    setAccessMode('locked')
    setSessionStatus('locked')
  }, [])

  const markReadOnly = useCallback(() => {
    setAuthEndpointState('enabled')
    setAccessMode('read-only')
    setSessionStatus('unlocked')
  }, [])

  const markBackendDown = useCallback(() => {
    setAccessMode('backend-down')
    setSessionStatus('error')
  }, [])

  const markNoAuthDev = useCallback(() => {
    setAuthEndpointState(current => current === 'enabled' ? current : 'disabled')
    setAccessMode('no-auth-dev')
    setSessionStatus('unlocked')
  }, [])

  const markOwnerAdmin = useCallback(() => {
    setAuthEndpointState('enabled')
    setAccessMode('owner-admin')
    setSessionStatus('unlocked')
  }, [])

  const markUnauthenticatedSession = useCallback(() => {
    setAuthEndpointState('enabled')
    setAccessMode((current) => {
      if (
        current === 'backend-down'
        || current === 'owner-admin'
        || current === 'no-auth-dev'
        || current === 'locked'
      ) {
        return current
      }

      return 'read-only'
    })
    setSessionStatus(current => current === 'checking' ? 'unlocked' : current)
  }, [])

  const markProjectListLoaded = useCallback((_projectCount: number) => {
    setAccessMode((current) => {
      if (current === 'owner-admin' || current === 'no-auth-dev' || current === 'backend-down') {
        return current
      }

      if (authEndpointState === 'disabled' || authEndpointState === 'unsupported') {
        return 'no-auth-dev'
      }

      if (authEndpointState === 'checking') {
        return current
      }

      return current === 'unknown' ? 'read-only' : current
    })
    setSessionStatus((current) => {
      if (authEndpointState === 'disabled' || authEndpointState === 'unsupported') {
        return 'unlocked'
      }
      if (authEndpointState === 'checking') {
        return current
      }
      return current === 'checking' ? 'unlocked' : current
    })
  }, [authEndpointState])

  const unlock = useCallback(async (token: string) => {
    setSessionStatus('unlocking')
    try {
      const response = await authFetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        if (isAuthRequiredResponse(response)) {
          const readResponse = await authFetch('/api/auth/read-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })

          if (readResponse.ok) {
            markReadOnly()
            syncSSEAccessMode('read-only', { forceReconnect: true })
            return
          }

          if (isBackendDownResponse(readResponse)) {
            markBackendDown()
            return
          }

          setAccessMode('locked')
          setSessionStatus('error')
          return
        }
        if (isBackendDownResponse(response)) {
          markBackendDown()
          return
        }
        setSessionStatus('error')
        return
      }

      markOwnerAdmin()
    }
    catch (error) {
      if (isBackendDownError(error)) {
        markBackendDown()
        return
      }
      setSessionStatus('error')
    }
    finally {
      token = ''
      void token
    }
  }, [markBackendDown, markOwnerAdmin, markReadOnly])

  const lock = useCallback(async () => {
    try {
      await authFetch('/api/auth/session', { method: 'DELETE', ownerIntent: true })
    }
    finally {
      markLocked()
    }
  }, [markLocked])

  useEffect(() => {
    let cancelled = false

    async function checkSession(): Promise<void> {
      try {
        const response = await authFetch('/api/auth/session')
        if (cancelled) {
          return
        }

        if (!response.ok) {
          if (response.status === 404) {
            setAuthEndpointState('unsupported')
            setAccessMode(current => current === 'unknown' ? 'no-auth-dev' : current)
            setSessionStatus(current => current === 'checking' ? 'unlocked' : current)
            return
          }

          if (isBackendDownResponse(response)) {
            markBackendDown()
          }
          else {
            markUnauthenticatedSession()
          }
          return
        }

        const session = await response.json() as SessionResponse
        if (cancelled) {
          return
        }

        if (session.authEnabled === false) {
          markNoAuthDev()
          return
        }

        if (session.authenticated) {
          markOwnerAdmin()
          return
        }

        markUnauthenticatedSession()
      }
      catch (error) {
        if (!cancelled && isBackendDownError(error)) {
          markBackendDown()
        }
      }
    }

    void checkSession()

    return () => {
      cancelled = true
    }
  }, [markBackendDown, markNoAuthDev, markOwnerAdmin, markUnauthenticatedSession])

  useEffect(() => {
    syncSSEAccessMode(accessMode)
  }, [accessMode])

  const value = useMemo<AuthSessionContextValue>(() => ({
    accessMode,
    sessionStatus,
    canManageProjects: accessMode === 'owner-admin' || accessMode === 'no-auth-dev',
    unlock,
    lock,
    markLocked,
    markReadOnly,
    markBackendDown,
    markNoAuthDev,
    markOwnerAdmin,
    markProjectListLoaded,
  }), [
    accessMode,
    sessionStatus,
    unlock,
    lock,
    markLocked,
    markReadOnly,
    markBackendDown,
    markNoAuthDev,
    markOwnerAdmin,
    markProjectListLoaded,
  ])

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  )
}
