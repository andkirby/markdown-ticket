/// <reference types="jest" />

import type { MCPTools } from '../src/tools/index'
import type { HttpTransportConfig } from '../src/transports/http'
import request from 'supertest'
import { createHttpTransportApp } from '../src/transports/http'

const validToken = 'mcp-stress-valid-token'
const invalidToken = 'mcp-stress-wrong-token'
const allowedOrigin = 'https://app.example.com'
const disallowedOrigin = 'https://disallowed.example.test'

describe('MCP HTTP stress matrix', () => {
  it('rejects missing, malformed, and invalid bearer credentials on the real /mcp route', async () => {
    const tools = createMockTools()
    const { app, sessionManager } = createSecuredApp(tools)

    try {
      const missing = await request(app)
        .post('/mcp')
        .send(jsonRpc('tools/list'))
      expect(missing.status).toBe(401)

      const malformed = await request(app)
        .post('/mcp')
        .set('Authorization', `Basic ${validToken}`)
        .send(jsonRpc('tools/list'))
      expect(malformed.status).toBe(401)

      const invalid = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(jsonRpc('tools/list'))
      expect(invalid.status).toBe(401)

      expect(tools.handleToolCall).not.toHaveBeenCalled()
    }
    finally {
      sessionManager.shutdown()
    }
  })

  it('does not treat allowed origin or proxy headers as credentials', async () => {
    const { app, sessionManager } = createSecuredApp(createMockTools())

    try {
      const response = await request(app)
        .post('/mcp')
        .set('Origin', allowedOrigin)
        .set('Referer', `${allowedOrigin}/mcp-client`)
        .set('X-Forwarded-For', '203.0.113.10')
        .set('X-Forwarded-Host', 'mcp.example.com')
        .set('X-Forwarded-Proto', 'https')
        .send(jsonRpc('tools/list'))

      expect(response.status).toBe(401)
      expect(JSON.stringify(response.body)).not.toContain(validToken)
    }
    finally {
      sessionManager.shutdown()
    }
  })

  it('rejects disallowed browser origins before processing valid authenticated MCP requests', async () => {
    const tools = createMockTools()
    const { app, sessionManager } = createSecuredApp(tools)

    try {
      const response = await request(app)
        .post('/mcp')
        .set('Origin', disallowedOrigin)
        .set('Authorization', `Bearer ${validToken}`)
        .send(jsonRpc('tools/call', { name: 'list_projects', arguments: {} }))

      expect(response.status).toBe(403)
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
      expect(tools.handleToolCall).not.toHaveBeenCalled()
    }
    finally {
      sessionManager.shutdown()
    }
  })

  it('allows authenticated same-origin and no-origin clients without leaking the auth token', async () => {
    const { app, sessionManager } = createSecuredApp(createMockTools())

    try {
      const sameOrigin = await request(app)
        .post('/mcp')
        .set('Origin', allowedOrigin)
        .set('Authorization', `Bearer ${validToken}`)
        .send(jsonRpc('tools/list'))

      expect(sameOrigin.status).toBe(200)
      expect(sameOrigin.headers['access-control-allow-origin']).toBe(allowedOrigin)
      expect(JSON.stringify(sameOrigin.body)).not.toContain(validToken)
      expect(sameOrigin.body.result.tools).toHaveLength(1)

      const noOrigin = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${validToken}`)
        .send(jsonRpc('tools/list'))

      expect(noOrigin.status).toBe(200)
      expect(noOrigin.headers['access-control-allow-origin']).toBeUndefined()
      expect(JSON.stringify(noOrigin.body)).not.toContain(validToken)
    }
    finally {
      sessionManager.shutdown()
    }
  })

  it('rate limits repeated authenticated tool calls on the real /mcp route', async () => {
    const tools = createMockTools()
    const { app, sessionManager } = createSecuredApp(tools, {
      rateLimitMax: 1,
      rateLimitWindowMs: 60000,
    })

    try {
      const first = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${validToken}`)
        .send(jsonRpc('tools/call', { name: 'list_projects', arguments: {} }))
      expect(first.status).toBe(200)

      const second = await request(app)
        .post('/mcp')
        .set('Authorization', `Bearer ${validToken}`)
        .send(jsonRpc('tools/call', { name: 'list_projects', arguments: {} }))
      expect(second.status).toBe(429)
      expect(second.headers['retry-after']).toBeDefined()
      expect(JSON.stringify(second.body)).not.toContain(validToken)
    }
    finally {
      sessionManager.shutdown()
    }
  })

  it('keeps health public but protects production session debugging with bearer auth', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const { app, sessionManager } = createSecuredApp(createMockTools())

    try {
      const health = await request(app).get('/health')
      expect(health.status).toBe(200)
      expect(health.body.features).toMatchObject({
        auth: true,
        originValidation: true,
      })
      expect(JSON.stringify(health.body)).not.toContain(validToken)

      const anonymousSessions = await request(app).get('/sessions')
      expect(anonymousSessions.status).toBe(401)

      const authenticatedSessions = await request(app)
        .get('/sessions')
        .set('Authorization', `Bearer ${validToken}`)
      expect(authenticatedSessions.status).toBe(200)
      expect(authenticatedSessions.body).toMatchObject({ count: 0 })
      expect(JSON.stringify(authenticatedSessions.body)).not.toContain(validToken)
    }
    finally {
      sessionManager.shutdown()
      process.env.NODE_ENV = originalNodeEnv
    }
  })
})

function createSecuredApp(tools: jest.Mocked<Pick<MCPTools, 'getTools' | 'handleToolCall'>>, overrides: Partial<HttpTransportConfig> = {}) {
  return createHttpTransportApp(tools as unknown as MCPTools, {
    port: 0,
    host: '127.0.0.1',
    enableOriginValidation: true,
    allowedOrigins: [allowedOrigin],
    enableAuth: true,
    authToken: validToken,
    enableRateLimiting: true,
    rateLimitMax: 100,
    rateLimitWindowMs: 60000,
    trustProxy: false,
    ...overrides,
  })
}

function createMockTools(): jest.Mocked<Pick<MCPTools, 'getTools' | 'handleToolCall'>> {
  return {
    getTools: jest.fn(() => [
      {
        name: 'list_projects',
        description: 'List projects',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ]),
    handleToolCall: jest.fn(async (_name: string, _args: Record<string, unknown>) => 'ok'),
  }
}

function jsonRpc(method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: '2.0',
    id: 1,
    method,
    params,
  }
}
