/**
 * MDT-095: Git Worktree Support - CRHandlers Worktree Tests
 *
 * Tests for MCP tool integration with worktree resolution in shared layer.
 *
 * After MDT-095 refactoring: Worktree resolution is now handled by the
 * shared TicketService, not CRHandlers. These tests verify that CRHandlers
 * correctly delegates to the shared layer and returns worktree metadata.
 *
 * @module mcp-server/src/tools/handlers/__tests__/crHandlers.worktree.test.ts
 */

import type { CRService } from '../../../services/crService.js'
import type { Project, Ticket } from '../../__tests__/test-fixtures.js'
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { createMockProject, createMockTicket, mockFileContent } from '../../__tests__/test-fixtures.js'

import { CRHandlers } from '../crHandlers.js'

// Mock dependencies
jest.mock('fs/promises')
jest.mock('../../../services/crService.js')

describe('CRHandlers - Worktree Integration (MDT-095)', () => {
  let crHandlers: CRHandlers
  let mockCrServiceInstance: jest.Mocked<CRService>

  const mockProject: Project = createMockProject({
    project: {
      ...createMockProject().project,
      description: 'Test project for MDT-095',
    },
  })

  const mockTicket: Ticket = createMockTicket()

  beforeEach(() => {
    jest.clearAllMocks()

    mockCrServiceInstance = {
      listCRs: jest.fn(),
      getCR: jest.fn(),
      createCR: jest.fn(),
      updateCRStatus: jest.fn(),
      updateCRAttrs: jest.fn(),
      deleteCR: jest.fn(),
      getNextCRNumber: jest.fn(),
    } as unknown as jest.Mocked<CRService>

    // Default mock responses
    mockCrServiceInstance.getCR.mockResolvedValue(mockTicket)
    mockCrServiceInstance.listCRs.mockResolvedValue([mockTicket])
    mockCrServiceInstance.createCR.mockResolvedValue(mockTicket)
    mockCrServiceInstance.updateCRStatus.mockResolvedValue(true)
    mockCrServiceInstance.updateCRAttrs.mockResolvedValue(true)
    mockCrServiceInstance.deleteCR.mockResolvedValue(true)

    MarkdownService.readFile = jest.fn().mockResolvedValue(mockFileContent) as unknown as typeof MarkdownService.readFile

    // eslint-disable-next-line ts/no-explicit-any -- Mock service instances
    const titleService: any = {}
    // eslint-disable-next-line ts/no-explicit-any -- Mock service instances
    const templateService: any = {
      validateTicketData: jest.fn().mockReturnValue({ valid: true }),
      suggestImprovements: jest.fn().mockReturnValue([]),
    }

    // Note: WorktreeService is NO LONGER passed to CRHandlers (MDT-095)
    // Worktree resolution now happens in the shared TicketService layer
    crHandlers = new CRHandlers(
      mockCrServiceInstance,
      MarkdownService as unknown as typeof MarkdownService,
      titleService,
      templateService,
    )

    process.env.MCP_SANITIZATION_ENABLED = 'false'
  })

  afterEach(() => {
    delete process.env.MCP_SANITIZATION_ENABLED
  })

  describe('MDT-095: Worktree resolution in shared layer', () => {
    it('should delegate getCR to shared service (which handles worktree resolution)', async () => {
      const ticketInWorktree = {
        ...mockTicket,
        inWorktree: true,
        worktreePath: '/test/worktrees/MDT-001',
      }
      mockCrServiceInstance.getCR.mockResolvedValue(ticketInWorktree)

      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'full')

      // Verify CRHandlers delegates to shared service
      expect(mockCrServiceInstance.getCR).toHaveBeenCalledWith(mockProject, 'MDT-001')
      expect(result).toBeDefined()
    })

    it('should include worktree metadata in metadata mode response', async () => {
      const ticketInWorktree = {
        ...mockTicket,
        inWorktree: true,
        worktreePath: '/test/worktrees/MDT-001',
        filePath: '/test/worktrees/MDT-001/docs/CRs/MDT-001-test.md',
      }
      mockCrServiceInstance.getCR.mockResolvedValue(ticketInWorktree)

      const result = await crHandlers.handleGetCR(mockProject, 'MDT-001', 'metadata')

      expect(result).toBeDefined()
      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('filePath')
      expect(parsed.filePath).toContain('/test/worktrees/MDT-001')
    })

    it('should delegate createCR to shared service', async () => {
      const createdTicket = {
        ...mockTicket,
        code: 'MDT-095',
        inWorktree: true,
        worktreePath: '/test/worktrees/MDT-095',
      }
      mockCrServiceInstance.createCR.mockResolvedValue(createdTicket)

      const result = await crHandlers.handleCreateCR(mockProject, 'Feature Enhancement', {
        title: 'New CR',
        priority: 'Medium',
      })

      expect(mockCrServiceInstance.createCR).toHaveBeenCalledWith(
        mockProject,
        'Feature Enhancement',
        expect.objectContaining({ title: 'New CR' }),
      )
      expect(result).toContain('Created CR MDT-095')
    })

    it('should delegate updateCRStatus to shared service', async () => {
      const result = await crHandlers.handleUpdateCRStatus(mockProject, 'MDT-001', 'Approved')

      expect(mockCrServiceInstance.updateCRStatus).toHaveBeenCalledWith(
        mockProject,
        'MDT-001',
        'Approved',
      )
      expect(result).toContain('Updated CR MDT-001')
    })

    it('should delegate updateCRAttrs to shared service', async () => {
      const result = await crHandlers.handleUpdateCRAttrs(
        mockProject,
        'MDT-001',
        { priority: 'High' },
      )

      expect(mockCrServiceInstance.updateCRAttrs).toHaveBeenCalledWith(
        mockProject,
        'MDT-001',
        { priority: 'High' },
      )
      expect(result).toContain('Updated CR MDT-001')
    })

    it('should delegate deleteCR to shared service', async () => {
      const result = await crHandlers.handleDeleteCR(mockProject, 'MDT-001')

      expect(mockCrServiceInstance.deleteCR).toHaveBeenCalledWith(mockProject, 'MDT-001')
      expect(result).toContain('Deleted CR MDT-001')
    })
  })

  describe('handleListCRs - inWorktree flag', () => {
    it('should show inWorktree status from shared service', async () => {
      const tickets: Ticket[] = [
        { ...mockTicket, code: 'MDT-001', title: 'In Main', inWorktree: false },
        { ...mockTicket, code: 'MDT-095', title: 'In Worktree', inWorktree: true },
      ]

      mockCrServiceInstance.listCRs.mockResolvedValue(tickets)

      const result = await crHandlers.handleListCRs(mockProject)

      expect(result).toBeDefined()
      expect(result).toContain('In Worktree: true')
      expect(result).toContain('In Worktree: false')
    })
  })
})
