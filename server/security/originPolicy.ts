import type { CorsOptions } from 'cors'
import type { NextFunction, Request, Response } from 'express'
import process from 'node:process'

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:4173',
  'http://localhost:6173',
] as const

interface OriginPolicyLogger {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export interface OriginPolicy {
  allowedOrigins: readonly string[]
  isAllowedOrigin: (origin: string | undefined) => boolean
  getAccessControlAllowOrigin: (origin: string | undefined) => string | undefined
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function parseAllowedDomains(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map(domain => trimTrailingSlash(domain.trim()))
    .filter(Boolean)
    .flatMap((domain) => {
      if (/^https?:\/\//i.test(domain)) {
        return [domain]
      }

      return [`https://${domain}`, `http://${domain}`]
    })
}

export function createAllowedOrigins(allowedDomains = process.env.ALLOWED_DOMAINS): string[] {
  return Array.from(new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseAllowedDomains(allowedDomains),
  ]))
}

export function createOriginPolicy(allowedOrigins: Iterable<string>): OriginPolicy {
  const normalizedOrigins = Array.from(new Set(
    Array.from(allowedOrigins)
      .map(origin => trimTrailingSlash(origin.trim()))
      .filter(Boolean),
  ))

  return {
    allowedOrigins: normalizedOrigins,
    isAllowedOrigin(origin: string | undefined): boolean {
      return !origin || normalizedOrigins.includes(trimTrailingSlash(origin))
    },
    getAccessControlAllowOrigin(origin: string | undefined): string | undefined {
      if (!origin) {
        return undefined
      }

      const normalizedOrigin = trimTrailingSlash(origin)

      return normalizedOrigins.includes(normalizedOrigin) ? normalizedOrigin : undefined
    },
  }
}

export function createDefaultOriginPolicy(allowedDomains = process.env.ALLOWED_DOMAINS): OriginPolicy {
  return createOriginPolicy(createAllowedOrigins(allowedDomains))
}

export function createCorsOptions(originPolicy: OriginPolicy, logger?: OriginPolicyLogger): CorsOptions {
  return {
    origin(origin, callback) {
      if (originPolicy.isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      logger?.warn('CORS blocked request from disallowed origin', { origin })
      callback(null, false)
    },
    credentials: true,
  }
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  next()
}
