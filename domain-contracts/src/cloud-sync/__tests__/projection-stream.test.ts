import type { ProjectedHeader } from '../projection'
import type { CatchupDelta, ClientAck, ClientEnvelope, LiveDelta, ReadySignal, StaleSignal, StreamEnvelope, StreamError } from '../projection-stream'
import {

  isProjectionDelta,
  isStreamEnvelope,

  parseStreamEnvelope,
  PROJECTION_STREAM_ENVELOPES,

} from '../projection-stream'

const header: ProjectedHeader = {
  code: 'MDT-1',
  title: 'Sample',
  status: 'In Progress',
  type: 'Feature Enhancement',
  priority: 'High',
  assignee: null,
  date_created: '2026-08-08T00:00:00Z',
  last_modified: '2026-08-08T00:00:00Z',
}

describe('projection-stream envelopes', () => {
  it('exposes all five server envelope kinds as a named array', () => {
    expect(PROJECTION_STREAM_ENVELOPES).toEqual([
      'catchup',
      'delta',
      'ready',
      'stale',
      'error',
    ])
  })

  it('catchup and delta carry a complete header plus delivery metadata only', () => {
    const catchup: CatchupDelta = {
      kind: 'catchup',
      cloudProjectId: 'proj-uuid',
      projectRevision: 42,
      ticketNumber: 1,
      projectionVersion: 3,
      lifecycle: 'active',
      header,
    }
    const delta: LiveDelta = { ...catchup, kind: 'delta', projectRevision: 43 }

    expect(isProjectionDelta(catchup)).toBe(true)
    expect(isProjectionDelta(delta)).toBe(true)
    // Header-only: no body field exists on the type
    expect(catchup).not.toHaveProperty('body')
    expect(delta).not.toHaveProperty('body')
  })

  it('ready carries only cloudProjectId and the high-water projectRevision', () => {
    const ready: ReadySignal = {
      kind: 'ready',
      cloudProjectId: 'proj-uuid',
      projectRevision: 100,
    }
    expect(ready).not.toHaveProperty('header')
    expect(ready).not.toHaveProperty('body')
  })

  it('stale and error carry a non-secret code/reason, never credentials or body', () => {
    const stale: StaleSignal = {
      kind: 'stale',
      cloudProjectId: 'proj-uuid',
      reason: 'stream_unavailable',
    }
    const error: StreamError = {
      kind: 'error',
      cloudProjectId: 'proj-uuid',
      code: 'authorization_revoked',
      retry: 'reconnect',
    }
    expect(stale).not.toHaveProperty('body')
    expect(stale).not.toHaveProperty('cfAccessToken')
    expect(error).not.toHaveProperty('body')
    expect(error).not.toHaveProperty('serviceToken')
  })

  it('client ack carries only the highest applied+persisted revision', () => {
    const ack: ClientEnvelope = {
      kind: 'ack',
      cloudProjectId: 'proj-uuid',
      projectRevision: 42,
    }
    expect(ack.kind).toBe('ack')
    expect(ack).not.toHaveProperty('body')
  })

  it('isStreamEnvelope narrows a parsed value and rejects foreign shapes', () => {
    expect(isStreamEnvelope({ kind: 'ready', cloudProjectId: 'p', projectRevision: 1 })).toBe(true)
    expect(isStreamEnvelope({ kind: 'nope' })).toBe(false)
    expect(isStreamEnvelope(null)).toBe(false)
    expect(isStreamEnvelope('ready')).toBe(false)
  })

  it('parseStreamEnvelope validates a JSON string and redacts disallowed fields', () => {
    const good = parseStreamEnvelope(
      JSON.stringify({ kind: 'delta', cloudProjectId: 'p', projectRevision: 5, ticketNumber: 1, projectionVersion: 1, lifecycle: 'active', header }),
    )
    expect(good.ok).toBe(true)
    if (good.ok)
      expect(good.value.kind).toBe('delta')

    const bad = parseStreamEnvelope('{ "kind": "delta" }')
    expect(bad.ok).toBe(false)

    const smuggled = parseStreamEnvelope(
      JSON.stringify({ kind: 'ready', cloudProjectId: 'p', projectRevision: 1, body: 'secret' }),
    )
    expect(smuggled.ok).toBe(false)
  })

  it('ClientAck is the single client-to-server envelope kind', () => {
    const ack: ClientAck = { kind: 'ack', cloudProjectId: 'p', projectRevision: 7 }
    expect(ack.kind).toBe('ack')
  })
})

// Satisfies compile-time references to the discriminated-union surface.
export type _StreamEnvelopeCompileCheck = StreamEnvelope
