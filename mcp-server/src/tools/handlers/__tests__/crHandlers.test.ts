/**
 * Behavioral Preservation Tests for CRHandlers
 * MDT-102 Phase 1: Lock current behavior before refactoring
 *
 * Purpose: These tests call actual handler methods and verify outputs.
 * They document the CURRENT behavior that must be preserved after refactoring.
 *
 * Key behaviors to lock:
 * 1. Response format and structure for all handler methods
 * 2. Error messages and validation behavior
 * 3. Sanitization of user input
 * 4. JSON output structure for attributes/metadata modes
 */

import type { CRService } from '../../../services/crService.js'
// Use local test fixtures instead of @mdt/shared imports
import type { Project, Ticket, TicketData, TicketFilters } from '../../__tests__/test-fixtures.js'

// Mock ALL external modules BEFORE any imports
// Import the real services
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { glob } from 'glob'
import { JsonRpcErrorCode, ToolError } from '../../../utils/toolError.js'
import { createMockProject, createMockTicket, mockFileContent } from '../../__tests__/test-fixtures.js'
// Now import the handlers
import { CRHandlers } from '../crHandlers.js'

jest.mock('fs/promises')
jest.mock('glob')
jest.mock('../../../services/crService.js')

// Create local mock instances with jest.fn()
interface MockTitleExtractionService {
  extractTitle: jest.Mock
}

interface MockTemplateService {
  validateTicketData: jest.Mock
  suggestImprovements: jest.Mock
}

const mockTitleExtractionService = {
  extractTitle: jest.fn(),
} as MockTitleExtractionService

const mockTemplateService = {
  validateTicketData: jest.fn(),
  suggestImprovements: jest.fn(),
} as MockTemplateService

describe('cRHandlers - Behavioral Preservation Tests', () => {
  let crHandlers: CRHandlers
  let mockCrServiceInstance: jest.Mocked<CRService>

  // Test project - use fixture helper
  const mockProject: Project = createMockProject({
    project: {
      ...createMockProject().project,
      description: 'Test project for MDT-102',
    },
  })

  // Test ticket - use fixture helper
  const mockTicket: Ticket = createMockTicket()

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock instances
    mockCrServiceInstance = {
      listCRs: jest.fn(),
      getCR: jest.fn(),
      createCR: jest.fn(),
      updateCRStatus: jest.fn(),
      updateCRAttrs: jest.fn(),
      deleteCR: jest.fn(),
      getNextCRNumber: jest.fn(),
    } as unknown as jest.Mocked<CRService>

    // Create handlers with mocked dependencies
    crHandlers = new CRHandlers(
      mockCrServiceInstance,
      MarkdownService as unknown as typeof MarkdownService,
      mockTitleExtractionService as unknown,
      mockTemplateService as unknown,
    );

    // Mock glob to return test file path
    (glob as jest.MockedFunction<typeof glob>).mockResolvedValue([
      '/test/path/docs/CRs/MDT-001-test-cr-title.md',
    ]);

    // MDT-102: Mock MarkdownService static methods
    (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFileContent)

    // Mock sanitization disabled (default behavior)
    process.env.MCP_SANITIZATION_ENABLED = 'false'
  })

  afterEach(() => {
    delete process.env.MCP_SANITIZATION_ENABLED
  })

  describe('handleListCRs', () => {
    it('should return formatted list when CRs exist', async () => {
      const mockTickets: Ticket[] = [
        {
          ...mockTicket,
          code: 'MDT-001',
          title: 'Test CR 1',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          phaseEpic: 'Phase 1',
        },
        {
          ...mockTicket,
          code: 'MDT-002',
          title: 'Test CR 2',
          status: 'In Progress',
          type: 'Bug Fix',
          priority: 'High',
          phaseEpic: undefined,
        },
      ]

      mockCrServiceInstance.listCRs.mockResolvedValue(mockTickets)

      const result = await crHandlers.handleListCRs(mockProject)

      expect(result).toContain('Found 2 CRs:')
      expect(result).toContain('**MDT-001** - Test CR 1')
      expect(result).toContain('- Status: Proposed')
      expect(result).toContain('- Type: Feature Enhancement')
      expect(result).toContain('- Priority: Medium')
      expect(result).toContain('- Phase: Phase 1')
      expect(result).toContain('**MDT-002** - Test CR 2')
      expect(result).toContain('- Status: In Progress')
      expect(result).toContain('- Type: Bug Fix')
      expect(result).toContain('- Priority: High')
      // MDT-002 has no phase, but MDT-001 does, so we check there's only one Phase line
      const phaseCount = (result.match(/- Phase:/g) || []).length
      expect(phaseCount).toBe(1)
      expect(mockCrServiceInstance.listCRs).toHaveBeenCalledWith(mockProject, undefined)
    })

    it('should return message when no CRs exist', async () => {
      mockCrServiceInstance.listCRs.mockResolvedValue([])

      const result = await crHandlers.handleListCRs(mockProject)

      expect(result).toContain('No CRs found in project MDT')
    })

    it('should return filtered message when no CRs match filters', async () => {
      mockCrServiceInstance.listCRs.mockResolvedValue([])

      const result = await crHandlers.handleListCRs(mockProject, { status: 'Implemented' })

      expect(result).toContain('No CRs found matching the specified filters in project MDT')
      expect(mockCrServiceInstance.listCRs).toHaveBeenCalledWith(mockProject, { status: 'Implemented' })
    })

    it('should use singular form when only one CR exists', async () => {
      mockCrServiceInstance.listCRs.mockResolvedValue([mockTicket])

      const result = await crHandlers.handleListCRs(mockProject)

      expect(result).toContain('Found 1 CR:')
    })

    it('should indicate when filters are applied', async () => {
      mockCrServiceInstance.listCRs.mockResolvedValue([mockTicket])

      const filters: TicketFilters = { status: 'Proposed' }
      const result = await crHandlers.handleListCRs(mockProject, filters)

      expect(result).toContain('Found 1 CR matching filters:')
    })
  })

  describe('handleGetCR - full mode', () => {
    it('should return sanitized full content', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)

      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'full')

      expect(result).toBe('# Test CR\n\n## Description\nTest content here.')
      expect(mockCrServiceInstance.getCR).toHaveBeenCalledWith(mockProject, 'MDT-001')
    })

    it('should throw protocol error for invalid CR key format', async () => {
      await expect(crHandlers.handleGetCR(mockProject, 'INVALID', 'full'))
        .rejects
        .toThrow(ToolError)

      try {
        await crHandlers.handleGetCR(mockProject, 'INVALID', 'full')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.isProtocolError()).toBe(true)
        expect(toolError.code).toBe(JsonRpcErrorCode.InvalidParams)
      }
    })

    it('should throw tool execution error when CR not found', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(null)

      await expect(crHandlers.handleGetCR(mockProject, 'MDT-999', 'full'))
        .rejects
        .toThrow('CR \'MDT-999\' not found')

      try {
        await crHandlers.handleGetCR(mockProject, 'MDT-999', 'full')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.isToolExecutionError()).toBe(true)
      }
    })
  })

  describe('handleGetCR - attributes mode', () => {
    beforeEach(() => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      // MDT-102: Use MarkdownService static methods
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue(mockFileContent);
      (MarkdownService.parseMarkdownContent as jest.MockedFunction<typeof MarkdownService.parseMarkdownContent>).mockResolvedValue(mockTicket)
    })

    it('should return JSON with YAML frontmatter attributes', async () => {
      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'attributes')

      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('code', 'MDT-001')
      expect(parsed).toHaveProperty('title', 'Test CR Title')
      expect(parsed).toHaveProperty('status', 'Proposed')
      expect(parsed).toHaveProperty('type', 'Feature Enhancement')
      expect(parsed).toHaveProperty('priority', 'Medium')
      expect(parsed).toHaveProperty('phaseEpic', 'Phase 1')
      expect(parsed).toHaveProperty('assignee', 'developer')
    })

    it('should include optional fields when present', async () => {
      const ticketWithOptional = {
        ...mockTicket,
        dependsOn: ['MDT-000'],
        blocks: ['MDT-002'],
        relatedTickets: ['MDT-003'],
        implementationDate: new Date('2024-01-15'),
        implementationNotes: 'Implemented successfully',
      }

      mockCrServiceInstance.getCR.mockResolvedValue(ticketWithOptional);
      (MarkdownService.parseMarkdownContent as jest.MockedFunction<typeof MarkdownService.parseMarkdownContent>).mockResolvedValue(ticketWithOptional)

      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'attributes')

      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('dependsOn', ['MDT-000'])
      expect(parsed).toHaveProperty('blocks', ['MDT-002'])
    })

    it('should throw error for invalid file format', async () => {
      // MDT-102: Use MarkdownService static methods
      (MarkdownService.readFile as jest.MockedFunction<typeof MarkdownService.readFile>).mockResolvedValue('No frontmatter here')

      await expect(crHandlers.handleGetCR(mockProject, 'MDT-001', 'attributes'))
        .rejects
        .toThrow('Invalid CR file format')
    })
  })

  describe('handleGetCR - metadata mode', () => {
    it('should return JSON with metadata including filePath', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket);
      (glob as jest.MockedFunction<typeof glob>).mockResolvedValue(['/test/path/docs/CRs/MDT-001-test.md'])

      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'metadata')

      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('filePath')
    })
  })

  describe('handleCreateCR', () => {
    const validTicketData: TicketData = {
      title: 'New Test CR',
      type: 'Feature Enhancement',
      priority: 'High',
      phaseEpic: 'Phase 1',
      impactAreas: ['Backend', 'API'],
      content: '# New Test CR\n\n## Description\nTest description.',
    }

    it('should create CR and return success message', async () => {
      const createdTicket = {
        ...mockTicket,
        code: 'MDT-002',
        title: 'New Test CR',
      }

      mockTemplateService.validateTicketData.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      })

      mockCrServiceInstance.createCR.mockResolvedValue(createdTicket)

      const result = await crHandlers.handleCreateCR(mockProject, 'Feature Enhancement', validTicketData)

      expect(result).toContain('**Created CR MDT-002**: New Test CR')
      expect(result).toContain('- Key: MDT-002')
      expect(result).toContain('- Status: Proposed')
      expect(result).toContain('- Type: Feature Enhancement')
      expect(result).toContain('- Priority: Medium') // From created ticket, not input
      expect(result).toContain('- Phase: Phase 1')
    })

    it('should throw protocol error for invalid type', async () => {
      await expect(crHandlers.handleCreateCR(mockProject, 'InvalidType', validTicketData))
        .rejects
        .toThrow(ToolError)

      try {
        await crHandlers.handleCreateCR(mockProject, 'InvalidType', validTicketData)
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.isProtocolError()).toBe(true)
      }
    })

    it('should throw protocol error for invalid data', async () => {
      mockTemplateService.validateTicketData.mockReturnValue({
        valid: false,
        errors: [{ field: 'title', message: 'Title is required' }],
        warnings: [],
      })

      const invalidData = { title: '', type: 'Feature Enhancement' } as unknown as TicketData

      await expect(crHandlers.handleCreateCR(mockProject, 'Feature Enhancement', invalidData))
        .rejects
        .toThrow('CR data validation failed')
    })

    it('should include template information when no content provided', async () => {
      const dataWithoutContent = { ...validTicketData, content: undefined }

      mockTemplateService.validateTicketData.mockReturnValue({
        valid: true,
        errors: [],
        warnings: [],
      })

      mockCrServiceInstance.createCR.mockResolvedValue(mockTicket)

      const result = await crHandlers.handleCreateCR(mockProject, 'Bug Fix', dataWithoutContent)

      expect(result).toContain('The CR has been created with a complete template including:')
      expect(result).toContain('- Problem statement and description')
      expect(result).toContain('- Standard CR sections ready for completion')
    })
  })

  describe('handleUpdateCRStatus', () => {
    it('should update status and return confirmation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.updateCRStatus.mockResolvedValue(true)

      const result = await crHandlers.handleUpdateCRStatus(mockProject, 'MDT-001', 'Approved')

      expect(result).toContain('**Updated CR MDT-001** status')
      expect(result).toContain('**Change:** Proposed → Approved') // Unicode arrow with bold and colon
      expect(result).toContain('- Title: Test CR Title')
      expect(result).toContain('- File: Updated YAML frontmatter')
    })

    it('should include approval message when status is Approved', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.updateCRStatus.mockResolvedValue(true)

      const result = await crHandlers.handleUpdateCRStatus(mockProject, 'MDT-001', 'Approved')

      expect(result).toContain('The CR is now approved and ready for implementation.')
    })

    it('should include implementation message for Bug Fix', async () => {
      const bugFixTicket = { ...mockTicket, type: 'Bug Fix' }
      mockCrServiceInstance.getCR.mockResolvedValue(bugFixTicket)
      mockCrServiceInstance.updateCRStatus.mockResolvedValue(true)

      const result = await crHandlers.handleUpdateCRStatus(mockProject, 'MDT-001', 'Implemented')

      expect(result).toContain('The CR has been marked as implemented.')
      expect(result).toContain('Consider deleting this bug fix CR after verification period.')
    })

    it('should throw protocol error for invalid CR key', async () => {
      await expect(crHandlers.handleUpdateCRStatus(mockProject, 'INVALID', 'Approved'))
        .rejects
        .toThrow(ToolError)
    })

    it('should throw protocol error for invalid status', async () => {
      await expect(crHandlers.handleUpdateCRStatus(mockProject, 'MDT-001', 'InvalidStatus' as CRStatus))
        .rejects
        .toThrow(ToolError)
    })
  })

  describe('handleUpdateCRAttrs', () => {
    it('should update attributes and return confirmation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.updateCRAttrs.mockResolvedValue(true)

      const attributes = {
        priority: 'High',
        phaseEpic: 'Phase 2',
        assignee: 'senior-dev',
      }

      const result = await crHandlers.handleUpdateCRAttrs(mockProject, 'MDT-001', attributes)

      expect(result).toContain('Updated CR MDT-001 Attributes')
      expect(result).toContain('- Title: Test CR Title')
      expect(result).toContain('- Status: Proposed')
      expect(result).toContain('**Updated Fields:**')
      expect(result).toContain('- priority: High')
      expect(result).toContain('- phaseEpic: Phase 2')
      expect(result).toContain('- assignee: senior-dev')
    })

    it('should throw error when CR not found', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(null)

      await expect(crHandlers.handleUpdateCRAttrs(mockProject, 'MDT-999', { priority: 'High' }))
        .rejects
        .toThrow('CR \'MDT-999\' not found')
    })

    it('should throw error when update fails', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.updateCRAttrs.mockResolvedValue(false)

      await expect(crHandlers.handleUpdateCRAttrs(mockProject, 'MDT-001', { priority: 'High' }))
        .rejects
        .toThrow('Failed to update CR \'MDT-001\' attributes')
    })
  })

  describe('handleDeleteCR', () => {
    it('should delete CR and return confirmation', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.deleteCR.mockResolvedValue(true)

      const result = await crHandlers.handleDeleteCR(mockProject, 'MDT-001')

      expect(result).toContain('Deleted CR MDT-001')
      expect(result).toContain('- Title: Test CR Title')
      expect(result).toContain('- Type: Feature Enhancement')
      expect(result).toContain('- Status: Proposed')
    })

    it('should include special message for Bug Fix deletion', async () => {
      const bugFixTicket = { ...mockTicket, type: 'Bug Fix' }
      mockCrServiceInstance.getCR.mockResolvedValue(bugFixTicket)
      mockCrServiceInstance.deleteCR.mockResolvedValue(true)

      const result = await crHandlers.handleDeleteCR(mockProject, 'MDT-001')

      expect(result).toContain('The bug fix CR has been deleted')
      expect(result).toContain('Bug CRs are typically removed after successful implementation')
    })

    it('should throw error when CR not found', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(null)

      await expect(crHandlers.handleDeleteCR(mockProject, 'MDT-999'))
        .rejects
        .toThrow('CR \'MDT-999\' not found')
    })

    it('should throw error when deletion fails', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
      mockCrServiceInstance.deleteCR.mockResolvedValue(false)

      await expect(crHandlers.handleDeleteCR(mockProject, 'MDT-001'))
        .rejects
        .toThrow('Failed to delete CR \'MDT-001\'')
    })
  })

  describe('handleSuggestCRImprovements', () => {
    it('should return formatted suggestions', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)

      const suggestions = [
        {
          type: 'improvement',
          title: 'Expand Content',
          description: 'Add more details',
          actionable: true,
          priority: 'high' as const,
        },
        {
          type: 'improvement',
          title: 'Add Tests',
          description: 'Include test cases',
          actionable: true,
          priority: 'medium' as const,
        },
      ]

      mockTemplateService.suggestImprovements.mockReturnValue(suggestions)

      const result = await crHandlers.handleSuggestCRImprovements(mockProject, 'MDT-001')

      expect(result).toContain('CR Improvement Suggestions for MDT-001')
      expect(result).toContain('**Current CR:** Test CR Title')
      expect(result).toContain('High-Priority Improvement:')
      expect(result).toContain('1. **Expand Content**')
      expect(result).toContain('Add more details')
      expect(result).toContain('*Actionable:* Yes')
    })

    it('should categorize suggestions by priority', async () => {
      mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)

      const suggestions = [
        { type: 'improvement', title: 'S1', description: 'D1', actionable: true, priority: 'high' as const },
        { type: 'improvement', title: 'S2', description: 'D2', actionable: true, priority: 'high' as const },
        { type: 'improvement', title: 'S3', description: 'D3', actionable: true, priority: 'high' as const },
        { type: 'improvement', title: 'S4', description: 'D4', actionable: true, priority: 'medium' as const },
        { type: 'improvement', title: 'S5', description: 'D5', actionable: true, priority: 'medium' as const },
        { type: 'improvement', title: 'S6', description: 'D6', actionable: true, priority: 'medium' as const },
        { type: 'improvement', title: 'S7', description: 'D7', actionable: true, priority: 'low' as const },
        { type: 'improvement', title: 'S8', description: 'D8', actionable: true, priority: 'low' as const },
      ]

      mockTemplateService.suggestImprovements.mockReturnValue(suggestions)

      const result = await crHandlers.handleSuggestCRImprovements(mockProject, 'MDT-001')

      expect(result).toContain('High-Priority Improvement:')
      expect(result).toContain('Medium-Priority Improvement:')
      expect(result).toContain('Low-Priority Improvement:')
    })
  })
})
