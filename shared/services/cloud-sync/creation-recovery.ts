import type {
  CreationRecoveryInspection,
  CreationRecoveryOutcome,
  CreationRecoveryReconcileInput,
  CreationRecoveryResumeInput,
} from '@mdt/domain-contracts'
import type { CloudOperationJournal, PendingOperation } from './operation-journal.js'
import { CoordinatorError, CreationRecoveryReconcileInputSchema, CreationRecoveryResumeInputSchema } from '@mdt/domain-contracts'

/** Trusted read-only proof port; never supplied by a request body. */
export interface CreationTerminalProof {
  cloudProjectId: string
  reservationId: string
  ticketNumber: number
  creationId?: string
  state: 'acknowledged' | 'abandoned'
  canonicalVerified: boolean
}

export interface CreationRecoveryServiceOptions {
  journal: CloudOperationJournal
  cloudProjectId: string
  resumeOperation: (op: PendingOperation) => Promise<{ recovered: string[], failed: string[] }>
  verifyTerminal: (op: PendingOperation) => Promise<CreationTerminalProof | null>
}

export class CreationRecoveryService {
  constructor(private readonly options: CreationRecoveryServiceOptions) {}

  inspect(): Promise<CreationRecoveryInspection> {
    return this.options.journal.inspect(this.options.cloudProjectId)
  }

  async resume(input: CreationRecoveryResumeInput): Promise<CreationRecoveryOutcome> {
    const parsed = CreationRecoveryResumeInputSchema.safeParse(input)
    if (!parsed.success)
      throw new CoordinatorError('invalid_request', { message: 'Use a discovered journal ID and its exact inspection digest' })
    const { journalId, expectedDigest } = parsed.data
    const entry = (await this.inspect()).entries.find(value => value.journalId === journalId)
    if (!entry || entry.digest !== expectedDigest)
      throw new CoordinatorError('reservation_state_conflict', { message: 'Creation journal changed; inspect the current entry before retrying' })
    if (entry.nextAction !== 'resume')
      return { status: 'manual-review-required', journalId }
    const op = await this.options.journal.load(this.options.cloudProjectId, expectedDigest)
    if (!op?.draft || !isResumableCreation(op))
      return { status: 'manual-review-required', journalId }
    // The callback passes expectedDigest to RecoveryRunner, which obtains its
    // existing lock and rechecks the same read before replay. Never nest locks.
    const result = await this.options.resumeOperation(op)
    return { status: result.recovered.includes(this.options.cloudProjectId) ? 'resumed' : 'retained', journalId }
  }

  async reconcile(input: CreationRecoveryReconcileInput): Promise<CreationRecoveryOutcome> {
    const parsed = CreationRecoveryReconcileInputSchema.safeParse(input)
    if (!parsed.success)
      throw new CoordinatorError('invalid_request', { message: 'Reconciliation requires a discovered journal, exact digest, UUID and reason' })
    return this.options.journal.archiveTerminal(this.options.cloudProjectId, parsed.data, this.options.verifyTerminal)
  }
}

function isResumableCreation(op: PendingOperation): boolean {
  return op.state !== 'acknowledged' && op.protocolVersion === 2 && !!op.creationId && op.minimumTicketNumber !== undefined && !!op.draft
}
