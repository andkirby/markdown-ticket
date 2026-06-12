const PublicReadApiPrefix = {
  DOCUMENTS: '/api/documents',
  EVENTS: '/api/events',
  PROJECTS: '/api/projects',
} as const

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
