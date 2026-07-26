/**
 * Ticket-number allocation strategy seam.
 *
 * Source: docs/CRs/MDT-201/architecture.md § Module Boundaries,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract.
 *
 * TicketService selects a strategy from the CONFIG_DIR cloud connection:
 *   - LocalTicketNumberAllocator: preserves the highest+1 scan exactly
 *     (absent connection only — BR-5.1).
 *   - CloudTicketNumberAllocator: calls the shared cloud coordinator.
 *   - FailClosedCloudAllocator: an enabled connection with no coordinator
 *     wired. Throws CoordinatorError — never a local number (BR-1.5).
 *
 * A cloud-bound create with an unavailable coordinator fails recoverably and
 * NEVER falls back to local numbering (BR-1.5, C4). Local-only projects (no
 * CONFIG_DIR connection) are unchanged (BR-5.1).
 */

import type {
  CloudCredential,
  CloudSyncConnection,
  CloudSyncCoordinator,
  ProjectCloudSyncBinding,
  ProjectConnectionRead,
  ReservationDTO,
  ReserveRequest,
} from '@mdt/domain-contracts'
import { CoordinatorError } from '@mdt/domain-contracts'

/** A strategy that allocates the next ticket number for one project. */
export interface TicketNumberAllocator {
  /**
   * Local strategies return just a number. Cloud strategies return a
   * reservation (number + reservation id, journaled for recovery).
   */
  allocate: () => Promise<AllocationOutcome>
}

export type AllocationOutcome
  = | { kind: 'local', ticketNumber: number }
    | { kind: 'cloud', reservation: ReservationDTO }

/**
 * Local allocator — wraps the existing TicketService.getNextCRNumber scan.
 * Preserves local-only behavior exactly (BR-1.7).
 */
export class LocalTicketNumberAllocator implements TicketNumberAllocator {
  constructor(private readonly scan: () => Promise<number>) {}

  async allocate(): Promise<AllocationOutcome> {
    return { kind: 'local', ticketNumber: await this.scan() }
  }
}

/**
 * Result of a cloud allocation attempt. `coordinator_unavailable` is the
 * recoverable failure that must NOT trigger a local fallback.
 */
export type CloudAllocationResult
  = | { ok: true, reservation: ReservationDTO }
    | { ok: false, reason: 'no_credential' | 'coordinator_unavailable', error?: Error }

/**
 * Cloud allocator — calls the coordinator. On coordinator unavailability it
 * returns a recoverable failure; the caller surfaces it without a local number.
 *
 * The caller is responsible for journaling the idempotency key before calling.
 */
export class CloudTicketNumberAllocator implements TicketNumberAllocator {
  constructor(
    private readonly coordinator: CloudSyncCoordinator,
    private readonly credential: CloudCredential | null,
    private readonly req: ReserveRequest,
  ) {}

  async allocate(): Promise<AllocationOutcome> {
    if (!this.credential) {
      throw new CoordinatorError('authentication_required', { message: 'no cloud credential available' })
    }
    try {
      const reservation = await this.coordinator.reserve(this.req, this.credential)
      return { kind: 'cloud', reservation }
    }
    catch (err) {
      if (err instanceof CoordinatorError && err.code === 'coordination_unavailable') {
        // Recoverable. The caller MUST NOT fall back to local numbering.
        throw err
      }
      throw err
    }
  }
}

/**
 * Fail-closed allocator for a valid enabled binding when no cloud coordinator
 * has been wired yet (U1). The real CloudSyncCoordinator arrives in U2; until
 * then a cloud-bound create MUST throw instead of producing a local number
 * (BR-1.5 no-fallback, C4).
 */
export class FailClosedCloudAllocator implements TicketNumberAllocator {
  constructor(private readonly binding: ProjectCloudSyncBinding) {}

  async allocate(): Promise<AllocationOutcome> {
    throw new CoordinatorError(
      'authentication_required',
      { message: `project ${this.binding.projectId} is cloud-bound but no coordinator is available` },
    )
  }
}

/**
 * Allocator selection from a CONFIG_DIR `ProjectConnectionRead` (MDT-201, C3,
 * BR-4.2, BR-5.1).
 *
 *   - `absent`                    → local (the ONLY outcome that selects local).
 *   - `enabled`                   → cloud path (fail-closed without a coordinator).
 *   - `disabled`                  → fail-closed (disable NEVER resumes local).
 *   - `malformed` / `untrusted`   → fail-closed.
 *
 * This is the live selection rule: `TicketService` reads the CONFIG_DIR
 * connection and routes through this model. The legacy `[project.cloudSync]`
 * repo binding is no longer read by the allocator (MDT-201 cutover).
 */
export type AllocatorSelection
  = | { kind: 'local', allocator: TicketNumberAllocator }
    | { kind: 'cloud', allocator: TicketNumberAllocator }
    | { kind: 'fail-closed', reason: string }

/**
 * Synthesize the legacy `ProjectCloudSyncBinding` shape from an enabled
 * CONFIG_DIR connection. `CloudCreateOrchestrator`, `CloudProjectionSync`,
 * and the injected `coordinatorFactory`/`projectionClientFactory` all still
 * consume the binding shape; this adapter lets the live TicketService path
 * drive them from the new connection model without rewriting those modules.
 *
 * Field mapping: `cloudProjectId → projectId`, `serviceOrigin → serviceUrl`.
 * `enabled` is always true (only enabled connections reach the cloud path).
 */
export function bindingFromEnabledConnection(connection: CloudSyncConnection): ProjectCloudSyncBinding {
  return {
    enabled: true,
    projectId: connection.cloudProjectId,
    serviceUrl: connection.serviceOrigin,
    pollIntervalSeconds: connection.pollIntervalSeconds,
  }
}

export function selectAllocatorFromConnection(
  read: ProjectConnectionRead,
  localScan: () => Promise<number>,
): AllocatorSelection {
  switch (read.kind) {
    case 'absent':
      return { kind: 'local', allocator: new LocalTicketNumberAllocator(localScan) }

    case 'enabled': {
      // Cloud path. Without a coordinator wired (U1 / before connect), this
      // fails closed — it MUST NOT fall back to local numbering (BR-1.5,
      // BR-4.2). The caller wires the real coordinator via selectTicketNumber
      // Allocator when available; this selection surfaces the fail-closed
      // contract for the new connection model.
      return {
        kind: 'cloud',
        allocator: new FailClosedCloudAllocator(bindingFromEnabledConnection(read.connection)),
      }
    }

    case 'disabled':
      // Disable NEVER resumes local numbering (BR-4.2). Retained state fails
      // closed; only permanent-detach (separate procedure) removes the record.
      return { kind: 'fail-closed', reason: 'cloud connection is disabled' }

    case 'malformed':
      return { kind: 'fail-closed', reason: 'cloud connection is malformed' }

    case 'untrusted':
      return { kind: 'fail-closed', reason: 'cloud connection serviceOrigin is untrusted' }

    default:
      // Exhaustiveness guard: any unrecognized state fails closed.
      return { kind: 'fail-closed', reason: 'unrecognized connection state' }
  }
}
