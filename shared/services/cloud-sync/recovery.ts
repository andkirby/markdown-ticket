/**
 * Recovery runner — consumes the CloudOperationJournal on startup and replays
 * any pending cloud operation to completion.
 *
 * Source: docs/CRs/MDT-199/architecture.md § Local Write Recovery,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract,
 *         docs/CRs/MDT-200 (BR-1.4 idempotent replay, BR-1.5 no local fallback).
 *
 * For each pending operation the runner, in order:
 *   1. If no reservation is held yet, retry `reserve` with the ORIGINAL
 *      idempotency key (BR-1.4). The reservation is journaled immediately so a
 *      crash during the subsequent write still recovers.
 *   2. Retry the local file write with the reserved ticket number.
 *   3. Acknowledge the reservation (the local Markdown now exists).
 *   4. Clear the journal entry.
 *
 * Already-reserved ops skip step 1 and reuse the held reservation. Already-
 * acknowledged ops skip straight to step 4 (idempotent cleanup). Retired numbers
 * are never reused and the runner NEVER falls back to local numbering (BR-1.5):
 * any recoverable failure (no credential, coordinator unavailable, write error)
 * leaves the op pending for the next run.
 */

import type {
  AcknowledgeReservationRequest,
  CloudCredential,
  CloudSyncCoordinator,
  ReservationDTO,
} from '@mdt/domain-contracts'
import type { CloudOperationJournal, PendingOperation } from './operation-journal.js'
import { CoordinatorError } from '@mdt/domain-contracts'

/** A credential, or null when none is available (caller must NOT fall back). */
export type RecoveryCredential = CloudCredential | null

/**
 * Writes the local Markdown file for a recovered reservation. The runner
 * retries this with the reserved ticket number; it must not allocate a number
 * of its own. Throw to signal the write is still incomplete (op stays pending).
 */
export type WriteLocalFile = (
  cloudProjectId: string,
  reservation: ReservationDTO,
) => Promise<void>

export interface RecoveryRunnerOptions {
  journal: CloudOperationJournal
  coordinator: CloudSyncCoordinator
  credential: RecoveryCredential
  writeLocal: WriteLocalFile
  buildAcknowledgement?: (
    op: PendingOperation,
  ) => Promise<Omit<AcknowledgeReservationRequest, 'cloudProjectId' | 'reservationId'>>
  /** Optional structured logger. Never receives credentials. */
  log?: (msg: string, err?: unknown) => void
}

export interface RecoveryResult {
  /** cloudProjectIds fully recovered (acknowledged + cleared). */
  recovered: string[]
  /** cloudProjectIds that could not be completed this run (op retained). */
  failed: string[]
}

/**
 * Replays pending cloud operations to completion. Never throws on a recoverable
 * failure — it records the project as `failed` and leaves the op pending so the
 * next run can retry. Never falls back to local numbering (BR-1.5).
 */
export class RecoveryRunner {
  constructor(private readonly opts: RecoveryRunnerOptions) {}

  /**
   * Recover the pending operation for each given cloud project id (the runtime
   * knows its bound projects). Returns the recovered/failed partition. Projects
   * with no pending operation are neither recovered nor failed (nothing to do).
   */
  async recoverPending(cloudProjectIds: Iterable<string>): Promise<RecoveryResult> {
    const recovered: string[] = []
    const failed: string[] = []
    for (const cloudProjectId of cloudProjectIds) {
      const outcome = await this.recoverOne(cloudProjectId)
      if (outcome === 'recovered')
        recovered.push(cloudProjectId)
      else if (outcome === 'failed')
        failed.push(cloudProjectId)
      // 'nothing' contributes to neither list.
    }
    return { recovered, failed }
  }

  /** Per-project outcome: recovered (cleared), failed (retained), or nothing. */
  private async recoverOne(cloudProjectId: string): Promise<'recovered' | 'failed' | 'nothing'> {
    const op = await this.opts.journal.load(cloudProjectId)
    if (!op)
      return 'nothing' // no pending operation — nothing to do

    // Fully acknowledged: only the cleanup was lost. Clear and finish without
    // re-writing or re-acknowledging (idempotent completion).
    if (op.state === 'acknowledged') {
      await this.opts.journal.clear(cloudProjectId)
      return 'recovered'
    }

    // A no-credential recovery cannot reach the cloud; keep the op pending and
    // report failed. NEVER fall back to local numbering (BR-1.5).
    if (!this.opts.credential) {
      this.opts.log?.(`recovery: ${cloudProjectId} has no credential; leaving pending`)
      return 'failed'
    }

    try {
      await this.ensureReserved(op)
      await this.replayLocalWrite(op)
      await this.acknowledge(op)
      await this.opts.journal.clear(cloudProjectId)
      return 'recovered'
    }
    catch (err) {
      // Recoverable: the op stays journaled (reservation already recorded if it
      // was obtained) for the next run. Never a local fallback.
      this.opts.log?.(`recovery: ${cloudProjectId} still pending: ${(err as Error)?.message ?? err}`, err)
      return 'failed'
    }
  }

  /**
   * Step 1: obtain a reservation if one is not already held, reusing the
   * ORIGINAL idempotency key (BR-1.4). The reservation is journaled before the
   * write so a mid-write crash still recovers.
   */
  private async ensureReserved(op: PendingOperation): Promise<void> {
    if (op.reservationId && op.ticketNumber !== undefined)
      return // already reserved — reuse the held reservation

    const reservation = await this.opts.coordinator.reserve(
      { cloudProjectId: op.cloudProjectId, idempotencyKey: op.idempotencyKey, requestHash: op.requestHash },
      this.opts.credential!,
    )
    await this.opts.journal.recordReservation(op.cloudProjectId, reservation.reservationId, reservation.ticketNumber)
    // Reflect the now-journaled reservation on the in-memory op so the caller
    // sees it without a re-load.
    op.reservationId = reservation.reservationId
    op.ticketNumber = reservation.ticketNumber
  }

  /**
   * Step 2: retry the local file write with the reserved ticket number. Throws
   * on failure (op stays `reserved` for the next run).
   */
  private async replayLocalWrite(op: PendingOperation): Promise<void> {
    if (op.state === 'written' && op.acknowledgement) {
      return
    }
    const reservation: ReservationDTO = {
      reservationId: op.reservationId!,
      ticketNumber: op.ticketNumber!,
      state: 'reserved',
      replayed: true,
    }
    await this.opts.writeLocal(op.cloudProjectId, reservation)
  }

  /**
   * Step 3: acknowledge the reservation now that the local file exists. Throws
   * (CoordinatorError) on failure so the runner reports failed — the op is kept
   * `reserved` for the next run.
   */
  private async acknowledge(op: PendingOperation): Promise<void> {
    const payload = op.acknowledgement ?? await this.opts.buildAcknowledgement?.(op)
    if (!payload) {
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'recovery is missing the projected header acknowledgement',
      })
    }
    if (!op.acknowledgement) {
      await this.opts.journal.recordLocalWrite(op.cloudProjectId, payload)
      op.acknowledgement = payload
      op.state = 'written'
    }
    await this.opts.coordinator.acknowledge({
      cloudProjectId: op.cloudProjectId,
      reservationId: op.reservationId!,
      ...payload,
    }, this.opts.credential!)
    await this.opts.journal.recordAcknowledged(op.cloudProjectId)
  }
}

// Re-export the CoordinatorError type guard for callers that catch and classify.
export { CoordinatorError }
