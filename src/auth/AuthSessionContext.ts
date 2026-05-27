import type { AccessMode, AuthAccessIndicator, AuthCapabilities, SessionStatus } from '@mdt/domain-contracts'
import { createContext, useContext } from 'react'

export type { AccessMode, AuthAccessIndicator, SessionStatus } from '@mdt/domain-contracts'

export interface AuthSessionContextValue extends AuthCapabilities {
  accessMode: AccessMode
  accessIndicator: AuthAccessIndicator
  sessionStatus: SessionStatus
  unlock: (token: string) => Promise<void>
  lock: () => Promise<void>
  markLocked: () => void
  markReadOnly: (source?: 'public' | 'shared') => void
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
