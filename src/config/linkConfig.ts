export interface LinkConfig {
  enableAutoLinking: boolean
  enableTicketLinks: boolean
  enableDocumentLinks: boolean
}

const defaultLinkConfig: LinkConfig = {
  enableAutoLinking: true,
  enableTicketLinks: true,
  enableDocumentLinks: true,
}

/**
 * Link configuration is OWNER-level, FILE-level (UAT decision 2026-08-24):
 * CONFIG_DIR/config.toml [links], edited by owners via Settings - Advanced
 * (BackendConfigSection) or the config API. There is no browser-localStorage
 * override. Values are fetched once per session from /api/config/global and
 * merged over the built-in defaults.
 */
let globalLinkConfig: Partial<LinkConfig> | null = null
let globalFetchStarted = false
const subscribers = new Set<() => void>()

interface GlobalConfigLinks {
  links?: {
    enableAutoLinking?: boolean
    enableTicketLinks?: boolean
    enableDocumentLinks?: boolean
  }
}

/** Start the one-time global link-config fetch (safe to call repeatedly). */
export function ensureGlobalLinkConfig(): void {
  if (globalFetchStarted) {
    return
  }
  globalFetchStarted = true

  void import('../auth/authFetch')
    .then(async ({ authFetch }) => {
      const response = await authFetch('/api/config/global')
      if (!response.ok) {
        return
      }
      const data = (await response.json()) as GlobalConfigLinks
      const links = data?.links
      if (links && typeof links === 'object') {
        const next: Partial<LinkConfig> = {}
        if (typeof links.enableAutoLinking === 'boolean')
          next.enableAutoLinking = links.enableAutoLinking
        if (typeof links.enableTicketLinks === 'boolean')
          next.enableTicketLinks = links.enableTicketLinks
        if (typeof links.enableDocumentLinks === 'boolean')
          next.enableDocumentLinks = links.enableDocumentLinks
        globalLinkConfig = next
        for (const cb of subscribers) {
          cb()
        }
      }
    })
    .catch((error) => {
      console.warn('Failed to load global link config:', error)
    })
}

/** Subscribe to global link-config changes. Returns an unsubscribe function. */
export function subscribeGlobalLinkConfig(cb: () => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

export function getLinkConfig(): LinkConfig {
  return { ...defaultLinkConfig, ...globalLinkConfig }
}

// ── Test-only helpers ────────────────────────────────────────────────────

/** Test hook: override the loaded global config (owner/file-level values). */
export function __testSetGlobalLinkConfig(overrides: Partial<LinkConfig> | null): void {
  globalLinkConfig = overrides
}

/** Test hook: reset module state between tests. */
export function __testResetLinkConfig(): void {
  globalLinkConfig = null
  globalFetchStarted = false
}
