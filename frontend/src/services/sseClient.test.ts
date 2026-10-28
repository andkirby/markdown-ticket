import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eventBus } from './eventBus'
import { sseClient, syncSSEAccessMode } from './sseClient'

const originalConsoleWarn = console.warn

class MockEventSource {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2
  static instances: MockEventSource[] = []

  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onopen: ((event: Event) => void) | null = null
  readyState = MockEventSource.OPEN

  constructor(
    public readonly url: string,
    public readonly init?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this)
  }

  close(): void {
    this.readyState = MockEventSource.CLOSED
  }
}

describe('sseClient access-mode sync', () => {
  beforeEach(() => {
    console.warn = () => {}
    MockEventSource.instances = []
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource
    sseClient.disconnect()
    sseClient.setAccessMode(null)
    sseClient.setSuppressed(false)
  })

  afterEach(() => {
    sseClient.disconnect()
    sseClient.setAccessMode(null)
    console.warn = originalConsoleWarn
  })

  it('reconnects when the access mode changes after session exchange', () => {
    syncSSEAccessMode('anonymous')
    expect(MockEventSource.instances).toHaveLength(1)

    const anonymousConnection = MockEventSource.instances[0]
    anonymousConnection?.onopen?.(new Event('open'))

    syncSSEAccessMode('read-only')
    expect(MockEventSource.instances).toHaveLength(2)
    expect(anonymousConnection?.readyState).toBe(MockEventSource.CLOSED)

    const readOnlyConnection = MockEventSource.instances[1]
    readOnlyConnection?.onopen?.(new Event('open'))

    syncSSEAccessMode('read-only')
    expect(MockEventSource.instances).toHaveLength(2)
  })

  it('reconnects on explicit cookie-grant refresh even when access mode is unchanged', () => {
    syncSSEAccessMode('read-only')
    expect(MockEventSource.instances).toHaveLength(1)

    const publicReadOnlyConnection = MockEventSource.instances[0]
    publicReadOnlyConnection?.onopen?.(new Event('open'))

    syncSSEAccessMode('read-only', { forceReconnect: true })
    expect(MockEventSource.instances).toHaveLength(2)
    expect(publicReadOnlyConnection?.readyState).toBe(MockEventSource.CLOSED)
  })

  it('disconnects and suppresses SSE while locked', () => {
    syncSSEAccessMode('read-only')
    expect(MockEventSource.instances).toHaveLength(1)

    const readOnlyConnection = MockEventSource.instances[0]
    readOnlyConnection?.onopen?.(new Event('open'))

    syncSSEAccessMode('locked')
    expect(readOnlyConnection?.readyState).toBe(MockEventSource.CLOSED)

    syncSSEAccessMode('locked')
    expect(MockEventSource.instances).toHaveLength(1)
  })
})

describe('MDT-258 SSE ingress and unknown-event isolation', () => {
  beforeEach(() => {
    console.warn = () => {}
    MockEventSource.instances = []
    globalThis.EventSource = MockEventSource as unknown as typeof EventSource
    sseClient.disconnect()
    sseClient.setSuppressed(false)
    sseClient.connect()
  })
  afterEach(() => {
    sseClient.disconnect()
    console.warn = originalConsoleWarn
  })
  function send(frame: unknown) {
    MockEventSource.instances.at(-1)?.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }))
  }
  it('ignores unknown types and malformed known payloads without poisoning dedupe IDs', () => {
    const received: unknown[] = []
    const off = eventBus.on('ticket:updated', event => received.push(event.payload))
    try {
      const eventId = `phase45-${Date.now()}`
      send({ type: 'future-type', data: { eventId } })
      send({ type: 'file-change', data: { eventType: 'change', filename: ['bad'], eventId } })
      send({ type: 'file-change', data: { eventType: 'change', filename: 'MDT-1.md', ticketData: { code: {} }, eventId } })
      expect(received).toEqual([])
      const valid = { type: 'file-change', data: { eventType: 'change', filename: 'MDT-1.md', projectId: 'p', ticketData: { code: 'MDT-1' }, eventId } }
      send(valid)
      send(valid)
      expect(received).toEqual([{ ticketCode: 'MDT-1', projectId: 'p', ticket: { code: 'MDT-1' } }])
    }
    finally { off() }
  })
  it('forwards document and subdocument events with existing defaults', () => {
    const received: unknown[] = []
    const offDoc = eventBus.on('document:file:changed', event => received.push(event.payload))
    const offSub = eventBus.on('ticket:subdocument:changed', event => received.push(event.payload))
    try {
      send({ type: 'document-change', data: { eventType: 'change', filePath: 'docs/a.md' } })
      send({ type: 'file-change', data: { eventType: 'add', filename: 'notes.md', subdocument: { code: 'MDT-123', filePath: 'MDT-123/notes.md' } } })
      expect(received).toEqual([
        { projectId: '', eventType: 'change', filePath: 'docs/a.md', timestamp: undefined },
        { ticketCode: 'MDT-123', projectId: '', eventType: 'add', subdocument: { code: 'MDT-123', filePath: 'MDT-123/notes.md' }, source: 'main' },
      ])
    }
    finally {
      offDoc()
      offSub()
    }
  })
  it('MDT-265 routes alphanumeric and five-digit subdocument events by the full ticket key', () => {
    const received: string[] = []
    const off = eventBus.on('ticket:subdocument:changed', event => received.push(event.payload.ticketCode))
    try {
      for (const key of ['TP0-042', 'TP0-10000', 'AB123-99999']) {
        send({ type: 'file-change', data: { eventType: 'change', filename: 'notes.md', subdocument: { code: key, filePath: `${key}/part/notes.md` } } })
      }
      expect(received).toEqual(['TP0-042', 'TP0-10000', 'AB123-99999'])
    }
    finally { off() }
  })
  it('MDT-265 does not truncate invalid subdocument path keys', () => {
    const received: string[] = []
    const off = eventBus.on('ticket:subdocument:changed', event => received.push(event.payload.ticketCode))
    try {
      for (const key of ['TP0-100000', 'MDT-100000', 'MDT-042extra']) {
        send({ type: 'file-change', data: { eventType: 'change', filename: 'notes.md', subdocument: { code: key, filePath: `${key}/notes.md` } } })
      }
      expect(received).toEqual(['notes', 'notes', 'notes'])
    }
    finally { off() }
  })
})
