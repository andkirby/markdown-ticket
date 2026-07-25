import type {
  CloudCredentialProvider,
  CloudSyncCoordinator as CloudSyncCoordinatorPort,
  ProjectCloudSyncBinding,
  ProjectedHeader,
  TicketData,
} from '@mdt/domain-contracts'
import type {
  CloudOperationJournal,
  PendingAcknowledgement,
  PendingTicketDraft,
} from './operation-journal.js'
import { createHash, randomUUID } from 'node:crypto'
import { CoordinatorError } from '@mdt/domain-contracts'
import { CloudSyncCoordinator as HttpCloudSyncCoordinator } from './CloudSyncCoordinator.js'

export interface CloudCreateWriteResult<T> {
  value: T
  acknowledgement: Omit<PendingAcknowledgement, 'operationId'>
}

export interface CloudCreateOrchestratorOptions {
  binding: ProjectCloudSyncBinding
  allowedOrigins: string[]
  journal: CloudOperationJournal
  credentialProvider: CloudCredentialProvider
  coordinator?: CloudSyncCoordinatorPort
}

export interface CloudCreateInput<T> {
  crType: string
  data: TicketData
  writeLocal: (
    ticketNumber: number,
    createdAt: string,
    draft: PendingTicketDraft,
  ) => Promise<CloudCreateWriteResult<T>>
}

/**
 * The complete cloud-bound create transaction from the local application's
 * perspective. Cloud allocation is durable before the file write; the file is
 * durable before acknowledgement; no failure path allocates locally.
 */
export class CloudCreateOrchestrator {
  private readonly coordinator: CloudSyncCoordinatorPort

  constructor(private readonly options: CloudCreateOrchestratorOptions) {
    this.coordinator = options.coordinator ?? new HttpCloudSyncCoordinator({
      serviceUrl: options.binding.serviceUrl,
      globalConfig: { allowedOrigins: options.allowedOrigins },
    })
  }

  async create<T>(input: CloudCreateInput<T>): Promise<T> {
    const draft: PendingTicketDraft = { crType: input.crType, data: input.data }
    const requestHash = sha256(stableJson(draft))
    const cloudProjectId = this.options.binding.projectId

    return this.options.journal.withLock(cloudProjectId, async () => {
      const op = await this.options.journal.begin({
        cloudProjectId,
        idempotencyKey: randomUUID(),
        requestHash,
        operationId: randomUUID(),
        draft,
      })
      const effectiveDraft = op.draft ?? draft
      const credential = await this.options.credentialProvider.resolve(this.options.binding.serviceUrl)
      if (!credential) {
        throw new CoordinatorError('authentication_required', {
          message: 'no Cloudflare Access credential is available',
        })
      }

      if (!op.reservationId || op.ticketNumber === undefined) {
        const reservation = await this.coordinator.reserve({
          cloudProjectId,
          idempotencyKey: op.idempotencyKey,
          requestHash: op.requestHash,
        }, credential)
        await this.options.journal.recordReservation(
          cloudProjectId,
          reservation.reservationId,
          reservation.ticketNumber,
        )
        op.reservationId = reservation.reservationId
        op.ticketNumber = reservation.ticketNumber
        op.state = 'reserved'
      }

      const local = await input.writeLocal(op.ticketNumber, op.createdAt, effectiveDraft)
      const acknowledgement: PendingAcknowledgement = {
        operationId: op.operationId,
        ...local.acknowledgement,
      }
      if (op.state !== 'written' || !op.acknowledgement) {
        await this.options.journal.recordLocalWrite(cloudProjectId, acknowledgement)
      }

      if (op.state !== 'acknowledged') {
        await this.coordinator.acknowledge({
          cloudProjectId,
          reservationId: op.reservationId,
          ...acknowledgement,
        }, credential)
        await this.options.journal.recordAcknowledged(cloudProjectId)
      }
      await this.options.journal.clear(cloudProjectId)
      return local.value
    })
  }
}

export function projectedHeaderHash(header: ProjectedHeader): string {
  return sha256(stableJson(header))
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
