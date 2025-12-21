/**
 * Ticket/CR Schema Business Rules Tests
 * Testing OUR rules, not Zod's functionality
 */

import {
  CRSchema,
  TicketSchema,
  CreateTicketInputSchema,
  UpdateTicketInputSchema,
} from '../schema';

describe('CRSchema', () => {
  // Testing OUR regex rule for code field
  describe('code format', () => {
    // Valid cases - our rule accepts these
    it('accepts MIN boundary (3 letters + 3 digits)', () => {
      expect(() => CRSchema.parse({
        code: 'ABC-123',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).not.toThrow();
    });

    it('accepts MAX boundary (4 letters + 4 digits)', () => {
      expect(() => CRSchema.parse({
        code: 'TEST-1234',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).not.toThrow();
    });

    it('accepts middle range (3-4 letters + 3-4 digits)', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).not.toThrow();

      expect(() => CRSchema.parse({
        code: 'API1-456',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Bug Fix',
        priority: 'High',
      })).not.toThrow();
    });

    // Invalid cases - our rule rejects these
    it('rejects below MIN (2 letters + 3 digits)', () => {
      expect(() => CRSchema.parse({
        code: 'AB-123',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow(/PREFIX-123/);
    });

    it('rejects above MAX (5+ letters)', () => {
      expect(() => CRSchema.parse({
        code: 'TOOLONG-123',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow();
    });

    it('rejects wrong format (lowercase letters)', () => {
      expect(() => CRSchema.parse({
        code: 'mdt-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow();
    });

    it('rejects wrong format (no dash)', () => {
      expect(() => CRSchema.parse({
        code: 'MDT101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow();
    });

    it('rejects wrong format (special chars in letters)', () => {
      expect(() => CRSchema.parse({
        code: 'MD_1-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow();
    });
  });

  // Testing OUR length rule for title field
  describe('title validation', () => {
    it('accepts MIN boundary (1 char)', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'A',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).not.toThrow();
    });

    it('accepts MAX boundary (200 chars)', () => {
      const longTitle = 'A'.repeat(200);
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: longTitle,
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).not.toThrow();
    });

    it('rejects above MAX (201+ chars)', () => {
      const tooLongTitle = 'A'.repeat(201);
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: tooLongTitle,
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow(/200 characters/);
    });

    it('trims whitespace from title', () => {
      const result = CRSchema.parse({
        code: 'MDT-101',
        title: '  Test Title  ',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      });
      expect(result.title).toBe('Test Title');
    });

    it('rejects empty/whitespace-only title', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: '   ',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      })).toThrow(/cannot be empty/);
    });
  });

  // Testing OUR design choice for optional fields
  describe('optional fields', () => {
    it('accepts missing optional fields', () => {
      const result = CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      });
      expect(result.phaseEpic).toBeUndefined();
      expect(result.impactAreas).toBeUndefined();
      expect(result.relatedTickets).toBeUndefined();
      expect(result.dependsOn).toBeUndefined();
      expect(result.blocks).toBeUndefined();
      expect(result.assignee).toBeUndefined();
      expect(result.content).toBeUndefined();
      expect(result.implementationDate).toBeUndefined();
      expect(result.implementationNotes).toBeUndefined();
    });

    it('accepts all optional fields', () => {
      const result = CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        phaseEpic: 'Phase 1',
        impactAreas: ['UI', 'API'],
        relatedTickets: 'MDT-100,MDT-102',
        dependsOn: 'MDT-099',
        blocks: 'MDT-103',
        assignee: 'test@example.com',
        content: '# Test Content',
        implementationDate: '2025-12-21',
        implementationNotes: 'Implemented successfully',
      });
      expect(result.phaseEpic).toBe('Phase 1');
      expect(result.impactAreas).toEqual(['UI', 'API']);
      expect(result.relatedTickets).toBe('MDT-100,MDT-102');
      expect(result.dependsOn).toBe('MDT-099');
      expect(result.blocks).toBe('MDT-103');
      expect(result.assignee).toBe('test@example.com');
      expect(result.content).toBe('# Test Content');
      expect(result.implementationDate).toBe('2025-12-21');
      expect(result.implementationNotes).toBe('Implemented successfully');
    });
  });

  // Testing OUR email validation rule
  describe('assignee email', () => {
    it('accepts valid email format', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        assignee: 'user@example.com',
      })).not.toThrow();
    });

    it('rejects invalid email format', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        assignee: 'not-an-email',
      })).toThrow(/Invalid email format/);
    });
  });

  // Testing OUR date format validation
  describe('implementationDate format', () => {
    it('accepts valid YYYY-MM-DD format', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Implemented',
        type: 'Feature Enhancement',
        priority: 'Medium',
        implementationDate: '2025-12-21',
      })).not.toThrow();
    });

    it('rejects invalid date format', () => {
      expect(() => CRSchema.parse({
        code: 'MDT-101',
        title: 'Test CR',
        status: 'Implemented',
        type: 'Feature Enhancement',
        priority: 'Medium',
        implementationDate: '21/12/2025',
      })).toThrow(/YYYY-MM-DD/);
    });
  });
});

describe('UpdateTicketInputSchema', () => {
  // Testing OUR rule: code is required for identification
  describe('code requirement', () => {
    it('requires code for identification', () => {
      expect(() => UpdateTicketInputSchema.parse({
        title: 'Updated Title',
      })).toThrow();
    });

    it('accepts valid code', () => {
      expect(() => UpdateTicketInputSchema.parse({
        code: 'MDT-101',
        title: 'Test', // Adding a field to update
      })).not.toThrow();
    });
  });

  // Testing OUR rule: at least one field to update
  describe('update fields requirement', () => {
    it('requires at least one field to update', () => {
      expect(() => UpdateTicketInputSchema.parse({
        code: 'MDT-101',
      })).toThrow(/At least one field/);
    });

    it('accepts single field update', () => {
      expect(() => UpdateTicketInputSchema.parse({
        code: 'MDT-101',
        title: 'New Title',
      })).not.toThrow();
    });

    it('accepts multiple field update', () => {
      expect(() => UpdateTicketInputSchema.parse({
        code: 'MDT-101',
        title: 'New Title',
        status: 'In Progress',
        priority: 'High',
      })).not.toThrow();
    });
  });

  // Testing that update fields are optional
  describe('optional update fields', () => {
    it('accepts any subset of fields', () => {
      const updates = [
        { code: 'MDT-101', title: 'New Title' },
        { code: 'MDT-101', status: 'In Progress' },
        { code: 'MDT-101', type: 'Bug Fix' },
        { code: 'MDT-101', priority: 'Critical' },
        { code: 'MDT-101', assignee: 'new@example.com' },
        { code: 'MDT-101', implementationDate: '2025-12-25' },
      ];

      updates.forEach(update => {
        expect(() => UpdateTicketInputSchema.parse(update)).not.toThrow();
      });
    });
  });
});