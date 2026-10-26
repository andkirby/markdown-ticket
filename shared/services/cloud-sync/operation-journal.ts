import type { CreationRecoveryEntry, CreationRecoveryInspection, CreationRecoveryLock, CreationRecoveryOutcome, CreationRecoveryReconcileInput, ProjectedHeader, TicketData } from '@mdt/domain-contracts'
import type { CreationTerminalProof } from './creation-recovery.js'
/**
 * Cloud operation journal — atomic, non-secret pending-operation persistence.
 *
 * Source: docs/CRs/MDT-199/architecture.md § Local Write Recovery,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract.
 *
 * Survives these boundaries (BR-1.4, Edge-2):
 *   - response lost after allocation
 *   - allocation returned but local file write failed
 *   - file exists but acknowledgement lost
 *   - acknowledgement succeeded but journal cleanup failed
 *
 * Every recovery reuses the original idempotency key or reservation. Retired
 * numbers are never reused. The journal holds NO secrets.
 *
 * Journal files live at CONFIG_DIR/cloud-sync/journals/{routingHash}/{cloudProjectId}.json
 * with user-only permissions (0700/0600 on POSIX).
 */

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import process from 'node:process'
import { CoordinatorError, CreationRecoveryEntrySchema, CreationRecoveryLockSchema, PendingOperationFileSchema } from '@mdt/domain-contracts'

const MAX_JOURNAL_BYTES = 1024 * 1024

interface JournalRoute {
  journalId: string
  file: string
  route: 'current' | 'legacy'
}

export interface PendingTicketDraft {
  crType: string
  data: TicketData
}

export interface PendingAcknowledgement {
  operationId: string
  contentHash: string
  header: ProjectedHeader
}

/** One persisted pending operation. */
export interface PendingOperation {
  /** Stable id = cloudProjectId + idempotency key hash. */
  creationId?: string
  minimumTicketNumber?: number
  protocolVersion?: 2
  cloudProjectId: string
  idempotencyKey: string
  requestHash: string
  operationId: string
  /** Present once a reservation has been obtained. */
  reservationId?: string
  ticketNumber?: number
  /** Device-local draft lets a later process retry the same canonical write. */
  draft?: PendingTicketDraft
  /** Persisted after the Markdown file exists and before acknowledgement. */
  acknowledgement?: PendingAcknowledgement
  /** Lifecycle: pending → reserved → written → acknowledged → cleared. */
  state: 'pending' | 'reserved' | 'written' | 'acknowledged'
  createdAt: string
  updatedAt: string
}

interface OperationJournalOptions {
  /** Root dir = CONFIG_DIR/cloud-sync/journals. */
  rootDir: string
  /** Physical Git common dir or canonical project root, for the routing key. */
  physicalRepoPath: string
  /** Old project-root routing must never be silently abandoned during upgrade. */
  legacyPhysicalRepoPaths?: string[]
}

/**
 * Atomic operation journal. One file per (routingHash, cloudProjectId).
 * The routing key is a device-local hash of the physical repo — never sent as
 * cloud identity. Linked worktrees for one physical repo resume the same
 * pending operation; independent clones remain independent.
 */
export class CloudOperationJournal {
  private readonly dir: string

  constructor(private readonly opts: OperationJournalOptions) {
    const routingHash = sha256short(opts.physicalRepoPath)
    this.dir = join(opts.rootDir, routingHash)
  }

  /** Load any pending operation for this cloud project, or null. */
  async load(cloudProjectId: string, expectedDigest?: string): Promise<PendingOperation | null> {
    for (const legacyPath of new Set(this.opts.legacyPhysicalRepoPaths ?? [])) {
      const legacyDir = join(this.opts.rootDir, sha256short(legacyPath))
      if (legacyDir === this.dir)
        continue
      for (const suffix of ['.json', '.json.lock']) {
        try {
          await readBounded(join(legacyDir, `${cloudProjectId}${suffix}`))
        }
        catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
            continue
          throw new CoordinatorError('reservation_state_conflict', { message: 'Legacy creation journal cannot be inspected; preserve it for explicit recovery' })
        }
        throw new CoordinatorError('reservation_state_conflict', { message: 'Legacy project-root creation journal requires explicit recovery before new allocation' })
      }
    }
    try {
      const data = await readBounded(this.filePath(cloudProjectId))
      if (!data || (expectedDigest !== undefined && digestBytes(data) !== expectedDigest))
        throw new Error('Journal is oversized or changed')
      const parsed = PendingOperationFileSchema.parse(JSON.parse(data.toString('utf8')))
      if (parsed.cloudProjectId !== cloudProjectId)
        throw new Error('Journal project identity mismatch')
      return parsed
    }
    catch (error) {
      if (expectedDigest === undefined && isMissing(error))
        return null
      throw new CoordinatorError('reservation_state_conflict', { message: 'Pending creation journal cannot be verified; preserve it for explicit recovery' })
    }
  }

  /** Read-only discovery: malformed files and lock-only routes remain visible. */
  async inspect(cloudProjectId: string): Promise<CreationRecoveryInspection> {
    const entries: CreationRecoveryEntry[] = []
    for (const route of this.routes(cloudProjectId)) {
      const lock = await inspectLock(`${route.file}.lock`)
      let bytes: Buffer | null
      try {
        bytes = await readBounded(route.file)
      }
      catch (error) {
        if (isMissing(error) && !lock)
          continue
        entries.push({ journalId: route.journalId, route: route.route, digest: null, status: isMissing(error) ? 'lock-only' : 'unreadable', ...(lock ? { lock } : {}), nextAction: lock ? 'verify-lock-owner' : 'manual-review-required' })
        continue
      }
      const entry: CreationRecoveryEntry = {
        journalId: route.journalId,
        route: route.route,
        digest: bytes ? digestBytes(bytes) : null,
        status: bytes ? 'malformed' : 'oversized',
        nextAction: 'manual-review-required',
        ...(lock ? { lock } : {}),
      }
      const op = bytes ? parseOperation(bytes, cloudProjectId) : null
      if (op) {
        const resumable = op.state !== 'acknowledged' && route.route === 'current' && op.protocolVersion === 2 && !!op.creationId && op.minimumTicketNumber !== undefined && !!op.draft
        entry.status = op.protocolVersion === 2 && op.creationId && op.minimumTicketNumber !== undefined ? route.route : 'legacy'
        entry.state = op.state
        entry.protocolVersion = op.protocolVersion
        entry.creationId = op.creationId
        entry.minimumTicketNumber = op.minimumTicketNumber
        entry.ticketNumber = op.ticketNumber
        // Use the output schema as an allowlist for bounded optional strings.
        for (const [key, value] of Object.entries({ operationId: op.operationId, reservationId: op.reservationId, draftTitle: op.draft?.data.title })) {
          if (value !== undefined && CreationRecoveryEntrySchema.safeParse({ ...entry, [key]: value }).success)
            Object.assign(entry, { [key]: value })
        }
        entry.nextAction = op.state === 'acknowledged' && op.reservationId && op.ticketNumber !== undefined
          ? 'archive-terminal'
          : resumable ? 'resume' : 'manual-review-required'
      }
      if (lock && lock.status !== 'dead')
        entry.nextAction = 'verify-lock-owner'
      entries.push(CreationRecoveryEntrySchema.parse(entry))
    }
    return { entries }
  }

  /** Both the active create route and the selected former route are exclusive. */
  async archiveTerminal(
    cloudProjectId: string,
    input: CreationRecoveryReconcileInput,
    verify: (op: PendingOperation) => Promise<CreationTerminalProof | null>,
  ): Promise<CreationRecoveryOutcome> {
    const route = this.routes(cloudProjectId).find(value => value.journalId === input.journalId)
    if (!route)
      throw recoveryConflict()
    const run = async (): Promise<CreationRecoveryOutcome> => {
      const archiveId = `archive/${input.operationId}`
      const archive = join(this.opts.rootDir, archiveId)
      const original = join(archive, 'original.json')
      const decisionFile = join(archive, 'decision.json')
      // A completed immutable receipt is checked before requiring an active file.
      let decisionBytes: Buffer | null
      try {
        decisionBytes = await readBounded(decisionFile)
      }
      catch (error) {
        if (!isMissing(error)) {
          throw recoveryConflict()
        }
        decisionBytes = null
      }
      if (decisionBytes) {
        try {
          const decision = JSON.parse(decisionBytes.toString('utf8')) as Record<string, unknown>
          const archived = await readBounded(original)
          const archivedOp = archived ? parseOperation(archived, cloudProjectId) : null
          if (decision.cloudProjectId !== cloudProjectId || decision.disposition !== 'archive-terminal'
            || !Object.entries(input).every(([key, value]) => decision[key] === value)
            || !archived || digestBytes(archived) !== input.expectedDigest
            || !archivedOp || !matchesTerminalProof(archivedOp, decision.proof)) {
            throw recoveryConflict()
          }
          await this.removeArchivedEntry(route.file, input.expectedDigest, true)
          return { status: 'archived', journalId: input.journalId, operationId: input.operationId, archiveId, replayed: true }
        }
        catch {
          throw recoveryConflict()
        }
      }
      let bytes: Buffer | null
      try {
        bytes = await readBounded(route.file)
      }
      catch {
        throw recoveryConflict()
      }
      if (!bytes || digestBytes(bytes) !== input.expectedDigest)
        throw recoveryConflict()
      const op = parseOperation(bytes, cloudProjectId)
      if (!op || !op.reservationId || op.ticketNumber === undefined)
        return { status: 'manual-review-required', journalId: input.journalId }
      // The service verifies the original receipt against read-only coordinator
      // and canonical evidence. Outages propagate before any archive mutation.
      const proof = await verify(op)
      if (!matchesTerminalProof(op, proof))
        return { status: 'manual-review-required', journalId: input.journalId }
      try {
        await this.checkDigest(route.file, input.expectedDigest)
        await mkdir(join(this.opts.rootDir, 'archive'), { recursive: true, mode: 0o700 })
        // Never reuse or overwrite a partial decision directory.
        await mkdir(archive, { mode: 0o700 })
        await persistExclusive(original, bytes)
        const safeProof: CreationTerminalProof = { cloudProjectId: proof.cloudProjectId, reservationId: proof.reservationId, ticketNumber: proof.ticketNumber, creationId: proof.creationId, state: proof.state, canonicalVerified: proof.canonicalVerified }
        const decision = Buffer.from(JSON.stringify({ ...input, cloudProjectId, disposition: 'archive-terminal', proof: safeProof, decidedAt: new Date().toISOString() }, null, 2))
        await persistExclusive(decisionFile, decision)
        if (!(await readFile(original)).equals(bytes) || !(await readFile(decisionFile)).equals(decision))
          throw recoveryConflict()
        await syncDirectory(archive)
        await syncDirectory(dirname(archive))
        await this.removeArchivedEntry(route.file, input.expectedDigest, false)
        return { status: 'archived', journalId: input.journalId, operationId: input.operationId, archiveId, replayed: false }
      }
      catch {
        // Preserve both active bytes and any partial immutable archive.
        throw recoveryConflict()
      }
    }
    return this.withLock(cloudProjectId, () => route.file === this.filePath(cloudProjectId) ? run() : this.withFileLock(route.file, run))
  }

  private routes(cloudProjectId: string): JournalRoute[] {
    // Project IDs are route components, never paths supplied by recovery input.
    if (!/^[\w-]+$/.test(cloudProjectId))
      throw recoveryConflict()
    const dirs = new Set([this.dir, ...(this.opts.legacyPhysicalRepoPaths ?? []).map(path => join(this.opts.rootDir, sha256short(path)))])
    return [...dirs].map((dir) => {
      const file = join(dir, `${cloudProjectId}.json`)
      return { file, journalId: relative(this.opts.rootDir, file).split('\\').join('/'), route: dir === this.dir ? 'current' : 'legacy' }
    })
  }

  private async checkDigest(file: string, expectedDigest: string): Promise<void> {
    const bytes = await readBounded(file)
    if (!bytes || digestBytes(bytes) !== expectedDigest)
      throw recoveryConflict()
  }

  private async removeArchivedEntry(file: string, expectedDigest: string, allowMissing: boolean): Promise<void> {
    try {
      await this.checkDigest(file, expectedDigest)
      await unlink(file)
      await syncDirectory(dirname(file))
    }
    catch (error) {
      if (!allowMissing || !isMissing(error))
        throw recoveryConflict()
    }
  }

  /**
   * Begin an operation: persist the idempotency key before any network call.
   * If a pending operation already exists for this project, return it (recovery).
   */
  async begin(
    op: Omit<PendingOperation, 'state' | 'createdAt' | 'updatedAt' | 'operationId'>
      & { operationId?: string },
  ): Promise<PendingOperation> {
    const existing = await this.load(op.cloudProjectId)
    if (existing) {
      if (existing.requestHash === op.requestHash) {
        return existing
      }
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'another cloud ticket creation is pending recovery for this project',
      })
    }
    const now = new Date().toISOString()
    const pending: PendingOperation = {
      ...op,
      operationId: op.operationId ?? crypto.randomUUID(),
      state: 'pending',
      createdAt: now,
      updatedAt: now,
    }
    await this.atomicWrite(pending)
    return pending
  }

  /** Record that a reservation was obtained. */
  async recordReservation(cloudProjectId: string, reservationId: string, ticketNumber: number): Promise<void> {
    const op = await this.require(cloudProjectId)
    op.reservationId = reservationId
    op.ticketNumber = ticketNumber
    op.state = 'reserved'
    op.updatedAt = new Date().toISOString()
    await this.atomicWrite(op)
  }

  /** Record that the local file exists and acknowledgement succeeded. */
  async recordAcknowledged(cloudProjectId: string): Promise<void> {
    const op = await this.require(cloudProjectId)
    op.state = 'acknowledged'
    op.updatedAt = new Date().toISOString()
    await this.atomicWrite(op)
  }

  async recordLocalWrite(
    cloudProjectId: string,
    acknowledgement: PendingAcknowledgement,
  ): Promise<void> {
    const op = await this.require(cloudProjectId)
    op.acknowledgement = acknowledgement
    op.state = 'written'
    op.updatedAt = new Date().toISOString()
    await this.atomicWrite(op)
  }

  /**
   * Serialize create/recovery work per physical repository and cloud project.
   * A stale lock owned by a dead process is reclaimed after a crash.
   */
  async withLock<T>(cloudProjectId: string, run: () => Promise<T>): Promise<T> {
    return this.withFileLock(this.filePath(cloudProjectId), run)
  }

  private async withFileLock<T>(file: string, run: () => Promise<T>): Promise<T> {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    const lockPath = `${file}.lock`
    const token = await this.acquireLock(lockPath)
    try {
      return await run()
    }
    finally {
      try {
        const bytes = await readBounded(lockPath, 4096)
        const owner = bytes ? JSON.parse(bytes.toString('utf8')) as { token?: string } : null
        if (owner?.token === token)
          await unlink(lockPath)
      }
      catch { /* Never remove an unverifiable or replaced lock. */ }
    }
  }

  /** Clear a completed operation (acknowledgement + cleanup). */
  async clear(cloudProjectId: string): Promise<void> {
    try {
      await unlink(this.filePath(cloudProjectId))
    }
    catch {
      // Already cleared — idempotent.
    }
  }

  private async require(cloudProjectId: string): Promise<PendingOperation> {
    const op = await this.load(cloudProjectId)
    if (!op) {
      throw new Error(`no pending operation for ${cloudProjectId}`)
    }
    return op
  }

  /** Atomic write: write to temp then rename, with user-only permissions. */
  private async atomicWrite(op: PendingOperation): Promise<void> {
    PendingOperationFileSchema.parse(op)
    const filePath = this.filePath(op.cloudProjectId)
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    const tmp = `${filePath}.tmp`
    // mode 0600 — user-only read/write. The journal holds no secrets, but keep
    // it tight per the architecture.
    await writeFile(tmp, JSON.stringify(op, null, 2), { mode: 0o600 })
    await rename(tmp, filePath)
  }

  private filePath(cloudProjectId: string): string {
    return join(this.dir, `${cloudProjectId}.json`)
  }

  private async acquireLock(lockPath: string): Promise<string> {
    const token = randomUUID()
    const create = async () => {
      const handle = await open(lockPath, 'wx', 0o600)
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, token, createdAt: new Date().toISOString() }))
      }
      finally {
        await handle.close()
      }
    }
    try {
      await create()
      return token
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }

    let previous: string
    let ownerPid: number
    try {
      const bytes = await readBounded(lockPath, 4096)
      if (!bytes)
        throw new Error('Unverified lock owner')
      previous = bytes.toString('utf8')
      const lock = JSON.parse(previous) as { pid?: unknown }
      if (typeof lock.pid !== 'number' || !Number.isSafeInteger(lock.pid) || lock.pid <= 0)
        throw new Error('Unverified lock owner')
      ownerPid = lock.pid
    }
    catch {
      throw new CoordinatorError('reservation_state_conflict', { message: 'Creation lock ownership is unverified; explicit recovery is required' })
    }
    if (isProcessAlive(ownerPid)) {
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'cloud ticket creation is already running for this project',
      })
    }
    // Only one process may reclaim a verified dead owner. Without this guard,
    // two stale readers can unlink each other's newly acquired lock.
    let reclaim
    try {
      reclaim = await open(`${lockPath}.reclaim`, 'wx', 0o600)
    }
    catch {
      throw new CoordinatorError('reservation_state_conflict', { message: 'Creation lock recovery is already running or requires explicit inspection' })
    }
    try {
      if ((await readBounded(lockPath, 4096))?.toString('utf8') !== previous || isProcessAlive(ownerPid))
        throw new CoordinatorError('reservation_state_conflict', { message: 'Creation lock changed during recovery' })
      await unlink(lockPath)
      await create()
      return token
    }
    finally {
      await reclaim.close()
      await unlink(`${lockPath}.reclaim`)
    }
  }

  /** Directory for test inspection. */
  get directory(): string {
    return this.dir
  }
}

function sha256short(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  }
  catch (error) {
    return (error as NodeJS.ErrnoException).code !== 'ESRCH'
  }
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
}

function recoveryConflict(): CoordinatorError {
  return new CoordinatorError('reservation_state_conflict', { message: 'Creation recovery state cannot be verified; preserve evidence and inspect the current journal and lock owner' })
}

function matchesTerminalProof(op: PendingOperation, proof: unknown): proof is CreationTerminalProof {
  return !!proof && typeof proof === 'object'
    && !!op.reservationId && op.ticketNumber !== undefined
    && 'cloudProjectId' in proof && proof.cloudProjectId === op.cloudProjectId
    && 'reservationId' in proof && proof.reservationId === op.reservationId
    && 'ticketNumber' in proof && proof.ticketNumber === op.ticketNumber
    && ('creationId' in proof ? proof.creationId : undefined) === op.creationId
    && 'canonicalVerified' in proof && typeof proof.canonicalVerified === 'boolean'
    && 'state' in proof && (proof.state === 'abandoned' || (proof.state === 'acknowledged' && proof.canonicalVerified))
}

function digestBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Hash and parse callers receive one bounded read of the original bytes. */
async function readBounded(file: string, limit = MAX_JOURNAL_BYTES): Promise<Buffer | null> {
  const handle = await open(file, 'r')
  try {
    const stat = await handle.stat()
    if (stat.size > limit)
      return null
    const buffer = Buffer.alloc(limit + 1)
    let offset = 0
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, null)
      if (bytesRead === 0)
        break
      offset += bytesRead
    }
    return offset > limit ? null : buffer.subarray(0, offset)
  }
  finally {
    await handle.close()
  }
}

function parseOperation(bytes: Buffer, cloudProjectId: string): PendingOperation | null {
  try {
    const result = PendingOperationFileSchema.safeParse(JSON.parse(bytes.toString('utf8')))
    return result.success && result.data.cloudProjectId === cloudProjectId ? result.data : null
  }
  catch {
    return null
  }
}

async function inspectLock(file: string): Promise<CreationRecoveryLock | undefined> {
  let bytes: Buffer | null
  try {
    bytes = await readBounded(file, 4096)
  }
  catch (error) {
    return isMissing(error) ? undefined : { status: 'unverifiable' }
  }
  const result: CreationRecoveryLock = { status: 'unverifiable' }
  try {
    const value: unknown = bytes ? JSON.parse(bytes.toString('utf8')) : null
    if (!value || typeof value !== 'object')
      return result
    if ('pid' in value && typeof value.pid === 'number' && Number.isSafeInteger(value.pid) && value.pid > 0) {
      result.pid = value.pid
      try {
        process.kill(value.pid, 0)
        result.status = 'live'
      }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        result.status = code === 'ESRCH' ? 'dead' : code === 'EPERM' ? 'live' : 'unverifiable'
      }
    }
    if ('createdAt' in value && CreationRecoveryLockSchema.safeParse({ ...result, createdAt: value.createdAt }).success)
      result.createdAt = value.createdAt as string
  }
  catch { /* Partial or malformed lock metadata must remain inspectable. */ }
  return result
}

async function persistExclusive(file: string, bytes: Buffer): Promise<void> {
  const handle = await open(file, 'wx', 0o600)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
  }
  finally {
    await handle.close()
  }
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, 'r')
  try {
    await handle.sync()
  }
  finally {
    await handle.close()
  }
}

// Re-export dirname helper for callers building the root path.
