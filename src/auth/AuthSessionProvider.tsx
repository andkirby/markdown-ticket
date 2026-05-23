import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { syncSSEAccessMode } from '../services/sseClient'
import { authFetch, isAuthRequiredResponse, isBackendDownError, isBackendDownResponse } from './authFetch'

export type AccessMode = 'unknown' | 'locked' | 'owner-admin' | 'no-auth-dev' | 'backend-down'
export type SessionStatus = 'checking' | 'locked' | 'unlocking' | 'unlocked' | 'error'
type AuthEndpointState = 'checking' | 'enabled' | 'disabled' | 'unsupported'

export interface AuthSessionContextValue {
  accessMode: AccessMode
  sessionStatus: SessionStatus
  canManageProjects: boolean
  unlock: (token: string) => Promise<void>
  lock: () => Promise<void>
  markLocked: () => void
  markBackendDown: () => void
  markNoAuthDev: () => void
  markOwnerAdmin: () => void
  markProjectListLoaded: (projectCount: number) => void
}

interface SessionResponse {
  authEnabled?: boolean
  authenticated?: boolean
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [accessMode, setAccessMode] = useState<AccessMode>('unknown')
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking')
  const [authEndpointState, setAuthEndpointState] = useState<AuthEndpointState>('checking')

  const markLocked = useCallback(() => {
    setAccessMode('locked')
    setSessionStatus('locked')
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
      ) {
        return current
      }

      return 'locked'
    })
    setSessionStatus(current => current === 'checking' ? 'locked' : current)
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

      return current === 'unknown' ? 'locked' : current
    })
    setSessionStatus((current) => {
      if (authEndpointState === 'disabled' || authEndpointState === 'unsupported') {
        return 'unlocked'
      }
      if (authEndpointState === 'checking') {
        return current
      }
      return current === 'checking' ? 'locked' : current
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
  }, [markBackendDown, markOwnerAdmin])

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

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext)
  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider')
  }

  return context
}
