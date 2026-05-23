import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

interface AuthUnlockPanelProps {
  error?: string | null
  unlocking?: boolean
  onUnlock?: (token: string) => Promise<void> | void
}

export function AuthUnlockPanel({ error, unlocking = false, onUnlock }: AuthUnlockPanelProps) {
  const [token, setToken] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [error])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submittedToken = token
    setToken('')
    await onUnlock?.(submittedToken)
  }

  return (
    <section data-testid="auth-unlock-panel" className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Board is locked</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This server accepts an owner token for management or a read token for scoped read-only access.
      </p>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium" htmlFor="auth-token-input">Access token</label>
        <input
          ref={inputRef}
          id="auth-token-input"
          data-testid="auth-token-input"
          type="password"
          value={token}
          disabled={unlocking}
          onChange={event => setToken(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
          autoComplete="current-password"
        />
        {error && (
          <p data-testid="auth-unlock-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          data-testid="auth-unlock-submit"
          type="submit"
          disabled={unlocking || token.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          Unlock
        </button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        Tokens are exchanged for a secure server session and are not stored in browser storage.
      </p>
    </section>
  )
}
