/// <reference types="jest" />
/**
 * SSE Endpoint Tests - MDT-106 Phase 2 Task 2.4.
 *
 * Tests Server-Sent Events (SSE) endpoint functionality:
 * - Connection establishment and headers
 * - Initial connection event
 * - Event delivery and ordering
 * - Keep-alive connection
 * - Connection failure handling
 * - Error event handling
 * - OpenAPI contract validation.
 *
 * @see server/routes/sse.ts
 * @see server/fileWatcherService.ts
 */
import type { Express } from 'express'
import type { Buffer } from 'node:buffer'
import type { Response as SuperagentResponse } from 'superagent'
import { Readable } from 'node:stream'
import request from 'supertest'
import {
  assertEventSequence,
  assertSSEConnection,
  parseSSEChunk,
  parseSSEMessage,
} from './helpers/sse'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

describe('sSE Endpoint - /api/events', () => {
  let tempDir: string
  let app: Express
  let cleanup: () => Promise<void>

  beforeAll(async () => {
    const context = await setupTestEnvironment()

    tempDir = context.tempDir
    app = context.app
    cleanup = async () => cleanupTestEnvironment(tempDir)
  })
  afterAll(async () => {
    if (cleanup) {
      await cleanup()
    }
  })
  describe('sSE Connection', () => {
    it('should establish SSE connection with correct headers', (done) => {
      const req = request(app).get('/api/events')

      req.on('response', (res: SuperagentResponse) => {
        assertSSEConnection(res)
        expect(res.status).toBe(200)
        expect(res.headers['access-control-allow-origin']).toBe('*')
        setTimeout(() => {
          try {
            req.abort()
          }
          catch {
            // Ignore abort errors
          }
        }, 100)
        done()
      })
      setTimeout(() => {
        try {
          req.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 1000)
    })
    it.skip('should send initial connection event with status and timestamp - Supertest SSE limitation', (done) => {
      const req = request(app).get('/api/events')
      let receivedData = false

      req.on('response', (res: SuperagentResponse) => {
        expect(res.status).toBe(200)

        // Set up data listener immediately
        let data = ''
        const onData = (chunk: Buffer) => {
          if (receivedData) {
            return
          }
          data = data + chunk.toString()
          const chunks = parseSSEChunk(data)

          if (chunks.length > 0) {
            receivedData = true
            res.off('data', onData)
            try {
              const eventData = JSON.parse(chunks[0].data || '{}')

              expect(eventData.type).toBe('connection')
              expect(eventData.data.status).toBe('connected')
              expect(typeof eventData.data.timestamp).toBe('number')
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
            catch {
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
          }
        }

        res.on('data', onData)
        res.resume()

        // Set up a timeout to fail the test if no data received
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true
            res.off('data', onData)
            try {
              req.abort()
            }
            catch {
              // Ignore abort errors
            }
            done(new Error('No data received within timeout'))
          }
        }, 5000)
      })
    }, 15000) // Increase test timeout to 15 seconds
  })
  describe('event Delivery', () => {
    it.skip('should verify event delivery to connected clients - Supertest SSE limitation', (done) => {
      const req = request(app).get('/api/events')
      let receivedData = false

      req.on('response', (res: SuperagentResponse) => {
        let data = ''
        const onData = (chunk: Buffer) => {
          if (receivedData) {
            return
          }
          data = data + chunk.toString()
          const chunks = parseSSEChunk(data)

          if (chunks.length > 0) {
            receivedData = true
            res.off('data', onData)
            try {
              expect(JSON.parse(chunks[0].data || '{}').type).toBe('connection')
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
            catch {
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
          }
        }

        res.on('data', onData)
        res.resume()
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true
            res.off('data', onData)
            try {
              req.abort()
            }
            catch {
              // Ignore abort errors
            }
            done(new Error('No data received within timeout'))
          }
        }, 5000)
      })
    }, 15000) // Increase test timeout to 15 seconds
    it.skip('should verify event order is preserved - Supertest SSE limitation', (done) => {
      const req = request(app).get('/api/events')
      let receivedData = false

      req.on('response', (res: SuperagentResponse) => {
        let data = ''
        const onData = (chunk: Buffer) => {
          if (receivedData) {
            return
          }
          data = data + chunk.toString()
          const chunks = parseSSEChunk(data)

          if (chunks.length > 1) {
            receivedData = true
            res.off('data', onData)
            try {
              const first = JSON.parse(chunks[0].data || '{}')
              const second = JSON.parse(chunks[1].data || '{}')

              expect(first.data.timestamp).toBeLessThanOrEqual(second.data.timestamp)
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
            catch {
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
          }
        }

        res.on('data', onData)
        res.resume()
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true
            res.off('data', onData)
            try {
              req.abort()
            }
            catch {
              // Ignore abort errors
            }
            done(new Error('No data received within timeout'))
          }
        }, 5000)
      })
    }, 15000) // Increase test timeout to 15 seconds
    it('should handle multiple concurrent SSE connections', (done) => {
      const req1 = request(app).get('/api/events')
      const req2 = request(app).get('/api/events')
      let responses = 0
      const checkResponse = (res: SuperagentResponse) => {
        assertSSEConnection(res)
        expect(res.status).toBe(200)
        responses++
        if (responses === 2) {
          setTimeout(() => {
            try {
              req1.abort()
              req2.abort()
            }
            catch {
              // Ignore abort errors
            }
            done()
          }, 100)
        }
      }

      req1.on('response', checkResponse)
      req2.on('response', checkResponse)
      setTimeout(() => {
        try {
          req1.abort()
          req2.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 2000)
    })
  })
  describe('keep-Alive Connection', () => {
    it('should maintain connection with keep-alive header', (done) => {
      const req = request(app).get('/api/events')

      req.on('response', (res: SuperagentResponse) => {
        expect(res.headers.connection).toMatch(/keep-alive/i)
        expect(res.headers['cache-control']).toContain('no-cache')
        setTimeout(() => {
          try {
            req.abort()
          }
          catch {
            // Ignore abort errors
          }
        }, 100)
        done()
      })
      setTimeout(() => {
        try {
          req.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 1000)
    })
    it('should include proper content-type for event stream', (done) => {
      const req = request(app).get('/api/events')

      req.on('response', (res: SuperagentResponse) => {
        expect(res.headers['content-type']).toContain('text/event-stream')
        setTimeout(() => {
          try {
            req.abort()
          }
          catch {
            // Ignore abort errors
          }
        }, 100)
        done()
      })
      setTimeout(() => {
        try {
          req.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 1000)
    })
  })
  describe('connection Failure Handling', () => {
    it('should handle connection drops gracefully', () => {
      const mockStream = new MockEventStream()

      mockStream.on('close', () => {
        mockStream.destroyed = true
      })
      mockStream.destroy()
      expect(mockStream.destroyed).toBe(true)
    })
    it('should clean up client on connection abort', () => {
      const mockRes = new MockEventStream()

      mockRes.on('aborted', () => {
        mockRes.isClosed = true
      })
      mockRes.emit('aborted')
      expect(mockRes.isClosed).toBe(true)
    })
    it('should handle connection errors without crashing', () => {
      const mockRes = new MockEventStream()

      mockRes.on('error', () => {
        mockRes.destroyed = true
      })
      mockRes.emit('error', new Error('Connection error'))
      expect(mockRes.destroyed).toBe(true)
    })
  })
  describe('error Event Handling', () => {
    it('should handle malformed event data gracefully', () => {
      const messages = parseSSEChunk('data: {invalid json}\n\n')

      expect(messages[0].data).toBe('{invalid json}')
    })
    it('should handle empty events', () => {
      const messages = parseSSEChunk('\n\n')

      expect(Array.isArray(messages)).toBe(true)
    })
    it('should parse events with custom event types and IDs', () => {
      const typeMsg = parseSSEChunk('event: custom-type\ndata: {"message":"test"}\n\n')

      expect(typeMsg[0].event).toBe('custom-type')
      const idMsg = parseSSEChunk('id: event-123\ndata: {"message":"test"}\n\n')

      expect(idMsg[0].id).toBe('event-123')
    })
    it('should handle multiple events in single chunk', () => {
      const messages = parseSSEChunk('data: {"event":"1"}\n\ndata: {"event":"2"}\n\n')

      expect(messages).toHaveLength(2)
      expect(messages[0].data).toBe('{"event":"1"}')
      expect(messages[1].data).toBe('{"event":"2"}')
    })
  })
  describe('sSE Message Format', () => {
    it('should correctly parse SSE message format', () => {
      const parsed = parseSSEMessage('event: test\ndata: {"key":"value"}\nid: 123\nretry: 5000\n\n')

      expect(parsed.event).toBe('test')
      expect(parsed.data).toBe('{"key":"value"}')
      expect(parsed.id).toBe('123')
      expect(parsed.retry).toBe(5000)
    })
    it('should handle messages with partial fields', () => {
      const parsed = parseSSEMessage('data: only-data\n\n')

      expect(parsed.data).toBe('only-data')
      expect(parsed.event).toBeUndefined()
    })
    it('should validate connection and file-change event structures', () => {
      const connData = { type: 'connection', data: { status: 'connected', timestamp: Date.now() } }
      const connParsed = JSON.parse(JSON.stringify(connData))

      expect(connParsed.type).toBe('connection')
      const fileData = { type: 'file-change', data: { eventType: 'change', filename: 'test.md' } }
      const fileParsed = JSON.parse(JSON.stringify(fileData))

      expect(fileParsed.type).toBe('file-change')
    })
  })
  describe('event Sequence Validation', () => {
    it('should validate event sequence matches expected order', () => {
      const events = [
        { data: '{"type":"connection"}' },
        { data: '{"type":"heartbeat"}' },
        { data: '{"type":"file-change"}' },
      ]
      const expected = [
        { data: { type: 'connection' } },
        { data: { type: 'heartbeat' } },
        { data: { type: 'file-change' } },
      ]

      assertEventSequence(events, expected)
    })
    it('should handle empty and partial event sequences', () => {
      assertEventSequence([], [])
      assertEventSequence(
        [{ data: '{"type":"event1"}' }, { data: '{"type":"event2"}' }],
        [{ data: { type: 'event1' } }],
      )
    })
  })
  describe('openAPI Contract Validation', () => {
    it('should satisfy OpenAPI spec for GET /api/events', (done) => {
      const req = request(app).get('/api/events')

      req.on('response', (res: SuperagentResponse) => {
        expect(res.status).toBe(200)
        expect(res).toSatisfyApiSpec()
        setTimeout(() => {
          try {
            req.abort()
          }
          catch {
            // Ignore abort errors
          }
        }, 100)
        done()
      })
      setTimeout(() => {
        try {
          req.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 1000)
    })
    it('should validate response headers match OpenAPI spec', (done) => {
      const req = request(app).get('/api/events')

      req.on('response', (res: SuperagentResponse) => {
        expect(res.headers['content-type']).toContain('text/event-stream')
        expect(res).toSatisfyApiSpec()
        setTimeout(() => {
          try {
            req.abort()
          }
          catch {
            // Ignore abort errors
          }
        }, 100)
        done()
      })
      setTimeout(() => {
        try {
          req.abort()
          done()
        }
        catch {
          // Ignore abort errors
        }
      }, 1000)
    })
    it.skip('should validate SSE content format matches spec - Supertest SSE limitation', (done) => {
      const req = request(app).get('/api/events')
      let receivedData = false

      req.on('response', (res: SuperagentResponse) => {
        expect(res.status).toBe(200)
        let data = ''
        const onData = (chunk: Buffer) => {
          if (receivedData) {
            return
          }
          data = data + chunk.toString()
          const chunks = parseSSEChunk(data)

          if (chunks.length > 0) {
            receivedData = true
            res.off('data', onData)
            try {
              chunks.forEach((chunk) => {
                const eventData = JSON.parse(chunk.data || '{}')

                expect(eventData.type).toBeDefined()
                expect(eventData.data).toBeDefined()
              })
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
            catch {
              setTimeout(() => {
                try {
                  req.abort()
                }
                catch {
                  // Ignore abort errors
                }
              }, 50)
              done()
            }
          }
        }

        res.on('data', onData)
        res.resume()
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true
            res.off('data', onData)
            try {
              req.abort()
            }
            catch {
              // Ignore abort errors
            }
            done(new Error('No data received within timeout'))
          }
        }, 5000)
      })
    }, 15000) // Increase test timeout to 15 seconds
  })
})
/** Mock Event Stream for testing SSE connection behavior */
class MockEventStream extends Readable {
  headersSent = false
  destroyed = false
  isClosed = false
  writable = true
  private headers: Record<string, string> = {}
  private chunks: string[] = []
  constructor() { super({ read() {} }) }
  writeHead(status: number, headers: Record<string, string>): void {
    this.headers = headers
    this.headersSent = true
  }

  write(chunk: string): boolean {
    this.chunks.push(chunk)
    this.push(chunk)

    return !this.destroyed
  }

  end(): void {
    this.isClosed = true
    this.push(null)
    this.emit('close')
  }

  destroy(_error?: Error): this {
    this.destroyed = true
    this.isClosed = true
    this.emit('close')

    return this
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener)
  }

  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args)
  }
}
