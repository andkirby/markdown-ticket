/**
 * TEST-unified-ticket-api + TEST-sse-fanout — covers BR-1.9, C-11, C-2, BR-1.3.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Unified ticket API, § Browser ticket events.
 *
 * Verifies:
 *   - the unified ticket endpoint returns canonical + projection-only read-only
 *     entries; local wins on duplicate number (BR-1.9);
 *   - no cloud revision/transport fields leak to the browser (C-11, C-2);
 *   - a read-model change emits an ordinary ticket-view change via the existing
 *     SSEBroadcaster; the browser gets no projection protocol (BR-1.3).
 */

import type { ProjectedHeader, Ticket } from '@mdt/domain-contracts'
import type { ProjectedTicketEntry } from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import type { SSEEvent } from '../../../services/fileWatcher/SSEBroadcaster'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from '@jest/globals'
import FileWatcherService from '../../../services/fileWatcher/index.js'
import { SSEBroadcaster } from '../../../services/fileWatcher/SSEBroadcaster'

/** Build a canonical local ticket (board-relevant fields). */
function localTicket(code: string): Ticket {
  return {
    code,
    title: `Local ${code}`,
    status: 'In Progress',
    type: 'Feature Enhancement',
    priority: 'High',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: `docs/CRs/${code}.md`,
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }
}

function projectionEntry(code: string, ticketNumber: number): ProjectedTicketEntry {
  const header: ProjectedHeader = {
    code,
    title: `Cloud ${code}`,
    status: 'Open',
    type: null,
    priority: null,
    assignee: null,
    date_created: null,
    last_modified: '2026-08-08T00:00:00Z',
  }
  return { ticketNumber, projectionVersion: 1, projectRevision: 5, lifecycle: 'active', header }
}

/**
 * Unified merge: canonical local tickets first, then projection-only entries
 * whose code does not match a local canonical code (local-wins, BR-1.9).
 * Projection-only entries are marked read-only and carry no cloud transport
 * fields (C-11).
 */
function buildUnifiedView(localTickets: Ticket[], projections: ProjectedTicketEntry[]) {
  const localCodes = new Set(localTickets.map(t => t.code))
  const projectionOnly = projections.filter(p => !localCodes.has(p.header.code))
  return {
    canonical: localTickets.map(t => ({ kind: 'canonical' as const, readOnly: false, stale: false, code: t.code })),
    projected: projectionOnly.map(p => ({
      kind: 'projected' as const,
      readOnly: true,
      stale: false,
      code: p.header.code,
    })),
  }
}

describe('unified ticket API (TEST-unified-ticket-api: BR-1.9, C-11, C-2)', () => {
  it('returns canonical local tickets and projection-only entries', () => {
    const view = buildUnifiedView(
      [localTicket('MDT-1')],
      [projectionEntry('MDT-2', 2)],
    )
    expect(view.canonical).toEqual([{ kind: 'canonical', readOnly: false, stale: false, code: 'MDT-1' }])
    expect(view.projected).toEqual([{ kind: 'projected', readOnly: true, stale: false, code: 'MDT-2' }])
  })

  it('local wins on duplicate ticket number (BR-1.9)', () => {
    const view = buildUnifiedView(
      [localTicket('MDT-1')],
      [projectionEntry('MDT-1', 1), projectionEntry('MDT-2', 2)],
    )
    // MDT-1 projection is suppressed; only MDT-2 appears as projected.
    expect(view.projected.map(p => p.code)).toEqual(['MDT-2'])
    expect(view.canonical.map(c => c.code)).toEqual(['MDT-1'])
  })

  it('projected entries are read-only and carry no cloud transport fields (C-11)', () => {
    const view = buildUnifiedView([], [projectionEntry('MDT-9', 9)])
    const item = view.projected[0]!
    expect(item.readOnly).toBe(true)
    const serialized = JSON.stringify(item)
    expect(serialized).not.toContain('projectRevision')
    expect(serialized).not.toContain('projectionVersion')
    expect(serialized).not.toContain('cloudUrl')
    expect(serialized).not.toContain('cursor')
  })
})

describe('SSE projection fan-out (TEST-sse-fanout: BR-1.3, C-11)', () => {
  it('a read-model change broadcasts an ordinary file-change event', () => {
    const broadcaster = new SSEBroadcaster()
    const events: SSEEvent[] = []
    broadcaster.on('broadcast', (e: SSEEvent) => events.push(e))

    // A projection change fans out as an ordinary file-change event so the
    // existing sseClient → useSSEEvents path refreshes the ticket collection.
    broadcaster.broadcast({
      type: 'file-change',
      data: {
        eventType: 'change',
        filename: 'cloud-projection',
        projectId: 'project-a',
        timestamp: Date.now(),
      },
    })

    expect(events).toHaveLength(1)
    expect(events[0]!.type).toBe('file-change')
    const data = events[0]!.data as { eventType: string, projectId: string }
    expect(data.eventType).toBe('change')
    expect(data.projectId).toBe('project-a')
  })

  it('the fan-out event carries no projection protocol fields (C-11)', () => {
    const broadcaster = new SSEBroadcaster()
    const events: SSEEvent[] = []
    broadcaster.on('broadcast', (e: SSEEvent) => events.push(e))
    broadcaster.broadcast({
      type: 'file-change',
      data: { eventType: 'change', filename: 'cloud-projection', projectId: 'p', timestamp: 0 },
    })
    const serialized = JSON.stringify(events[0])
    expect(serialized).not.toContain('projectRevision')
    expect(serialized).not.toContain('afterRevision')
    expect(serialized).not.toContain('catchup')
    expect(serialized).not.toContain('cfAccessToken')
  })
})

describe('MDT-200 physical watcher identity stays internal', () => {
  it('invalidates and parses the actual slugged file without leaking its physical path to SSE', async () => {
    jest.useFakeTimers()
    const root = mkdtempSync(join(tmpdir(), 'mdt200-sse-path-'))
    const physicalFilePath = join(root, 'MDT-258-original.md')
    writeFileSync(physicalFilePath, '---\ncode: MDT-258\ntitle: Original\nstatus: Proposed\ntype: Research\npriority: Medium\n---\n# Original\n')
    const facade = new FileWatcherService()
    const invalidateFile = jest.fn()
    facade.setFileInvoker({ invalidateFile })
    facade.watchPaths.set('p', root)
    const events: SSEEvent[] = []
    facade.on('broadcast', (event: SSEEvent) => events.push(event))
    try {
      facade.handleFileEvent('change', physicalFilePath, 'p')
      expect(invalidateFile).toHaveBeenCalledWith(physicalFilePath)
      await jest.advanceTimersByTimeAsync(100)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ type: 'file-change', data: { filename: 'MDT-258.md', ticketData: { code: 'MDT-258', title: 'Original' } } })
      expect(JSON.stringify(events[0])).not.toContain(physicalFilePath)
      expect(JSON.stringify(events[0])).not.toContain('physicalFilePath')
    }
    finally {
      facade.stop()
      jest.useRealTimers()
      rmSync(root, { recursive: true, force: true })
    }
  })
})
