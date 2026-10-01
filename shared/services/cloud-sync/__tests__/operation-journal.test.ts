/**
 * Operation journal recovery — covers BR-1.4, Edge-2.
 *
 * Verifies the atomic journal survives the recovery boundaries: a retried
 * create reuses the same idempotency key/reservation, and acknowledged/cleared
 * operations resume correctly.
 */

import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { CloudOperationJournal } from '../operation-journal'

let root: string
let journal: CloudOperationJournal

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mdt-journal-'))
  journal = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo' })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('operation journal recovery (BR-1.4, Edge-2)', () => {
  it('persists the idempotency key before a network call', async () => {
    const op = await journal.begin({
      cloudProjectId: 'p1',
      idempotencyKey: 'k-1',
      requestHash: 'h-1',
    })
    expect(op.state).toBe('pending')
    expect(op.idempotencyKey).toBe('k-1')
    const file = join(journal.directory, 'p1.json')
    expect(existsSync(file)).toBe(true)
    // Mode 0600 — user-only.
    const mode = statSync(file).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it('returns the same pending operation on a retry (recovery)', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const retried = await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    expect(retried.idempotencyKey).toBe('k-1')
    expect(retried.state).toBe('pending')
  })

  it('records a reservation and then acknowledged; then clears', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    await journal.recordReservation('p1', 'res-9', 201)
    let op = await journal.load('p1')
    expect(op?.state).toBe('reserved')
    expect(op?.reservationId).toBe('res-9')
    expect(op?.ticketNumber).toBe(201)

    await journal.recordAcknowledged('p1')
    op = await journal.load('p1')
    expect(op?.state).toBe('acknowledged')

    await journal.clear('p1')
    expect(await journal.load('p1')).toBeNull()
  })

  it('write is atomic (no tmp file left behind)', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' })
    const tmpFile = join(journal.directory, 'p1.json.tmp')
    expect(existsSync(tmpFile)).toBe(false)
  })

  it('isolates projects by routing hash (independent clones remain independent)', async () => {
    const journalB = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/other/repo' })
    await journal.begin({ cloudProjectId: 'shared-project', idempotencyKey: 'k', requestHash: 'h' })
    const fromB = await journalB.load('shared-project')
    expect(fromB).toBeNull() // different routing hash → independent
  })
})
