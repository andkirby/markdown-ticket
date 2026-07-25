/**
 * D1 adapter for bun:sqlite — lets projection/repository tests run against real
 * SQLite using the production SQL. Mirrors the D1Database surface the
 * repository expects (prepare().bind().{first,all,run} + db.batch()).
 *
 * Re-exports the projection repository functions wrapped so tests pass a raw
 * bun:sqlite Database in place of a D1Database binding.
 */

import type { Database as BunDatabase } from 'bun:sqlite'

import type { CloudPrincipal, ProjectedHeader, PublishProjectionRequest } from '../../src/cloudflare/d1/projection'
// Re-export the projection repository functions, bound to accept a raw
// bun:sqlite Database (adapted to D1) so tests don't import the adapter inline.
import {
  createInitialProjection as _create,
  pollProjections as _poll,
  publishProjection as _publish,
} from '../../src/cloudflare/d1/projection'

export interface BoundStatement {
  __sql: string
  __params: unknown[]
  first: <T>() => T | null
  all: <T>() => { results: T[] }
  run: () => { meta: { changes: number } }
}

/** Adapt a bun:sqlite Database to the D1Database surface. */
export function asD1(db: BunDatabase) {
  const prepare = (sql: string) => ({
    bind(...params: unknown[]): BoundStatement {
      return {
        __sql: sql,
        __params: params,
        first<T>(): T | null {
          const row = db.prepare(sql).get(...params) as T | null
          return row ?? null
        },
        all<T>(): { results: T[] } {
          const rows = db.prepare(sql).all(...params) as T[]
          return { results: rows ?? [] }
        },
        run() {
          const info = db.prepare(sql).run(...params) as unknown as { changes?: number }
          return { meta: { changes: info.changes ?? 0 } }
        },
      }
    },
  })
  return {
    prepare,
    async batch(statements: BoundStatement[]) {
      const transaction = db.transaction(() => {
        const results: Array<{ meta: { changes: number } }> = []
        for (const statement of statements) {
          results.push(statement.run())
        }
        return results
      })
      return transaction()
    },
  } as unknown as import('@cloudflare/workers-types').D1Database
}

export type { ProjectedHeader }

export async function createInitialProjection(
  db: BunDatabase,
  cloudProjectId: string,
  reservationId: string,
  ticketNumber: number,
  operationId: string,
  contentHash: string,
  header: ProjectedHeader,
  principal: CloudPrincipal,
  now: string,
) {
  return _create(asD1(db), cloudProjectId, reservationId, ticketNumber, operationId, contentHash, header, principal, now)
}

export async function publishProjection(
  db: BunDatabase,
  cloudProjectId: string,
  req: PublishProjectionRequest,
  principal: CloudPrincipal,
  now: string,
) {
  return _publish(asD1(db), cloudProjectId, req, principal, now)
}

export async function pollProjections(
  db: BunDatabase,
  cloudProjectId: string,
  after: number,
  limit: number,
) {
  return _poll(asD1(db), cloudProjectId, after, limit)
}
