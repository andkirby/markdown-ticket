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

import type { CloudSyncCoordinator, ReservationDTO } from '@mdt/domain-contracts'
import type { PendingOperation } from '../operation-journal'
import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { CoordinatorError } from '@mdt/domain-contracts'
import { CloudOperationJournal } from '../operation-journal'
import { RecoveryRunner } from '../recovery'

const IDENTITY = { protocolVersion: 2 as const, creationId: 'c419052e-b1de-4514-8fc7-9d15c72603bc', minimumTicketNumber: 1 }
const CREDENTIAL = { kind: 'human', cfAccessToken: 'tok' } as const
const ACKNOWLEDGEMENT = {
  operationId: 'op-recovery',
  contentHash: 'hash-recovery',
  header: {
    creationId: IDENTITY.creationId,
    code: 'MDT-201',
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
  reserveResult?: ReservationDTO
  reserveError?: CoordinatorError
}) {
  const reserve = jest.fn<CloudSyncCoordinator['reserve']>(async (req) => {
    if (opts.reserveError)
      throw opts.reserveError
    void req
    return { ...IDENTITY, ...(opts.reserveResult ?? { reservationId: 'res-replayed', ticketNumber: 201, state: 'reserved', replayed: true }) }
  })
  const acknowledge = jest.fn<CloudSyncCoordinator['acknowledge']>(async () => ({
    acknowledged: true as const,
    projectionVersion: 1,
    projectRevision: 1,
    replayed: false,
  }))
  return {
    reserve,
    acknowledge,
  }
}

describe('RecoveryRunner: pending op (reserve never happened / response lost)', () => {
  it('retries reserve with the SAME idempotency key, writes, acknowledges, clears', async () => {
    // Seed a pending op (reserve response was lost).
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })

    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    let recordedReservedBeforeWrite = false
    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.recordReservation('p1', 'res-9', 201)

    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.recordReservation('p1', 'res-9', 201)
    await journal.recordAcknowledged('p1')

    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveError: new CoordinatorError('coordination_unavailable') })
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({ reserveResult: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false } })
    const write = jest.fn(async (_r: unknown) => {
      throw new Error('disk full')
    })

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const coordinator = fakeCoordinator({})
    const write = jest.fn(async (_r: unknown) => {})

    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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
      verifyLocal: async () => {},
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
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p2', idempotencyKey: 'k-2', requestHash: 'h-2' })

    const coordinator = fakeCoordinator({})
    const runner = new RecoveryRunner({
      verifyLocal: async () => {},
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

describe('MDT-258 corrupt journal ingress cannot drive replay writes', () => {
  it.each([
    '{broken',
    'null',
    '[]',
    '{}',
    { state: 'unknown' },
    { cloudProjectId: 'another-project' },
    { ticketNumber: '201' },
    { ticketNumber: -1, reservationId: 'invalid-held', state: 'reserved' },
    { ticketNumber: Number.MAX_SAFE_INTEGER, reservationId: 'invalid-held', state: 'reserved' },
    { ticketNumber: 1, minimumTicketNumber: 201, reservationId: 'below-floor', state: 'reserved' },
    { reservationId: [] },
    { draft: { crType: 'Bug Fix', data: { title: 'Valid', type: 'Bug Fix', dependsOn: { bad: true } } } },
    { acknowledgement: { operationId: 'op', contentHash: 'h', header: { code: 'MDT-001' } } },
  ])('reports retained corrupt persisted input %j before reserve/write/ack', async (invalid) => {
    const valid = await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const text = typeof invalid === 'string' ? invalid : JSON.stringify({ ...valid, ...invalid })
    const file = join(journal.directory, 'p1.json')
    const { writeFile, readFile } = await import('node:fs/promises')
    await writeFile(file, text)
    const coordinator = fakeCoordinator({})
    const write = jest.fn(async () => {})
    const runner = new RecoveryRunner({ journal, coordinator: coordinator as never, credential: CREDENTIAL, writeLocal: write, buildAcknowledgement: async () => ACKNOWLEDGEMENT })
    expect(await runner.recoverPending(['p1'])).toEqual({ recovered: [], failed: ['p1'] })
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
    expect(await readFile(file, 'utf8')).toBe(text)
  })
})

describe('identity-aware recovery safety', () => {
  it('cannot replay while another create owns the same journal lock', async () => {
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'held', requestHash: 'held' })
    const coordinator = fakeCoordinator({})
    const writeLocal = jest.fn(async () => {})
    const runner = new RecoveryRunner({ journal, coordinator, credential: CREDENTIAL, writeLocal, verifyLocal: async () => {} })
    await journal.withLock('p1', async () => {
      expect(await runner.recoverPending(['p1'])).toEqual({ recovered: [], failed: ['p1'] })
    })
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(writeLocal).not.toHaveBeenCalled()
  })
  it('retains legacy operations without allocating or acknowledging', async () => {
    await journal.begin({ cloudProjectId: 'legacy', idempotencyKey: 'old', requestHash: 'old' })
    const coordinator = fakeCoordinator({})
    const writeLocal = jest.fn(async () => {})
    const runner = new RecoveryRunner({ journal, coordinator, credential: CREDENTIAL, writeLocal })
    expect(await runner.recoverPending(['legacy'])).toEqual({ recovered: [], failed: ['legacy'] })
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
    expect(writeLocal).not.toHaveBeenCalled()
    expect(await journal.load('legacy')).not.toBeNull()
  })
  it('does not acknowledge a written file whose current identity cannot be verified', async () => {
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'owned', requestHash: 'owned' })
    await journal.recordReservation('p1', 'reservation', 201)
    await journal.recordLocalWrite('p1', ACKNOWLEDGEMENT)
    const coordinator = fakeCoordinator({})
    const verifyLocal = jest.fn(async () => {
      throw new Error('File replaced by another creation')
    })
    const runner = new RecoveryRunner({ journal, coordinator, credential: CREDENTIAL, writeLocal: async () => {}, verifyLocal })
    expect(await runner.recoverPending(['p1'])).toEqual({ recovered: [], failed: ['p1'] })
    expect(verifyLocal).toHaveBeenCalledTimes(1)
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
    expect((await journal.load('p1'))?.state).toBe('written')
  })
})

// PREPARE-only API declarations. Implementation replaces these with the pure
// Zod v4 contracts; all behavioral calls below target the real source module.
interface RecoveryEntry {
  journalId: string
  digest: string | null
  route: 'current' | 'legacy'
  nextAction: string
}
interface ResumeInput { journalId: string, expectedDigest: string }
interface ReconcileInput extends ResumeInput { operationId: string, reason: string }
interface TerminalProof {
  cloudProjectId: string
  reservationId: string
  ticketNumber: number
  creationId?: string
  state: 'acknowledged' | 'abandoned'
  canonicalVerified: boolean
}
interface RecoveryOutcome {
  status: 'resumed' | 'retained' | 'manual-review-required' | 'archived'
  journalId: string
  operationId?: string
  archiveId?: string
  replayed?: boolean
}
interface RecoveryServiceOptions {
  journal: CloudOperationJournal
  cloudProjectId: string
  resumeOperation: (op: PendingOperation) => Promise<{ recovered: string[], failed: string[] }>
  verifyTerminal: (op: PendingOperation) => Promise<TerminalProof | null>
}
interface ExplicitRecoveryService {
  inspect: () => Promise<{ entries: RecoveryEntry[] }>
  resume: (input: ResumeInput) => Promise<RecoveryOutcome>
  reconcile: (input: ReconcileInput) => Promise<RecoveryOutcome>
}

async function explicitRecovery(options: RecoveryServiceOptions): Promise<ExplicitRecoveryService> {
  const modulePath = '../creation-recovery'
  // Missing planned module is an explicit missing-capability assertion, not a
  // loader failure that prevents existing RecoveryRunner tests from executing.
  const module = existsSync(join(__dirname, '..', 'creation-recovery.ts')) ? await import(modulePath) : undefined
  expect(module?.CreationRecoveryService).toEqual(expect.any(Function))
  return new module.CreationRecoveryService(options)
}

function digestOf(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function seedOriginalDraft(subject = journal) {
  const draft = { crType: 'Feature Enhancement', data: { title: 'Original persisted title', type: 'Feature Enhancement', content: 'ORIGINAL_PRIVATE_BODY' } }
  const op = await subject.begin({ ...IDENTITY, cloudProjectId: 'p1', idempotencyKey: 'original-key', requestHash: 'original-hash', draft })
  await subject.recordReservation('p1', 'original-held', 201)
  const file = join(subject.directory, 'p1.json')
  const bytes = await readFile(file)
  return { op: { ...op, state: 'reserved' as const, reservationId: 'original-held', ticketNumber: 201 }, file, bytes, draft, input: { journalId: relative(root, file), expectedDigest: digestOf(bytes) } }
}

function verifiedTerminal(op: PendingOperation, state: TerminalProof['state'] = 'acknowledged'): TerminalProof {
  return { cloudProjectId: op.cloudProjectId, reservationId: op.reservationId!, ticketNumber: op.ticketNumber!, creationId: op.creationId, state, canonicalVerified: true }
}

const ARCHIVE_OPERATION_ID = '1c323e35-9b48-4dfe-b604-f037fd9b1ec0'
function reconcileInput(input: ResumeInput): ReconcileInput {
  return { ...input, operationId: ARCHIVE_OPERATION_ID, reason: 'Owner verified terminal original receipt against coordinator and canonical identity' }
}

describe('review: RecoveryRunner exact-byte guard under existing exclusive lock', () => {
  it('rejects a changed valid journal after inspection without reserve, write, verify or ACK', async () => {
    const seeded = await seedOriginalDraft()
    // Whitespace-only replacement preserves every parsed field but changes bytes.
    await writeFile(seeded.file, `${seeded.bytes.toString('utf8')}\n`)
    const changed = await readFile(seeded.file)
    const coordinator = fakeCoordinator({})
    const writeLocal = jest.fn(async () => {})
    const verifyLocal = jest.fn(async () => {})
    const options: ConstructorParameters<typeof RecoveryRunner>[0] & { expectedDigest: string } = {
      journal,
      coordinator,
      credential: CREDENTIAL,
      writeLocal,
      verifyLocal,
      expectedDigest: seeded.input.expectedDigest,
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
    }
    expect(await new RecoveryRunner(options).recoverPending(['p1'])).toEqual({ recovered: [], failed: ['p1'] })
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(writeLocal).not.toHaveBeenCalled()
    expect(verifyLocal).not.toHaveBeenCalled()
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(changed)
  })
})

describe('review: explicit persisted creation inspection and resume', () => {
  it('restarts from the original stored draft and held receipt through real RecoveryRunner without nested locks', async () => {
    const seeded = await seedOriginalDraft()
    const restarted = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo' })
    const coordinator = fakeCoordinator({})
    const writeLocal = jest.fn(async (_projectId: string, receipt: ReservationDTO) => {
      // Demonstrate the original body reaches the writer, rather than new input.
      const op = await restarted.load('p1')
      expect(op?.draft).toEqual(seeded.draft)
      expect(receipt).toMatchObject({ reservationId: 'original-held', ticketNumber: 201, creationId: IDENTITY.creationId })
    })
    const verifyLocal = jest.fn(async () => {})
    const resumeOperation = jest.fn(async (op: PendingOperation) => {
      expect(op).toMatchObject({ draft: seeded.draft, idempotencyKey: 'original-key', requestHash: 'original-hash', reservationId: 'original-held', ticketNumber: 201, ...IDENTITY })
      const options: ConstructorParameters<typeof RecoveryRunner>[0] & { expectedDigest: string } = {
        journal: restarted,
        coordinator,
        credential: CREDENTIAL,
        writeLocal,
        verifyLocal,
        expectedDigest: seeded.input.expectedDigest,
        buildAcknowledgement: async () => ACKNOWLEDGEMENT,
      }
      return new RecoveryRunner(options).recoverPending(['p1'])
    })
    const verifyTerminal = jest.fn(async () => null)
    const service = await explicitRecovery({ journal: restarted, cloudProjectId: 'p1', resumeOperation, verifyTerminal })
    const inspected = await service.inspect()
    expect(inspected.entries).toEqual(expect.arrayContaining([expect.objectContaining({ journalId: seeded.input.journalId, digest: seeded.input.expectedDigest, nextAction: 'resume' })]))
    expect(resumeOperation).not.toHaveBeenCalled()
    expect(verifyTerminal).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    expect(await service.resume(seeded.input)).toMatchObject({ status: 'resumed', journalId: seeded.input.journalId })
    expect(resumeOperation).toHaveBeenCalledTimes(1)
    expect(coordinator.reserve).not.toHaveBeenCalled()
    expect(writeLocal).toHaveBeenCalledTimes(1)
    expect(verifyLocal).toHaveBeenCalledTimes(1)
    expect(coordinator.acknowledge).toHaveBeenCalledTimes(1)
    expect(coordinator.acknowledge).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 'original-held', header: expect.objectContaining({ creationId: IDENTITY.creationId }) }), CREDENTIAL)
    expect(await restarted.load('p1')).toBeNull()
    await expect(service.resume(seeded.input)).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(coordinator.acknowledge).toHaveBeenCalledTimes(1)
  })

  it('returns retained structured outcome when the real runner cannot verify current canonical identity', async () => {
    const seeded = await seedOriginalDraft()
    const coordinator = fakeCoordinator({})
    const options: ConstructorParameters<typeof RecoveryRunner>[0] & { expectedDigest: string } = {
      journal,
      coordinator,
      credential: CREDENTIAL,
      expectedDigest: seeded.input.expectedDigest,
      writeLocal: async () => {},
      verifyLocal: async () => { throw new Error('different canonical creation') },
      buildAcknowledgement: async () => ACKNOWLEDGEMENT,
    }
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => new RecoveryRunner(options).recoverPending(['p1']), verifyTerminal: async () => null })
    expect(await service.resume(seeded.input)).toMatchObject({ status: 'retained', journalId: seeded.input.journalId })
    expect(coordinator.acknowledge).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
  })

  it('refuses stale digest before invoking the resume callback', async () => {
    const seeded = await seedOriginalDraft()
    await writeFile(seeded.file, `${seeded.bytes.toString('utf8')}\n`)
    const before = await readFile(seeded.file)
    const resumeOperation = jest.fn(async () => ({ recovered: ['p1'], failed: [] }))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation, verifyTerminal: async () => null })
    await expect(service.resume(seeded.input)).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(resumeOperation).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(before)
  })

  it('does not reconstruct a missing original draft or resume legacy/corrupt state', async () => {
    const seeded = await seedOriginalDraft()
    const resumeOperation = jest.fn(async () => ({ recovered: ['p1'], failed: [] }))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation, verifyTerminal: async () => null })
    for (const op of [{ ...seeded.op, draft: undefined }, { ...seeded.op, protocolVersion: undefined, creationId: undefined, minimumTicketNumber: undefined }, '{broken']) {
      const bytes = typeof op === 'string' ? op : JSON.stringify(op)
      await writeFile(seeded.file, bytes)
      expect(await service.resume({ ...seeded.input, expectedDigest: digestOf(bytes) })).toMatchObject({ status: 'manual-review-required' })
      expect(await readFile(seeded.file, 'utf8')).toBe(bytes)
    }
    expect(resumeOperation).not.toHaveBeenCalled()
  })

  it('rejects traversal and another project journalId without touching either operation', async () => {
    const seeded = await seedOriginalDraft()
    await journal.begin({ ...IDENTITY, cloudProjectId: 'p2', idempotencyKey: 'other', requestHash: 'other' })
    const other = join(journal.directory, 'p2.json')
    const otherBytes = await readFile(other)
    const resumeOperation = jest.fn(async () => ({ recovered: ['p1'], failed: [] }))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation, verifyTerminal: async () => null })
    for (const journalId of ['../../outside.json', seeded.file, relative(root, other)])
      await expect(service.resume({ journalId, expectedDigest: seeded.input.expectedDigest })).rejects.toMatchObject({ code: expect.stringMatching(/invalid_request|reservation_state_conflict/) })
    expect(resumeOperation).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    expect(await readFile(other)).toEqual(otherBytes)
  })
})

describe('review: explicit terminal archive retains original evidence', () => {
  it.each(['acknowledged', 'abandoned'] as const)('archives verified %s receipt bytes with private immutable decision and idempotent operationId', async (state) => {
    const seeded = await seedOriginalDraft()
    const verifyTerminal = jest.fn(async (op: PendingOperation) => verifiedTerminal(op, state))
    const resumeOperation = jest.fn(async () => ({ recovered: [], failed: [] }))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation, verifyTerminal })
    const input = reconcileInput(seeded.input)
    const result = await service.reconcile(input)
    expect(result).toMatchObject({ status: 'archived', journalId: input.journalId, operationId: input.operationId, replayed: false })
    expect(result.archiveId).toEqual(expect.any(String))
    expect(isAbsolute(result.archiveId!)).toBe(false)
    expect(result.archiveId).not.toContain('..')
    const archive = join(root, result.archiveId!)
    expect(await readFile(join(archive, 'original.json'))).toEqual(seeded.bytes)
    const decisionBytes = await readFile(join(archive, 'decision.json'))
    const decision = JSON.parse(decisionBytes.toString('utf8'))
    expect(decision).toMatchObject({ ...input, disposition: 'archive-terminal', proof: { cloudProjectId: 'p1', reservationId: 'original-held', ticketNumber: 201, state } })
    expect(statSync(archive).mode & 0o777).toBe(0o700)
    for (const name of ['original.json', 'decision.json'])
      expect(statSync(join(archive, name)).mode & 0o777).toBe(0o600)
    expect(existsSync(seeded.file)).toBe(false)
    expect(resumeOperation).not.toHaveBeenCalled()
    expect(verifyTerminal).toHaveBeenCalledWith(expect.objectContaining({ reservationId: 'original-held', ticketNumber: 201 }))
    expect(await service.reconcile(input)).toMatchObject({ status: 'archived', archiveId: result.archiveId, operationId: input.operationId, replayed: true })
    expect(verifyTerminal).toHaveBeenCalledTimes(1)
    expect(await readFile(join(archive, 'decision.json'))).toEqual(decisionBytes)
    for (const changed of [{ reason: 'changed reason' }, { expectedDigest: '0'.repeat(64) }, { journalId: '0000000000000000/p1.json' }])
      await expect(service.reconcile({ ...input, ...changed })).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(await readFile(join(archive, 'original.json'))).toEqual(seeded.bytes)
  })

  it('requires fresh terminal proof even when local journal already says acknowledged', async () => {
    const seeded = await seedOriginalDraft()
    await journal.recordAcknowledged('p1')
    const before = await readFile(seeded.file)
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal: async () => null })
    expect(await service.reconcile(reconcileInput({ ...seeded.input, expectedDigest: digestOf(before) }))).toMatchObject({ status: 'manual-review-required' })
    expect(await readFile(seeded.file)).toEqual(before)
  })

  it.each([
    null,
    { state: 'reserved' },
    { state: 'orphaned' },
    { cloudProjectId: 'another-project' },
    { reservationId: 'different-receipt' },
    { ticketNumber: 202 },
    { creationId: 'a0114c7c-eb27-4dc5-8f91-937a298dc2d1' },
    { canonicalVerified: false },
  ])('never archives uncertain or mismatched original binding proof: %j', async (changes) => {
    const seeded = await seedOriginalDraft()
    const proof = changes === null ? null : { ...verifiedTerminal(seeded.op), ...changes }
    const verifyTerminal = jest.fn(async () => proof as TerminalProof | null)
    const resumeOperation = jest.fn(async () => ({ recovered: [], failed: [] }))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation, verifyTerminal })
    expect(await service.reconcile(reconcileInput(seeded.input))).toMatchObject({ status: 'manual-review-required' })
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    expect(resumeOperation).not.toHaveBeenCalled()
  })

  it('keeps unknown corrupt receipt inspectable and never asks the verifier to guess it', async () => {
    const seeded = await seedOriginalDraft()
    const bytes = '{"reservationId":"forged","ticketNumber":201,"draft":"PRIVATE_BODY"}'
    await writeFile(seeded.file, bytes)
    const verifyTerminal = jest.fn(async (op: PendingOperation) => verifiedTerminal(op))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal })
    expect(await service.reconcile(reconcileInput({ ...seeded.input, expectedDigest: digestOf(bytes) }))).toMatchObject({ status: 'manual-review-required' })
    expect(verifyTerminal).not.toHaveBeenCalled()
    expect((await service.inspect()).entries).toHaveLength(1)
    expect(await readFile(seeded.file, 'utf8')).toBe(bytes)
  })

  it('rejects a stale archive hash before proof and preserves newly changed bytes', async () => {
    const seeded = await seedOriginalDraft()
    const changed = Buffer.concat([seeded.bytes, Buffer.from('\n')])
    await writeFile(seeded.file, changed)
    const verifyTerminal = jest.fn(async (op: PendingOperation) => verifiedTerminal(op))
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal })
    await expect(service.reconcile(reconcileInput(seeded.input))).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(verifyTerminal).not.toHaveBeenCalled()
    expect(await readFile(seeded.file)).toEqual(changed)
  })

  it('rechecks exact bytes after proof and preserves an entry replaced during verification', async () => {
    const seeded = await seedOriginalDraft()
    const changed = Buffer.concat([seeded.bytes, Buffer.from('\n')])
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal: async (op) => {
      await writeFile(seeded.file, changed)
      return verifiedTerminal(op)
    } })
    await expect(service.reconcile(reconcileInput(seeded.input))).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(await readFile(seeded.file)).toEqual(changed)
  })

  it.each(['current', 'legacy'] as const)('serializes %s archive against BOTH the active create lock and entry lock', async (route) => {
    const entryJournal = route === 'legacy' ? new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/old/worktree' }) : journal
    const seeded = await seedOriginalDraft(entryJournal)
    const active = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo', legacyPhysicalRepoPaths: ['/old/worktree'] })
    const verifyTerminal = jest.fn(async (op: PendingOperation) => verifiedTerminal(op))
    const service = await explicitRecovery({ journal: active, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal })
    for (const lockJournal of route === 'legacy' ? [active, entryJournal] : [active]) {
      await lockJournal.withLock('p1', async () => {
        const lockFile = join(lockJournal.directory, 'p1.json.lock')
        const lockBytes = await readFile(lockFile)
        await expect(service.reconcile(reconcileInput(seeded.input))).rejects.toMatchObject({ code: 'reservation_state_conflict' })
        expect(await readFile(lockFile)).toEqual(lockBytes)
      })
      expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    }
    expect(verifyTerminal).not.toHaveBeenCalled()
  })

  it('can archive a parsed legacy held receipt only after explicit matching terminal proof', async () => {
    const legacy = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/old/worktree' })
    const seeded = await seedOriginalDraft(legacy)
    const bytes = JSON.stringify({ ...seeded.op, creationId: undefined, minimumTicketNumber: undefined, protocolVersion: undefined })
    await writeFile(seeded.file, bytes)
    const active = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo', legacyPhysicalRepoPaths: ['/old/worktree'] })
    const verifyTerminal = jest.fn(async (op: PendingOperation) => verifiedTerminal(op, 'abandoned'))
    const resumeOperation = jest.fn(async () => ({ recovered: [], failed: [] }))
    const service = await explicitRecovery({ journal: active, cloudProjectId: 'p1', resumeOperation, verifyTerminal })
    const result = await service.reconcile(reconcileInput({ ...seeded.input, expectedDigest: digestOf(bytes) }))
    expect(result).toMatchObject({ status: 'archived' })
    expect(await readFile(join(root, result.archiveId!, 'original.json'), 'utf8')).toBe(bytes)
    expect(resumeOperation).not.toHaveBeenCalled()
    expect(await active.load('p1')).toBeNull()
  })

  it('retains the active entry if private archive storage cannot be created', async () => {
    const seeded = await seedOriginalDraft()
    await writeFile(join(root, 'archive'), 'block archive directory creation')
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal: async op => verifiedTerminal(op) })
    await expect(service.reconcile(reconcileInput(seeded.input))).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    expect(await readFile(join(root, 'archive'), 'utf8')).toBe('block archive directory creation')
  })
})

describe('review: pure recovery request contracts', () => {
  it('accepts only discovered-route references, exact digests and explicit UUID/reason decisions', async () => {
    const modulePath = '../../../../domain-contracts/src/cloud-sync/creation-recovery'
    const contracts = existsSync(join(__dirname, `${modulePath}.ts`)) ? await import(modulePath) : undefined
    expect(contracts?.CreationRecoveryResumeInputSchema).toBeDefined()
    expect(contracts?.CreationRecoveryReconcileInputSchema).toBeDefined()
    const resume = { journalId: '0123456789abcdef/p1.json', expectedDigest: 'a'.repeat(64) }
    const reconcile = reconcileInput(resume)
    expect(contracts.CreationRecoveryResumeInputSchema.safeParse(resume).success).toBe(true)
    expect(contracts.CreationRecoveryReconcileInputSchema.safeParse(reconcile).success).toBe(true)
    for (const change of [{ journalId: '../p1.json' }, { journalId: '/tmp/private/p1.json' }, { expectedDigest: 'not-a-digest' }, { expectedDigest: '' }, { proof: { state: 'acknowledged' } }, { draft: { content: 'untrusted new intent' } }])
      expect(contracts.CreationRecoveryResumeInputSchema.safeParse({ ...resume, ...change }).success).toBe(false)
    for (const change of [{ operationId: 'not-a-uuid' }, { reason: '' }, { reason: '   ' }, { reason: 'x'.repeat(1001) }, { disposition: 'force-clear' }, { reservationId: 'invented' }])
      expect(contracts.CreationRecoveryReconcileInputSchema.safeParse({ ...reconcile, ...change }).success).toBe(false)
  })
})

describe('review: archive concurrency and proof failure', () => {
  it('allows one archive decision under competing operation IDs and preserves its original receipt', async () => {
    const seeded = await seedOriginalDraft()
    const verifyTerminal = jest.fn(async (op: PendingOperation) => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return verifiedTerminal(op)
    })
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal })
    const input = reconcileInput(seeded.input)
    const competing = { ...input, operationId: '8d94967b-58ba-45a2-80bf-42d8190d41ac' }
    const results = await Promise.allSettled([service.reconcile(input), service.reconcile(competing)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    const winner = results.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<RecoveryOutcome>
    expect(winner.value.status).toBe('archived')
    expect(await readFile(join(root, winner.value.archiveId!, 'original.json'))).toEqual(seeded.bytes)
    expect(verifyTerminal).toHaveBeenCalledTimes(1)
    expect(existsSync(seeded.file)).toBe(false)
  })

  it('retains all active bytes and inspectability when current coordinator proof is unavailable', async () => {
    const seeded = await seedOriginalDraft()
    const service = await explicitRecovery({ journal, cloudProjectId: 'p1', resumeOperation: async () => ({ recovered: [], failed: [] }), verifyTerminal: async () => {
      throw new CoordinatorError('coordination_unavailable')
    } })
    await expect(service.reconcile(reconcileInput(seeded.input))).rejects.toMatchObject({ code: 'coordination_unavailable' })
    expect(await readFile(seeded.file)).toEqual(seeded.bytes)
    expect((await service.inspect()).entries).toEqual(expect.arrayContaining([expect.objectContaining({ journalId: seeded.input.journalId, digest: seeded.input.expectedDigest })]))
  })
})
