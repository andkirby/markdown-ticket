import type { Application } from 'express'
import path from 'node:path'
import process from 'node:process'
import { parseApiAuthConfig } from '../security/apiAuth.js'
import { getPreviewTokenSecret } from '../security/documentPreviewToken.js'
import { createAllowedOrigins, parseExtraOrigins, parsePublicOrigin } from '../security/originPolicy.js'
import { getReadSessionSecret, parseReadTokenScopes } from '../security/readSession.js'

const DEFAULT_OWNER_SESSION_MAX_AGE_DAYS = 14
const SECONDS_PER_DAY = 24 * 60 * 60

export interface RuntimeConfig {
  cloud: { projectionStreamRolloutEnabled: boolean }
  configDir: string
  nodeEnv?: string
  auth: ReturnType<typeof parseApiAuthConfig>
  origins: {
    allowedOrigins: string[]
    publicOrigin?: string
  }
  readSessions: {
    secret?: string
    allowLocalFallback: boolean
  }
  ownerSessions: {
    maxAgeSeconds: number
  }
  /** MDT-221 — HMAC secret for short-lived HTML preview tokens. */
  previewTokenSecret: string
  system: {
    devtoolsEnabled: boolean
    isProduction: boolean
    isTest: boolean
    maintenanceEndpointsEnabled: boolean
  }
  readTokens: {
    staticScopes: ReturnType<typeof parseReadTokenScopes>
  }
}

export function buildRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const auth = parseApiAuthConfig(env)
  const publicOrigin = parsePublicOrigin(env.PUBLIC_ORIGIN)

  return {
    cloud: { projectionStreamRolloutEnabled: env.MDT_PROJECTION_STREAM_ROLLOUT === 'true' },
    configDir: resolveConfigDir(env),
    nodeEnv: env.NODE_ENV,
    auth,
    origins: {
      // MDT_ALLOWED_ORIGINS adds origins independently of PUBLIC_ORIGIN —
      // e2e runs use an ephemeral frontend port (not in DEFAULT_LOCAL_ORIGINS)
      // and tests may override PUBLIC_ORIGIN without losing their own origin.
      allowedOrigins: createAllowedOrigins(publicOrigin, parseExtraOrigins(env.MDT_ALLOWED_ORIGINS)),
      publicOrigin,
    },
    readSessions: {
      secret: getReadSessionSecret(auth.token, env),
      allowLocalFallback: !isAuthConfigured(env) && isLocalOrTestEnv(env.NODE_ENV),
    },
    ownerSessions: {
      maxAgeSeconds: resolveOwnerSessionMaxAgeSeconds(env),
    },
    previewTokenSecret: getPreviewTokenSecret(auth.token, env),
    system: {
      devtoolsEnabled: env.NODE_ENV !== 'production' || env.DEVTOOLS_ENABLED === 'true',
      isProduction: env.NODE_ENV === 'production',
      isTest: env.NODE_ENV === 'test',
      maintenanceEndpointsEnabled: env.NODE_ENV !== 'production' || env.MAINTENANCE_ENDPOINTS_ENABLED === 'true',
    },
    readTokens: {
      staticScopes: parseReadTokenScopes(env.API_READ_TOKEN_HASHES),
    },
  }
}

export function getRuntimeConfig(app: Application): RuntimeConfig {
  const current = app.locals.runtimeConfig
  if (isRuntimeConfig(current)) {
    return current
  }

  throw new Error('RuntimeConfig is not initialized on app.locals.runtimeConfig')
}

function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.configDir === 'string'
    && typeof value.auth === 'object'
    && typeof value.origins === 'object'
    && typeof value.ownerSessions === 'object'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAuthConfigured(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.API_AUTH_TOKEN?.trim())
    || ['true', '1', 'yes', 'on'].includes(env.API_SECURITY_AUTH?.trim().toLowerCase() ?? '')
}

function resolveConfigDir(env: NodeJS.ProcessEnv): string {
  if (env.CONFIG_DIR?.trim()) {
    return env.CONFIG_DIR
  }

  if (env.HOME?.trim()) {
    return path.join(env.HOME, '.config', 'markdown-ticket')
  }

  return path.join('/tmp', 'markdown-ticket')
}

function isLocalOrTestEnv(nodeEnv: string | undefined): boolean {
  return !nodeEnv || nodeEnv === 'development' || nodeEnv === 'test' || nodeEnv === 'local'
}

function resolveOwnerSessionMaxAgeSeconds(env: NodeJS.ProcessEnv): number {
  const configuredDays = parsePositiveInteger(env.OWNER_SESSION_MAX_AGE_DAYS, 'OWNER_SESSION_MAX_AGE_DAYS')
  return (configuredDays ?? DEFAULT_OWNER_SESSION_MAX_AGE_DAYS) * SECONDS_PER_DAY
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const normalizedValue = value.trim()
  if (!/^\d+$/u.test(normalizedValue)) {
    throw new Error(`${name} must be a positive integer`)
  }

  const parsed = Number.parseInt(normalizedValue, 10)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }

  return parsed
}
