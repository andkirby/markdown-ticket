import type { ReactNode } from 'react'
import type { AccessMode, AuthAccessIndicator, AuthSessionContextValue, SessionStatus } from './AuthSessionContext'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { syncSSEAccessMode } from '../services/sseClient'
import { authFetch, isAuthRequiredResponse, isBackendDownError, isBackendDownResponse } from './authFetch'
import { AuthSessionContext } from './AuthSessionContext'

type AuthEndpointState = 'checking' | 'enabled' | 'disabled' | 'unsupported'

interface SessionResponse {
  authEnabled?: boolean
  authenticated?: boolean
  readAuthenticated?: boolean
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [accessMode, setAccessMode] = useState<AccessMode>('unknown')
  const [accessIndicator, setAccessIndicator] = useState<AuthAccessIndicator>('none')
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking')
  const [authEndpointState, setAuthEndpointState] = useState<AuthEndpointState>('checking')

  const markLocked = useCallback(() => {
    setAccessMode('locked')
    setAccessIndicator('none')
    setSessionStatus('locked')
  }, [])

  const markReadOnly = useCallback((source: 'public' | 'shared' = 'shared') => {
    setAuthEndpointState('enabled')
    setAccessMode('read-only')
    setAccessIndicator(source === 'shared' ? 'shared' : 'none')
    setSessionStatus('unlocked')
  }, [])

  const markBackendDown = useCallback(() => {
    setAccessMode('backend-down')
    setAccessIndicator('none')
    setSessionStatus('error')
  }, [])

  const markNoAuthDev = useCallback(() => {
    setAuthEndpointState(current => current === 'enabled' ? current : 'disabled')
    setAccessMode(current => current === 'read-only' ? current : 'no-auth-dev')
    setAccessIndicator(current => current === 'shared' ? current : 'none')
    setSessionStatus('unlocked')
  }, [])

  const markOwnerAdmin = useCallback(() => {
    setAuthEndpointState('enabled')
    setAccessMode('owner-admin')
    setAccessIndicator('owner')
    setSessionStatus('unlocked')
  }, [])

  const markUnauthenticatedSession = useCallback(() => {
    setAuthEndpointState('enabled')
    setAccessMode((current) => {
      if (
        current === 'backend-down'
        || current === 'no-auth-dev'
        || current === 'locked'
      ) {
        return current
      }

      return 'read-only'
    })
    setAccessIndicator('none')
    setSessionStatus(current => current === 'checking' ? 'unlocked' : current)
  }, [])

  const markProjectListLoaded = useCallback((_projectCount: number) => {
    setAccessMode((current) => {
      if (current === 'owner-admin' || current === 'read-only' || current === 'no-auth-dev' || current === 'backend-down') {
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
      const response = await authFetch('/api/auth/session', { method: 'DELETE', ownerIntent: true })
      if (isBackendDownResponse(response)) {
        markBackendDown()
        return
      }

      if (!response.ok && !isAuthRequiredResponse(response)) {
        setSessionStatus('error')
        return
      }

      markUnauthenticatedSession()
    }
    catch (error) {
      if (isBackendDownError(error)) {
        markBackendDown()
        return
      }

      setSessionStatus('error')
    }
  }, [markBackendDown, markUnauthenticatedSession])

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

        if (session.readAuthenticated) {
          markReadOnly('shared')
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
  }, [markBackendDown, markNoAuthDev, markOwnerAdmin, markReadOnly, markUnauthenticatedSession])

  useEffect(() => {
    syncSSEAccessMode(accessMode)
  }, [accessMode])

  const value = useMemo<AuthSessionContextValue>(() => {
    const ownerCapable = accessMode === 'owner-admin' || accessMode === 'no-auth-dev'

    return {
      accessMode,
      accessIndicator,
      sessionStatus,
      canWriteTickets: ownerCapable,
      canManageProjects: ownerCapable,
      canManageSharing: ownerCapable,
      canUseOwnerEndpoints: ownerCapable,
      unlock,
      lock,
      markLocked,
      markReadOnly,
      markBackendDown,
      markNoAuthDev,
      markOwnerAdmin,
      markProjectListLoaded,
    }
  }, [
    accessMode,
    accessIndicator,
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
