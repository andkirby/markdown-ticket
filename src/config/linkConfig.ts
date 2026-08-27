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

const LINK_CONFIG_KEY = 'markdown-ticket-link-config'

/**
 * Global link defaults from CONFIG_DIR/config.toml ([links]), fetched once per
 * session from /api/config/global. Precedence (highest wins):
 *   browser localStorage override > global config.toml > built-in defaults.
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
  let merged: LinkConfig = { ...defaultLinkConfig }
  if (globalLinkConfig) {
    merged = { ...merged, ...globalLinkConfig }
  }
  try {
    const stored = localStorage.getItem(LINK_CONFIG_KEY)
    if (stored) {
      merged = { ...merged, ...JSON.parse(stored) }
    }
  }
  catch (error) {
    console.warn('Failed to load link config:', error)
  }
  return merged
}

function _setLinkConfig(config: Partial<LinkConfig>): void {
  try {
    const current = getLinkConfig()
    const updated = { ...current, ...config }
    localStorage.setItem(LINK_CONFIG_KEY, JSON.stringify(updated))
  }
  catch (error) {
    console.warn('Failed to save link config:', error)
  }
}
