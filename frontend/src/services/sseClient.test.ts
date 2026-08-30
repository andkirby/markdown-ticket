import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
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
