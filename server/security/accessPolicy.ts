const PublicReadApiPrefix = {
  DOCUMENTS: '/api/documents',
  EVENTS: '/api/events',
  PROJECTS: '/api/projects',
} as const

/**
 * MDT-221: the raw-preview prefix is carved out of public-read so it does not
 * inherit the broad /api/documents anonymous + read-session-readable grant.
 * This is defense-in-depth — the handler's HMAC token check (gate G2) is the
 * primary gate and works regardless; the carve-out prevents the prefix from
 * being a quiet public-readable surface and prevents HEAD/OPTIONS method
 * creep. The GET-only exemption in apiAuth.ts re-admits the request narrowly
 * so the handler can enforce the token. See architecture.md §3.1.
 */
const RAW_PREVIEW_PREFIX = '/api/documents/raw-preview'

const OwnerOnlyApiPrefix = {
  CACHE: '/api/cache',
  CONFIG: '/api/config',
  DIRECTORIES: '/api/directories',
  FILESYSTEM: '/api/filesystem',
  READ_TOKENS: '/api/read-tokens',
} as const

function isSafeReadMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

export function isPublicReadRoute(path: string, method: string): boolean {
  if (!isSafeReadMethod(method)) {
    return false
  }
  if (path.startsWith(RAW_PREVIEW_PREFIX)) {
    return false
  }

  return path.startsWith(PublicReadApiPrefix.PROJECTS)
    || path.startsWith(PublicReadApiPrefix.DOCUMENTS)
    || path.startsWith(PublicReadApiPrefix.EVENTS)
}

export function isReadOnlyMutationCandidate(path: string, method: string): boolean {
  if (isSafeReadMethod(method)) {
    return false
  }

  return path.startsWith(PublicReadApiPrefix.PROJECTS)
    || path.startsWith(PublicReadApiPrefix.DOCUMENTS)
}

export function isOwnerOnlyRoute(path: string): boolean {
  return path.startsWith(OwnerOnlyApiPrefix.CACHE)
    || path.startsWith(OwnerOnlyApiPrefix.CONFIG)
    || path.startsWith(OwnerOnlyApiPrefix.DIRECTORIES)
    || path.startsWith(OwnerOnlyApiPrefix.FILESYSTEM)
    || path.startsWith(OwnerOnlyApiPrefix.READ_TOKENS)
}
