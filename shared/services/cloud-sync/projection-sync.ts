import type {
  CloudCredentialProvider,
  ProjectCloudSyncBinding,
  ProjectedHeader,
} from '@mdt/domain-contracts'
import type { ProjectionPublishRequest } from './CloudProjectionClient.js'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CoordinatorError } from '@mdt/domain-contracts'
import {
  CloudProjectionClient,

} from './CloudProjectionClient.js'
import { projectedHeaderHash } from './create-orchestrator.js'

interface PendingProjection {
  ticketNumber: number
  baseContentHash: string
  contentHash: string
  header: ProjectedHeader
  lifecycle: 'active' | 'deleted'
  operationId: string
  /**
   * Last known cloud projection version for this ticket. `0` when the local edit
   * has not observed a cloud projection (a pre-cloud ticket). Used as the
   * conditional PUT version; a 409 means the cloud moved past it.
   */
  projectionVersion: number
  /**
   * Terminal classification. `unmanaged` entries never retry automatically — the
   * ticket has no cloud projection and must be imported through an explicit
   * reservation/acknowledgement or backfill workflow (MDT-226).
   */
  state: 'pending' | 'conflict' | 'unmanaged' | 'authentication_paused'
  updatedAt: string
}

export interface ProjectionSyncOptions {
  binding: ProjectCloudSyncBinding
  allowedOrigins: string[]
  journalRoot: string
  physicalRepoPath: string
  credentialProvider: CloudCredentialProvider
  client?: ProjectionClientPort
}

/**
 * Journal attempt outcomes (MDT-226):
 * - `synced`               → entry removed; cloud state matches.
 * - `transient`            → network/429/5xx; bounded exponential backoff.
 * - `authentication_paused`→ 401/403; pause the whole project (no credential).
 * - `conflict`             → 409 version mismatch; operator-visible conflict.
 * - `unmanaged`            → authenticated project exists but projection does not
 *                            (projection_not_found); terminal, no automatic retry.
 */
export type ProjectionSyncResult
  = 'synced' | 'transient' | 'authentication_paused' | 'conflict' | 'unmanaged'
export type ProjectionClientPort = Pick<CloudProjectionClient, 'get' | 'poll' | 'publish'>

/**
 * Durable best-effort Markdown-to-cloud projection publisher. Local edits
 * remain successful during an outage; the pending projected header is stored
 * device-locally and never contains the ticket body.
 */
export class CloudProjectionSync {
  private readonly dir: string
  private readonly client: ProjectionClientPort
  /** Bounded retry runner timer (one per project). */
  private retryTimer: ReturnType<typeof setInterval> | undefined

  constructor(private readonly options: ProjectionSyncOptions) {
    this.dir = join(
      options.journalRoot,
      createHash('sha256').update(options.physicalRepoPath).digest('hex').slice(0, 16),
      options.binding.projectId,
    )
    this.client = options.client ?? new CloudProjectionClient({
      serviceUrl: options.binding.serviceUrl,
      globalConfig: { allowedOrigins: options.allowedOrigins },
    }, options.binding.projectId)
  }

  async publish(
    ticketNumber: number,
    previousHeader: ProjectedHeader,
    nextHeader: ProjectedHeader,
    lifecycle: 'active' | 'deleted',
  ): Promise<ProjectionSyncResult> {
    const existing = await this.load(ticketNumber)
    const pending: PendingProjection = {
      ticketNumber,
      baseContentHash: existing?.baseContentHash ?? projectedHeaderHash(previousHeader),
      contentHash: projectedHeaderHash(nextHeader),
      header: nextHeader,
      lifecycle,
      operationId: existing?.operationId ?? randomUUID(),
      // Preserve the last known cloud version; 0 for a pre-cloud ticket.
      projectionVersion: existing?.projectionVersion ?? 0,
      // Only `unmanaged` is truly terminal (no projection exists). `conflict`
      // resets to `pending` so a new edit retries with the adopted version.
      state: existing?.state === 'unmanaged'
        ? existing.state
        : 'pending',
      updatedAt: new Date().toISOString(),
    }
    await this.write(pending)
    // unmanaged is terminal: no projection to update.
    if (pending.state === 'unmanaged') {
      return pending.state
    }
    return this.attempt(pending)
  }

  async flush(): Promise<{
    synced: number
    transient: number
    authenticationPaused: number
    conflicts: number
    unmanaged: number
  }> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    }
    catch {
      return { synced: 0, transient: 0, authenticationPaused: 0, conflicts: 0, unmanaged: 0 }
    }
    let synced = 0
    let transient = 0
    let authenticationPaused = 0
    let conflicts = 0
    let unmanaged = 0
    for (const name of names.filter(item => item.endsWith('.json'))) {
      const ticketNumber = Number.parseInt(name.replace(/\.json$/u, ''), 10)
      const pending = await this.load(ticketNumber)
      if (!pending)
        continue
      // Terminal states are classified once and do not generate further traffic.
      if (pending.state === 'unmanaged') {
        unmanaged += 1
        continue
      }
      if (pending.state === 'conflict') {
        conflicts += 1
        continue
      }
      const result = await this.attempt(pending)
      if (result === 'synced')
        synced += 1
      else if (result === 'conflict')
        conflicts += 1
      else if (result === 'unmanaged')
        unmanaged += 1
      else if (result === 'authentication_paused')
        authenticationPaused += 1
      else
        transient += 1
    }
    return { synced, transient, authenticationPaused, conflicts, unmanaged }
  }

  /**
   * Attempt one publish WITHOUT a read-before-write (MDT-226). The conditional
   * PUT carries the last known `projectionVersion`; D1 is the single source of
   * truth for version correctness. Outcomes are explicit and terminal states
   * (`unmanaged`, `conflict`) never retry automatically.
   */
  private async attempt(pending: PendingProjection): Promise<ProjectionSyncResult> {
    if (pending.state === 'conflict' || pending.state === 'unmanaged') {
      return pending.state
    }
    const credential = await this.options.credentialProvider.resolve(this.options.binding.serviceUrl)
    if (!credential) {
      await this.markState(pending, 'authentication_paused')
      return 'authentication_paused'
    }
    try {
      // Conditional PUT directly — no GET. reservationId is empty because the D1
      // update query keys on (cloud_project_id, ticket_number, projection_version).
      const request: ProjectionPublishRequest = {
        ticketNumber: pending.ticketNumber,
        reservationId: '',
        expectedProjectionVersion: pending.projectionVersion,
        operationId: pending.operationId,
        contentHash: pending.contentHash,
        header: pending.header,
        lifecycle: pending.lifecycle,
      }
      const result = await this.client.publish(request, credential)
      // Success: update the stored version and clear the entry.
      await this.clear(pending.ticketNumber)
      void result
      return 'synced'
    }
    catch (error) {
      // Optimistic concurrency recovery: if the version was stale, adopt the
      // server's currentVersion and retry once. This handles the cold-start case
      // where the journal held version 0 but D1 has a real projection at vN.
      if (error instanceof CoordinatorError
        && error.code === 'projection_version_conflict'
        && typeof error.currentVersion === 'number'
        && error.currentVersion > 0
        && error.currentVersion !== pending.projectionVersion) {
        const updated = { ...pending, projectionVersion: error.currentVersion }
        const recovered = await this.retryWithVersion(updated, credential)
        if (recovered)
          return 'synced'
        // Retry also failed — classify the UPDATED pending so the adopted
        // version is preserved in the stored entry for the next edit.
        return this.classifyError(updated, error)
      }
      return this.classifyError(pending, error)
    }
  }

  /**
   * Retry the PUT with the adopted server version. Called once from
   * {@link attempt} on a recoverable version conflict. Returns true on success
   * (entry cleared); false on any second failure (caller classifies).
   */
  private async retryWithVersion(
    pending: PendingProjection,
    credential: NonNullable<Awaited<ReturnType<CloudCredentialProvider['resolve']>>>,
  ): Promise<boolean> {
    try {
      await this.client.publish(
        {
          ticketNumber: pending.ticketNumber,
          reservationId: '',
          expectedProjectionVersion: pending.projectionVersion,
          operationId: pending.operationId,
          contentHash: pending.contentHash,
          header: pending.header,
          lifecycle: pending.lifecycle,
        },
        credential,
      )
      await this.clear(pending.ticketNumber)
      return true
    }
    catch {
      // Persist the adopted version so a later retry starts from the server's
      // version rather than the stale 0.
      await this.write(pending)
      return false
    }
  }

  /**
   * Classify a publish failure into an explicit, non-repeating outcome.
   * - `projection_version_conflict` (409) → conflict (operator-visible).
   * - `projection_not_found` (no cloud projection) → unmanaged (terminal).
   * - `project_not_found` / `forbidden` / `authentication_required` → auth paused.
   * - network / 429 / 5xx / unknown → transient (bounded backoff).
   */
  private async classifyError(pending: PendingProjection, error: unknown): Promise<ProjectionSyncResult> {
    if (error instanceof CoordinatorError) {
      switch (error.code) {
        case 'projection_version_conflict':
          await this.markState(pending, 'conflict')
          return 'conflict'
        case 'projection_not_found':
          // Authenticated project, but this ticket has no cloud projection.
          // Terminal: never implicitly import a pre-cloud local ticket.
          await this.markState(pending, 'unmanaged')
          return 'unmanaged'
        case 'project_not_found':
        case 'forbidden':
        case 'authentication_required':
        case 'coordination_suspended':
          await this.markState(pending, 'authentication_paused')
          return 'authentication_paused'
        case 'rate_limited':
        case 'coordination_unavailable':
        default:
          return 'transient'
      }
    }
    return 'transient'
  }

  private async load(ticketNumber: number): Promise<PendingProjection | null> {
    try {
      return JSON.parse(await readFile(this.file(ticketNumber), 'utf8')) as PendingProjection
    }
    catch {
      return null
    }
  }

  private async write(pending: PendingProjection): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 })
    const file = this.file(pending.ticketNumber)
    const temporary = `${file}.tmp`
    await writeFile(temporary, JSON.stringify(pending, null, 2), { mode: 0o600 })
    await rename(temporary, file)
  }

  private async markState(
    pending: PendingProjection,
    state: PendingProjection['state'],
  ): Promise<void> {
    await this.write({ ...pending, state, updatedAt: new Date().toISOString() })
  }

  private async clear(ticketNumber: number): Promise<void> {
    await unlink(this.file(ticketNumber)).catch(() => undefined)
  }

  /**
   * Start a bounded retry runner that flushes non-terminal journal entries on
   * a fixed interval (MDT-226 C-12). This replaces the old read-path flush that
   * caused per-poll D1 amplification. One timer per project; terminal states
   * (`unmanaged`, `conflict`) are skipped and produce zero traffic.
   */
  startRetryRunner(intervalMs = 60_000): void {
    if (this.retryTimer)
      return
    this.retryTimer = setInterval(() => {
      void this.flush().catch(() => {
        // Swallow — the runner must never crash the process.
      })
    }, intervalMs)
  }

  /** Stop the bounded retry runner (graceful shutdown). */
  stopRetryRunner(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private file(ticketNumber: number): string {
    return join(this.dir, `${ticketNumber}.json`)
  }
}
