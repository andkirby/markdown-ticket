import type { CorsOptions } from 'cors'
import type { NextFunction, Request, Response } from 'express'

const DEFAULT_LOCAL_ORIGINS = [
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

export function parsePublicOrigin(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmedValue = value.trim()
  if (trimmedValue.includes(',')) {
    return undefined
  }

  try {
    const parsed = new URL(trimmedValue)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return undefined
    }

    return parsed.origin
  }
  catch {
    return undefined
  }
}

export function createAllowedOrigins(publicOrigin?: string): string[] {
  const normalizedPublicOrigin = publicOrigin ? trimTrailingSlash(publicOrigin.trim()) : undefined

  return Array.from(new Set([
    ...DEFAULT_LOCAL_ORIGINS,
    ...(normalizedPublicOrigin ? [normalizedPublicOrigin] : []),
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

export function createDefaultOriginPolicy(publicOrigin?: string): OriginPolicy {
  return createOriginPolicy(createAllowedOrigins(publicOrigin))
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
