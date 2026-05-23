import type { NextFunction, Request, Response } from 'express'
import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'
import { isOwnerOnlyRoute, isPublicReadRoute, isReadOnlyMutationCandidate } from './accessPolicy.js'
import { verifyOwnerSessionCookie } from './apiSession.js'
import { getReadSessionState } from './readSession.js'
import { createReadTokenStore } from './readTokenStore.js'

const EXEMPT_API_ROUTES = new Set(['/api/status', '/api/health'])
export const OWNER_INTENT_HEADER = 'x-mdt-owner-intent'

export type RequestAccessMode = 'anonymous' | 'read-only' | 'owner-admin' | 'no-auth-dev'

export interface RequestAccessContext {
  canWrite: boolean
  mode: RequestAccessMode
  projectRefs: string[]
  shareIds: string[]
}

export interface AccessRequest extends Request {
  mdtAccess?: RequestAccessContext
}

export interface ApiAuthConfig {
  enabled: boolean
  token?: string
  migrationWarningRequired: boolean
}

export interface ApiAuthLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

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
  }
}

export function isApiAuthExemptRoute(method: string, path: string): boolean {
  if (method.toUpperCase() !== 'GET') {
    return false
  }

  return EXEMPT_API_ROUTES.has(path.split('?')[0] ?? path)
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

    if (!config.enabled) {
      const readSession = await resolveActiveReadSession(
        getReadSessionState(req, options.readSessionSecret),
        options,
      )
      if (readSession.authenticated) {
        enforceReadOnlyAccess(req, res, next, readSession)
        return
      }

      if (config.migrationWarningRequired && !migrationWarningEmitted) {
        migrationWarningEmitted = true
        logger.warn('Backend API authentication is disabled. Set API_SECURITY_AUTH=true and API_AUTH_TOKEN to protect API routes.')
      }

      setRequestAccess(req, { canWrite: true, mode: 'no-auth-dev', projectRefs: [], shareIds: [] })
      next()
      return
    }

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

    const readSession = await resolveActiveReadSession(
      getReadSessionState(req, options.readSessionSecret),
      options,
    )
    enforceReadOnlyAccess(req, res, next, readSession)
  }
}

export interface ApiAuthMiddlewareOptions extends ReadSessionResolutionOptions {
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

export interface ReadSessionResolutionOptions {
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
