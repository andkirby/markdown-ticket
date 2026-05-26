import type { AccessMode } from '@/auth/AuthSessionContext'

interface AuthStatusActionProps {
  accessMode: AccessMode
  onUnlockClick?: () => void
}

export function AuthStatusAction({ accessMode, onUnlockClick }: AuthStatusActionProps) {
  if (accessMode === 'no-auth-dev' || accessMode === 'read-only' || accessMode === 'owner-admin') {
    return null
  }

  const canUnlock = accessMode === 'locked'
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
      {canUnlock && (
        <button
          data-testid="auth-unlock-affordance"
          type="button"
          className="text-sm"
          onClick={onUnlockClick}
        >
          Unlock
        </button>
      )}
    </div>
  )
}
