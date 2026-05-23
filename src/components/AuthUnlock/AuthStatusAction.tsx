import type { AccessMode } from '@/auth/AuthSessionContext'

interface AuthStatusActionProps {
  accessMode: AccessMode
  onLock?: () => Promise<void> | void
  onUnlockClick?: () => void
}

export function AuthStatusAction({ accessMode, onLock, onUnlockClick }: AuthStatusActionProps) {
  if (accessMode === 'no-auth-dev') {
    return null
  }

  const owner = accessMode === 'owner-admin'
  const canUnlock = accessMode === 'locked' || accessMode === 'read-only'
  const label = {
    'unknown': 'Checking auth',
    'locked': 'Locked',
    'read-only': 'Read only',
    'owner-admin': 'Owner session',
    'no-auth-dev': 'Local mode',
    'backend-down': 'Backend unavailable',
  }[accessMode]

  return (
    <div className="flex items-center gap-2">
      <span data-testid="auth-status-chip" className="rounded-full border border-border px-2 py-1 text-xs">
        {label}
      </span>
      {owner
        ? (
            <button data-testid="auth-lock-button" type="button" className="text-sm" onClick={() => void onLock?.()}>
              Lock
            </button>
          )
        : canUnlock
          ? (
              <button data-testid="auth-unlock-affordance" type="button" className="text-sm" onClick={onUnlockClick}>
                Unlock
              </button>
            )
          : null}
    </div>
  )
}
