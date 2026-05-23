import { createContext, useContext } from 'react'

export type AccessMode = 'unknown' | 'locked' | 'read-only' | 'owner-admin' | 'no-auth-dev' | 'backend-down'
export type SessionStatus = 'checking' | 'locked' | 'unlocking' | 'unlocked' | 'error'

export interface AuthSessionContextValue {
  accessMode: AccessMode
  sessionStatus: SessionStatus
  canManageProjects: boolean
  unlock: (token: string) => Promise<void>
  lock: () => Promise<void>
  markLocked: () => void
  markReadOnly: () => void
  markBackendDown: () => void
  markNoAuthDev: () => void
  markOwnerAdmin: () => void
  markProjectListLoaded: (projectCount: number) => void
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext)
  if (!context) {
    throw new Error('useAuthSession must be used within AuthSessionProvider')
  }

  return context
}
