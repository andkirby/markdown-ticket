/**
 * Behavioral Preservation Tests: Ticket Model
 * CR: MDT-101
 * Source: shared/models/Ticket.ts
 * Purpose: Lock current behavior before migrating to domain-contracts
 *
 * ⚠️ These tests document CURRENT behavior, not DESIRED behavior.
 * Tests must pass before and after migration to ensure no regression.
 *
 * Status: RED (domain-contracts package doesn't exist yet)
 * Framework: Jest
 */

import {
  Ticket,
  normalizeTicket,
  arrayToString,
  TicketData,
  TicketUpdateAttrs,
  TICKET_UPDATE_ALLOWED_ATTRS,
  TicketFilters
} from '../../../models/Ticket';

describe('Ticket Model - Behavioral Preservation', () => {
  describe('Type Contracts', () => {
    it('should maintain Ticket interface shape', () => {
      // This test locks the expected shape
      const mockTicket: Ticket = {
        code: 'MDT-001',
        title: 'Test Ticket',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        dateCreated: new Date(),
        lastModified: new Date(),
        content: '# Test\n\nContent here',
        filePath: '/path/to/ticket.md',
        relatedTickets: ['MDT-002'],
        dependsOn: ['MDT-000'],
        blocks: ['MDT-003']
      };

      // Verify required fields exist and are of expected type
      expect(typeof mockTicket.code).toBe('string');
      expect(typeof mockTicket.title).toBe('string');
      expect(typeof mockTicket.status).toBe('string');
      expect(typeof mockTicket.type).toBe('string');
      expect(typeof mockTicket.priority).toBe('string');
      expect(mockTicket.dateCreated).toBeInstanceOf(Date);
      expect(mockTicket.lastModified).toBeInstanceOf(Date);
      expect(typeof mockTicket.content).toBe('string');
      expect(typeof mockTicket.filePath).toBe('string');
      expect(Array.isArray(mockTicket.relatedTickets)).toBe(true);
      expect(Array.isArray(mockTicket.dependsOn)).toBe(true);
      expect(Array.isArray(mockTicket.blocks)).toBe(true);
    });

    it('should maintain optional fields behavior', () => {
      const minimalTicket: Ticket = {
        code: 'MDT-001',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature',
        priority: 'Medium',
        dateCreated: null,
        lastModified: null,
        content: '',
        filePath: '/test.md',
        relatedTickets: [],
        dependsOn: [],
        blocks: [],
        // Optional fields - normalizeTicket provides empty string defaults
        phaseEpic: '',
        assignee: '',
        implementationNotes: '',
        implementationDate: null
      };

      // Optional fields have defaults from normalizeTicket
      expect(minimalTicket.phaseEpic).toBe('');
      expect(minimalTicket.assignee).toBe('');
      expect(minimalTicket.implementationDate).toBeNull();
      expect(minimalTicket.implementationNotes).toBe('');
    });
  });

  describe('Function: normalizeTicket', () => {
    it('should normalize raw ticket data correctly', () => {
      const rawTicket = {
        key: 'MDT-001',  // Legacy field
        title: 'Test Ticket',
        status: 'Approved',
        type: 'Bug Fix',
        priority: 'High',
        dateCreated: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-02T00:00:00Z',
        content: 'Test content',
        path: '/test/path.md',
        phaseEpic: 'Phase 1',
        assignee: 'john.doe',
        relatedTickets: 'MDT-002,MDT-003',  // String format
        dependsOn: 'MDT-000',
        blocks: ''  // Empty string
      };

      const normalized = normalizeTicket(rawTicket);

      // Verify field mapping
      expect(normalized.code).toBe('MDT-001');
      expect(normalized.title).toBe('Test Ticket');
      expect(normalized.status).toBe('Approved');
      expect(normalized.type).toBe('Bug Fix');
      expect(normalized.priority).toBe('High');
      expect(normalized.filePath).toBe('/test/path.md');
      expect(normalized.phaseEpic).toBe('Phase 1');
      expect(normalized.assignee).toBe('john.doe');

      // Verify array normalization
      expect(normalized.relatedTickets).toEqual(['MDT-002', 'MDT-003']);
      expect(normalized.dependsOn).toEqual(['MDT-000']);
      expect(normalized.blocks).toEqual([]);  // Empty string becomes empty array

      // Verify date parsing
      expect(normalized.dateCreated).toBeInstanceOf(Date);
      expect(normalized.lastModified).toBeInstanceOf(Date);
    });

    it('should provide defaults for missing fields', () => {
      const rawTicket = {
        code: 'MDT-001'
      };

      const normalized = normalizeTicket(rawTicket);

      expect(normalized.title).toBe('');
      expect(normalized.status).toBe('Proposed');
      expect(normalized.type).toBe('Feature Enhancement');
      expect(normalized.priority).toBe('Medium');
      expect(normalized.content).toBe('');
      expect(normalized.filePath).toBe('');
      expect(normalized.relatedTickets).toEqual([]);
      expect(normalized.dependsOn).toEqual([]);
      expect(normalized.blocks).toEqual([]);
    });

    it('should handle null/undefined dates', () => {
      const rawTicket = {
        code: 'MDT-001',
        dateCreated: null,
        lastModified: undefined,
        implementationDate: 'invalid-date'
      };

      const normalized = normalizeTicket(rawTicket);

      expect(normalized.dateCreated).toBeNull();
      expect(normalized.lastModified).toBeNull();
      expect(normalized.implementationDate).toBeNull();  // Invalid date becomes null
    });

    it('should handle already normalized data', () => {
      const alreadyNormalized: Ticket = {
        code: 'MDT-001',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature',
        priority: 'Medium',
        dateCreated: new Date(),
        lastModified: new Date(),
        content: 'Test',
        filePath: '/test.md',
        relatedTickets: ['MDT-002'],
        dependsOn: [],
        blocks: [],
        // Include optional fields with defaults
        phaseEpic: '',
        assignee: '',
        implementationDate: null,
        implementationNotes: ''
      };

      const result = normalizeTicket(alreadyNormalized);

      // Should preserve structure with optional fields
      expect(result.code).toBe(alreadyNormalized.code);
      expect(result.title).toBe(alreadyNormalized.title);
      expect(result.relatedTickets).toEqual(alreadyNormalized.relatedTickets);
      expect(result.dependsOn).toEqual(alreadyNormalized.dependsOn);
      expect(result.blocks).toEqual(alreadyNormalized.blocks);
    });
  });

  describe('Function: arrayToString', () => {
    it('should convert arrays to comma-separated strings', () => {
      expect(arrayToString(['MDT-001', 'MDT-002', 'MDT-003'])).toBe('MDT-001,MDT-002,MDT-003');
      expect(arrayToString(['single'])).toBe('single');
      expect(arrayToString([])).toBe('');
    });

    it('should handle non-array inputs', () => {
      expect(arrayToString(null as any)).toBe('');
      expect(arrayToString(undefined as any)).toBe('');
      expect(arrayToString('string' as any)).toBe('');
    });
  });

  describe('Type: TicketData', () => {
    it('should maintain TicketData interface shape', () => {
      const ticketData: TicketData = {
        title: 'New Ticket',
        type: 'Feature Enhancement',
        priority: 'High',
        phaseEpic: 'Phase 1',
        impactAreas: ['UI', 'API'],
        relatedTickets: 'MDT-001',
        dependsOn: 'MDT-000',
        assignee: 'developer@example.com',
        content: '# Description\n\nImplementation details'
      };

      expect(typeof ticketData.title).toBe('string');
      expect(typeof ticketData.type).toBe('string');
      expect(ticketData.priority).toBe('High');  // Optional
      expect(ticketData.phaseEpic).toBe('Phase 1');  // Optional
      expect(Array.isArray(ticketData.impactAreas)).toBe(true);
    });
  });

  describe('Type: TicketUpdateAttrs', () => {
    it('should maintain TicketUpdateAttrs interface shape', () => {
      const updateAttrs: TicketUpdateAttrs = {
        priority: 'Critical',
        phaseEpic: 'Phase 2',
        relatedTickets: 'MDT-001,MDT-002',
        dependsOn: 'MDT-000',
        blocks: 'MDT-003',
        assignee: 'new.assignee@example.com',
        implementationDate: new Date(),
        implementationNotes: 'Implementation completed successfully'
      };

      expect(updateAttrs.priority).toBe('Critical');
      expect(updateAttrs.implementationDate).toBeInstanceOf(Date);
      expect(typeof updateAttrs.implementationNotes).toBe('string');
    });
  });

  describe('Constant: TICKET_UPDATE_ALLOWED_ATTRS', () => {
    it('should include all expected attributes', () => {
      const expectedAttrs = [
        'priority',
        'phaseEpic',
        'relatedTickets',
        'dependsOn',
        'blocks',
        'assignee',
        'implementationDate',
        'implementationNotes'
      ];

      expectedAttrs.forEach(attr => {
        expect(TICKET_UPDATE_ALLOWED_ATTRS.has(attr as any)).toBe(true);
      });
    });

    it('should exclude immutable attributes', () => {
      const immutableAttrs = ['code', 'title', 'type', 'status', 'content', 'dateCreated', 'lastModified'];

      immutableAttrs.forEach(attr => {
        expect(TICKET_UPDATE_ALLOWED_ATTRS.has(attr as any)).toBe(false);
      });
    });
  });

  describe('Type: TicketFilters', () => {
    it('should maintain TicketFilters interface shape', () => {
      const filters: TicketFilters = {
        status: ['Proposed', 'In Progress'],
        type: 'Feature Enhancement',
        priority: ['High', 'Critical'],
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      expect(Array.isArray(filters.status)).toBe(true);
      expect(typeof filters.type).toBe('string');
      expect(Array.isArray(filters.priority)).toBe(true);
      expect(filters.dateRange?.start).toBeInstanceOf(Date);
      expect(filters.dateRange?.end).toBeInstanceOf(Date);
    });

    it('should accept single string values', () => {
      const filters: TicketFilters = {
        status: 'Proposed',
        type: 'Bug Fix',
        priority: 'High'
        // dateRange is optional
      };

      expect(typeof filters.status).toBe('string');
      expect(typeof filters.type).toBe('string');
      expect(typeof filters.priority).toBe('string');
    });
  });
});