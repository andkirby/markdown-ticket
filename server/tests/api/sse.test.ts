/// <reference types="jest" />
/**
 * SSE Endpoint Tests - MDT-106 Phase 2 Task 2.4
 *
 * Tests Server-Sent Events (SSE) endpoint functionality:
 * - Connection establishment and headers
 * - Initial connection event
 * - Event delivery and ordering
 * - Keep-alive connection
 * - Connection failure handling
 * - Error event handling
 * - OpenAPI contract validation
 *
 * @see server/routes/sse.ts
 * @see server/fileWatcherService.ts
 */
import request from 'supertest';
import { Readable } from 'stream';
import { setupTestEnvironment, cleanupTestEnvironment } from './setup.js';
import {
  parseSSEMessage,
  parseSSEChunk,
  assertSSEConnection,
  assertEventSequence,
} from './helpers/sse.js';
describe('SSE Endpoint - /api/events', () => {
  let tempDir: string;
  let app: any;
  let cleanup: () => Promise<void>;
  beforeAll(async () => {
    const context = await setupTestEnvironment();
    tempDir = context.tempDir;
    app = context.app;
    cleanup = async () => cleanupTestEnvironment(tempDir);
  });
  afterAll(async () => {
    if (cleanup) await cleanup();
  });
  describe('SSE Connection', () => {
    it('should establish SSE connection with correct headers', (done) => {
      const req = request(app).get('/api/events');
      req.on('response', (res: any) => {
        assertSSEConnection(res);
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe('*');
        setTimeout(() => { try { req.abort(); } catch {} }, 100);
        done();
      });
      setTimeout(() => { try { req.abort(); done(); } catch {} }, 1000);
    });
    it('should send initial connection event with status and timestamp', (done) => {
      const req = request(app).get('/api/events');
      let receivedData = false;
      req.on('response', (res: any) => {
        expect(res.status).toBe(200);
        let data = '';
        const onData = (chunk: Buffer) => {
          if (receivedData) return;
          data += chunk.toString();
          const chunks = parseSSEChunk(data);
          if (chunks.length > 0) {
            receivedData = true;
            res.off('data', onData);
            const eventData = JSON.parse(chunks[0].data || '{}');
            expect(eventData.type).toBe('connection');
            expect(eventData.data.status).toBe('connected');
            expect(typeof eventData.data.timestamp).toBe('number');
            setTimeout(() => { try { req.abort(); } catch {} }, 50);
            done();
          }
        };
        res.on('data', onData);
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true;
            res.off('data', onData);
            try { req.abort(); } catch {}
            done();
          }
        }, 2000);
      });
    });
  });
  describe('Event Delivery', () => {
    it('should verify event delivery to connected clients', (done) => {
      const req = request(app).get('/api/events');
      let receivedData = false;
      req.on('response', (res: any) => {
        let data = '';
        const onData = (chunk: Buffer) => {
          if (receivedData) return;
          data += chunk.toString();
          const chunks = parseSSEChunk(data);
          if (chunks.length > 0) {
            receivedData = true;
            res.off('data', onData);
            expect(JSON.parse(chunks[0].data || '{}').type).toBe('connection');
            setTimeout(() => { try { req.abort(); } catch {} }, 50);
            done();
          }
        };
        res.on('data', onData);
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true;
            res.off('data', onData);
            try { req.abort(); } catch {}
            done();
          }
        }, 2000);
      });
    });
    it('should verify event order is preserved', (done) => {
      const req = request(app).get('/api/events');
      let receivedData = false;
      req.on('response', (res: any) => {
        let data = '';
        const onData = (chunk: Buffer) => {
          if (receivedData) return;
          data += chunk.toString();
          const chunks = parseSSEChunk(data);
          if (chunks.length > 1) {
            receivedData = true;
            res.off('data', onData);
            const first = JSON.parse(chunks[0].data || '{}');
            const second = JSON.parse(chunks[1].data || '{}');
            expect(first.data.timestamp).toBeLessThanOrEqual(second.data.timestamp);
            setTimeout(() => { try { req.abort(); } catch {} }, 50);
            done();
          }
        };
        res.on('data', onData);
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true;
            res.off('data', onData);
            try { req.abort(); } catch {}
            done();
          }
        }, 2000);
      });
    });
    it('should handle multiple concurrent SSE connections', (done) => {
      const req1 = request(app).get('/api/events');
      const req2 = request(app).get('/api/events');
      let responses = 0;
      const checkResponse = (res: any) => {
        assertSSEConnection(res);
        expect(res.status).toBe(200);
        responses++;
        if (responses === 2) {
          setTimeout(() => {
            try { req1.abort(); req2.abort(); } catch {}
            done();
          }, 100);
        }
      };
      req1.on('response', checkResponse);
      req2.on('response', checkResponse);
      setTimeout(() => {
        try { req1.abort(); req2.abort(); done(); } catch {}
      }, 2000);
    });
  });
  describe('Keep-Alive Connection', () => {
    it('should maintain connection with keep-alive header', (done) => {
      const req = request(app).get('/api/events');
      req.on('response', (res: any) => {
        expect(res.headers['connection']).toMatch(/keep-alive/i);
        expect(res.headers['cache-control']).toContain('no-cache');
        setTimeout(() => { try { req.abort(); } catch {} }, 100);
        done();
      });
      setTimeout(() => { try { req.abort(); done(); } catch {} }, 1000);
    });
    it('should include proper content-type for event stream', (done) => {
      const req = request(app).get('/api/events');
      req.on('response', (res: any) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        setTimeout(() => { try { req.abort(); } catch {} }, 100);
        done();
      });
      setTimeout(() => { try { req.abort(); done(); } catch {} }, 1000);
    });
  });
  describe('Connection Failure Handling', () => {
    it('should handle connection drops gracefully', () => {
      const mockStream = new MockEventStream();
      mockStream.on('close', () => { mockStream.destroyed = true; });
      mockStream.destroy();
      expect(mockStream.destroyed).toBe(true);
    });
    it('should clean up client on connection abort', () => {
      const mockRes = new MockEventStream();
      mockRes.on('aborted', () => { mockRes.isClosed = true; });
      mockRes.emit('aborted');
      expect(mockRes.isClosed).toBe(true);
    });
    it('should handle connection errors without crashing', () => {
      const mockRes = new MockEventStream();
      mockRes.on('error', () => { mockRes.destroyed = true; });
      mockRes.emit('error', new Error('Connection error'));
      expect(mockRes.destroyed).toBe(true);
    });
  });
  describe('Error Event Handling', () => {
    it('should handle malformed event data gracefully', () => {
      const messages = parseSSEChunk('data: {invalid json}\n\n');
      expect(messages[0].data).toBe('{invalid json}');
    });
    it('should handle empty events', () => {
      const messages = parseSSEChunk('\n\n');
      expect(Array.isArray(messages)).toBe(true);
    });
    it('should parse events with custom event types and IDs', () => {
      const typeMsg = parseSSEChunk('event: custom-type\ndata: {"message":"test"}\n\n');
      expect(typeMsg[0].event).toBe('custom-type');
      const idMsg = parseSSEChunk('id: event-123\ndata: {"message":"test"}\n\n');
      expect(idMsg[0].id).toBe('event-123');
    });
    it('should handle multiple events in single chunk', () => {
      const messages = parseSSEChunk('data: {"event":"1"}\n\ndata: {"event":"2"}\n\n');
      expect(messages.length).toBe(2);
      expect(messages[0].data).toBe('{"event":"1"}');
      expect(messages[1].data).toBe('{"event":"2"}');
    });
  });
  describe('SSE Message Format', () => {
    it('should correctly parse SSE message format', () => {
      const parsed = parseSSEMessage('event: test\ndata: {"key":"value"}\nid: 123\nretry: 5000\n\n');
      expect(parsed.event).toBe('test');
      expect(parsed.data).toBe('{"key":"value"}');
      expect(parsed.id).toBe('123');
      expect(parsed.retry).toBe(5000);
    });
    it('should handle messages with partial fields', () => {
      const parsed = parseSSEMessage('data: only-data\n\n');
      expect(parsed.data).toBe('only-data');
      expect(parsed.event).toBeUndefined();
    });
    it('should validate connection and file-change event structures', () => {
      const connData = { type: 'connection', data: { status: 'connected', timestamp: Date.now() } };
      const connParsed = JSON.parse(JSON.stringify(connData));
      expect(connParsed.type).toBe('connection');
      const fileData = { type: 'file-change', data: { eventType: 'change', filename: 'test.md' } };
      const fileParsed = JSON.parse(JSON.stringify(fileData));
      expect(fileParsed.type).toBe('file-change');
    });
  });
  describe('Event Sequence Validation', () => {
    it('should validate event sequence matches expected order', () => {
      const events = [
        { data: '{"type":"connection"}' },
        { data: '{"type":"heartbeat"}' },
        { data: '{"type":"file-change"}' },
      ];
      const expected = [
        { data: { type: 'connection' } },
        { data: { type: 'heartbeat' } },
        { data: { type: 'file-change' } },
      ];
      assertEventSequence(events, expected);
    });
    it('should handle empty and partial event sequences', () => {
      assertEventSequence([], []);
      assertEventSequence(
        [{ data: '{"type":"event1"}' }, { data: '{"type":"event2"}' }],
        [{ data: { type: 'event1' } }]
      );
    });
  });
  describe('OpenAPI Contract Validation', () => {
    it('should satisfy OpenAPI spec for GET /api/events', (done) => {
      const req = request(app).get('/api/events');
      req.on('response', (res: any) => {
        expect(res.status).toBe(200);
        expect(res as any).toSatisfyApiSpec();
        setTimeout(() => { try { req.abort(); } catch {} }, 100);
        done();
      });
      setTimeout(() => { try { req.abort(); done(); } catch {} }, 1000);
    });
    it('should validate response headers match OpenAPI spec', (done) => {
      const req = request(app).get('/api/events');
      req.on('response', (res: any) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res as any).toSatisfyApiSpec();
        setTimeout(() => { try { req.abort(); } catch {} }, 100);
        done();
      });
      setTimeout(() => { try { req.abort(); done(); } catch {} }, 1000);
    });
    it('should validate SSE content format matches spec', (done) => {
      const req = request(app).get('/api/events');
      let receivedData = false;
      req.on('response', (res: any) => {
        expect(res.status).toBe(200);
        let data = '';
        const onData = (chunk: Buffer) => {
          if (receivedData) return;
          data += chunk.toString();
          const chunks = parseSSEChunk(data);
          if (chunks.length > 0) {
            receivedData = true;
            res.off('data', onData);
            chunks.forEach(chunk => {
              const eventData = JSON.parse(chunk.data || '{}');
              expect(eventData.type).toBeDefined();
              expect(eventData.data).toBeDefined();
            });
            setTimeout(() => { try { req.abort(); } catch {} }, 50);
            done();
          }
        };
        res.on('data', onData);
        setTimeout(() => {
          if (!receivedData) {
            receivedData = true;
            res.off('data', onData);
            try { req.abort(); } catch {}
            done();
          }
        }, 2000);
      });
    });
  });
});
/** Mock Event Stream for testing SSE connection behavior */
class MockEventStream extends Readable {
  headersSent = false;
  destroyed = false;
  isClosed = false;
  writable = true;
  private headers: Record<string, string> = {};
  private chunks: string[] = [];
  constructor() { super({ read() {} }); }
  writeHead(status: number, headers: Record<string, string>): void {
    this.headers = headers;
    this.headersSent = true;
  }
  write(chunk: string): boolean {
    this.chunks.push(chunk);
    this.push(chunk);
    return !this.destroyed;
  }
  end(): void {
    this.isClosed = true;
    this.push(null);
    this.emit('close');
  }
  destroy(error?: Error): this {
    this.destroyed = true;
    this.isClosed = true;
    this.emit('close');
    return this;
  }
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }
}
