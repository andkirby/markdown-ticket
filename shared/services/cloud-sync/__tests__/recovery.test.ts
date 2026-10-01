/**
 * TEST-recovery — covers the CloudOperationJournal recovery runner (MDT-200
 * Slice U2).
 *
 * Source: docs/CRs/MDT-199/architecture.md § Local Write Recovery,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract.
 *
 * Verifies (BR-1.4, Edge-2):
 *   - a journaled pending operation retries reserve with the SAME idempotency
 *     key, then retries the local file write, then acknowledges, then clears;
 *   - an already-reserved op (reservation obtained but ack lost) skips reserve
 *     and just retries the file write + acknowledge + clear;
 *   - the runner NEVER falls back to local numbering (BR-1.5).
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'

import { CloudOperationJournal } from '../operation-journal'
import { RecoveryRunner } from '../recovery'

const CREDENTIAL = { kind: 'human', cfAccessToken: 'tok' } as const
const ACKNOWLEDGEMENT = {
  operationId: 'op-recovery',
  contentHash: 'hash-recovery',
  header: {
    code: 'MDT-777',
    title: 'Recovered',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    assignee: null,
    date_created: '2026-07-25T00:00:00.000Z',
    last_modified: '2026-07-25T00:00:00.000Z',
  },
}

let root: string
let journal: CloudOperationJournal

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mdt-recovery-'))
  journal = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo' })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/** A fake coordinator that records the idempotency key it was called with. */
function fakeCoordinator(opts: {
  reserveResult?: { reservationId: string, ticketNumber: number, state: string, replayed: boolean }
  reserveError?: CoordinatorError
}): { reserve: jest.Mock, acknowledge: jest.Mock } {
  const reserve = jest.fn(async (req: { idempotencyKey: string }) => {
    if (opts.reserveError)
      throw opts.reserveError
    void req
    return opts.reserveResult ?? { reservationId: 'res-replayed', ticketNumber: 777, state: 'reserved', replayed: true }
  })
  const acknowledge = jest.fn(async () => ({
    acknowledged: true as const,
    projectionVersion: 1,
    projectRevision: 1,
    replayed: false,
  }))
  return {
    reserve: reserve as unknown as jest.Mock,
    acknowledge: acknowledge as unknown as jest.Mock,
  }
}

describe('RecoveryRunner: pending op (reserve never happened / response lost)', () => {
  it('retries reserve with the SAME idempotency key, writes, acknowledges, clears', async () => {
    // Seed a pending op (reserve response was lost).
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })

    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    const result = await runner.recoverPending(['p1'])

    expect(result.recovered).toEqual(['p1'])
    // SAME idempotency key reused (BR-1.4).
    expect(coordinator.reserve).toHaveBeenCalledWith(
      expect.objectContaining({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' }),
      CREDENTIAL,
    )
    // Local write retried with the reserved ticket number.
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ ticketNumber: 201, reservationId: 'res-9' }))
    // Acknowledged after the write.
    expect(coordinator.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ cloudProjectId: 'p1', reservationId: 'res-9' }),
      CREDENTIAL,
    )
    // Cleared on success.
    expect(await journal.load('p1')).toBeNull()
  })

  it('records the reservation before the write so a crash during write still recovers', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    let recordedReservedBeforeWrite = false
    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async () => {
        // At the moment the write runs, the reservation must already be journaled.
        const op = await journal.load('p1')
        recordedReservedBeforeWrite = op?.state === 'reserved' && op.reservationId === 'res-9'
      },
    })
    await runner.recoverPending(['p1'])
    expect(recordedReservedBeforeWrite).toBe(true)
  })
})

describe('RecoveryRunner: reserved op (reservation obtained, ack lost)', () => {
  it('skips reserve, retries write + acknowledge + clear', async () => {
    // Reservation was obtained but acknowledgement (or cleanup) was lost.
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.recordReservation('p1', 'res-9', 201)

    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    await runner.recoverPending(['p1'])

    // Reserve NOT retried (the reservation is already held — reuse it, BR-1.4).
    expect(coordinator.reserve).not.toHaveBeenCalled()
    // Write + acknowledge retried with the existing reservation.
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ ticketNumber: 201, reservationId: 'res-9' }))
    expect(coordinator.acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({ cloudProjectId: 'p1', reservationId: 'res-9' }),
      CREDENTIAL,
    )
    expect(await journal.load('p1')).toBeNull()
  })
})

describe('RecoveryRunner: acknowledged op (cleanup lost)', () => {
  it('only clears (idempotent cleanup)', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.recordReservation('p1', 'res-9', 201)
    await journal.recordAcknowledged('p1')

    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    await runner.recoverPending(['p1'])

    // Fully acknowledged — just clear the journal. No re-reserve, no re-write.
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(await journal.load('p1')).toBeNull()
  })
})

describe('RecoveryRunner: no fallback to local numbering (BR-1.5)', () => {
  it('does NOT call the local write fallback when reserve fails recoverably', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveError: new CoordinatorError('coordination_unavailable') })
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    const result = await runner.recoverPending(['p1'])

    // Recoverable failure: the op stays pending (kept for the next run) and is
    // reported as failed — never a local number.
    expect(result.recovered).toEqual([])
    expect(result.failed).toEqual(['p1'])
    expect(write).not.toHaveBeenCalled()
    const stillPending = await journal.load('p1')
    expect(stillPending?.state).toBe('pending')
  })

  it('keeps the op and reports failed when the local write throws', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    const write = jest.fn(async (_r: unknown) => {
      throw new Error('disk full')
    })

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    const result = await runner.recoverPending(['p1'])
    expect(result.recovered).toEqual([])
    expect(result.failed).toEqual(['p1'])
    // Reservation was recorded but ack did NOT run (write failed); op stays for retry.
    const op = await journal.load('p1')
    expect(op?.state).toBe('reserved')
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
  })

  it('does not fall back to local numbering when no credential is available', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: null, // no credential
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })

    const result = await runner.recoverPending(['p1'])
    expect(result.recovered).toEqual([])
    expect(result.failed).toEqual(['p1'])
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    // Op retained for the next run.
    expect((await journal.load('p1'))?.state).toBe('pending')
  })
})

describe('RecoveryRunner: idempotency / multiple projects', () => {
  it('skips projects with no pending op (nothing to recover)', async () => {
    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})
    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async (_id, reservation) => write(reservation),
    })
    const result = await runner.recoverPending(['p-empty'])
    expect(result.recovered).toEqual([])
    expect(result.failed).toEqual([])
    expect(coordinator.reserve).not.toHaveBeenCalled()
  })

  it('recovers multiple independent projects in one run', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.begin({ cloudProjectId: 'p2', idempotencyKey: 'k-2', requestHash: 'h-2' })

    const coordinator = fakeCoordinator({})
    const runner = new RecoveryRunner({
      journal,
      coordinator: coordinator as any,
      credential: CREDENTIAL,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      writeLocal: async () => {},
    })

    const result = await runner.recoverPending(['p1', 'p2'])
    expect(result.recovered.sort()).toEqual(['p1', 'p2'])
    expect(await journal.load('p1')).toBeNull()
    expect(await journal.load('p2')).toBeNull()
  })
})
