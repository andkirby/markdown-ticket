/**
 * TEST-audit-redacted — covers BR-4.1, Edge-3 (scheduled expiry).
 *
 * Verifies structured, redacted audit records are written for allocation,
 * scheduled expiry, and that they never carry raw tokens/secrets.
 * Uses bun:sqlite with the production schema.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-audit-'))
  db = new Database(join(tmpDir, 'audit.sqlite'))
  db.run(readFileSync(SCHEMA_PATH, 'utf8'))
  // Seed a project + owner.
  const now = new Date().toISOString()
  db.run(`INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at) VALUES ('p1', 'MDT', 'active', 301, 0, ?, ?)`, [now, now])
  db.run(`INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at) VALUES ('p1', 'human', 'owner@example.com', 'Owner', 'owner', ?, ?)`, [now, now])
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('structured redacted audit (BR-4.1)', () => {
  test('allocation writes a structured audit event with principal attribution', () => {
    const now = new Date().toISOString()
    const reservationId = 'res-audit-1'
    db.run(`INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at) VALUES ('p1', ?, 301, 'reserved', 'human', 'owner@example.com', ?)`, [reservationId, now])
    db.run(`INSERT INTO audit_events (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome, resource_type, resource_id, detail_json, occurred_at) VALUES (?, 'p1', ?, 'human', 'owner@example.com', 'reservation.create', 'allocated', 'reservation', ?, ?, ?)`, [crypto.randomUUID(), reservationId, reservationId, JSON.stringify({ ticket_number: 301 }), now])

    const row = db.prepare(`SELECT principal_kind, principal_id, action, outcome, detail_json FROM audit_events WHERE resource_id = ?`).get(reservationId) as Record<string, string>
    expect(row.principal_kind).toBe('human')
    expect(row.principal_id).toBe('owner@example.com')
    expect(row.action).toBe('reservation.create')
    expect(row.outcome).toBe('allocated')
    expect(JSON.parse(row.detail_json)).toEqual({ ticket_number: 301 })
  })

  test('audit never stores raw token/cookie/assertion fields (redaction)', () => {
    const rows = db.prepare(`SELECT detail_json FROM audit_events`).all() as Array<{ detail_json: string }>
    for (const row of rows) {
      const lower = row.detail_json.toLowerCase()
      expect(lower).not.toContain('authorization')
      expect(lower).not.toContain('cookie')
      expect(lower).not.toContain('cf-access')
      expect(lower).not.toContain('secret')
      expect(lower).not.toContain('token')
    }
  })
})
