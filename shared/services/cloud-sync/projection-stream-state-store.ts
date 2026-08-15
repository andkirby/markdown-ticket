/**
 * projection-stream-state-store — persisted local activation state for the
 * projection stream (MDT-226 incident recovery).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream manager.
 *
 * Persists the NON-SECRET activation view: `phase`, stable `reasonCode`,
 * activation fingerprint, bounded attempt budget, and transition timestamps in
 * `{rootDir}/projects/{localProjectId}/projection-stream-state.json`. A grant,
 * token, assertion, principal identifier, or raw error body is NEVER persisted
 * — the store's fixed schema makes that structurally impossible (C-3, C-14,
 * C-15).
 *
 * Persistence mirrors the projection read-model pattern: temp-then-rename with
 * user-only permissions (0600 files, 0700 dirs).
 */

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/**
 * Durable manager phases. `paused_authorization` and `paused_incompatible`
 * are terminal until an approved re-arm event; `stale_offline` is terminal
 * once the persisted transient budget is exhausted.
 */
export const PROJECTION_STREAM_PHASES = [
  'connecting',
  'live',
  'stale_offline',
  'paused_authorization',
  'paused_incompatible',
] as const

export type ProjectionStreamPhase = (typeof PROJECTION_STREAM_PHASES)[number]

/** Persisted (non-secret) stream activation state. */
export interface ProjectionStreamState {
  schemaVersion: 1
  cloudProjectId: string
  /** Non-secret activation fingerprint this state belongs to. */
  activationFingerprint: string
  phase: ProjectionStreamPhase
  /** Stable non-secret reason code for the current phase. */
  reasonCode: string
  /** Transient reconnect attempts consumed for this activation. */
  attemptCount: number
  /** Epoch-ms of the last phase transition. */
  lastTransitionAt: number
  /** Epoch-ms when the stream was last live (0 = never). */
  lastLiveAt: number
  /** Operator activation generation; an explicit retry bumps it. */
  activationGeneration: number
}

export interface ProjectionStreamStateStoreOptions {
  /**
   * Root directory for stream state. The state file lives at
   * `{rootDir}/projects/{localProjectId}/projection-stream-state.json`.
   * Defaults to the shared CONFIG_DIR. Pass a temp dir in tests.
   */
  rootDir?: string
  localProjectId: string
}

/** The non-secret fingerprint inputs (requirements.md § Activation fingerprint). */
export interface ActivationFingerprintInput {
  cloudProjectId: string
  serviceOrigin: string
  /** Credential kind + stable identity — routine token refresh does not change it. */
  credentialKind: 'human' | 'service'
  credentialIdentity: string
  /** Deployed stream protocol version the client speaks. */
  streamProtocol: number
  /** Operator activation generation; an explicit retry bumps it. */
  activationGeneration: number
}

/**
 * Compute the activation fingerprint: a SHA-256 over the stable non-secret
 * activation inputs. An unchanged fingerprint cannot re-arm a terminal stream
 * failure (C-15).
 */
export function activationFingerprint(input: ActivationFingerprintInput): string {
  const material = JSON.stringify({
    cloudProjectId: input.cloudProjectId,
    serviceOrigin: input.serviceOrigin,
    credentialKind: input.credentialKind,
    credentialIdentity: input.credentialIdentity,
    streamProtocol: input.streamProtocol,
    activationGeneration: input.activationGeneration,
  })
  return createHash('sha256').update(material).digest('hex')
}

/**
 * Extract a stable, non-secret credential identity from resolved stream
 * authorization headers. Human Access JWTs contribute their `sub` claim
 * (validation stays Cloudflare's job); service credentials contribute their
 * client id. A routine refresh of the same credential yields the same value.
 */
export function credentialIdentityFromAuthorization(auth: {
  headers: Record<string, string>
}): { kind: 'human' | 'service', identity: string } {
  const humanToken = auth.headers['cf-access-token']
  if (typeof humanToken === 'string' && humanToken.length > 0) {
    return { kind: 'human', identity: decodeJwtSubject(humanToken) }
  }
  const clientId = auth.headers['CF-Access-Client-Id']
  if (typeof clientId === 'string' && clientId.length > 0) {
    return { kind: 'service', identity: clientId }
  }
  return { kind: 'human', identity: '' }
}

function decodeJwtSubject(token: string): string {
  try {
    const payloadSegment = token.split('.')[1]
    if (!payloadSegment)
      return ''
    const payload = JSON.parse(
      Buffer.from(payloadSegment, 'base64url').toString('utf8'),
    ) as { sub?: unknown }
    return typeof payload.sub === 'string' ? payload.sub : ''
  }
  catch {
    return ''
  }
}

/** Monotonic tmp-file suffix so concurrent saves cannot collide. */
let saveCounter = 0

export class ProjectionStreamStateStore {
  private readonly rootDir: string
  private readonly localProjectId: string
  private readonly stateFile: string

  constructor(opts: ProjectionStreamStateStoreOptions) {
    this.rootDir = opts.rootDir ?? defaultConfigDir()
    this.localProjectId = opts.localProjectId
    this.stateFile = join(this.rootDir, 'projects', this.localProjectId, 'projection-stream-state.json')
  }

  /** Load persisted state; null when none exists. */
  async load(): Promise<ProjectionStreamState | null> {
    let raw: string
    try {
      raw = await readFile(this.stateFile, 'utf8')
    }
    catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === 'ENOENT')
        return null
      throw err
    }
    try {
      return sanitize(JSON.parse(raw))
    }
    catch {
      return null
    }
  }

  /** Atomically persist state (temp-then-rename, user-only permissions). */
  async save(state: ProjectionStreamState): Promise<void> {
    await mkdir(join(this.rootDir, 'projects', this.localProjectId), {
      recursive: true,
      mode: 0o700,
    })
    // Unique tmp name: a stale in-flight save must never consume or collide
    // with a newer one during activation transitions.
    const tmp = `${this.stateFile}.${process.pid}.${saveCounter++}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 })
    await rename(tmp, this.stateFile)
  }
}

/** Accept only the fixed non-secret schema; drop anything unexpected. */
function sanitize(raw: unknown): ProjectionStreamState | null {
  if (typeof raw !== 'object' || raw === null)
    return null
  const v = raw as Record<string, unknown>
  const phases: readonly string[] = PROJECTION_STREAM_PHASES
  if (typeof v.cloudProjectId !== 'string'
    || typeof v.activationFingerprint !== 'string'
    || typeof v.phase !== 'string'
    || !phases.includes(v.phase)
    || typeof v.reasonCode !== 'string') {
    return null
  }
  return {
    schemaVersion: 1,
    cloudProjectId: v.cloudProjectId,
    activationFingerprint: v.activationFingerprint,
    phase: v.phase as ProjectionStreamPhase,
    reasonCode: v.reasonCode,
    attemptCount: typeof v.attemptCount === 'number' ? v.attemptCount : 0,
    lastTransitionAt: typeof v.lastTransitionAt === 'number' ? v.lastTransitionAt : 0,
    lastLiveAt: typeof v.lastLiveAt === 'number' ? v.lastLiveAt : 0,
    activationGeneration: typeof v.activationGeneration === 'number' ? v.activationGeneration : 0,
  }
}

function defaultConfigDir(): string {
  return process.env.CONFIG_DIR
    ?? join(homedir(), '.config', 'markdown-ticket')
}
