/**
 * Cloud credential providers — resolve a Cloudflare Access credential for one
 * runtime (human vs machine).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Client Credential Flows.
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
 *     reads CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET from the process env
 *     and returns null if either is absent. Sending them as the Access client
 *     headers (CF-Access-Client-Id / CF-Access-Client-Secret) is the runtime's
 *     job — this provider resolves presence and exposes the header pair via
 *     buildServiceTokenHeaders.
 *
 * Invariants (identity-and-access.md § Secret and Token Policy):
 *   - No credential is ever printed, persisted, or logged.
 *   - A credential is resolved only for an allowlisted origin (the caller —
 *     the coordinator — re-checks the allowlist before attaching any header).
 */

import type { CloudCredential, CloudCredentialProvider } from '@mdt/domain-contracts'
import type { ChildProcess, ExecFileException } from 'node:child_process'
import { execFile } from 'node:child_process'
import process from 'node:process'

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
 * Machine credential provider. Reads the Access service-token pair from the
 * process environment. Returns null if either value is absent so the caller can
 * surface authentication_required without a local fallback (BR-1.5).
 *
 * The returned `cfAccessToken` carries the resolved client id (a non-secret
 * membership key per identity-and-access.md § Principal Contract). The runtime
 * attaches the actual Access client headers via `buildServiceTokenHeaders`.
 */
export class ServiceTokenCredentialProvider implements CloudCredentialProvider {
  /** Injectable env source (defaults to process.env). */
  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

  async resolve(_serviceUrl: string): Promise<CloudCredential | null> {
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
