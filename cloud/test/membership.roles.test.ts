import type { CloudPrincipal } from '@mdt/domain-contracts'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  getMembers,
  probeProject,
  putMember,
  removeMember,
  updateCoordinationState,
} from '../src/cloudflare/application/membership'
import { createReservation } from '../src/cloudflare/application/reservation'
import { asD1 } from './helpers/projection-d1-adapter'

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '0001_init.sql')
const owner: CloudPrincipal = { kind: 'human', id: 'owner@example.com', display: 'owner@example.com' }
const contributor: CloudPrincipal = { kind: 'human', id: 'contributor@example.com', display: 'contributor@example.com' }
const viewer: CloudPrincipal = { kind: 'human', id: 'viewer@example.com', display: 'viewer@example.com' }
let db: Database.Database
let tempDir: string

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mdt-membership-'))
  db = new Database(join(tempDir, 'membership.sqlite'))
  db.run(readFileSync(schemaPath, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tempDir, { recursive: true, force: true })
})

beforeEach(() => {
  db.run('DELETE FROM audit_events')
  db.run('DELETE FROM memberships')
  db.run('DELETE FROM cloud_projects')
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO cloud_projects
       (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
     VALUES ('p1', 'MDT', 'active', 200, 0, ?, ?)`,
    [now, now],
  )
  for (const [principal, role] of [[owner, 'owner'], [contributor, 'contributor'], [viewer, 'viewer']] as const) {
    db.run(
      `INSERT INTO memberships
         (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
       VALUES ('p1', ?, ?, ?, ?, ?, ?)`,
      [principal.kind, principal.id, principal.display, role, now, now],
    )
  }
})

describe('project membership roles', () => {
  test('viewer can probe but cannot list members', async () => {
    const probe = await probeProject(asD1(db), viewer, 'p1', 'req-probe')
    expect(probe.role).toBe('viewer')
    await expect(getMembers(asD1(db), viewer, 'p1', 'req-list'))
      .rejects
      .toMatchObject({ code: 'forbidden' })
    expect(db.prepare(
      `SELECT action, outcome, principal_id FROM audit_events WHERE request_id = 'req-list'`,
    ).get()).toEqual({
      action: 'membership.list',
      outcome: 'denied',
      principal_id: viewer.id,
    })
  })

  test('owner can list, add, change, and revoke a member', async () => {
    const created = await putMember(
      asD1(db),
      owner,
      'p1',
      'machine',
      'service-client',
      { displayLabel: 'Build bot', role: 'viewer' },
      'req-put-1',
    )
    expect(created).toMatchObject({ kind: 'machine', id: 'service-client', role: 'viewer' })

    const changed = await putMember(
      asD1(db),
      owner,
      'p1',
      'machine',
      'service-client',
      { displayLabel: 'Build bot', role: 'contributor' },
      'req-put-2',
    )
    expect(changed.role).toBe('contributor')

    await removeMember(asD1(db), owner, 'p1', 'machine', 'service-client', 'req-delete')
    const members = await getMembers(asD1(db), owner, 'p1', 'req-list')
    expect(members.items.some(item => item.id === 'service-client')).toBe(false)
  })

  test('final owner cannot be demoted or removed', async () => {
    await expect(putMember(
      asD1(db),
      owner,
      'p1',
      'human',
      owner.id,
      { displayLabel: owner.display, role: 'contributor' },
      'req-demote',
    )).rejects.toMatchObject({ code: 'last_owner_required' })

    await expect(removeMember(asD1(db), owner, 'p1', 'human', owner.id, 'req-remove'))
      .rejects
      .toMatchObject({ code: 'last_owner_required' })
    expect(db.prepare(
      `SELECT action, outcome FROM audit_events WHERE request_id = 'req-remove'`,
    ).get()).toEqual({ action: 'membership.delete', outcome: 'denied' })
  })

  test('concurrent owner demotions cannot leave a project without an owner', async () => {
    const now = new Date().toISOString()
    db.run(
      `INSERT INTO memberships
         (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
       VALUES ('p1', 'human', 'owner2@example.com', 'Owner 2', 'owner', ?, ?)`,
      [now, now],
    )
    const owner2: CloudPrincipal = {
      kind: 'human',
      id: 'owner2@example.com',
      display: 'Owner 2',
    }

    const outcomes = await Promise.allSettled([
      putMember(
        asD1(db),
        owner,
        'p1',
        'human',
        owner.id,
        { displayLabel: owner.display, role: 'contributor' },
        'req-demote-owner-1',
      ),
      putMember(
        asD1(db),
        owner2,
        'p1',
        'human',
        owner2.id,
        { displayLabel: owner2.display, role: 'contributor' },
        'req-demote-owner-2',
      ),
    ])

    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(outcome => outcome.status === 'rejected')).toHaveLength(1)
    const count = db.prepare(
      `SELECT COUNT(*) AS n FROM memberships WHERE cloud_project_id = 'p1' AND role = 'owner'`,
    ).get() as { n: number }
    expect(count.n).toBe(1)
  })

  test('revocation is effective on the next protected operation', async () => {
    await removeMember(asD1(db), owner, 'p1', 'human', contributor.id, 'req-revoke')
    await expect(createReservation(
      asD1(db),
      contributor,
      'p1',
      { idempotencyKey: 'key', requestHash: 'a'.repeat(64) },
      'req-create',
    )).rejects.toMatchObject({ code: 'project_not_found' })
  })

  test('suspension blocks mutation but leaves membership probe readable', async () => {
    await updateCoordinationState(asD1(db), owner, 'p1', { state: 'suspended' }, 'req-suspend')
    expect((await probeProject(asD1(db), viewer, 'p1', 'req-probe')).coordinationState)
      .toBe('suspended')
    await expect(createReservation(
      asD1(db),
      contributor,
      'p1',
      { idempotencyKey: 'key', requestHash: 'a'.repeat(64) },
      'req-create',
    )).rejects.toMatchObject({ code: 'coordination_suspended' })
    expect(db.prepare(
      `SELECT action, outcome FROM audit_events WHERE request_id = 'req-create'`,
    ).get()).toEqual({ action: 'reservation.create', outcome: 'denied' })
  })
})
