import type {
  ListedReadToken,
  ReadTokenCreationResponse,
  ReadTokenInviteResponse,
  ReadTokenListResponse,
} from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { authFetch } from '../../auth/authFetch'
import { getProjectCode } from '../../utils/projectUtils'

interface ReadAccessTokensProps {
  projects: Project[]
  linkOrigin: string
  onLinkOriginChange: (origin: string) => void
}

interface CreationResult {
  name: string
  rawToken: string
}

export function ReadAccessTokens({ projects, linkOrigin, onLinkOriginChange }: ReadAccessTokensProps) {
  const [tokens, setTokens] = useState<ListedReadToken[]>([])
  const [name, setName] = useState('')
  const [expiryDays, setExpiryDays] = useState('7')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [originOptions, setOriginOptions] = useState<string[]>([])
  const [originNotice, setOriginNotice] = useState<string | null>(null)
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null)
  const [inviteUrl, setInviteUrl] = useState('')
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')

  const projectOptions = useMemo(() => projects.map(project => ({
    code: getProjectCode(project),
    name: project.project.name,
  })), [projects])
  const effectiveLinkOrigin = useMemo(() => (
    originOptions.includes(linkOrigin) ? linkOrigin : ''
  ), [originOptions, linkOrigin])

  const loadTokens = useCallback(async () => {
    const response = await authFetch('/api/read-tokens')
    if (!response.ok) {
      return
    }

    const data = await response.json() as ReadTokenListResponse
    setTokens(data.tokens)

    const nextOrigins = data.linkOrigins.options
    setOriginOptions(nextOrigins)
    setOriginNotice(data.linkOrigins.notice ?? null)

    const serverSelectedOrigin = data.linkOrigins.selectedOrigin
    if (serverSelectedOrigin && serverSelectedOrigin !== linkOrigin) {
      onLinkOriginChange(serverSelectedOrigin)
    }
    else if (!serverSelectedOrigin && linkOrigin) {
      onLinkOriginChange('')
    }
  }, [onLinkOriginChange, linkOrigin])

  useEffect(() => {
    void loadTokens()
  }, [loadTokens])

  const toggleProject = useCallback((code: string, checked: boolean) => {
    setSelectedProjects(current => checked
      ? Array.from(new Set([...current, code]))
      : current.filter(projectCode => projectCode !== code))
  }, [])

  const createNamedAccess = useCallback(async () => {
    setStatus('saving')
    setInviteUrl('')
    try {
      const days = Number(expiryDays)
      const expiresAt = Number.isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null
      const response = await authFetch('/api/read-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ownerIntent: true,
        body: JSON.stringify({
          name,
          projectRefs: selectedProjects,
          expiresAt,
        }),
      })

      if (!response.ok) {
        throw new Error('Read access was not created')
      }

      const created = await response.json() as ReadTokenCreationResponse
      setCreationResult({ name: created.name, rawToken: created.rawToken })
      setName('')
      setSelectedProjects([])
      setTokens(current => [created, ...current])
      setStatus('idle')
    }
    catch {
      setStatus('error')
    }
  }, [expiryDays, name, selectedProjects])

  const generateInvite = useCallback(async (token: ListedReadToken) => {
    setInviteUrl('')
    if (token.status !== 'active' || !effectiveLinkOrigin) {
      return
    }

    const response = await authFetch(`/api/read-tokens/${encodeURIComponent(token.id)}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ownerIntent: true,
      body: JSON.stringify({ origin: effectiveLinkOrigin }),
    })

    if (!response.ok) {
      return
    }

    const data = await response.json() as ReadTokenInviteResponse
    setInviteUrl(data.inviteUrl)
  }, [effectiveLinkOrigin])

  const revokeToken = useCallback(async (tokenId: string) => {
    const response = await authFetch(`/api/read-tokens/${encodeURIComponent(tokenId)}/revoke`, {
      method: 'POST',
      ownerIntent: true,
    })

    if (response.ok) {
      const revoked = await response.json() as ListedReadToken
      setTokens(current => current.map(token => token.id === revoked.id ? revoked : token))
      setInviteUrl('')
    }
    setPendingRevokeId(null)
  }, [])

  return (
    <div className="settings-group" data-testid="sharing-named-access-section">
      <label className="settings-label">Named read access</label>
      <p className="settings-desc">Create a read-only session scope across selected projects.</p>

      {originNotice && (
        <p data-testid="sharing-link-origin-fallback-notice" className="settings-desc">{originNotice}</p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px]">
        <input
          data-testid="sharing-named-access-name-input"
          value={name}
          onChange={event => setName(event.target.value)}
          className="settings-input"
          placeholder="Name"
        />
        <input
          data-testid="sharing-named-access-expiry-input"
          value={expiryDays}
          onChange={event => setExpiryDays(event.target.value)}
          className="settings-input"
          inputMode="numeric"
          aria-label="Expiry days"
        />
      </div>

      <div className="settings-checkbox-list">
        {projectOptions.map(project => (
          <label key={project.code} className="settings-checkbox-row">
            <input
              type="checkbox"
              data-testid={`sharing-named-access-project-${project.code}`}
              checked={selectedProjects.includes(project.code)}
              onChange={event => toggleProject(project.code, event.target.checked)}
              className="settings-checkbox"
            />
            <span>{project.code}</span>
          </label>
        ))}
      </div>

      <button
        data-testid="sharing-create-named-access"
        type="button"
        onClick={createNamedAccess}
        disabled={status === 'saving' || !name.trim() || selectedProjects.length === 0}
        className="settings-action-btn mt-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'saving' ? 'Creating...' : 'Create'}
      </button>
      {status === 'error' && <p className="settings-desc text-destructive">Read access was not created.</p>}

      {creationResult && (
        <div data-testid="sharing-creation-result" className="mt-3 rounded-md border border-border p-3">
          <p className="settings-label">{creationResult.name}</p>
          <input value={creationResult.rawToken} readOnly className="settings-input mt-2 font-mono text-xs" />
          <button
            type="button"
            data-testid="sharing-dismiss-creation-result"
            onClick={() => setCreationResult(null)}
            className="settings-action-btn mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {inviteUrl && (
        <input data-testid="sharing-invite-url" value={inviteUrl} readOnly className="settings-input mt-3 font-mono text-xs" />
      )}

      <div data-testid="sharing-named-access-list" className="mt-3 space-y-2">
        {tokens.map(token => (
          <div
            key={token.id}
            data-testid="sharing-named-access-row"
            data-access-name={token.name}
            className="rounded-md border border-border p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="settings-label">{token.name}</p>
                <p className="settings-desc">
                  {token.projectRefs.join(', ')}
                  {' · '}
                  {token.status}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="sharing-generate-invite"
                  onClick={() => void generateInvite(token)}
                  disabled={token.status !== 'active' || !effectiveLinkOrigin}
                  className="settings-action-btn"
                  data-disabled={token.status !== 'active' || !effectiveLinkOrigin ? 'true' : undefined}
                >
                  Invite
                </button>
                <button
                  type="button"
                  data-testid="sharing-revoke-named-access"
                  onClick={() => setPendingRevokeId(token.id)}
                  className="settings-action-btn"
                  data-disabled={token.status === 'revoked' ? 'true' : undefined}
                >
                  Revoke
                </button>
              </div>
            </div>
            {pendingRevokeId === token.id && (
              <button
                type="button"
                data-testid="confirm-button"
                onClick={() => void revokeToken(token.id)}
                className="settings-action-btn mt-2"
              >
                Confirm revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
