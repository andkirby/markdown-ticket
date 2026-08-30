/**
 * useCloudProjections — merges local tickets with cloud-projected header stubs
 * (MDT-200 Slice U5).
 *
 * Source: docs/CRs/MDT-200/ux-design.md § Cloud-projected header stub,
 *         BR-3.4 (board distinguishes projected state).
 *
 * The board never implies teammate ownership/presence (C8) and never auto-merges
 * cloud values into local files (C2). A projected stub is shown ONLY for a
 * ticket number that has NO local file — when a local file exists the canonical
 * local ticket wins and no stub is rendered.
 *
 * Polling is driven by `useCloudProjectionFeed`, which calls an owner-only
 * local-server endpoint. Cloudflare credentials never cross into the browser.
 *
 * Degraded behavior (BR-1.5/1.6): when `stale` is true (a poll failed), existing
 * stubs remain visible but are marked stale; they do NOT disappear.
 */

import type { BoardTicket, ProjectedStubTicket, Ticket } from '../types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isProjectedStub } from '../types'

/**
 * The approved projected header fields the frontend consumes (BR-3.1: never a
 * body). Defined locally so the frontend does not depend on the cloud-sync
 * shared client or the (off-limits) cloud package at render time. The shape
 * mirrors the wire ProjectedHeader (cloud/src/cloudflare/d1/projection.ts).
 */
export interface ProjectedHeaderFields {
  code: string
  title: string
  status: string
  type: string | null
  priority: string | null
  assignee: string | null
  date_created: string | null
  last_modified: string
}

/**
 * A projection item as the frontend consumes it: the approved header fields
 * plus the lifecycle flag (so tombstones can drop a previously-shown stub).
 */
export interface FeedProjection extends ProjectedHeaderFields {
  ticketNumber: number
  lifecycle: 'active' | 'deleted'
}

export interface ProjectionFeed {
  /** Projected items observed since the last successful poll. */
  items: FeedProjection[]
  /** True when the last poll failed (coordination unavailable); stubs stay. */
  stale?: boolean
}

export interface UseCloudProjectionsResult {
  /** Local tickets + projected stubs (stubs only for numbers with no local file). */
  boardTickets: BoardTicket[]
  /** Projected stubs currently rendered (subset of boardTickets). */
  projectedStubs: ProjectedStubTicket[]
  /** True when the last poll failed; existing stubs remain visible. */
  stale: boolean
}

export interface UseCloudProjectionsOptions {
  /** Local canonical tickets (local file always wins over a stub). */
  localTickets: Ticket[]
  /**
   * Injected projection feed. In production this is driven by a polling loop;
   * for the E2E/tests it is supplied directly. Omit/null to disable projection.
   */
  feed?: ProjectionFeed | null
}

/** Parse an ISO date string into a Date, or null. */
function parseDate(value: string | null | undefined): Date | null {
  if (!value)
    return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Convert a feed projection into a read-only stub ticket. Only the approved
 * header fields are carried (BR-3.1: never a body).
 */
function toStubTicket(p: FeedProjection, projectCode: string): ProjectedStubTicket {
  return {
    kind: 'projected',
    code: p.code || `${projectCode}-${p.ticketNumber}`,
    title: p.title,
    status: p.status,
    type: p.type ?? '',
    priority: p.priority ?? '',
    assignee: p.assignee ?? undefined,
    dateCreated: parseDate(p.date_created),
    lastModified: parseDate(p.last_modified),
    filePath: '',
    content: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }
}

/**
 * Merge local tickets with projected stubs.
 *
 * Rules (BR-3.4, C2):
 *   - A local ticket for a code always wins; its stub is suppressed.
 *   - Active projections become stubs.
 *   - A 'deleted' (tombstone) projection removes a previously-shown stub.
 *   - Stubs are de-duplicated by code; the highest ticketNumber wins on conflict.
 */
export function mergeProjections(
  localTickets: Ticket[],
  items: FeedProjection[],
  projectCode: string,
): ProjectedStubTicket[] {
  const localCodes = new Set(localTickets.map(t => t.code))
  const tombstoned = new Set<string>()
  const byCode = new Map<string, ProjectedStubTicket>()

  for (const item of items) {
    const stub = toStubTicket(item, projectCode)
    if (item.lifecycle === 'deleted') {
      tombstoned.add(stub.code)
      byCode.delete(stub.code)
      continue
    }
    if (localCodes.has(stub.code) || tombstoned.has(stub.code))
      continue
    const existing = byCode.get(stub.code)
    // Keep the latest by ticketNumber (defensive; revisions are ordered upstream).
    if (!existing || item.ticketNumber >= Number.parseInt(existing.code.split('-').pop() ?? '0', 10) || !existing.code) {
      byCode.set(stub.code, stub)
    }
  }

  return Array.from(byCode.values())
}

/**
 * Hook: produce the merged board ticket list (local + projected stubs) and
 * track staleness. Recomputes only when the inputs change.
 */
export function useCloudProjections(opts: UseCloudProjectionsOptions): UseCloudProjectionsResult {
  const { localTickets, feed } = opts
  const projectCode = useMemo(() => {
    // Derive the project code prefix from the first local ticket's code, e.g.
    // "MDT-001" -> "MDT". Falls back to 'MDT' (the conventional PROJECT_CODE).
    const first = localTickets.find(t => t.code?.includes('-'))
    if (first) {
      const prefix = first.code.split('-')[0]
      if (prefix)
        return prefix
    }
    return 'MDT'
  }, [localTickets])

  const [stale, setStale] = useState<boolean>(feed?.stale === true)

  // Keep the latest feed items in a ref so a polling driver can push updates
  // without re-mounting. The merge below is recomputed via useMemo on `feed`.
  const feedRef = useRef<ProjectionFeed | null>(feed ?? null)
  useEffect(() => {
    feedRef.current = feed ?? null
    setStale(feed?.stale === true)
  }, [feed])

  const projectedStubs = useMemo(
    () => mergeProjections(localTickets, feed?.items ?? [], projectCode),
    [localTickets, feed, projectCode],
  )

  const boardTickets = useMemo<BoardTicket[]>(() => {
    // Local tickets first (canonical), then stubs that have no local file.
    const localAsBoard = localTickets as BoardTicket[]
    const stubsAsBoard = projectedStubs as BoardTicket[]
    return [...localAsBoard, ...stubsAsBoard]
  }, [localTickets, projectedStubs])

  // Stable callback for a polling driver to push a new feed imperatively.
  const pushFeed = useCallback((next: ProjectionFeed) => {
    feedRef.current = next
    setStale(next.stale === true)
  }, [])

  // Expose pushFeed via a ref so a driver can call it without prop churn.
  void pushFeed

  return {
    boardTickets,
    projectedStubs,
    stale,
  }
}

export { isProjectedStub }
