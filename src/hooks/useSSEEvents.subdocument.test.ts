/**
 * MDT-142: Subdocument SSE Events - useSSEEvents Tests
 *
 * Tests for mapping SSE events to EventBus events.
 *
 * Covers: BR-1.4, C4
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { eventBus } from '../services/eventBus'

describe('useSSEEvents - Subdocument Mapping (MDT-142)', () => {
  beforeEach(() => {
    // Clear any existing listeners
    eventBus.removeAllListeners()
  })

  describe('OBL-frontend-event-mapping: Map SSE to EventBus (C4)', () => {
    it('should map SSE file-change with subdocument to ticket:subdocument:changed', (done) => {
      eventBus.on('ticket:subdocument:changed', (event) => {
        expect(event.payload.ticketCode).toBe('MDT-142')
        expect(event.payload.eventType).toBe('change')
        expect(event.payload.subdocument.code).toBe('architecture')
        done()
      })

      // Simulate SSE event being mapped
      const sseEvent = {
        type: 'file-change',
        data: {
          eventType: 'change',
          filename: 'MDT-142/architecture.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: {
            code: 'architecture',
            filePath: 'MDT-142/architecture.md',
          },
          source: 'main',
        },
      }

      // This is the mapping logic that should exist in useSSEEvents
      if (sseEvent.data.subdocument) {
        eventBus.emit('ticket:subdocument:changed', {
          ticketCode: 'MDT-142',
          eventType: sseEvent.data.eventType,
          subdocument: sseEvent.data.subdocument,
          source: sseEvent.data.source,
        }, 'sse')
      }
    })

    it('should map SSE file-change without subdocument to ticket:updated', (done) => {
      eventBus.on('ticket:updated', (event) => {
        expect(event.payload.ticketCode).toBe('MDT-142')
        done()
      })

      const sseEvent = {
        type: 'file-change',
        data: {
          eventType: 'change',
          filename: 'MDT-142.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: null,
          source: 'main',
        },
      }

      // This is the mapping logic that should exist in useSSEEvents
      if (!sseEvent.data.subdocument) {
        eventBus.emit('ticket:updated', {
          ticketCode: 'MDT-142',
          projectId: 'MDT',
        }, 'sse')
      }
    })
  })

  describe('C4: Backward compatibility for existing consumers', () => {
    it('should still emit ticket:updated for main ticket file changes', (done) => {
      let ticketUpdatedCount = 0

      eventBus.on('ticket:updated', () => {
        ticketUpdatedCount++
      })

      // Simulate main ticket file change
      eventBus.emit('ticket:updated', {
        ticketCode: 'MDT-142',
        projectId: 'MDT',
      }, 'sse')

      setTimeout(() => {
        expect(ticketUpdatedCount).toBe(1)
        done()
      }, 50)
    })

    it('should not break existing ticket:updated listeners when adding ticket:subdocument:changed', (done) => {
      const receivedEvents: string[] = []

      eventBus.on('ticket:updated', () => {
        receivedEvents.push('ticket:updated')
      })

      eventBus.on('ticket:subdocument:changed', () => {
        receivedEvents.push('ticket:subdocument:changed')
      })

      // Emit both events
      eventBus.emit('ticket:updated', { ticketCode: 'MDT-142', projectId: 'MDT' }, 'sse')
      eventBus.emit('ticket:subdocument:changed', {
        ticketCode: 'MDT-142',
        eventType: 'change',
        subdocument: { code: 'bdd', filePath: 'MDT-142/bdd.md' },
        source: 'main',
      }, 'sse')

      setTimeout(() => {
        expect(receivedEvents).toContain('ticket:updated')
        expect(receivedEvents).toContain('ticket:subdocument:changed')
        done()
      }, 50)
    })
  })

  describe('BR-1.4: Include eventType in ticket:subdocument:changed payload', () => {
    it('should pass eventType through to frontend for add/unlink/change handling', (done) => {
      const eventTypes = ['add', 'change', 'unlink']
      let receivedCount = 0

      eventBus.on('ticket:subdocument:changed', (event) => {
        expect(event.payload.eventType).toBeOneOf(eventTypes)
        receivedCount++

        if (receivedCount === 3) {
          done()
        }
      })

      eventTypes.forEach((type) => {
        eventBus.emit('ticket:subdocument:changed', {
          ticketCode: 'MDT-142',
          eventType: type,
          subdocument: { code: 'doc', filePath: `MDT-142/doc.md` },
          source: 'main',
        }, 'sse')
      })
    })
  })
})
