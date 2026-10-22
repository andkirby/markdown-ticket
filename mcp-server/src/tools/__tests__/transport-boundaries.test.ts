import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import request from 'supertest'
import { _handleJsonRpcRequest, createHttpTransportApp } from '../../transports/http.js'
import { SessionManager } from '../../transports/sessionManager.js'
import { startStdioTransport } from '../../transports/stdio.js'
import { ProjectHandlers } from '../handlers/projectHandlers.js'
import { createTools } from './boundary-fixtures.js'

let mockTransport: InMemoryTransport
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(() => mockTransport),
}))

const invalid = { key: '1', attributes: { priority: { bad: true } } }
function expectIssues(error: unknown) {
  expect(error).toMatchObject({ code: -32602, data: { code: 'VALIDATION_ERROR', issues: expect.any(Array) } })
}

describe('MCP transports preserve registry issues', () => {
  afterEach(() => jest.restoreAllMocks())
  it.each([invalid, null, false, [], 0].map(args => ({ args })))('stdio through real SDK dispatch: $args', async ({ args }) => {
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject')
    const [client, server] = InMemoryTransport.createLinkedPair()
    mockTransport = server
    await startStdioTransport(createTools())
    try {
      const response = new Promise<JSONRPCMessage>((accept) => {
        client.onmessage = accept
      })
      await client.send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_cr_attrs', arguments: args } })
      const message = await response
      expect('error' in message).toBe(true)
      if ('error' in message)
        expectIssues(message.error)
      expect(resolve).not.toHaveBeenCalled()
    }
    finally {
      await client.close()
      await server.close()
    }
  })
  it.each([invalid, null, false, [], 0].map(args => ({ args })))('active HTTP dispatch: $args', async ({ args }) => {
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject')
    const { app, sessionManager } = createHttpTransportApp(createTools(), { port: 0, enableAuth: false, enableRateLimiting: false, enableOriginValidation: false })
    try {
      const response = await request(app).post('/mcp').send({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_cr_attrs', arguments: args } })
      expect(response.status).toBe(200)
      expectIssues(response.body.error)
      expect(resolve).not.toHaveBeenCalled()
    }
    finally { sessionManager.shutdown() }
  })
  it.each([invalid, null, false, [], 0].map(args => ({ args })))('secondary HTTP dispatch: $args', async ({ args }) => {
    const resolve = jest.spyOn(ProjectHandlers.prototype, 'resolveProject')
    const sessions = new SessionManager()
    try {
      const response = await _handleJsonRpcRequest(createTools(), { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'update_cr_attrs', arguments: args } }, sessions)
      expect('error' in response).toBe(true)
      if ('error' in response)
        expectIssues(response.error)
      expect(resolve).not.toHaveBeenCalled()
    }
    finally { sessions.shutdown() }
  })
  it.each(['stdio', 'active-http', 'secondary-http'])('%s normalizes absent arguments to an empty object', async (transport) => {
    const tools = createTools()
    const invoke = jest.spyOn(tools.registry.list_projects, 'invoke').mockResolvedValue('ok')
    const payload = { jsonrpc: '2.0' as const, id: 1, method: 'tools/call', params: { name: 'list_projects' } }
    if (transport === 'stdio') {
      const [client, server] = InMemoryTransport.createLinkedPair()
      mockTransport = server
      await startStdioTransport(tools)
      try {
        const response = new Promise<JSONRPCMessage>((accept) => {
          client.onmessage = accept
        })
        await client.send(payload)
        expect(await response).toHaveProperty('result')
      }
      finally {
        await client.close()
        await server.close()
      }
    }
    else if (transport === 'active-http') {
      const { app, sessionManager } = createHttpTransportApp(tools, { port: 0, enableAuth: false, enableRateLimiting: false, enableOriginValidation: false })
      try {
        const response = await request(app).post('/mcp').send(payload)
        expect(response.status).toBe(200)
        expect(response.body).toHaveProperty('result')
      }
      finally { sessionManager.shutdown() }
    }
    else {
      const sessions = new SessionManager()
      try {
        expect(await _handleJsonRpcRequest(tools, payload, sessions)).toHaveProperty('result')
      }
      finally { sessions.shutdown() }
    }
    expect(invoke).toHaveBeenCalledWith({})
  })
  it('dispatcher normalizes only absent arguments and keeps unknown-tool precedence', async () => {
    const tools = createTools()
    const call = jest.spyOn(tools.registry.list_projects, 'invoke').mockResolvedValue('ok')
    await tools.handleToolCall('list_projects')
    expect(call).toHaveBeenCalledWith({})
    await expect(tools.handleToolCall('unknown')).rejects.toMatchObject({ code: -32601 })
  })
})
