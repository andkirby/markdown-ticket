/**
 * ProjectStateStore — atomic CONFIG_DIR cloud connection persistence
 * (MDT-201, BR-1.5 / BR-1.6 / BR-4.2 / C3).
 *
 * Source: docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection.
 *
 * The connection record lives ONLY at
 * `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`. Repository files and
 * the registry entry `CONFIG_DIR/projects/{localProjectId}.toml` contain no
 * cloud connection state.
 *
 * Read semantics (C3, BR-4.2, BR-5.1):
 *   - `absent`     → the ONLY outcome that selects local allocation.
 *   - `enabled`    → cloud coordination path.
 *   - `disabled`   → retained, fail-closed (never resumes local numbering).
 *   - `malformed`  → fail-closed.
 *   - `untrusted`  → fail-closed (serviceOrigin not in the trusted profile).
 *
 * Writes are atomic (temp-then-rename) and the trusted profile is enforced
 * before any write so an untrusted origin is never persisted. The store
 * performs exactly one atomic write per `write()` — there is no partial/begin
 * API, so a failed cloud verification leaves connection state unchanged
 * (BR-1.6 commit-last).
 */

import type {
  CloudSyncConnection,
  ProjectConnectionRead,
} from '@mdt/domain-contracts'
import type { TrustedServiceProfile } from './trusted-service-profile.js'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { CLOUD_SYNC_CONNECTION_VERSION, CloudSyncConnectionState } from '@mdt/domain-contracts'
import { parseToml, stringify as stringifyToml } from '../../utils/toml.js'

export interface ProjectStateStoreOptions {
  /**
   * CONFIG_DIR root. The connection installs under
   * `{rootDir}/projects/{localProjectId}/cloud-sync.toml`. Defaults to the
   * shared CONFIG_DIR. Pass a temp dir in tests.
   */
  rootDir?: string
  /** Trusted service profile; required to enforce origin trust on read+write. */
  profile: TrustedServiceProfile
}

/** Thrown when a connection fails validation (never leaks the file content). */
export class ProjectStateFormatError extends Error {
  constructor(message = 'cloud-sync connection is malformed') {
    super(message)
    this.name = 'ProjectStateFormatError'
  }
}

/** Thrown when a write is rejected because the origin is not trusted. */
export class UntrustedServiceOriginError extends Error {
  constructor() {
    super('connection serviceOrigin is not in the effective trusted service profile')
    this.name = 'UntrustedServiceOriginError'
  }
}

export class ProjectStateStore {
  private readonly rootDir: string
  private readonly profile: TrustedServiceProfile

  constructor(opts: ProjectStateStoreOptions) {
    this.rootDir = opts.rootDir ?? defaultConfigDir()
    this.profile = opts.profile
  }

  /**
   * Atomically write the connection record. Enforces origin trust first so an
   * untrusted origin is never persisted. This is the single commit point —
   * there is no partial/begin API, so a failed cloud verification (handled by
   * the caller) leaves connection state unchanged (BR-1.6).
   */
  async write(localProjectId: string, connection: CloudSyncConnection): Promise<void> {
    requireSafeProjectId(localProjectId)
    validateConnection(connection)
    const trust = this.profile.checkConnectionOrigin(connection)
    if (trust.kind === 'untrusted') {
      // Never persist an untrusted origin.
      throw new UntrustedServiceOriginError()
    }
    const file = this.filePath(localProjectId)
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    const tmp = `${file}.tmp`
    await writeFile(tmp, serializeConnection(connection), { mode: 0o600 })
    await rename(tmp, file)
  }

  /**
   * Read the connection for a project. Returns the discriminated
   * `ProjectConnectionRead`; only `absent` selects local allocation.
   */
  async read(localProjectId: string): Promise<ProjectConnectionRead> {
    requireSafeProjectId(localProjectId)
    let raw: string
    try {
      raw = await readFile(this.filePath(localProjectId), 'utf8')
    }
    catch (err) {
      if (isNotFound(err)) {
        return { kind: 'absent' }
      }
      throw err
    }
    let connection: CloudSyncConnection
    try {
      connection = parseConnection(raw)
    }
    catch {
      // Malformed file fails closed; the reason never leaks file content.
      return { kind: 'malformed', reason: 'cloud-sync connection is malformed' }
    }
    const trust = this.profile.checkConnectionOrigin(connection)
    if (trust.kind === 'untrusted') {
      return { kind: 'untrusted', connection, reason: trust.reason }
    }
    return connection.state === CloudSyncConnectionState.ENABLED
      ? { kind: 'enabled', connection }
      : { kind: 'disabled', connection }
  }

  /** Remove the connection file (used only by permanent-detach, not disable). */
  async delete(localProjectId: string): Promise<void> {
    requireSafeProjectId(localProjectId)
    const { rm } = await import('node:fs/promises')
    await rm(this.filePath(localProjectId), { force: true })
  }

  /** Resolve the absolute connection file path for one project. */
  filePath(localProjectId: string): string {
    requireSafeProjectId(localProjectId)
    return join(this.rootDir, 'projects', localProjectId, 'cloud-sync.toml')
  }
}

/** Serialize a connection to canonical TOML (round-trip verified). */
function serializeConnection(connection: CloudSyncConnection): string {
  const obj = {
    version: connection.version,
    state: connection.state,
    cloudProjectId: connection.cloudProjectId,
    serviceOrigin: connection.serviceOrigin,
    pollIntervalSeconds: connection.pollIntervalSeconds,
  }
  const out = stringifyToml(obj)
  // Round-trip verify so a serialization bug never writes a partial record.
  const reparsed = parseToml(out) as Partial<CloudSyncConnection>
  if (
    reparsed.version !== connection.version
    || reparsed.state !== connection.state
    || reparsed.cloudProjectId !== connection.cloudProjectId
    || reparsed.serviceOrigin !== connection.serviceOrigin
    || reparsed.pollIntervalSeconds !== connection.pollIntervalSeconds
  ) {
    throw new ProjectStateFormatError('connection TOML round-trip verification failed')
  }
  return out
}

/** Parse a connection file. Throws on any malformed field. */
function parseConnection(raw: string): CloudSyncConnection {
  let parsed: unknown
  try {
    parsed = parseToml(raw)
  }
  catch {
    throw new ProjectStateFormatError()
  }
  const obj = parsed as Partial<CloudSyncConnection> & Record<string, unknown>
  const { version, state, cloudProjectId, serviceOrigin, pollIntervalSeconds } = obj
  if (version !== CLOUD_SYNC_CONNECTION_VERSION) {
    throw new ProjectStateFormatError()
  }
  if (state !== CloudSyncConnectionState.ENABLED && state !== CloudSyncConnectionState.DISABLED) {
    throw new ProjectStateFormatError()
  }
  if (typeof cloudProjectId !== 'string' || cloudProjectId.length === 0) {
    throw new ProjectStateFormatError()
  }
  if (typeof serviceOrigin !== 'string' || serviceOrigin.length === 0) {
    throw new ProjectStateFormatError()
  }
  if (typeof pollIntervalSeconds !== 'number'
    || !Number.isInteger(pollIntervalSeconds)
    || pollIntervalSeconds < 5
    || pollIntervalSeconds > 300) {
    throw new ProjectStateFormatError()
  }
  return {
    version,
    state,
    cloudProjectId,
    serviceOrigin,
    pollIntervalSeconds,
  }
}

function validateConnection(connection: CloudSyncConnection): void {
  if (connection.version !== CLOUD_SYNC_CONNECTION_VERSION) {
    throw new ProjectStateFormatError('unsupported connection version')
  }
  if (connection.state !== CloudSyncConnectionState.ENABLED && connection.state !== CloudSyncConnectionState.DISABLED) {
    throw new ProjectStateFormatError('unsupported connection state')
  }
  if (typeof connection.cloudProjectId !== 'string' || connection.cloudProjectId.length === 0) {
    throw new ProjectStateFormatError('cloudProjectId is required')
  }
  if (typeof connection.serviceOrigin !== 'string' || connection.serviceOrigin.length === 0) {
    throw new ProjectStateFormatError('serviceOrigin is required')
  }
  if (!Number.isInteger(connection.pollIntervalSeconds) || connection.pollIntervalSeconds < 5 || connection.pollIntervalSeconds > 300) {
    throw new ProjectStateFormatError('pollIntervalSeconds must be an integer from 5 through 300')
  }
}

function requireSafeProjectId(localProjectId: string): void {
  if (typeof localProjectId !== 'string' || !/^[\w.-]+$/.test(localProjectId) || localProjectId.length > 256) {
    throw new ProjectStateFormatError('invalid localProjectId')
  }
}

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT'
}

function defaultConfigDir(): string {
  return process.env.CONFIG_DIR
    ?? join(homedir(), '.config', 'markdown-ticket')
}
