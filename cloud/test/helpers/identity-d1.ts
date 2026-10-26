import type { D1Database } from '@cloudflare/workers-types'
import type { SQLQueryBindings } from 'bun:sqlite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Database } from 'bun:sqlite'

export function applyMigrations(db: Database): void {
  const root = join(import.meta.dir, '../../migrations')
  for (const name of readdirSync(root).filter(file => file.endsWith('.sql')).sort()) {
    db.run(readFileSync(join(root, name), 'utf8'))
  }
}

export function identityFixture(state: 'active' | 'suspended' = 'active') {
  const db = new Database(':memory:')
  applyMigrations(db)
  const now = '2026-10-25T00:00:00.000Z'
  db.prepare('INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('p', 'MDT', state, 258, 0, now, now)
  db.prepare('INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('p', 'human', 'owner@example.invalid', 'Owner', 'owner', now, now)
  return db
}

export interface D1Budget {
  queries: number
  largestBindingCount: number
}

/** Enforce D1 Free's invocation budget and every statement's binding limit. */
export function identityD1(db: Database, initialReads = 0, budget?: D1Budget): D1Database {
  const query = () => {
    if (budget && ++budget.queries > 50)
      throw new Error('D1 invocation exceeds 50 queries')
  }
  let reads = 0
  let open = initialReads === 0
  const waiting: Array<() => void> = []
  const prepare = (sql: string) => ({
    bind(...params: SQLQueryBindings[]) {
      if (budget) {
        budget.largestBindingCount = Math.max(budget.largestBindingCount, params.length)
        if (params.length > 100)
          throw new Error('D1 statement exceeds 100 bound parameters')
      }
      const statement = db.prepare(sql)
      return {
        async first<T>(): Promise<T | null> {
          query()
          const row = statement.get(...params) as T | null
          if (sql.includes('SELECT next_ticket_number FROM cloud_projects')) {
            reads++
            if (reads >= initialReads) {
              open = true
              for (const resolve of waiting.splice(0)) resolve()
            }
          }
          return row
        },
        async all<T>() {
          query()
          return { results: statement.all(...params) as T[] }
        },
        async run() {
          query()
          return { meta: { changes: statement.run(...params).changes } }
        },
        execute() {
          if (/^\s*SELECT\b/iu.test(sql)) {
            return { results: statement.all(...params), meta: { changes: 0 } }
          }
          return { results: [], meta: { changes: statement.run(...params).changes } }
        },
      }
    },
  })
  return {
    prepare,
    async batch(statements: Array<{ execute: () => unknown }>) {
      // D1 counts a batch as one invocation query; binding limits still apply to
      // every prepared statement above, including statements inside the batch.
      query()
      if (!open)
        await new Promise<void>(resolve => waiting.push(resolve))
      return db.transaction(() => statements.map(statement => statement.execute()))()
    },
  } as unknown as D1Database
}

export const owner = { kind: 'human' as const, id: 'owner@example.invalid' }
export const creationId = 'd12139b4-b607-456f-90d9-796a6f57e01e'
export const otherCreationId = 'f087eaf8-ae57-4a16-bd57-df109c9a9891'
export function projectedHeader(number = 263, identity = creationId) {
  return {
    code: `MDT-${String(number).padStart(3, '0')}`,
    creationId: identity,
    title: 'Canonical fixture',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    assignee: null,
    date_created: '2026-10-25T00:00:00.000Z',
    last_modified: '2026-10-25T00:00:00.000Z',
  }
}

export function headerHash(header: ReturnType<typeof projectedHeader>): string {
  const keys = Object.keys(header).sort() as Array<keyof typeof header>
  const canonical = `{${keys.map(key => `${JSON.stringify(key)}:${JSON.stringify(header[key])}`).join(',')}}`
  return createHash('sha256').update(canonical).digest('hex')
}
