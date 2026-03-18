/**
 * MDT-142: Subdocument SSE Events - SSEBroadcaster Tests
 *
 * Tests for subdocument metadata in SSE events.
 *
 * Covers: BR-1.1, BR-1.4, Edge-2
 */

import { SSEBroadcaster } from '../services/fileWatcher/SSEBroadcaster.js'

describe('SSEBroadcaster - Subdocument Events (MDT-142)', () => {
  let broadcaster: SSEBroadcaster

  beforeEach(() => {
    broadcaster = new SSEBroadcaster()
  })

  afterEach(() => {
    broadcaster.stop()
  })

  describe('OBL-subdocument-event-structure: SSE events include subdocument metadata (BR-1.1)', () => {
    it('should include subdocument field in file-change event', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      broadcaster.broadcast({
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
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      expect(event.data.subdocument).toBeDefined()
      expect(event.data.subdocument.code).toBe('architecture')
      expect(event.data.subdocument.filePath).toBe('MDT-142/architecture.md')
    })

    it('should include source field indicating main or worktree origin (BR-1.1)', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      broadcaster.broadcast({
        type: 'file-change',
        data: {
          eventType: 'change',
          filename: 'MDT-142/bdd.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: {
            code: 'bdd',
            filePath: 'MDT-142/bdd.md',
          },
          source: 'worktree',
        },
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      expect(event.data.source).toBe('worktree')
    })

    it('should set subdocument to null for main ticket file changes', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      broadcaster.broadcast({
        type: 'file-change',
        data: {
          eventType: 'change',
          filename: 'MDT-142.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: null,
          source: 'main',
        },
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      expect(event.data.subdocument).toBeNull()
    })
  })

  describe('BR-1.4: SSE events enable targeted UI updates', () => {
    it('should broadcast event with all required fields for frontend routing', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      const eventData = {
        eventType: 'change',
        filename: 'MDT-142/tests.md',
        projectId: 'MDT',
        timestamp: Date.now(),
        subdocument: {
          code: 'tests',
          filePath: 'MDT-142/tests.md',
        },
        source: 'main' as const,
        ticketData: {
          code: 'MDT-142',
          status: 'In Progress',
        },
      }

      broadcaster.broadcast({
        type: 'file-change',
        data: eventData,
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      // Verify all fields for frontend routing
      expect(event.type).toBe('file-change')
      expect(event.data.eventType).toBe('change')
      expect(event.data.subdocument.code).toBe('tests')
      expect(event.data.source).toBe('main')
      expect(event.data.ticketData).toBeDefined()
    })
  })

  describe('Edge-2: Subdocument add/unlink events', () => {
    it('should broadcast add event with subdocument metadata', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      broadcaster.broadcast({
        type: 'file-change',
        data: {
          eventType: 'add',
          filename: 'MDT-142/new-doc.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: {
            code: 'new-doc',
            filePath: 'MDT-142/new-doc.md',
          },
          source: 'main',
        },
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      expect(event.data.eventType).toBe('add')
      expect(event.data.subdocument).toBeDefined()
    })

    it('should broadcast unlink event with subdocument metadata', () => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      broadcaster.broadcast({
        type: 'file-change',
        data: {
          eventType: 'unlink',
          filename: 'MDT-142/old-doc.md',
          projectId: 'MDT',
          timestamp: Date.now(),
          subdocument: {
            code: 'old-doc',
            filePath: 'MDT-142/old-doc.md',
          },
          source: 'worktree',
        },
      })

      const writeCall = mockClient.write.mock.calls[0][0]
      const event = JSON.parse(writeCall.replace('data: ', '').replace('\n\n', ''))

      expect(event.data.eventType).toBe('unlink')
      expect(event.data.subdocument).toBeDefined()
      expect(event.data.source).toBe('worktree')
    })
  })

  describe('Debouncing and event queue', () => {
    it('should debounce rapid subdocument changes', (done) => {
      const mockClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: false,
        destroyed: false,
      }

      broadcaster.addClient(mockClient)

      // Fire multiple rapid changes
      const key = 'change:MDT-142/architecture.md:MDT'
      broadcaster.debouncedBroadcast(key, () => {
        mockClient.write('data: {"type":"file-change"}\n\n')
      }, 100)

      broadcaster.debouncedBroadcast(key, () => {
        mockClient.write('data: {"type":"file-change"}\n\n')
      }, 100)

      // Only one write should happen after debounce
      setTimeout(() => {
        expect(mockClient.write).toHaveBeenCalledTimes(1)
        done()
      }, 150)
    })
  })
})
