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
  state: 'pending' | 'conflict'
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

export type ProjectionSyncResult = 'synced' | 'queued' | 'conflict'
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
      state: 'pending',
      updatedAt: new Date().toISOString(),
    }
    await this.write(pending)
    return this.attempt(pending)
  }

  async flush(): Promise<{ synced: number, queued: number, conflicts: number }> {
    let names: string[]
    try {
      names = await readdir(this.dir)
    }
    catch {
      return { synced: 0, queued: 0, conflicts: 0 }
    }
    let synced = 0
    let queued = 0
    let conflicts = 0
    for (const name of names.filter(item => item.endsWith('.json'))) {
      const ticketNumber = Number.parseInt(name.replace(/\.json$/u, ''), 10)
      const pending = await this.load(ticketNumber)
      if (!pending)
        continue
      const result = await this.attempt(pending)
      if (result === 'synced')
        synced += 1
      else if (result === 'conflict')
        conflicts += 1
      else
        queued += 1
    }
    return { synced, queued, conflicts }
  }

  private async attempt(pending: PendingProjection): Promise<ProjectionSyncResult> {
    if (pending.state === 'conflict') {
      return 'conflict'
    }
    const credential = await this.options.credentialProvider.resolve(this.options.binding.serviceUrl)
    if (!credential) {
      return 'queued'
    }
    try {
      const current = await this.client.get(pending.ticketNumber, credential)
      // The no-op guard must compare BOTH content and lifecycle. A delete keeps
      // the same content hash (deleteCR passes previous === next), so a
      // content-only check would drop the lifecycle:'deleted' tombstone and
      // leave the cloud projection active forever (MDT-200 regression).
      const sameContent = current.contentHash === pending.contentHash
      const sameLifecycle = (current.lifecycle ?? 'active') === pending.lifecycle
      if (sameContent && sameLifecycle) {
        await this.clear(pending.ticketNumber)
        return 'synced'
      }
      if (current.contentHash !== pending.baseContentHash) {
        await this.markConflict(pending)
        return 'conflict'
      }
      const request: ProjectionPublishRequest = {
        ticketNumber: pending.ticketNumber,
        reservationId: current.reservationId,
        expectedProjectionVersion: current.projectionVersion,
        operationId: pending.operationId,
        contentHash: pending.contentHash,
        header: pending.header,
        lifecycle: pending.lifecycle,
      }
      await this.client.publish(request, credential)
      await this.clear(pending.ticketNumber)
      return 'synced'
    }
    catch (error) {
      if (error instanceof CoordinatorError && error.code === 'projection_version_conflict') {
        await this.markConflict(pending)
        return 'conflict'
      }
      return 'queued'
    }
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

  private async markConflict(pending: PendingProjection): Promise<void> {
    await this.write({ ...pending, state: 'conflict', updatedAt: new Date().toISOString() })
  }

  private async clear(ticketNumber: number): Promise<void> {
    await unlink(this.file(ticketNumber)).catch(() => undefined)
  }

  private file(ticketNumber: number): string {
    return join(this.dir, `${ticketNumber}.json`)
  }
}
