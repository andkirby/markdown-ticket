import type { NextFunction, Request, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'

const EXEMPT_API_ROUTES = new Set(['/api/status', '/api/health'])

export interface ApiAuthConfig {
  enabled: boolean
  token?: string
  migrationWarningRequired: boolean
}

export interface ApiAuthLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export function parseApiAuthConfig(env: NodeJS.ProcessEnv = process.env): ApiAuthConfig {
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
  return apiKey ? apiKey : null
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
  config: ApiAuthConfig = parseApiAuthConfig(),
  logger: ApiAuthLogger = console,
) {
  let migrationWarningEmitted = false

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isApiAuthExemptRoute(req.method, getRequestPath(req))) {
      next()
      return
    }

    if (!config.enabled) {
      if (config.migrationWarningRequired && !migrationWarningEmitted) {
        migrationWarningEmitted = true
        logger.warn('Backend API authentication is disabled. Set API_SECURITY_AUTH=true and API_AUTH_TOKEN to protect API routes.')
      }

      next()
      return
    }

    const credential = extractApiCredential(req)
    if (!timingSafeTokenMatches(credential ?? undefined, config.token)) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }

    next()
  }
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
  return token ? token : null
}

function getRequestPath(req: Request): string {
  return req.originalUrl?.split('?')[0] || req.path || req.url.split('?')[0] || ''
}
