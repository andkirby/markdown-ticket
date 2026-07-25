/**
 * Ticket-number allocation strategy seam.
 *
 * Source: docs/CRs/MDT-199/architecture.md § Module Ownership,
 *         docs/CRs/MDT-200/architecture.md § Requirement → Module Conformance.
 *
 * TicketService selects a strategy from validated project config:
 *   - LocalTicketNumberAllocator: preserves the existing highest+1 scan exactly.
 *   - CloudTicketNumberAllocator: calls the shared cloud coordinator.
 *   - FailClosedCloudAllocator: a valid enabled binding with no coordinator
 *     wired yet (U1). Throws CoordinatorError('authentication_required') —
 *     never a local number (BR-1.5). U2 replaces this with the real client.
 *
 * A cloud-bound create with an unavailable coordinator fails recoverably and
 * NEVER falls back to local numbering (BR-1.5, C4). Local-only projects are
 * unchanged (BR-1.7).
 */

import type {
  CloudCredential,
  CloudSyncCoordinator,
  ProjectCloudSyncBinding,
  ReservationDTO,
  ReserveRequest,
} from '@mdt/domain-contracts'
import type { ProjectConfig } from '../../models/Project.js'
import { CoordinatorError } from '@mdt/domain-contracts'
import { validateProjectBinding } from './config.js'

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
 * Read the `[project.cloudSync]` binding from a loaded ProjectConfig and return
 * the validated binding ONLY when it is present, valid, and enabled.
 *
 * Returns null when:
 *   - there is no binding section (backward-compatible local project, BR-1.7),
 *   - the binding is explicitly disabled (`enabled: false`).
 *
 * A present enabled/malformed binding throws. Falling back to local allocation
 * would risk reusing a number already allocated by another clone.
 *
 * Only a VALID enabled binding triggers the cloud path (which then fails closed
 * without a coordinator in U1). This distinction is deliberate and tested.
 */
export function readEnabledCloudSyncBinding(
  config: ProjectConfig | null,
  opts?: { log?: (msg: string, err?: unknown) => void },
): ProjectCloudSyncBinding | null {
  if (!config?.project)
    return null

  const raw = (config.project as { cloudSync?: unknown }).cloudSync
  if (raw == null)
    return null

  if (typeof raw === 'object' && raw !== null && (raw as { enabled?: unknown }).enabled === false) {
    return null
  }

  let binding: ProjectCloudSyncBinding
  try {
    binding = validateProjectBinding(raw as Partial<ProjectCloudSyncBinding>)
  }
  catch (err) {
    opts?.log?.(`Invalid [project.cloudSync] binding: ${(err as Error).message}`, err)
    throw err
  }
  if (!binding.enabled)
    return null

  return binding
}

/**
 * Select the ticket-number allocator for one project from its loaded config.
 *
 * Selection rule (BR-1.5, BR-1.7):
 *   - No valid enabled binding  -> LocalTicketNumberAllocator (local scan preserved).
 *   - Valid enabled binding + coordinator present -> CloudTicketNumberAllocator.
 *   - Valid enabled binding + no coordinator (U1) -> FailClosedCloudAllocator
 *     (throws authentication_required; never a local number).
 *
 * `buildCloudAllocator` returns null when no coordinator is wired; the selector
 * substitutes the fail-closed allocator in that case. The cloud project id for
 * the ReserveRequest comes from the binding.
 */
export function selectTicketNumberAllocator(
  config: ProjectConfig | null,
  localScan: () => Promise<number>,
  buildCloudAllocator?: (
    binding: ProjectCloudSyncBinding,
  ) => {
    coordinator: CloudSyncCoordinator
    credential: CloudCredential | null
    req: ReserveRequest
  } | null,
  opts?: { log?: (msg: string, err?: unknown) => void },
): TicketNumberAllocator {
  const binding = readEnabledCloudSyncBinding(config, opts)
  if (!binding) {
    return new LocalTicketNumberAllocator(localScan)
  }

  // A valid enabled binding takes the cloud path. No coordinator wired yet
  // (U1) -> fail closed. This MUST NOT fall back to local numbering.
  const built = buildCloudAllocator?.(binding)
  if (!built) {
    return new FailClosedCloudAllocator(binding)
  }
  return new CloudTicketNumberAllocator(built.coordinator, built.credential, built.req)
}
