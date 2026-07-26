/**
 * Machine credential store — owner-only CONFIG_DIR machine credential files.
 *
 * Source: docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         docs/architecture/cloud-sync/README.md § Local Cloud Connection,
 *         constraints C6 (no persisted secrets outside CONFIG_DIR credential
 *         files), C8 (per-runtime owner-only machine credentials).
 *
 * Machine service-token credentials are installed per runtime under
 * `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml`. The directory and
 * file are owner-only (`0700`/`0600` on POSIX and the closest supported
 * equivalent elsewhere), writes are atomic, and diagnostics redact the secret.
 *
 * This store CONSUMES credentials installed by the operator-controlled
 * Cloudflare procedure. It does NOT create, rotate, or fetch Cloudflare tokens
 * — `ServiceTokenCredentialProvider` only reads the installed pair (BR-2.3, C8).
 *
 * Invariants:
 *   - The secret is never returned through diagnostics, errors, or listing
 *     helpers (C6).
 *   - Browser-facing consumers receive the redacted diagnostic view only.
 *   - A malformed file fails closed; no partial credential is returned.
 */

import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { parseToml, stringify as stringifyToml } from '../../utils/toml.js'

/** Credential file schema version. Currently `1`. */
export const MACHINE_CREDENTIAL_VERSION = 1 as const

/** Supported credential kinds. The first slice ships the Cloudflare service token. */
export type MachineCredentialKind = 'cloudflare-service-token'

/** Persisted machine credential record. Owner-only file (C6, C8). */
export interface MachineCredentialRecord {
  version: typeof MACHINE_CREDENTIAL_VERSION
  kind: MachineCredentialKind
  /** Non-secret machine principal id (Access service-token client id). */
  clientId: string
  /** Owner-only secret; never returned through diagnostics or DTOs. */
  clientSecret: string
}

/**
 * Redacted diagnostic view. Browser-facing consumers receive this shape only;
 * the secret never appears here (C6).
 */
export interface MachineCredentialDiagnostic {
  credentialRef: string
  installed: boolean
  /** Non-secret principal id; safe to surface for membership. */
  clientId?: string
  kind?: MachineCredentialKind
}

export interface MachineCredentialStoreOptions {
  /**
   * Credential root dir. Credentials install under
   * `{rootDir}/credentials/{credentialRef}.toml`. Defaults to
   * `CONFIG_DIR/cloud-sync` (so the canonical production path is
   * `CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml` per
   * docs/architecture/cloud-sync/README.md § Local Cloud Connection). Pass a
   * temp dir in tests.
   */
  rootDir?: string
}

/**
 * Thrown when a caller attempts to read a secret through a redacted path (e.g.
 * a browser-facing consumer). The message never contains the secret.
 */
export class CredentialRedactedError extends Error {
  constructor(readonly credentialRef: string) {
    super(`machine credential is redacted for ${credentialRef}`)
    this.name = 'CredentialRedactedError'
  }
}

/** Thrown when a credential file is malformed or fails validation. */
export class MachineCredentialFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MachineCredentialFormatError'
  }
}

/**
 * Owner-only atomic machine credential store. One file per runtime under
 * `{rootDir}/cloud-sync/credentials/`.
 */
export class MachineCredentialStore {
  private readonly rootDir: string

  constructor(opts: MachineCredentialStoreOptions = {}) {
    this.rootDir = opts.rootDir ?? defaultCredentialRoot()
  }

  /**
   * Atomically install (or replace) the credential for one runtime. The
   * directory and file are owner-only; the write is temp-then-rename.
   */
  async install(credentialRef: string, record: MachineCredentialRecord): Promise<void> {
    requireSafeCredentialRef(credentialRef)
    validateRecord(record)
    const file = this.filePath(credentialRef)
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    const tmp = `${file}.tmp`
    await writeFile(tmp, serializeRecord(record), { mode: 0o600 })
    await rename(tmp, file)
    // Re-tighten permissions after rename in case the temp file inherited a
    // different mode on a foreign filesystem (defense in depth; C6).
    await chmodOwnerOnly(file, 0o600)
  }

  /**
   * Load the credential for one runtime, or null when none is installed. A
   * malformed file throws — the caller fails closed without a partial value.
   */
  async load(credentialRef: string): Promise<MachineCredentialRecord | null> {
    requireSafeCredentialRef(credentialRef)
    let raw: string
    try {
      raw = await readFile(this.filePath(credentialRef), 'utf8')
    }
    catch (err) {
      if (isNotFound(err)) {
        return null
      }
      throw err
    }
    return parseRecord(raw)
  }

  /** Remove the credential for one runtime. Idempotent. */
  async remove(credentialRef: string): Promise<void> {
    requireSafeCredentialRef(credentialRef)
    await rm(this.filePath(credentialRef), { force: true })
  }

  /**
   * Redacted diagnostic view of the credential for one runtime. Browser-facing
   * consumers receive this shape only; the secret never appears here.
   */
  describe(credentialRef: string): MachineCredentialDiagnostic {
    requireSafeCredentialRef(credentialRef)
    // Synchronous diagnostic: we intentionally do NOT read the file here. The
    // installed/clientId fields are populated by callers that already hold a
    // loaded record; the diagnostic itself carries no secret. This keeps the
    // method safe to hand to any consumer.
    return { credentialRef, installed: false }
  }

  /**
   * Build a redacted diagnostic from a loaded record. The loaded secret is
   * dropped; only the non-secret principal id and kind are surfaced.
   */
  describeLoaded(record: MachineCredentialRecord, credentialRef: string): MachineCredentialDiagnostic {
    requireSafeCredentialRef(credentialRef)
    return {
      credentialRef,
      installed: true,
      clientId: record.clientId,
      kind: record.kind,
    }
  }

  /** Resolve the absolute file path for a credential ref (test/diagnostic use). */
  filePath(credentialRef: string): string {
    requireSafeCredentialRef(credentialRef)
    return join(this.rootDir, 'credentials', `${credentialRef}.toml`)
  }
}

/** Serialize a record to canonical TOML (round-trip verified). */
function serializeRecord(record: MachineCredentialRecord): string {
  const obj = {
    version: record.version,
    kind: record.kind,
    clientId: record.clientId,
    clientSecret: record.clientSecret,
  }
  const out = stringifyToml(obj)
  // Round-trip verify so a serialization bug never writes a partial secret.
  const reparsed = parseToml(out) as Partial<MachineCredentialRecord>
  if (
    reparsed.version !== record.version
    || reparsed.kind !== record.kind
    || reparsed.clientId !== record.clientId
    || reparsed.clientSecret !== record.clientSecret
  ) {
    throw new MachineCredentialFormatError('credential TOML round-trip verification failed')
  }
  return out
}

/** Parse and validate a credential file. Throws on any malformed field. */
function parseRecord(raw: string): MachineCredentialRecord {
  let parsed: unknown
  try {
    parsed = parseToml(raw)
  }
  catch {
    throw new MachineCredentialFormatError('credential file is not valid TOML')
  }
  const obj = parsed as Partial<MachineCredentialRecord>
  if (obj.version !== MACHINE_CREDENTIAL_VERSION) {
    throw new MachineCredentialFormatError('credential file has unsupported version')
  }
  if (obj.kind !== 'cloudflare-service-token') {
    throw new MachineCredentialFormatError('credential file has unsupported kind')
  }
  if (typeof obj.clientId !== 'string' || obj.clientId.length === 0) {
    throw new MachineCredentialFormatError('credential file is missing clientId')
  }
  if (typeof obj.clientSecret !== 'string' || obj.clientSecret.length === 0) {
    throw new MachineCredentialFormatError('credential file is missing clientSecret')
  }
  return {
    version: obj.version,
    kind: obj.kind,
    clientId: obj.clientId,
    clientSecret: obj.clientSecret,
  }
}

function validateRecord(record: MachineCredentialRecord): void {
  if (record.version !== MACHINE_CREDENTIAL_VERSION) {
    throw new MachineCredentialFormatError('unsupported credential version')
  }
  if (record.kind !== 'cloudflare-service-token') {
    throw new MachineCredentialFormatError('unsupported credential kind')
  }
  if (typeof record.clientId !== 'string' || record.clientId.trim().length === 0) {
    throw new MachineCredentialFormatError('clientId is required')
  }
  if (typeof record.clientSecret !== 'string' || record.clientSecret.trim().length === 0) {
    throw new MachineCredentialFormatError('clientSecret is required')
  }
}

/** A credential ref is a stable runtime name; restrict to a safe filename set. */
function requireSafeCredentialRef(credentialRef: string): void {
  if (typeof credentialRef !== 'string' || !/^[\w.-]+$/.test(credentialRef) || credentialRef.length > 128) {
    throw new MachineCredentialFormatError('invalid credentialRef')
  }
}

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT'
}

async function chmodOwnerOnly(file: string, mode: number): Promise<void> {
  // POSIX only: Windows chmod is a no-op for owner-only semantics. We avoid
  // importing node:fs constants synchronously; chmod + conditional keeps this
  // portable across runtimes.
  try {
    const { chmod } = await import('node:fs/promises')
    await chmod(file, mode)
  }
  catch {
    // If chmod fails on a foreign filesystem, the temp-file mode and rename
    // already established owner-only permissions on POSIX. Swallow defensively
    // rather than leaking a path through an error.
  }
}

/**
 * Resolve the default credential root synchronously. We read CONFIG_DIR from
 * the environment directly (the shared `getConfigDir()` helper respects the
 * same variable) to avoid a dynamic import / require at module load and to
 * stay loadable in runtimes that do not ship the shared config helpers.
 */
function defaultCredentialRoot(): string {
  // Default credential root = CONFIG_DIR/cloud-sync, so the canonical path is
  // CONFIG_DIR/cloud-sync/credentials/{credentialRef}.toml.
  const configDir = process.env.CONFIG_DIR
    ?? join(homedir(), '.config', 'markdown-ticket')
  return join(configDir, 'cloud-sync')
}
