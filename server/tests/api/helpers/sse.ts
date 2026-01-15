/**
 * SSE Testing Utilities - MDT-106
 * SSE testing using Node's built-in Event/EventTarget.
 */

import type { Response } from 'supertest'

export interface SSEMessage { data?: string, event?: string, id?: string, retry?: number }
export interface ExpectedSSEEvent { event?: string, data?: string | Record<string, unknown>, id?: string }

/** Mock EventSource using Node's EventTarget */
class _MockEventSource extends EventTarget {
  readonly url: string
  #connected = false

  constructor(url: string) {
    super()
    this.url = url
  }

  connect(): void {
    this.#connected = true
    this.dispatchEvent(new Event('open'))
  }

  disconnect(): void {
    this.#connected = false
    this.dispatchEvent(new Event('close'))
  }

  isConnected(): boolean {
    return this.#connected
  }

  receiveMessage(msg: SSEMessage): void {
    this.dispatchEvent(new CustomEvent(msg.event || 'message', { detail: msg }))
  }
}

/** Parse SSE message format (data:, event:, id:, retry:) */
export function parseSSEMessage(raw: string): SSEMessage {
  const msg: SSEMessage = {}

  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) {
      msg.data = line.slice(5).trim()
    }
    else if (line.startsWith('event:')) {
      msg.event = line.slice(6).trim()
    }
    else if (line.startsWith('id:')) {
      msg.id = line.slice(3).trim()
    }
    else if (line.startsWith('retry:')) {
      msg.retry = Number.parseInt(line.slice(6), 10)
    }
  }

  return msg
}

/** Parse SSE chunk with multiple messages */
export function parseSSEChunk(chunk: string): SSEMessage[] {
  const msgs: SSEMessage[] = []
  const cur: string[] = []

  for (const line of chunk.split('\n')) {
    if (line === '') {
      if (cur.length > 0) {
        msgs.push(parseSSEMessage(cur.join('\n')))
      }
      cur.length = 0
    }
    else {
      cur.push(line)
    }
  }

  if (cur.length > 0) {
    msgs.push(parseSSEMessage(cur.join('\n')))
  }

  return msgs
}

/** Assert SSE event structure */
function _assertSSEEvent(actual: SSEMessage, expected: ExpectedSSEEvent): void {
  if (expected.event !== undefined) {
    expect(actual.event).toBe(expected.event)
  }
  if (expected.id !== undefined) {
    expect(actual.id).toBe(expected.id)
  }
  if (expected.data !== undefined) {
    const actualData = typeof expected.data === 'string' ? actual.data : JSON.parse(actual.data || '{}')

    expect(actualData).toEqual(expected.data)
  }
}

/** Assert SSE connection headers (text/event-stream, no-cache, keep-alive) */
export function assertSSEConnection(response: Response): void {
  expect(response.headers['content-type']).toContain('text/event-stream')
  expect(response.headers['cache-control']).toContain('no-cache')
  expect(response.headers.connection).toMatch(/keep-alive/i)
}

/** Assert event sequence matches expected order */
export function assertEventSequence(actual: SSEMessage[], expected: ExpectedSSEEvent[]): void {
  expect(actual.length).toBeGreaterThanOrEqual(expected.length)
  expected.forEach((exp, i) => {
    _assertSSEEvent(actual[i], exp)
  })
}
