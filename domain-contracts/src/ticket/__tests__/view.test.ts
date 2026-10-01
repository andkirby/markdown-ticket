import type { TicketItemKind, UnifiedTicketItem } from '../view'
import {
  isCanonicalTicket,
  isProjectedTicket,
  TICKET_ITEM_KINDS,

} from '../view'

describe('unified ticket view contract', () => {
  it('exposes the two item kinds as a named array', () => {
    expect(TICKET_ITEM_KINDS).toEqual(['canonical', 'projected'])
  })

  it('canonical item carries board fields and is not read-only', () => {
    const item: UnifiedTicketItem = {
      kind: 'canonical',
      readOnly: false,
      stale: false,
      code: 'MDT-1',
      title: 'Local ticket',
      status: 'In Progress',
      type: 'Feature Enhancement',
      priority: 'High',
      assignee: null,
      dateCreated: '2026-08-08T00:00:00Z',
      lastModified: '2026-08-08T00:00:00Z',
    }
    expect(isCanonicalTicket(item)).toBe(true)
    expect(isProjectedTicket(item)).toBe(false)
    expect(item.readOnly).toBe(false)
  })

  it('projected item is always read-only and carries no body or revision fields', () => {
    const item: UnifiedTicketItem = {
      kind: 'projected',
      readOnly: true,
      stale: false,
      code: 'MDT-2',
      title: 'Cloud-only ticket',
      status: 'Open',
      type: null,
      priority: null,
      assignee: 'someone',
      dateCreated: null,
      lastModified: '2026-08-08T00:00:00Z',
    }
    expect(isProjectedTicket(item)).toBe(true)
    expect(isCanonicalTicket(item)).toBe(false)
    // The browser-facing contract must not expose cloud transport/protocol state.
    expect(item).not.toHaveProperty('projectRevision')
    expect(item).not.toHaveProperty('projectionVersion')
    expect(item).not.toHaveProperty('afterRevision')
    expect(item).not.toHaveProperty('cloudUrl')
    expect(item).not.toHaveProperty('cfAccessToken')
    expect(item).not.toHaveProperty('body')
    expect(item).not.toHaveProperty('content')
  })

  it('a stale flag is available without exposing the cursor or catch-up state', () => {
    const item: UnifiedTicketItem = {
      kind: 'projected',
      readOnly: true,
      stale: true,
      code: 'MDT-3',
      title: 'Stale projection',
      status: 'Open',
      type: null,
      priority: null,
      assignee: null,
      dateCreated: null,
      lastModified: '2026-08-08T00:00:00Z',
    }
    expect(item.stale).toBe(true)
    expect(item).not.toHaveProperty('cursor')
    expect(item).not.toHaveProperty('catchup')
  })

  it('TicketItemKind narrows to the two literal values', () => {
    const k: TicketItemKind = 'canonical'
    expect(TICKET_ITEM_KINDS.includes(k)).toBe(true)
  })
})
