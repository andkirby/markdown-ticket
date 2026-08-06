import type { RequestAccessMode } from '@mdt/domain-contracts'
import type { NextFunction, Request, Response } from 'express'
import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import { isOwnerOnlyRoute, isPublicReadRoute, isReadOnlyMutationCandidate } from './accessPolicy.js'
import { verifyOwnerSessionCookie } from './apiSession.js'
import { getReadSessionState } from './readSession.js'
import { createReadTokenStore } from './readTokenStore.js'

const EXEMPT_API_ROUTES = new Set(['/api/status', '/api/health'])
export const OWNER_INTENT_HEADER = 'x-mdt-owner-intent'

export interface RequestAccessContext {
  canWrite: boolean
  mode: RequestAccessMode
  projectRefs: string[]
  shareIds: string[]
}

interface AccessRequest extends Request {
  mdtAccess?: RequestAccessContext
}

interface ApiAuthConfig {
  enabled: boolean
  token?: string
  migrationWarningRequired: boolean
  // MDT-157 UAT 2026-08-06: loopback-host no-auth carve-out.
  localHosts: string[]
  localHostBypassEnabled: boolean
}

interface ApiAuthLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

const DEFAULT_LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1']

export function parseApiAuthConfig(env: NodeJS.ProcessEnv): ApiAuthConfig {
  const authFlag = parseAuthFlag(env.API_SECURITY_AUTH)
  const token = env.API_AUTH_TOKEN?.trim()

  if (authFlag === true && !token) {
    throw new Error('API_SECURITY_AUTH=true requires API_AUTH_TOKEN')
  }

  const enabled = authFlag === true || (authFlag === undefined && Boolean(token))

  return {
    enabled,
    token: enabled ? token : undefined,
    migrationWarningRequired: !enabled && !isLocalOrTestEnv(env.NODE_ENV),
    localHosts: parseLocalHosts(env.API_LOCAL_HOSTS),
    // Native (non-Docker) runs default the bypass ON so local dev keeps no-token
    // convenience. Docker is an intentional deployment posture and must opt in
    // explicitly via API_LOCAL_HOST_BYPASS=true; default OFF there.
    localHostBypassEnabled: parseLocalHostBypass(env.API_LOCAL_HOST_BYPASS, env.NODE_ENV),
  }
}

function parseLocalHosts(value: string | undefined): string[] {
  if (!value || value.trim() === '') {
    return DEFAULT_LOCAL_HOSTS
  }

  const parsed = value
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean)

  // An explicit but empty/whitespace-only list would silently disable the
  // carve-out in a confusing way; fall back to the default rather than [].
  return parsed.length > 0 ? Array.from(new Set(parsed)) : DEFAULT_LOCAL_HOSTS
}

function parseLocalHostBypass(value: string | undefined, nodeEnv: string | undefined): boolean {
  if (value === undefined || value.trim() === '') {
    // Default ON for native local dev: undefined NODE_ENV (the documented
    // `bunx tsx server.ts` path sets none), 'development', and 'local' all
    // mean "interactive local developer" and keep no-token loopback owner.
    // OFF in production and test: production is an intentional deployment;
    // the test suite runs on loopback, so bypass-on would make every auth
    // test silently pass through the carve-out. Tests opt in explicitly by
    // setting API_LOCAL_HOST_BYPASS=true.
    return !nodeEnv || nodeEnv === 'development' || nodeEnv === 'local'
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }
  throw new Error('API_LOCAL_HOST_BYPASS must be true or false')
}

export function isApiAuthExemptRoute(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'GET') {
    return false
  }

  const pathWithoutQuery = path.split('?')[0] ?? path
  return EXEMPT_API_ROUTES.has(pathWithoutQuery)
    // MDT-221: raw-preview carries its own credential (the HMAC preview token)
    // in the URL path, because the opaque sandboxed iframe cannot send the
    // SameSite=Strict session cookie on subresource requests. The handler
    // enforces the token before any file work. GET-only here is the
    // method-creep guard (HEAD/OPTIONS/POST are not exempt).
    || pathWithoutQuery.startsWith('/api/documents/raw-preview/')
}

/**
 * MDT-157 UAT 2026-08-06 — single authority for "is this a local request".
 *
 * Trusts ONLY the request `Host` header hostname. `X-Forwarded-Host`,
 * `CF-Connecting-IP`, `Origin`, `Referer`, `X-Forwarded-For`, and
 * `socket.remoteAddress` are deliberately ignored — they are client-supplied
 * and/or spoofable. The `Host` header is the one identifier a CDN/tunnel edge
 * fixes into the request and cannot be forged by an internet client reaching
 * a public-named tunnel.
 *
 * Used by both the protected `/api` gate and `GET /api/auth/session` so the
 * two report a consistent local-exempt state.
 *
 * Parsing: `new URL(\`http://${host}\`)` strips the port and lowercases; exact
 * membership match against `localHosts` rejects lookalikes (`localhost.evil`,
 * `127.0.0.1.evil`) and normalizes bracketed IPv6 (`[::1]:3001` -> `::1`).
 * Missing/malformed `Host` -> fail closed (false).
 */
export function isLocalHostRequest(req: Request, localHosts: string[]): boolean {
  const host = req.headers.host
  if (typeof host !== 'string' || host.trim() === '') {
    return false
  }

  let hostname: string
  try {
    // Prepend a scheme so URL parses the host+port; .hostname strips the port
    // and lowercases. WHATWG URL keeps the brackets on IPv6 hostnames
    // (`[::1]`), so strip them to normalize to the bare address (`::1`) that
    // matches API_LOCAL_HOSTS defaults.
    hostname = new URL(`http://${host}`).hostname.replace(/^(\[)|(\])$/g, '')
  }
  catch {
    // Malformed Host (spaces, control chars, no host) -> fail closed.
    return false
  }

  if (!hostname) {
    return false
  }

  return localHosts.includes(hostname)
}

/**
 * MDT-157 UAT 2026-08-06 — single authority for "is this request eligible
 * for the loopback-host no-auth bypass". Shared by the protected `/api` gate
 * and `GET /api/auth/session` so the two cannot diverge (review P2 fix).
 *
 * Read-only precedence (C12): an authenticated read session blocks the bypass
 * regardless of scope — keyed on `readSession.authenticated` alone, NOT on
 * whether projectRefs/shareIds are non-empty. A valid-but-empty/revoked read
 * session must still block bypass, or the UI would enter no-auth-dev while the
 * protected gate denies owner.
 */
export interface LoopbackBypassReadSession {
  authenticated: boolean
}

export function isLoopbackBypassEligible(
  req: Request,
  config: { localHostBypassEnabled: boolean, localHosts: string[] },
  readSession: LoopbackBypassReadSession,
): boolean {
  return config.localHostBypassEnabled
    && !readSession.authenticated
    && isLocalHostRequest(req, config.localHosts)
}

export function extractApiCredential(req: Request): string | null {
  const bearerToken = extractBearerToken(req.headers.authorization)
  if (bearerToken) {
    return bearerToken
  }

  const apiKeyHeader = req.headers['x-api-key']
  if (typeof apiKeyHeader !== 'string') {
    return null
  }

  const apiKey = apiKeyHeader.trim()
  return apiKey || null
}

export function timingSafeTokenMatches(actualToken: string | undefined, expectedToken: string | undefined): boolean {
  if (!actualToken || !expectedToken) {
    return false
  }

  const actualBuffer = Buffer.from(actualToken)
  const expectedBuffer = Buffer.from(expectedToken)

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export function createApiAuthMiddleware(
  config: ApiAuthConfig,
  options: ApiAuthMiddlewareOptions,
  logger: ApiAuthLogger = console,
) {
  let migrationWarningEmitted = false
  const { originPolicy } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (isApiAuthExemptRoute(req.method, getRequestPath(req))) {
      setRequestAccess(req, { canWrite: false, mode: 'anonymous', projectRefs: [], shareIds: [] })
      next()
      return
    }

    // MDT-157 UAT 2026-08-06: resolve the read session once up front so that
    // read-only precedence (C12) holds across every branch — an authenticated
    // read-only session is never escalated to owner by the loopback bypass.
    const readSession = await resolveActiveReadSession(
      getReadSessionState(req, options.readSessionSecret),
      options,
    )
    const bypassEligible = isLoopbackBypassEligible(req, config, readSession)

    if (!config.enabled) {
      // Disabled-auth branch: owner only on loopback host AND no read-only
      // session. Non-loopback hosts (e.g. a tunnel) fall through to the
      // read-only/401 path instead of being granted owner (BR-1.8, closes
      // the pre-UAT hole where auth-disabled granted owner to every host).
      if (bypassEligible) {
        if (config.migrationWarningRequired && !migrationWarningEmitted) {
          migrationWarningEmitted = true
          logger.warn('Backend API authentication is disabled. Set API_SECURITY_AUTH=true and API_AUTH_TOKEN to protect API routes.')
        }

        setRequestAccess(req, { canWrite: true, mode: 'no-auth-dev', projectRefs: [], shareIds: [] })
        next()
        return
      }

      // Non-loopback or read-only session present: read-only session honored,
      // else migration warning + MDT-172 policy (public-read 200 / 401 / 403).
      if (!readSession.authenticated && config.migrationWarningRequired && !migrationWarningEmitted) {
        migrationWarningEmitted = true
        logger.warn('Backend API authentication is disabled. Set API_SECURITY_AUTH=true and API_AUTH_TOKEN to protect API routes.')
      }

      enforceReadOnlyAccess(req, res, next, readSession)
      return
    }

    // Auth enabled: explicit token/session always wins, loopback bypass is a
    // fallback only when no credential and no read-only session is present.
    const credential = extractApiCredential(req)
    if (timingSafeTokenMatches(credential ?? undefined, config.token)) {
      setRequestAccess(req, { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] })
      next()
      return
    }

    const hasOwnerSession = verifyOwnerSessionCookie(req, config.token)

    if (hasOwnerSession && requiresCookieMutationIntent(req) && !hasCookieMutationIntent(req, originPolicy)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    if (hasOwnerSession) {
      setRequestAccess(req, { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] })
      next()
      return
    }

    if (bypassEligible) {
      setRequestAccess(req, { canWrite: true, mode: 'no-auth-dev', projectRefs: [], shareIds: [] })
      next()
      return
    }

    enforceReadOnlyAccess(req, res, next, readSession)
  }
}

interface ApiAuthMiddlewareOptions extends ReadSessionResolutionOptions {
  originPolicy: OriginPolicyLike
}

interface ReadOnlySessionState {
  authenticated: boolean
  projectRefs: string[]
  shareIds: string[]
  staticProjectRefs?: string[]
  tokenIds?: string[]
  tokenProjectRefs?: string[]
}

interface ReadSessionResolutionOptions {
  allowLocalReadSessionFallback: boolean
  configDir: string
  readSessionSecret?: string
}

export async function resolveActiveReadSession(
  readSession: ReadOnlySessionState,
  options: ReadSessionResolutionOptions,
): Promise<ReadOnlySessionState> {
  if (!readSession.authenticated || !readSession.tokenIds?.length) {
    return readSession
  }

  const store = createReadTokenStore({ configDir: options.configDir })
  const activeProjectRefs = new Set<string>()
  const staticProjectRefs = readSession.staticProjectRefs ?? (readSession.tokenProjectRefs ? [] : readSession.projectRefs)
  for (const tokenId of readSession.tokenIds) {
    try {
      const token = await store.resolveTokenById(tokenId)
      for (const projectRef of token.projectRefs) {
        activeProjectRefs.add(projectRef)
      }
    }
    catch {
      // Revoked, expired, malformed, or missing token grants fail closed.
    }
  }

  if (activeProjectRefs.size === 0 && staticProjectRefs.length === 0 && options.allowLocalReadSessionFallback) {
    return readSession
  }

  return {
    ...readSession,
    projectRefs: Array.from(new Set([...staticProjectRefs, ...activeProjectRefs])),
  }
}

function enforceReadOnlyAccess(req: Request, res: Response, next: NextFunction, readSession: ReadOnlySessionState): void {
  setRequestAccess(req, {
    canWrite: false,
    mode: readSession.authenticated ? 'read-only' : 'anonymous',
    projectRefs: readSession.projectRefs,
    shareIds: readSession.shareIds,
  })

  const requestPath = getRequestPath(req)

  if (isPublicReadRoute(requestPath, req.method)) {
    next()
    return
  }

  if (isReadOnlyMutationCandidate(requestPath, req.method)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (isOwnerOnlyRoute(requestPath)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  res.status(401).json({ error: 'Authentication required' })
}

export function getRequestAccess(req: Request): RequestAccessContext {
  return (req as AccessRequest).mdtAccess ?? {
    canWrite: false,
    mode: 'anonymous',
    projectRefs: [],
    shareIds: [],
  }
}

interface OriginPolicyLike {
  isAllowedOrigin: (origin: string | undefined) => boolean
}

function parseAuthFlag(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const normalizedValue = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false
  }

  throw new Error('API_SECURITY_AUTH must be true or false')
}

function isLocalOrTestEnv(nodeEnv: string | undefined): boolean {
  return !nodeEnv || nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'local'
}

function extractBearerToken(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  const parts = value.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  const token = parts[1]?.trim()
  return token || null
}

function getRequestPath(req: Request): string {
  return req.originalUrl?.split('?')[0] || req.path || req.url.split('?')[0] || ''
}

function requiresCookieMutationIntent(req: Request): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())
}

function hasCookieMutationIntent(req: Request, originPolicy: OriginPolicyLike): boolean {
  const origin = req.headers.origin
  const intent = req.headers[OWNER_INTENT_HEADER]

  return typeof origin === 'string'
    && originPolicy.isAllowedOrigin(origin)
    && intent === '1'
}

function setRequestAccess(req: Request, access: RequestAccessContext): void {
  ;(req as AccessRequest).mdtAccess = access
}
