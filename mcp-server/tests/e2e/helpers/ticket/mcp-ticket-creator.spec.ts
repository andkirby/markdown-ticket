import type { MCPClient } from '../mcp-client'
import type { TicketData } from '../types/project-factory-types'
import { McpTicketCreator } from './mcp-ticket-creator'

describe('mcpTicketCreator', () => {
  let creator: McpTicketCreator
  let mockMcpClient: jest.Mocked<MCPClient>

  beforeEach(() => {
    mockMcpClient = {
      callTool: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      isConnected: jest.fn(),
      listTools: jest.fn(),
      registerProject: jest.fn(),
    } as unknown as jest.Mocked<MCPClient>

    creator = new McpTicketCreator(mockMcpClient)
  })

  describe('getType', () => {
    it('should return "mcp"', () => {
      expect(creator.getType()).toBe('mcp')
    })
  })

  describe('validate', () => {
    it('should validate valid ticket data', () => {
      const data: TicketData = {
        title: 'Test Ticket',
        type: 'Feature Enhancement',
        content: 'Test content',
      }

      const result = creator.validate(data)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject missing required fields', () => {
      const data: TicketData = {
        title: '',
        type: '',
        content: '',
      }

      const result = creator.validate(data)
      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(3)
      expect(result.errors.map(e => e.code)).toContain('MISSING_TITLE')
      expect(result.errors.map(e => e.code)).toContain('MISSING_TYPE')
      expect(result.errors.map(e => e.code)).toContain('MISSING_CONTENT')
    })

    it('should warn about long titles', () => {
      const data: TicketData = {
        title: 'a'.repeat(101),
        type: 'Feature Enhancement',
        content: 'Test content',
      }

      const result = creator.validate(data)
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].code).toBe('LONG_TITLE')
    })
  })

  describe('extractTicketId', () => {
    it('should extract ticket ID from title format', () => {
      const mockResponse = {
        success: true,
        data: '✅ **Created CR TEST-001**: Test Title\n- Key: TEST-001',
      }

      mockMcpClient.callTool.mockResolvedValue(mockResponse)

      creator.create('TEST', {
        title: 'Test',
        type: 'Feature',
        content: 'Test',
      }).then((result) => {
        expect(result.ticketId).toBe('TEST-001')
      })
    })

    it('should extract ticket ID from key format', () => {
      const mockResponse = {
        success: true,
        data: 'Created CR successfully\n- Key: TEST-002\n- Status: Proposed',
      }

      mockMcpClient.callTool.mockResolvedValue(mockResponse)

      creator.create('TEST', {
        title: 'Test',
        type: 'Feature',
        content: 'Test',
      }).then((result) => {
        expect(result.ticketId).toBe('TEST-002')
      })
    })
  })
})
