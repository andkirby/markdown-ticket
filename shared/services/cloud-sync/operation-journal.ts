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

import type { ProjectedHeader, TicketData } from '@mdt/domain-contracts'
import { createHash } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { CoordinatorError } from '@mdt/domain-contracts'

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

export interface OperationJournalOptions {
  /** Root dir = CONFIG_DIR/cloud-sync/journals. */
  rootDir: string
  /** Physical Git common dir or canonical project root, for the routing key. */
  physicalRepoPath: string
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
  async load(cloudProjectId: string): Promise<PendingOperation | null> {
    try {
      const data = await readFile(this.filePath(cloudProjectId), 'utf8')
      return JSON.parse(data) as PendingOperation
    }
    catch {
      return null
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
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    const lockPath = `${this.filePath(cloudProjectId)}.lock`
    await this.acquireLock(lockPath)
    try {
      return await run()
    }
    finally {
      await unlink(lockPath).catch(() => undefined)
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

  private async acquireLock(lockPath: string): Promise<void> {
    try {
      const handle = await open(lockPath, 'wx', 0o600)
      await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }))
      await handle.close()
      return
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }

    let ownerPid: number | undefined
    try {
      const lock = JSON.parse(await readFile(lockPath, 'utf8')) as { pid?: unknown }
      ownerPid = typeof lock.pid === 'number' ? lock.pid : undefined
    }
    catch {
      ownerPid = undefined
    }
    if (ownerPid !== undefined && isProcessAlive(ownerPid)) {
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'cloud ticket creation is already running for this project',
      })
    }
    await unlink(lockPath).catch(() => undefined)
    const handle = await open(lockPath, 'wx', 0o600)
    await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }))
    await handle.close()
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
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

// Re-export dirname helper for callers building the root path.
export { dirname }
