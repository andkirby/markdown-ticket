/**
 * Operation journal recovery — covers BR-1.4, Edge-2.
 *
 * Verifies the atomic journal survives the recovery boundaries: a retried
 * create reuses the same idempotency key/reservation, and acknowledged/cleared
 * operations resume correctly.
 */

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
  it('never steals an empty lock while its owner may still be publishing it', async () => {
    await mkdir(journal.directory, { recursive: true })
    const lock = join(journal.directory, 'p1.json.lock')
    await writeFile(lock, '')
    let entered = false
    await expect(journal.withLock('p1', async () => {
      entered = true
    })).rejects.toThrow('ownership is unverified')
    expect(entered).toBe(false)
    expect(await readFile(lock, 'utf8')).toBe('')
  })
  it('does not release a lock replaced by a different owner', async () => {
    const lock = join(journal.directory, 'p1.json.lock')
    await journal.withLock('p1', async () => {
      await writeFile(lock, JSON.stringify({ pid: process.pid, token: 'replacement' }))
    })
    expect(JSON.parse(await readFile(lock, 'utf8')).token).toBe('replacement')
  })
  it('rejects a live owner and serializes verified dead-owner reclamation', async () => {
    await journal.withLock('p1', async () => {
      await expect(journal.withLock('p1', async () => {})).rejects.toThrow('already running')
    })
    const lock = join(journal.directory, 'p1.json.lock')
    await writeFile(lock, JSON.stringify({ pid: 2147483647, token: 'dead' }))
    let entrants = 0
    const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => journal.withLock('p1', async () => {
      entrants++
      await new Promise(resolve => setTimeout(resolve, 50))
    })))
    expect(entrants).toBe(1)
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(existsSync(lock)).toBe(false)
  })
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

// TEST-review-legacy-journal-inspection / TEST-review-lock-owner-diagnostics.
// This temporary structural type lets PREPARE load the existing journal normally.
// The implementation must export the canonical Zod-derived contract.
interface InspectionEntry {
  journalId: string
  digest: string | null
  route: 'current' | 'legacy'
  status: 'current' | 'legacy' | 'malformed' | 'unreadable' | 'oversized' | 'lock-only'
  state?: string
  creationId?: string
  reservationId?: string
  ticketNumber?: number
  nextAction: string
  lock?: { pid?: number, createdAt?: string, status: string }
}

async function inspectJournal(subject = journal): Promise<{ entries: InspectionEntry[] }> {
  const inspect = (subject as unknown as { inspect?: (projectId: string) => Promise<{ entries: InspectionEntry[] }> }).inspect
  expect(inspect).toEqual(expect.any(Function))
  return inspect!.call(subject, 'p1')
}

function exactDigest(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

describe('review: bounded read-only creation journal inspection', () => {
  it('discovers both current and known legacy routes without load succeeding', async () => {
    const legacy = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/old/worktree' })
    await legacy.begin({ cloudProjectId: 'p1', idempotencyKey: 'old', requestHash: 'old' })
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'current', requestHash: 'current' })
    const subject = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo', legacyPhysicalRepoPaths: ['/old/worktree', '/old/worktree'] })
    const currentFile = join(journal.directory, 'p1.json')
    const legacyFile = join(legacy.directory, 'p1.json')
    const before = await Promise.all([readFile(currentFile), readFile(legacyFile)])
    await expect(subject.load('p1')).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    const inspected = await inspectJournal(subject)
    expect(inspected.entries).toHaveLength(2)
    expect(inspected.entries.map(entry => entry.route).sort()).toEqual(['current', 'legacy'])
    expect(new Set(inspected.entries.map(entry => entry.journalId)).size).toBe(2)
    for (const entry of inspected.entries) {
      expect(entry.journalId).toMatch(/^[a-f0-9]{16}\/p1\.json$/)
      expect(entry.status).toBe('legacy')
      expect(entry.nextAction).toBe('manual-review-required')
    }
    expect(inspected.entries.map(entry => entry.digest).sort()).toEqual(before.map(exactDigest).sort())
    expect(await Promise.all([readFile(currentFile), readFile(legacyFile)])).toEqual(before)
  })

  it.each(['{broken secret-token', 'null', '[]', '{"state":"reserved","reservationId":"untrusted","ticketNumber":201}'])('retains malformed bytes and exposes no guessed receipt: %s', async (bytes) => {
    await mkdir(journal.directory, { recursive: true })
    const file = join(journal.directory, 'p1.json')
    await writeFile(file, bytes)
    const { entries } = await inspectJournal()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ status: 'malformed', digest: exactDigest(bytes), nextAction: 'manual-review-required' })
    expect(entries[0].reservationId).toBeUndefined()
    expect(entries[0].ticketNumber).toBeUndefined()
    expect(entries[0].state).toBeUndefined()
    expect(JSON.stringify(entries)).not.toContain('secret-token')
    expect(JSON.stringify(entries)).not.toContain('untrusted')
    expect(await readFile(file, 'utf8')).toBe(bytes)
  })

  it('returns only safe valid metadata, excluding draft/body, credentials and absolute paths', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'sensitive-key', requestHash: 'hash', protocolVersion: 2, creationId: 'c419052e-b1de-4514-8fc7-9d15c72603bc', minimumTicketNumber: 201, draft: { crType: 'Bug Fix', data: { title: 'Owner title', type: 'Bug Fix', content: 'PRIVATE_BODY_SENTINEL' } } })
    await journal.recordReservation('p1', 'held-original', 201)
    const file = join(journal.directory, 'p1.json')
    const bytes = await readFile(file)
    const { entries } = await inspectJournal()
    expect(entries[0]).toMatchObject({ status: 'current', state: 'reserved', creationId: 'c419052e-b1de-4514-8fc7-9d15c72603bc', digest: exactDigest(bytes), reservationId: 'held-original', ticketNumber: 201, nextAction: 'resume' })
    const serialized = JSON.stringify(entries)
    for (const forbidden of [root, '/fake/repo', 'PRIVATE_BODY_SENTINEL', 'sensitive-key', '"draft"', '"content"', '"cfAccessToken"'])
      expect(serialized).not.toContain(forbidden)
    expect(serialized.length).toBeLessThan(4096)
    expect(await readFile(file)).toEqual(bytes)
  })

  it('keeps an unreadable discovered route inspectable without a fabricated digest', async () => {
    const file = join(journal.directory, 'p1.json')
    // A directory at the expected file path gives deterministic EISDIR even as root.
    await mkdir(file, { recursive: true })
    const { entries } = await inspectJournal()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ status: 'unreadable', digest: null, nextAction: 'manual-review-required' })
    expect(statSync(file).isDirectory()).toBe(true)
  })

  it('bounds oversized entry metadata and preserves every original byte', async () => {
    await mkdir(journal.directory, { recursive: true })
    const bytes = Buffer.alloc(2 * 1024 * 1024, 120)
    const file = join(journal.directory, 'p1.json')
    await writeFile(file, bytes)
    const { entries } = await inspectJournal()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ status: 'oversized', nextAction: 'manual-review-required' })
    if (entries[0].digest !== null)
      expect(entries[0].digest).toBe(exactDigest(bytes))
    expect(JSON.stringify(entries).length).toBeLessThan(4096)
    expect(await readFile(file)).toEqual(bytes)
  })

  it('reports available PID/time for old live locks and never uses age as theft permission', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' })
    const lock = join(journal.directory, 'p1.json.lock')
    const lockBytes = JSON.stringify({ pid: process.pid, createdAt: '2000-01-01T00:00:00.000Z', token: 'PRIVATE_LOCK_TOKEN' })
    await writeFile(lock, lockBytes)
    const { entries } = await inspectJournal()
    expect(entries[0]).toMatchObject({ lock: { pid: process.pid, createdAt: '2000-01-01T00:00:00.000Z', status: 'live' }, nextAction: 'verify-lock-owner' })
    expect(JSON.stringify(entries)).not.toContain('PRIVATE_LOCK_TOKEN')
    await expect(journal.withLock('p1', async () => {})).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(await readFile(lock, 'utf8')).toBe(lockBytes)
  })

  it.each(['', '{broken', '{"createdAt":"2000-01-01T00:00:00.000Z","token":"DO_NOT_EXPOSE"}'])('reports lock-only unverified state without stealing incomplete locks: %s', async (bytes) => {
    await mkdir(journal.directory, { recursive: true })
    const lock = join(journal.directory, 'p1.json.lock')
    await writeFile(lock, bytes)
    const { entries } = await inspectJournal()
    expect(entries[0]).toMatchObject({ status: 'lock-only', digest: null, nextAction: 'verify-lock-owner', lock: { status: 'unverifiable' } })
    expect(JSON.stringify(entries)).not.toContain('DO_NOT_EXPOSE')
    expect(await readFile(lock, 'utf8')).toBe(bytes)
  })
})

describe('review: validate before durable creation-journal persistence', () => {
  it('refuses invalid v2 held receipts before any journal is created', async () => {
    await expect(journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h', protocolVersion: 2, creationId: 'c419052e-b1de-4514-8fc7-9d15c72603bc', minimumTicketNumber: 201, reservationId: 'held', ticketNumber: 200 })).rejects.toBeDefined()
    expect(existsSync(join(journal.directory, 'p1.json'))).toBe(false)
  })

  it('rejects an invalid reservation update without replacing valid pending bytes', async () => {
    await journal.begin({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h', protocolVersion: 2, creationId: 'c419052e-b1de-4514-8fc7-9d15c72603bc', minimumTicketNumber: 201 })
    const file = join(journal.directory, 'p1.json')
    const before = await readFile(file)
    await expect(journal.recordReservation('p1', 'below-floor', 200)).rejects.toBeDefined()
    expect(await readFile(file)).toEqual(before)
  })
})

describe('review: legacy discovery does not depend on parse or readability', () => {
  it.each(['corrupt', 'lock-only'] as const)('keeps a %s former route visible while preserving the new-create barrier', async (kind) => {
    const legacy = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/old/worktree' })
    await mkdir(legacy.directory, { recursive: true })
    const file = join(legacy.directory, kind === 'lock-only' ? 'p1.json.lock' : 'p1.json')
    const bytes = kind === 'lock-only' ? '' : '{PRIVATE_CORRUPT_LEGACY_BODY'
    await writeFile(file, bytes)
    const active = new CloudOperationJournal({ rootDir: root, physicalRepoPath: '/fake/repo', legacyPhysicalRepoPaths: ['/old/worktree'] })
    const { entries } = await inspectJournal(active)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ route: 'legacy', status: kind === 'lock-only' ? 'lock-only' : 'malformed', nextAction: kind === 'lock-only' ? 'verify-lock-owner' : 'manual-review-required' })
    expect(JSON.stringify(entries)).not.toContain('PRIVATE_CORRUPT_LEGACY_BODY')
    await expect(active.begin({ cloudProjectId: 'p1', idempotencyKey: 'new', requestHash: 'new' })).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(await readFile(file, 'utf8')).toBe(bytes)
    expect(existsSync(join(active.directory, 'p1.json'))).toBe(false)
  })
})
