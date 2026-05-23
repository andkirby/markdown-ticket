import type { Request } from 'express'
import path from 'node:path'
import process from 'node:process'
import { parseApiAuthConfig } from '../security/apiAuth.js'
import { createAllowedOrigins, parsePublicOrigin } from '../security/originPolicy.js'
import { getReadSessionSecret, parseReadTokenScopes } from '../security/readSession.js'

export interface RuntimeConfig {
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
    configDir: resolveConfigDir(env),
    nodeEnv: env.NODE_ENV,
    auth,
    origins: {
      allowedOrigins: createAllowedOrigins(publicOrigin),
      publicOrigin,
    },
    readSessions: {
      secret: getReadSessionSecret(auth.token, env),
      allowLocalFallback: !isAuthConfigured(env) && isLocalOrTestEnv(env.NODE_ENV),
    },
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

export function getRuntimeConfig(req: Request): RuntimeConfig {
  const current = req.app.locals.runtimeConfig
  if (isRuntimeConfig(current)) {
    return current
  }

  throw new Error('RuntimeConfig is not initialized on app.locals.runtimeConfig')
}

function isRuntimeConfig(value: unknown): value is RuntimeConfig {
  return Boolean(
    value
    && typeof value === 'object'
    && typeof (value as RuntimeConfig).configDir === 'string'
    && typeof (value as RuntimeConfig).auth === 'object'
    && typeof (value as RuntimeConfig).origins === 'object',
  )
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
