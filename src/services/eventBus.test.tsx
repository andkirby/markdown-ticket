import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { eventBus, useEventBus } from './eventBus'

describe('useEventBus', () => {
  beforeEach(() => {
    eventBus.removeAllListeners()
    eventBus.clearHistory()
    eventBus.resetErrorCount()
  })

  afterEach(() => {
    eventBus.removeAllListeners()
    eventBus.clearHistory()
    eventBus.resetErrorCount()
  })

  it('invokes the latest handler after rerender without explicit dependencies', () => {
    const seenValues: string[] = []

    const { rerender } = renderHook(
      ({ value }: { value: string }) => useEventBus('ticket:subdocument:changed', () => {
        seenValues.push(value)
      }),
      { initialProps: { value: 'initial' } },
    )

    act(() => {
      eventBus.emit('ticket:subdocument:changed', {
        ticketCode: 'MDT-142',
        projectId: 'MDT',
        eventType: 'change',
        subdocument: {
          code: 'bbb.trace',
          filePath: 'MDT-142/bbb.trace.md',
        },
        source: 'main',
      }, 'sse')
    })

    rerender({ value: 'updated' })

    act(() => {
      eventBus.emit('ticket:subdocument:changed', {
        ticketCode: 'MDT-142',
        projectId: 'MDT',
        eventType: 'change',
        subdocument: {
          code: 'bbb.trace',
          filePath: 'MDT-142/bbb.trace.md',
        },
        source: 'main',
      }, 'sse')
    })

    expect(seenValues).toEqual(['initial', 'updated'])
    expect(eventBus.getListenerCount('ticket:subdocument:changed')).toBe(1)
  })

  it('emits typed document file change events', () => {
    const seenPaths: string[] = []

    eventBus.on('document:file:changed', (event) => {
      seenPaths.push(`${event.payload.eventType}:${event.payload.filePath}`)
    })

    act(() => {
      eventBus.emit('document:file:changed', {
        projectId: 'markdown-ticket',
        eventType: 'change',
        filePath: 'docs/guide.md',
        timestamp: 123,
      }, 'sse')
    })

    expect(seenPaths).toEqual(['change:docs/guide.md'])
  })
})
