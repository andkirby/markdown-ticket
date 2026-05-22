import type { Request } from 'express'
import { createHash } from 'node:crypto'

export interface HttpTransportSecurityConfig {
  port: number
  host?: string
  trustProxy?: boolean | number | string | string[]
  enableOriginValidation?: boolean
  allowedOrigins?: string[]
  enableRateLimiting?: boolean
  rateLimitMax?: number
  rateLimitWindowMs?: number
  enableAuth?: boolean
  authToken?: string
  sessionTimeoutMs?: number
}

export function parseHttpTransportConfig(env: NodeJS.ProcessEnv): HttpTransportSecurityConfig {
  const nodeEnv = env.NODE_ENV || 'development'
  const originValidationEnabled = env.MCP_SECURITY_ORIGIN_VALIDATION === undefined
    ? nodeEnv === 'production'
    : env.MCP_SECURITY_ORIGIN_VALIDATION === 'true'
  const allowedOrigins = (env.MCP_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  if (originValidationEnabled && allowedOrigins.length === 0) {
    throw new Error('MCP_SECURITY_ORIGIN_VALIDATION=true requires MCP_ALLOWED_ORIGINS')
  }

  if (env.MCP_SECURITY_AUTH === 'true' && !env.MCP_AUTH_TOKEN?.trim()) {
    throw new Error('MCP_SECURITY_AUTH=true requires MCP_AUTH_TOKEN')
  }

  return {
    port: Number.parseInt(env.MCP_HTTP_PORT || env.HTTP_PORT || '3002', 10),
    host: env.MCP_BIND_ADDRESS || env.HOST || '127.0.0.1',
    trustProxy: parseTrustProxyConfig(env.MCP_TRUST_PROXY),
    enableOriginValidation: originValidationEnabled,
    allowedOrigins,
    enableRateLimiting: env.MCP_SECURITY_RATE_LIMITING === undefined
      ? nodeEnv === 'production'
      : env.MCP_SECURITY_RATE_LIMITING !== 'false',
    rateLimitMax: Number.parseInt(env.MCP_RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowMs: Number.parseInt(env.MCP_RATE_LIMIT_WINDOW_MS || '60000', 10),
    enableAuth: env.MCP_SECURITY_AUTH === 'true',
    authToken: env.MCP_AUTH_TOKEN,
  }
}

function parseTrustProxyConfig(value: string | undefined): boolean | number | string | string[] {
  if (!value || value === 'false') {
    return false
  }

  if (value === 'true') {
    return true
  }

  const numericValue = Number.parseInt(value, 10)
  if (Number.isFinite(numericValue) && String(numericValue) === value) {
    return numericValue
  }

  if (value.includes(',')) {
    return value.split(',').map(entry => entry.trim()).filter(Boolean)
  }

  return value
}

export function validateHttpTransportConfig(config: HttpTransportSecurityConfig): void {
  if (config.enableOriginValidation && (!config.allowedOrigins || config.allowedOrigins.length === 0)) {
    throw new Error('MCP origin validation requires MCP_ALLOWED_ORIGINS to contain at least one origin')
  }

  if (config.enableAuth && !config.authToken?.trim()) {
    throw new Error('MCP auth requires MCP_AUTH_TOKEN when MCP_SECURITY_AUTH is enabled')
  }
}

export function getCallerIdentity(req: Request): string {
  const authHeader = req.headers.authorization
  const remoteAddress = req.ip || req.socket.remoteAddress || 'unknown-remote'

  if (authHeader) {
    return `auth:${createHash('sha256').update(authHeader).digest('hex')}:${remoteAddress}`
  }

  return `anon:${remoteAddress}`
}
