/**
 * Trusted service profile — the effective trusted-origin set and privileged
 * provisioning endpoint resolution (MDT-201, BR-1.3 / C4 / C5 / Edge-5).
 *
 * Source: docs/CRs/MDT-201/requirements.md § Security Decisions,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * The effective trusted-origin set combines:
 *   1. product-controlled HTTPS origins shipped with the distribution; and
 *   2. operator-controlled exact-HTTPS extensions from global
 *      `cloudSync.allowedOrigins` (CONFIG_DIR/config.toml).
 *
 * Repository data cannot supply, select, or redirect the privileged
 * provisioning endpoint or the coordination origin. The connection
 * `serviceOrigin` is accepted only on an exact trusted-profile match. An
 * untrusted or changed origin fails closed and no credential is sent.
 *
 * This profile composes with the existing coordination-origin allowlist
 * (config.ts `buildEffectiveCloudSyncConfig`); both must accept an origin
 * before any credential-bearing request is made.
 */

import type { CloudSyncConnection, ProjectConnectionRead } from '@mdt/domain-contracts'
import {
  DISTRIBUTION_CLOUD_SYNC_ORIGINS,
  DISTRIBUTION_COORDINATION_ORIGIN,
  DISTRIBUTION_PROVISIONING_ORIGIN,
  isAbsoluteHttpsOrigin,
} from './config.js'

/** Inputs to the trusted profile. Repository data is NEVER an input here. */
export interface TrustedServiceProfileInputs {
  /**
   * Operator-controlled exact-HTTPS extensions from
   * `cloudSync.allowedOrigins`. Non-HTTPS or non-exact origins are dropped.
   * Default empty — only distribution origins are trusted.
   */
  operatorOrigins: readonly string[]
}

/**
 * The resolved trusted service profile. Immutable after construction; the
 * provisioning endpoint cannot be redirected by repository data or by a setter.
 */
export class TrustedServiceProfile {
  readonly origins: readonly string[]
  readonly provisioningOrigin: string
  /** Default coordination origin for a new connection (distribution origin). */
  readonly coordinationOriginDefault: string

  constructor(opts: {
    origins: readonly string[]
    provisioningOrigin: string
    coordinationOriginDefault: string
  }) {
    this.origins = Object.freeze([...opts.origins])
    this.provisioningOrigin = opts.provisioningOrigin
    this.coordinationOriginDefault = opts.coordinationOriginDefault
  }

  /** True when the origin is an exact trusted-profile member. */
  isTrusted(origin: string): boolean {
    return this.origins.includes(origin)
  }

  /**
   * Check a connection's serviceOrigin against the trusted profile (Edge-5).
   * Returns `{ kind: 'untrusted', reason }` when the origin is not trusted; the
   * reason never echoes the untrusted origin back (no path leak). Returns
   * `{ kind: 'ok' }` otherwise (the caller still applies the allowlist and
   * connection-state checks).
   */
  checkConnectionOrigin(connection: CloudSyncConnection):
    | { kind: 'ok' }
    | { kind: 'untrusted', reason: string } {
    if (!this.isTrusted(connection.serviceOrigin)) {
      return {
        kind: 'untrusted',
        reason: 'connection serviceOrigin is not in the effective trusted service profile',
      }
    }
    return { kind: 'ok' }
  }
}

/**
 * Compose the effective trusted service profile from distribution defaults and
 * operator exact-HTTPS extensions. Repository data is not an input.
 *
 * The provisioning origin is the distribution admin endpoint (operator
 * audience); the coordination default is the distribution coordination
 * endpoint. Both are explicit constants so `enable` requests an
 * operator-audience token and `connect` requests a coordination-audience one.
 * A repository-supplied value can never reach this resolver.
 */
export function resolveTrustedServiceProfile(
  inputs: TrustedServiceProfileInputs,
): TrustedServiceProfile {
  const operatorOrigins = (inputs.operatorOrigins ?? []).filter(isExactHttpsOrigin)
  const origins = dedupeOrdered([
    ...DISTRIBUTION_CLOUD_SYNC_ORIGINS,
    ...operatorOrigins,
  ])
  if (origins.length === 0) {
    // Defense in depth: the distribution always ships at least one origin, so
    // this branch is unreachable in production. We still avoid throwing so a
    // misconfigured build fails closed at the first credential-bearing call
    // rather than at profile construction.
    return new TrustedServiceProfile({
      origins: [],
      provisioningOrigin: '',
      coordinationOriginDefault: '',
    })
  }
  return new TrustedServiceProfile({
    origins,
    provisioningOrigin: DISTRIBUTION_PROVISIONING_ORIGIN,
    coordinationOriginDefault: DISTRIBUTION_COORDINATION_ORIGIN,
  })
}

/** De-duplicate while preserving first-seen order. */
function dedupeOrdered(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v)
      out.push(v)
    }
  }
  return out
}

/**
 * Stricter than `isAbsoluteHttpsOrigin`: also rejects wildcards and any
 * non-literal hostname character. Operator extensions must be exact HTTPS
 * origins (C4).
 */
function isExactHttpsOrigin(value: unknown): value is string {
  if (!isAbsoluteHttpsOrigin(value)) {
    return false
  }
  // isAbsoluteHttpsOrigin narrows value to string; bind it so URL() gets a
  // string, not the outer `unknown`.
  const origin = value as string
  try {
    const url = new URL(origin)
    // Reject wildcards or glob-like characters in the hostname.
    if (/[*?[\]{}]/.test(url.hostname)) {
      return false
    }
    return true
  }
  catch {
    return false
  }
}

/**
 * Read a CONFIG_DIR connection as a `ProjectConnectionRead`, applying the
 * trusted profile so an untrusted origin fails closed (Edge-5). The malformed
 * and disabled distinctions are owned by the project state store
 * (TASK-4); this helper only applies the trust check on top of a parsed
 * connection.
 */
export function applyTrustToConnection(
  connection: CloudSyncConnection,
  profile: TrustedServiceProfile,
): ProjectConnectionRead {
  const trust = profile.checkConnectionOrigin(connection)
  if (trust.kind === 'untrusted') {
    return { kind: 'untrusted', connection, reason: trust.reason }
  }
  return connection.state === 'enabled'
    ? { kind: 'enabled', connection }
    : { kind: 'disabled', connection }
}
