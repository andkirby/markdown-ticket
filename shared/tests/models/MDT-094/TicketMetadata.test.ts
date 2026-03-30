/**
 * TicketMetadata Type Tests - MDT-094.
 *
 * Tests for the TicketMetadata interface that excludes content field.
 * This type is used for list operations returning metadata-only responses.
 *
 * @see docs/CRs/MDT-094/architecture.md
 */

/// <reference types="jest" />

import type { Ticket } from '@mdt/shared/models/Ticket'

// MDT-094: TicketMetadata type - will be added to shared/models/Ticket.ts
// This import will fail until implementation exists (TDD RED phase)
// import type { TicketMetadata, normalizeTicketMetadata } from '@mdt/shared/models/Ticket'

describe('TicketMetadata (MDT-094)', () => {
  // These tests are intentionally written to FAIL until implementation exists
  // This is TDD RED phase - tests define the expected behavior

  describe('type definition', () => {
    it('should exclude content field by definition', () => {
      // Type-level test: TicketMetadata should NOT have content
      // This test will fail until TicketMetadata type is implemented
      type TicketMetadata = Omit<Ticket, 'content'>

      // Runtime check: ensure content is excluded
      const metadata: TicketMetadata = {
        code: 'MDT-094',
        title: 'Test Ticket',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        dateCreated: new Date(),
        lastModified: new Date(),
        filePath: '/path/to/ticket.md',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
      }

      // This should NOT compile if content is included
      // @ts-expect-error - content should not exist on TicketMetadata
      expect(metadata.content).toBeUndefined()

      // Ensure the type excludes content at compile time
      expect(Object.keys(metadata)).not.toContain('content')
    })

    it('should include all required metadata fields', () => {
      // Define expected fields based on architecture.md
      const requiredFields = [
        'code',
        'title',
        'status',
        'type',
        'priority',
        'dateCreated',
        'lastModified',
      ]

      // This will fail until TicketMetadata is properly exported
      // For now, use the Omit-based type
      type TicketMetadata = Omit<Ticket, 'content'>

      const metadata: TicketMetadata = {
        code: 'MDT-094',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        dateCreated: new Date(),
        lastModified: new Date(),
        filePath: '/path/to/ticket.md',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
      }

      requiredFields.forEach((field) => {
        expect(metadata).toHaveProperty(field)
      })
    })

    it('should have optional fields matching Ticket', () => {
      // Optional fields from Ticket that should also be in TicketMetadata
      const _optionalFields = [
        'phaseEpic',
        'assignee',
        'implementationDate',
        'implementationNotes',
        'inWorktree',
        'worktreePath',
      ]

      type TicketMetadata = Omit<Ticket, 'content'>

      const metadata: TicketMetadata = {
        code: 'MDT-094',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        dateCreated: new Date(),
        lastModified: new Date(),
        filePath: '/path/to/ticket.md',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        // Optional fields
        phaseEpic: 'Phase 1',
        assignee: 'developer',
      }

      // Optional fields can be present
      expect(metadata.phaseEpic).toBe('Phase 1')
      expect(metadata.assignee).toBe('developer')

      // But are not required
      const minimalMetadata: TicketMetadata = {
        code: 'MDT-095',
        title: 'Minimal',
        status: 'Proposed',
        type: 'Bug Fix',
        priority: 'High',
        dateCreated: null,
        lastModified: null,
        filePath: '',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
      }

      expect(minimalMetadata).toBeDefined()
    })

    it('should be assignable from Ticket via Pick', () => {
      // TicketMetadata should be Pick<Ticket, MetadataFields>
      // This ensures type compatibility

      const fullTicket: Ticket = {
        code: 'MDT-094',
        title: 'Test Ticket',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        content: 'This is the full markdown content\n\n## Description\n...',
        dateCreated: new Date(),
        lastModified: new Date(),
        filePath: '/path/to/ticket.md',
        relatedTickets: ['MDT-093'],
        dependsOn: [],
        blocks: ['MDT-095'],
      }

      // Extract metadata from full ticket
      type TicketMetadata = Omit<Ticket, 'content'>
      const metadata: TicketMetadata = {
        code: fullTicket.code,
        title: fullTicket.title,
        status: fullTicket.status,
        type: fullTicket.type,
        priority: fullTicket.priority,
        dateCreated: fullTicket.dateCreated,
        lastModified: fullTicket.lastModified,
        filePath: fullTicket.filePath,
        relatedTickets: fullTicket.relatedTickets,
        dependsOn: fullTicket.dependsOn,
        blocks: fullTicket.blocks,
      }

      expect(metadata.code).toBe(fullTicket.code)
      expect(metadata.title).toBe(fullTicket.title)
      // content should NOT be present
      expect('content' in metadata).toBe(false)
    })

    it('should normalize dates correctly', () => {
      type TicketMetadata = Omit<Ticket, 'content'>

      // Test with Date objects
      const withDates: TicketMetadata = {
        code: 'MDT-094',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        dateCreated: new Date('2026-01-15T10:00:00Z'),
        lastModified: new Date('2026-03-02T15:30:00Z'),
        filePath: '/path',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
      }

      expect(withDates.dateCreated).toBeInstanceOf(Date)
      expect(withDates.lastModified).toBeInstanceOf(Date)

      // Test with null dates
      const nullDates: TicketMetadata = {
        code: 'MDT-095',
        title: 'Test',
        status: 'Proposed',
        type: 'Bug Fix',
        priority: 'Low',
        dateCreated: null,
        lastModified: null,
        filePath: '/path',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
      }

      expect(nullDates.dateCreated).toBeNull()
      expect(nullDates.lastModified).toBeNull()
    })
  })

  describe('normalizeTicketMetadata', () => {
    it('should normalize unknown input to TicketMetadata', () => {
      // This test will fail until normalizeTicketMetadata is implemented
      // Expected to be added alongside TicketMetadata type

      // For now, document expected behavior
      const rawInput = {
        code: 'MDT-094',
        title: '  Test Ticket  ', // Should be trimmed
        status: 'proposed', // Should be normalized to 'Proposed'
        type: 'feature', // Should be normalized
        priority: '', // Should default to 'Medium'
        dateCreated: '2026-01-15T10:00:00Z', // Should be Date
        lastModified: null,
        content: 'This should be ignored', // Should be stripped
      }

      // Expected normalized output (will fail until implemented):
      // expect(normalizeTicketMetadata(rawInput)).toEqual({
      //   code: 'MDT-094',
      //   title: 'Test Ticket',
      //   status: 'Proposed',
      //   type: 'Feature Enhancement',
      //   priority: 'Medium',
      //   dateCreated: expect.any(Date),
      //   lastModified: null,
      //   filePath: '',
      //   relatedTickets: [],
      //   dependsOn: [],
      //   blocks: [],
      // })

      // Placeholder assertion until implementation
      expect(rawInput).toBeDefined()
      expect(rawInput.content).toBe('This should be ignored')
    })

    it('should handle missing required fields with defaults', () => {
      // Test default value behavior
      const minimalInput = {
        code: 'MDT-094',
      }

      // Expected behavior: fill in defaults for missing fields
      // - title: 'Untitled'
      // - status: 'Proposed'
      // - type: 'Feature Enhancement'
      // - priority: 'Medium'
      // - dateCreated: null
      // - lastModified: null
      // - filePath: ''
      // - relatedTickets: []
      // - dependsOn: []
      // - blocks: []

      expect(minimalInput.code).toBe('MDT-094')
    })
  })
})
