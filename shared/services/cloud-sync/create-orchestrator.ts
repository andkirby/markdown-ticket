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
import { ALLOCATION_PROTOCOL_VERSION, CoordinatorError, CreationIdSchema, MinimumTicketNumberSchema } from '@mdt/domain-contracts'
import { CloudSyncCoordinator as HttpCloudSyncCoordinator } from './CloudSyncCoordinator.js'

interface CloudCreateWriteResult<T> {
  value: T
  acknowledgement: Omit<PendingAcknowledgement, 'operationId'>
}

interface CloudCreateOrchestratorOptions {
  binding: ProjectCloudSyncBinding
  allowedOrigins: string[]
  journal: CloudOperationJournal
  credentialProvider: CloudCredentialProvider
  coordinator?: CloudSyncCoordinatorPort
}

interface CloudCreateInput<T> {
  crType: string
  data: TicketData
  minimumTicketNumber?: number
  verifyLocal?: (ticketNumber: number, creationId: string) => Promise<void>
  writeLocal: (
    ticketNumber: number,
    createdAt: string,
    draft: PendingTicketDraft,
    creationId: string,
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
        protocolVersion: ALLOCATION_PROTOCOL_VERSION,
        minimumTicketNumber: input.minimumTicketNumber ?? 1,
        creationId: randomUUID(),
        idempotencyKey: randomUUID(),
        requestHash,
        operationId: randomUUID(),
        draft,
      })
      if (op.protocolVersion !== ALLOCATION_PROTOCOL_VERSION || !CreationIdSchema.safeParse(op.creationId).success || !MinimumTicketNumberSchema.safeParse(op.minimumTicketNumber).success) {
        throw new CoordinatorError('reservation_state_conflict', { message: 'Legacy creation intent requires explicit reconciliation; its reservation must not be replaced' })
      }
      const creationId = op.creationId!
      const minimumTicketNumber = op.minimumTicketNumber!
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
          protocolVersion: ALLOCATION_PROTOCOL_VERSION,
          creationId,
          minimumTicketNumber,
          idempotencyKey: op.idempotencyKey,
          requestHash: op.requestHash,
        }, credential)
        if (reservation.protocolVersion !== ALLOCATION_PROTOCOL_VERSION || reservation.creationId !== creationId || reservation.minimumTicketNumber !== minimumTicketNumber || !MinimumTicketNumberSchema.safeParse(reservation.ticketNumber).success || reservation.ticketNumber < minimumTicketNumber) {
          throw new CoordinatorError('reservation_state_conflict', { message: 'Coordinator allocation protocol or creation identity does not match the journaled intent' })
        }
        await this.options.journal.recordReservation(
          cloudProjectId,
          reservation.reservationId,
          reservation.ticketNumber,
        )
        op.reservationId = reservation.reservationId
        op.ticketNumber = reservation.ticketNumber
        op.state = 'reserved'
      }

      const local = await input.writeLocal(op.ticketNumber, op.createdAt, effectiveDraft, creationId)
      await input.verifyLocal?.(op.ticketNumber, creationId)
      const acknowledgement: PendingAcknowledgement = {
        operationId: op.operationId,
        ...local.acknowledgement,
      }
      if (op.state !== 'written' || !op.acknowledgement) {
        await this.options.journal.recordLocalWrite(cloudProjectId, acknowledgement)
      }

      if (op.state !== 'acknowledged') {
        await input.verifyLocal?.(op.ticketNumber, creationId)
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
