import type { CloudPrincipal } from '@mdt/domain-contracts'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { getMembers, probeProject } from '../src/cloudflare/application/membership'
import { asD1 } from './helpers/projection-d1-adapter'

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '0001_init.sql')
const owner: CloudPrincipal = { kind: 'human', id: 'owner@example.com', display: 'owner@example.com' }
const outsider: CloudPrincipal = { kind: 'human', id: 'outsider@example.com', display: 'outsider@example.com' }
let db: Database.Database
let tempDir: string

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'mdt-isolation-'))
  db = new Database(join(tempDir, 'isolation.sqlite'))
  db.run(readFileSync(schemaPath, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tempDir, { recursive: true, force: true })
})

beforeEach(() => {
  db.run('DELETE FROM memberships')
  db.run('DELETE FROM cloud_projects')
  const now = new Date().toISOString()
  for (const id of ['p1', 'p2']) {
    db.run(
      `INSERT INTO cloud_projects
         (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
       VALUES (?, 'MDT', 'active', 200, 0, ?, ?)`,
      [id, now, now],
    )
  }
  db.run(
    `INSERT INTO memberships
       (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
     VALUES ('p1', 'human', ?, ?, 'owner', ?, ?)`,
    [owner.id, owner.display, now, now],
  )
})

describe('tenant isolation', () => {
  test('unknown project and hidden project use the same non-disclosing error', async () => {
    for (const projectId of ['missing', 'p2']) {
      await expect(probeProject(asD1(db), outsider, projectId, `req-${projectId}`))
        .rejects
        .toMatchObject({ code: 'project_not_found', status: 404 })
    }
  })

  test('member access is scoped to its project', async () => {
    expect((await probeProject(asD1(db), owner, 'p1', 'req-p1')).projectId).toBe('p1')
    await expect(getMembers(asD1(db), owner, 'p2', 'req-p2'))
      .rejects
      .toMatchObject({ code: 'project_not_found' })
  })
})
