/**
 * Tests for TicketMutationService
 * MDT-145: Consumer-facing ticket mutation with atomic operations
 *
 * These tests verify:
 * - Set/add/remove attr operation semantics
 * - Atomic persistence behavior
 * - Structured write results
 * - Validation failure handling
 */

import { CRStatus, CRType, CRPriority } from '@mdt/domain-contracts'
import type { Ticket } from '@mdt/domain-contracts'
import type { Project } from '../../../models/Project'
import { ServiceError } from '../../ServiceError'
import { TicketMutationService, type MutationResult, type AttrMutationRequest } from '../TicketMutationService'

// Mock TicketService
const mockTicketService = {
  getCR: jest.fn(),
  updateCRAttrs: jest.fn(),
}

// Mock ProjectService
const mockProjectService = {
  getProjectByCodeOrId: jest.fn(),
}

const mockProject: Project = {
  id: 'test-project-id',
  project: {
    id: 'test-project-id',
    name: 'Test Project',
    code: 'TEST',
    path: '/projects/test',
    configFile: '/projects/test/.mdt-config.toml',
    active: true,
    description: 'A test project',
    repository: 'https://github.com/test/test',
    ticketsPath: 'docs/CRs',
  },
  metadata: {
    dateRegistered: '2024-01-01',
    lastAccessed: '2024-01-01',
    version: '1.0.0',
  },
}

describe('TicketMutationService', () => {
  let service: TicketMutationService

  const mockTicket: Ticket = {
    code: 'TEST-001',
    title: 'Test Ticket',
    status: CRStatus.PROPOSED,
    type: CRType.FEATURE_ENHANCEMENT,
    priority: CRPriority.MEDIUM,
    relatedTickets: ['TEST-002'],
    dependsOn: [],
    blocks: [],
    filePath: '/projects/test/docs/CRs/TEST-001.md',
    dateCreated: null,
    lastModified: null,
    content: '',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockProjectService.getProjectByCodeOrId.mockResolvedValue(mockProject)
    service = new TicketMutationService(
      mockTicketService as unknown as never,
      mockProjectService as unknown as never,
    )
  })

  describe('mutateAttrs', () => {
    it('should apply replace operation for scalar fields', async () => {
      const updatedTicket: Ticket = {
        ...mockTicket,
        title: 'Updated Title',
        priority: CRPriority.HIGH,
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'Updated Title' },
          { field: 'priority', op: 'replace', value: 'High' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.ticket?.title).toBe('Updated Title')
        expect(result.ticket?.priority).toBe(CRPriority.HIGH)
      }
    })

    it('should apply add operation for relation fields', async () => {
      const updatedTicket: Ticket = {
        ...mockTicket,
        relatedTickets: ['TEST-002', 'TEST-003'],
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'relatedTickets', op: 'add', value: 'TEST-003' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.ticket?.relatedTickets).toContain('TEST-003')
      }
    })

    it('should apply remove operation for relation fields', async () => {
      const ticketWithRelations: Ticket = {
        ...mockTicket,
        relatedTickets: ['TEST-002', 'TEST-003'],
      }
      const updatedTicket: Ticket = {
        ...mockTicket,
        relatedTickets: ['TEST-003'],
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(ticketWithRelations) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'relatedTickets', op: 'remove', value: 'TEST-002' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.ticket?.relatedTickets).not.toContain('TEST-002')
      }
    })

    it('should reject add/remove for non-relation fields', async () => {
      mockTicketService.getCR.mockResolvedValue(mockTicket)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'add', value: 'Extra Title' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('INVALID_OPERATION')
        expect(result.error.message).toMatch(/add.*relation/)
      }
    })

    it('should apply multiple operations atomically', async () => {
      const ticketWithRelations: Ticket = {
        ...mockTicket,
        relatedTickets: ['TEST-002'],
        dependsOn: ['TEST-010'],
      }
      const updatedTicket: Ticket = {
        ...mockTicket,
        title: 'Updated',
        relatedTickets: ['TEST-003'],
        dependsOn: [],
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(ticketWithRelations) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'Updated' },
          { field: 'relatedTickets', op: 'add', value: 'TEST-003' },
          { field: 'relatedTickets', op: 'remove', value: 'TEST-002' },
          { field: 'dependsOn', op: 'remove', value: 'TEST-010' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      // All operations should be applied in single update
      expect(mockTicketService.updateCRAttrs).toHaveBeenCalledTimes(1)
    })

    it('should not persist on validation failure', async () => {
      mockTicketService.getCR.mockResolvedValue(mockTicket)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'add', value: 'Invalid' }, // Invalid: add on scalar
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(false)
      expect(mockTicketService.updateCRAttrs).not.toHaveBeenCalled()
    })
  })

  describe('structured results', () => {
    it('should return MutationResult with target ticket info', async () => {
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(mockTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'New Title' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result).toMatchObject<Partial<MutationResult>>({
        success: true,
        ticketKey: 'TEST-001',
        projectKey: 'TEST',
      })
    })

    it('should return normalized input values in result', async () => {
      const updatedTicket: Ticket = {
        ...mockTicket,
        title: 'Trimmed Title',
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: '  Trimmed Title  ' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.normalizedInputs?.title).toBe('Trimmed Title')
      }
    })

    it('should return persisted file path in result', async () => {
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(mockTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'New' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.filePath).toBeDefined()
      }
    })

    it('should return changed fields in result', async () => {
      const updatedTicket: Ticket = {
        ...mockTicket,
        title: 'New Title',
        priority: CRPriority.HIGH,
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(updatedTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'New Title' },
          { field: 'priority', op: 'replace', value: 'High' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.changedFields).toContain('title')
        expect(result.changedFields).toContain('priority')
      }
    })
  })

  describe('error handling', () => {
    it('should return structured error for missing ticket', async () => {
      mockTicketService.getCR.mockResolvedValue(null)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-999',
        operations: [
          { field: 'title', op: 'replace', value: 'New' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('TICKET_NOT_FOUND')
      }
    })

    it('should return structured error for missing project', async () => {
      mockProjectService.getProjectByCodeOrId.mockResolvedValue(null)

      const request: AttrMutationRequest = {
        projectKey: 'MISSING',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'New' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('PROJECT_NOT_FOUND')
        expect(result.error.details).toMatchObject({ identifier: 'MISSING' })
      }
    })

    it('should return structured error for persistence failure', async () => {
      mockTicketService.getCR.mockResolvedValue(mockTicket)
      mockTicketService.updateCRAttrs.mockRejectedValue(new Error('Disk full'))

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: 'New' },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('PERSISTENCE_ERROR')
      }
    })
  })

  describe('relation field validation', () => {
    it('should allow add/remove on relatedTickets', async () => {
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(mockTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'relatedTickets', op: 'add', value: 'TEST-005' },
        ],
      }

      const result = await service.mutateAttrs(request)
      expect(result.success).toBe(true)
    })

    it('should allow add/remove on dependsOn', async () => {
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(mockTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'dependsOn', op: 'add', value: 'TEST-010' },
        ],
      }

      const result = await service.mutateAttrs(request)
      expect(result.success).toBe(true)
    })

    it('should allow add/remove on blocks', async () => {
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket) // Initial fetch
        .mockResolvedValueOnce(mockTicket) // Refetch after update
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'blocks', op: 'add', value: 'TEST-020' },
        ],
      }

      const result = await service.mutateAttrs(request)
      expect(result.success).toBe(true)
    })

    it('should reject add/remove on status field', async () => {
      mockTicketService.getCR.mockResolvedValue(mockTicket)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'status', op: 'add', value: 'Implemented' },
        ],
      }

      const result = await service.mutateAttrs(request)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_OPERATION')
      }
    })

    it('should treat shell-like user input as literal data', async () => {
      const literalValue = '$(rm -rf /tmp/demo) && echo hacked'
      const updatedTicket: Ticket = {
        ...mockTicket,
        title: literalValue,
      }
      mockTicketService.getCR
        .mockResolvedValueOnce(mockTicket)
        .mockResolvedValueOnce(updatedTicket)
      mockTicketService.updateCRAttrs.mockResolvedValue(true)

      const request: AttrMutationRequest = {
        projectKey: 'TEST',
        ticketKey: 'TEST-001',
        operations: [
          { field: 'title', op: 'replace', value: literalValue },
        ],
      }

      const result = await service.mutateAttrs(request)

      expect(mockTicketService.updateCRAttrs).toHaveBeenCalledWith(
        mockProject,
        'TEST-001',
        { title: literalValue },
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.normalizedInputs?.title).toBe(literalValue)
        expect(result.ticket.title).toBe(literalValue)
      }
    })
  })
})
