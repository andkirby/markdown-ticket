/**
 * Cloud credential providers — resolve a Cloudflare Access credential for one
 * runtime (human vs machine).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Client Credential Flows,
 *         docs/CRs/MDT-201/requirements.md § Lifecycle Decisions (audience-aware).
 *
 * Two impls of the `CloudCredentialProvider` port from @mdt/domain-contracts:
 *
 *   - CloudflaredCredentialProvider (human, interactive CLI / local MCP):
 *     spawns `cloudflared access token -app=<origin>` with a fixed arg array
 *     (no shell). The origin comes from validated config, never request input.
 *     Returns the short-lived application token or null on no session. The token
 *     is held in memory only — it is never printed, persisted, or logged.
 *
 *   - ServiceTokenCredentialProvider (machine, headless MCP / automation):
 *     MDT-201: resolves the credential from the owner-only CONFIG_DIR machine
 *     credential store when configured (`{ store, credentialRef }`). It
 *     CONSUMES credentials installed by the operator-controlled Cloudflare
 *     procedure — it never creates Cloudflare tokens. Falls back to
 *     CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET env vars for backward
 *     compatibility (Slice U2). Returns null if neither path yields a pair.
 *
 * `AudienceAwareCredentialResolver` routes one underlying credential provider
 * to the correct Access audience per operation (BR-1.2, C5): provisioning uses
 * the operator audience; connect, membership, diagnostics, disable, and normal
 * coordination use the coordination audience. An owner who is not an operator
 * is denied for provisioning with a clear operator-authority reason.
 *
 * Invariants (identity-and-access.md § Secret and Token Policy):
 *   - No credential is ever printed, persisted, or logged.
 *   - A credential is resolved only for an allowlisted origin (the caller —
 *     the coordinator — re-checks the allowlist before attaching any header).
 *   - Membership requests carry only the non-secret machine principal id; the
 *     secret never enters a membership payload (BR-2.3, C8).
 */

import type {
  AudienceAwareCredentialProvider,
  CloudAccessAudienceValue,
  CloudCredential,
  CloudCredentialProvider,
} from '@mdt/domain-contracts'
import type { ChildProcess, ExecFileException } from 'node:child_process'
import type { MachineCredentialStore } from './credential-store.js'
import { execFile } from 'node:child_process'
import process from 'node:process'
import { CloudAccessAudience } from '@mdt/domain-contracts'

/** The spawn signature of node:child_process.execFile (injectable for tests). */
export type ExecFile = (
  file: string,
  args: readonly string[],
  callback: (err: ExecFileException | null, stdout: string, stderr: string) => void,
) => ChildProcess

/**
 * The default spawn: node:child_process.execFile with an explicit string-encoding
 * options object so overload resolution picks the
 * `(file, args, options, callback)` form unambiguously. No shell is ever
 * involved — the executable name and arg array are fixed literals.
 */
const defaultExecFile: ExecFile = (file, args, callback) =>
  execFile(file, [...args], { encoding: 'utf8' }, callback)

export interface CloudflaredCredentialProviderOptions {
  /**
   * Injectable spawn. Defaults to node:child_process.execFile with a fixed arg
   * array — NEVER a shell. The executable name is fixed at `cloudflared`.
   */
  spawn?: ExecFile
  /** Override the executable name (tests/dev only). Defaults to `cloudflared`. */
  executable?: string
}

/**
 * Human credential provider. Spawns `cloudflared access token -app=<origin>`.
 *
 * The fixed arg array means no shell is ever involved and the only interpolated
 * value is the validated origin. The returned token is consumed from stdout,
 * trimmed, and held in memory only; stderr is discarded and never printed.
 */
export class CloudflaredCredentialProvider implements CloudCredentialProvider {
  private readonly spawn: ExecFile
  private readonly executable: string

  constructor(opts: CloudflaredCredentialProviderOptions = {}) {
    this.spawn = opts.spawn ?? defaultExecFile
    this.executable = opts.executable ?? 'cloudflared'
  }

  async resolve(serviceUrl: string): Promise<CloudCredential | null> {
    // Fixed arg array — no shell, no request-derived input beyond the origin.
    const args = ['access', 'token', `-app=${serviceUrl}`]
    return new Promise((resolve) => {
      try {
        this.spawn(this.executable, args, (err, stdout) => {
          // Non-zero exit / spawn error (ENOENT) → no human session. Return null
          // so the caller surfaces authentication_required WITHOUT a local
          // fallback (BR-1.5). Never throw on "no session".
          if (err)
            return resolve(null)
          const token = stdout.trim()
          if (!token)
            return resolve(null)
          resolve({ kind: 'human', cfAccessToken: token })
        })
      }
      catch {
        // Defensive: any synchronous spawn failure is treated as no session.
        resolve(null)
      }
    })
  }
}

/**
 * Machine credential provider. MDT-201: resolves the Access service-token pair
 * from the owner-only CONFIG_DIR machine credential store when configured.
 * Falls back to CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET env vars for
 * backward compatibility (Slice U2). Returns null when neither path yields a
 * pair so the caller can surface authentication_required without a local
 * fallback (BR-1.5).
 *
 * This provider CONSUMES credentials installed by the operator-controlled
 * Cloudflare procedure — it does NOT create Cloudflare tokens (BR-2.3, C8).
 *
 * The returned `clientId` is the non-secret machine principal id used for
 * project-scoped membership (identity-and-access.md § Principal Contract). The
 * runtime attaches the actual Access client headers via
 * `buildServiceTokenHeaders`. The secret never enters a membership payload.
 */
export interface ServiceTokenCredentialProviderOptions {
  /** Owner-only CONFIG_DIR store; when provided, takes precedence over env. */
  store?: MachineCredentialStore
  /** Stable runtime name keyed under the credential store. */
  credentialRef?: string
  /** Injectable env source (defaults to process.env). */
  env?: NodeJS.ProcessEnv
}

export class ServiceTokenCredentialProvider implements CloudCredentialProvider {
  private readonly env: NodeJS.ProcessEnv
  private readonly store?: MachineCredentialStore
  private readonly credentialRef?: string

  constructor(opts: ServiceTokenCredentialProviderOptions | NodeJS.ProcessEnv = process.env) {
    // Accept either the legacy env-only shape (`new ServiceTokenCredentialProvider(process.env)`)
    // or the MDT-201 options object for backward compatibility.
    if (isOptionsObject(opts)) {
      this.store = opts.store
      this.credentialRef = opts.credentialRef
      this.env = opts.env ?? process.env
    }
    else {
      this.env = opts
    }
  }

  async resolve(_serviceUrl: string): Promise<CloudCredential | null> {
    // Prefer the CONFIG_DIR store (MDT-201 owner-only per-runtime credential).
    if (this.store && this.credentialRef) {
      const record = await this.store.load(this.credentialRef)
      if (record) {
        return { kind: 'service', clientId: record.clientId, clientSecret: record.clientSecret }
      }
    }
    // Backward-compatible env fallback (Slice U2).
    const clientId = this.env.CF_ACCESS_CLIENT_ID?.trim()
    const clientSecret = this.env.CF_ACCESS_CLIENT_SECRET?.trim()
    if (!clientId || !clientSecret)
      return null
    // The client id is the verified `common_name` membership key (non-secret).
    // Carrying it lets the runtime build the Access header pair without
    // re-reading the environment.
    return { kind: 'service', clientId, clientSecret }
  }

  /**
   * The non-secret machine principal id used for project-scoped membership.
   * Returns null when no credential is installed; the caller surfaces
   * authentication_required without leaking the secret. Membership requests
   * carry this id only (BR-2.3, C8).
   */
  async machinePrincipalId(): Promise<string | null> {
    if (this.store && this.credentialRef) {
      const record = await this.store.load(this.credentialRef)
      if (record) {
        return record.clientId
      }
    }
    const clientId = this.env.CF_ACCESS_CLIENT_ID?.trim()
    return clientId || null
  }

  /**
   * The resolved service-token header pair, or null if not present. The runtime
   * (coordinator/transport) attaches these as `CF-Access-Client-Id` /
   * `CF-Access-Client-Secret` per identity-and-access.md.
   */
  resolveHeaders(): { 'CF-Access-Client-Id': string, 'CF-Access-Client-Secret': string } | null {
    return buildServiceTokenHeaders(
      this.env.CF_ACCESS_CLIENT_ID?.trim(),
      this.env.CF_ACCESS_CLIENT_SECRET?.trim(),
    )
  }
}

function isOptionsObject(
  opts: ServiceTokenCredentialProviderOptions | NodeJS.ProcessEnv,
): opts is ServiceTokenCredentialProviderOptions {
  return typeof opts === 'object' && opts !== null && (
    'store' in opts || 'credentialRef' in opts || 'env' in opts
  )
}

/**
 * Default process credential policy: use an explicitly installed service token
 * when present; otherwise use the interactive cloudflared human session.
 */
export class RuntimeCloudCredentialProvider implements CloudCredentialProvider {
  constructor(
    private readonly service = new ServiceTokenCredentialProvider(),
    private readonly human = new CloudflaredCredentialProvider(),
  ) {}

  async resolve(serviceUrl: string): Promise<CloudCredential | null> {
    return await this.service.resolve(serviceUrl) ?? await this.human.resolve(serviceUrl)
  }
}

/**
 * Outcome of an operator-authority requirement check. `ok: false` surfaces a
 * clear operator-authority reason without leaking a secret (BR-1.2, C5).
 */
export type RequireCredentialOutcome
  = | { ok: true, credential: CloudCredential }
    | { ok: false, reason: 'operator_authority_required' | 'authentication_required', message: string }

/**
 * Audience-aware credential resolver (MDT-201, BR-1.2 / C5).
 *
 * Routes one underlying credential provider to the correct Access audience per
 * operation. Provisioning requires the `operator` audience; connect,
 * membership, diagnostics, disable, and normal coordination use the
 * `coordination` audience. A principal who is a project owner but is not
 * admitted by the operator Access policy is denied for provisioning with a
 * clear operator-authority reason and no fallback to coordination.
 *
 * The resolver does NOT create credentials. It only selects the audience for
 * which the underlying provider resolves a credential at the validated origin.
 */
export class AudienceAwareCredentialResolver {
  constructor(private readonly provider: AudienceAwareCredentialProvider) {}

  /** Provisioning uses the operator audience. */
  forProvisioning(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.OPERATOR)
  }

  /** Connect uses the coordination audience (never operator). */
  forConnect(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.COORDINATION)
  }

  /** Membership mutations use the coordination audience. */
  forMembership(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.COORDINATION)
  }

  /** Diagnostics use the coordination audience. */
  forDiagnostics(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.COORDINATION)
  }

  /** Disable uses the coordination audience. */
  forDisable(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.COORDINATION)
  }

  /** Normal coordination operations use the coordination audience. */
  forNormalOperation(serviceOrigin: string): Promise<CloudCredential | null> {
    return this.provider.resolve(serviceOrigin, CloudAccessAudience.COORDINATION)
  }

  /**
   * Require an operator-audience credential for provisioning. Returns a clear
   * operator-authority denial when none is available; never falls back to a
   * coordination credential. The denial message never contains a secret.
   */
  async requireForProvisioning(serviceOrigin: string): Promise<RequireCredentialOutcome> {
    const credential = await this.forProvisioning(serviceOrigin)
    if (!credential) {
      return {
        ok: false,
        reason: 'operator_authority_required',
        message: 'provisioning requires the operator Access audience; the current principal is not admitted by the operator policy',
      }
    }
    return { ok: true, credential }
  }
}

/** Re-export the audience values for callers building routing tables. */
export { CloudAccessAudience, type CloudAccessAudienceValue }

/**
 * Build the Cloudflare Access service-token header pair from the resolved env
 * values. Returns null if either is absent. Header names are fixed per
 * identity-and-access.md § Client Credential Flows + § Secret and Token Policy.
 */
export function buildServiceTokenHeaders(
  clientId: string | undefined,
  clientSecret: string | undefined,
): { 'CF-Access-Client-Id': string, 'CF-Access-Client-Secret': string } | null {
  const id = clientId?.trim()
  const secret = clientSecret?.trim()
  if (!id || !secret)
    return null
  return {
    'CF-Access-Client-Id': id,
    'CF-Access-Client-Secret': secret,
  }
}
