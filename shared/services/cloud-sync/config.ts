/**
 * Cloud Sync config validation + origin allowlist.
 *
 * Source: docs/architecture/cloud-sync/README.md § Project Binding,
 *         constraints C4 (opt-in), C5 (no secrets), C6 (allowlist).
 *
 * Pure logic — no I/O. The config loader calls these to validate a binding
 * before any cloud call. Credentials are never permitted in config (C5).
 */

import type {
  GlobalCloudSyncConfig,
  OriginAllowlistResult,
  ProjectCloudSyncBinding,
} from '@mdt/domain-contracts'

/** Field names that must never appear in cloud config (C5). */
const FORBIDDEN_SECRET_KEYS = [
  'token',
  'secret',
  'password',
  'cfaccessclientid',
  'cfaccessclientsecret',
  'cf_access_client_id',
  'cf_access_client_secret',
  'jwt',
  'audience',
  'apikey',
]

/**
 * Product-controlled origins trusted by this distribution (C6).
 *
 * The coordination origin serves `/v1/projects/*` (coordination audience); the
 * admin origin serves `/v1/admin/*` (operator audience, used only for
 * provisioning). Both hit the same Worker; the audience is selected by the
 * Access application that issued the JWT, which is bound to the origin.
 */
export const DISTRIBUTION_CLOUD_SYNC_ORIGINS = [
  'https://mdt-sync.constantapp.org',
  'https://mdt-sync-admin.constantapp.org',
] as const

/**
 * The distribution origin whose Access application issues operator-audience
 * tokens (provisioning). Distinct from the coordination origin so `enable`
 * requests a token the Worker's `/v1/admin/*` routes will accept.
 */
export const DISTRIBUTION_PROVISIONING_ORIGIN = 'https://mdt-sync-admin.constantapp.org'

/**
 * The distribution origin whose Access application issues coordination-audience
 * tokens (connect, membership, status, ticket allocation).
 */
export const DISTRIBUTION_COORDINATION_ORIGIN = 'https://mdt-sync.constantapp.org'

/**
 * Merge immutable distribution origins with operator-controlled extensions.
 * Repository project config can select an origin, but cannot add trust.
 */
export function buildEffectiveCloudSyncConfig(
  global: GlobalCloudSyncConfig,
): GlobalCloudSyncConfig {
  return {
    allowedOrigins: [...new Set([
      ...DISTRIBUTION_CLOUD_SYNC_ORIGINS,
      ...global.allowedOrigins,
    ])],
  }
}

/**
 * Validate a per-project cloud binding. Returns the normalized binding or throws
 * on any violation. When disabled, returns the binding as-is (still validated
 * for shape so a stale/invalid binding never silently enables).
 */
export function validateProjectBinding(
  raw: Partial<ProjectCloudSyncBinding>,
): ProjectCloudSyncBinding {
  if (typeof raw.enabled !== 'boolean') {
    throw new ConfigValidationError('project.cloudSync.enabled must be a boolean')
  }
  if (typeof raw.projectId !== 'string' || raw.projectId.length === 0) {
    throw new ConfigValidationError('project.cloudSync.projectId must be a non-empty string')
  }
  if (!isAbsoluteHttpsOrigin(raw.serviceUrl)) {
    throw new ConfigValidationError('project.cloudSync.serviceUrl must be an absolute HTTPS origin (no path/query/fragment/credentials/wildcard)')
  }
  const pollIntervalSeconds = raw.pollIntervalSeconds ?? 15
  if (!Number.isInteger(pollIntervalSeconds) || pollIntervalSeconds < 5 || pollIntervalSeconds > 300) {
    throw new ConfigValidationError('project.cloudSync.pollIntervalSeconds must be an integer from 5 through 300')
  }
  return {
    enabled: raw.enabled,
    projectId: raw.projectId,
    serviceUrl: raw.serviceUrl as string,
    pollIntervalSeconds,
  }
}

/**
 * Check a serviceUrl against the global operator-controlled allowlist (C6).
 * Default empty allowlist denies every origin. Project files cannot expand it.
 */
export function checkOriginAllowlist(
  serviceUrl: string,
  global: GlobalCloudSyncConfig,
): OriginAllowlistResult {
  if (!isAbsoluteHttpsOrigin(serviceUrl)) {
    return { allowed: false, reason: 'not_https' }
  }
  if (global.allowedOrigins.length === 0) {
    return { allowed: false, reason: 'empty_allowlist' }
  }
  const origin = originOf(serviceUrl)
  if (!global.allowedOrigins.includes(origin)) {
    return { allowed: false, reason: 'not_allowlisted' }
  }
  return { allowed: true }
}

/**
 * Detect forbidden secret-like keys in a raw config object (C5). Returns the
 * list of offending keys. Used by the config loader to reject credentials in
 * project/global config files.
 */
export function findForbiddenSecretKeys(rawConfig: Record<string, unknown>): string[] {
  const found: string[] = []
  for (const key of Object.keys(rawConfig)) {
    const lower = key.toLowerCase().replace(/[-_]/g, '')
    if (FORBIDDEN_SECRET_KEYS.some(f => lower.includes(f.replace(/[-_]/g, '')))) {
      found.push(key)
    }
  }
  return found
}

/** True for an absolute HTTPS origin with no path/query/fragment/credentials. */
export function isAbsoluteHttpsOrigin(value: unknown): value is string {
  if (typeof value !== 'string')
    return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:')
      return false
    // Origin only: no path (except '/'), no query, no fragment, no credentials.
    if (url.pathname !== '/' || url.search !== '' || url.hash !== '')
      return false
    if (url.username !== '' || url.password !== '')
      return false
    return true
  }
  catch {
    return false
  }
}

function originOf(httpsUrl: string): string {
  const url = new URL(httpsUrl)
  return `${url.protocol}//${url.host}`
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}
