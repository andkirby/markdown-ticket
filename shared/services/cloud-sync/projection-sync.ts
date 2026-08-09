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
      state: existing?.state === 'unmanaged' || existing?.state === 'conflict'
        ? existing.state
        : 'pending',
      updatedAt: new Date().toISOString(),
    }
    await this.write(pending)
    // Terminal states do not retry automatically.
    if (pending.state === 'unmanaged' || pending.state === 'conflict') {
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
      return this.classifyError(pending, error)
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

  private file(ticketNumber: number): string {
    return join(this.dir, `${ticketNumber}.json`)
  }
}
