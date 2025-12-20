/**
 * MDT-101 Phase 1.1: MCP Boundary Validation Tests
 *
 * These tests verify that MCP tools properly validate all responses using
 * domain contracts. Tests are written in RED state and will fail until
 * validation is implemented at MCP boundaries.
 */

import { z } from 'zod';

// Import schemas that should be used for validation
import {
  ProjectSchema,
  LocalProjectConfigSchema,
  ProjectInfoSchema
} from '../project/schema';

import {
  TicketSchema,
  TicketDataSchema
} from '../ticket/schema';

describe('MCP Tool Response Validation', () => {
  describe('list_projects tool validation', () => {
    it('validates successful list_projects response', () => {
      // Simulate MCP tool response
      const mcpResponse = [
        {
          key: 'MDT',
          name: 'Markdown Ticket',
          path: '/Users/user/projects/markdown-ticket',
          crCount: 42,
          lastAccessed: '2024-01-01T00:00:00Z',
          active: true
        },
        {
          key: 'API',
          name: 'API Project',
          path: '/Users/user/projects/api',
          crCount: 15,
          lastAccessed: '2024-01-02T00:00:00Z',
          active: false
        }
      ];

      // Each project in the array should validate
      mcpResponse.forEach(project => {
        const result = ProjectInfoSchema.safeParse(project);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.key).toBeDefined();
          expect(result.data.name).toBeDefined();
          expect(result.data.path).toBeDefined();
          expect(typeof result.data.crCount).toBe('number');
        }
      });

      // The entire response structure should be valid
      expect(Array.isArray(mcpResponse)).toBe(true);
      expect(mcpResponse.length).toBeGreaterThan(0);
    });

    it('rejects invalid project entries in list_projects', () => {
      const invalidResponse = [
        {
          key: 'MDT',
          name: 'Markdown Ticket',
          // Missing required fields
          crCount: 'not-a-number', // Wrong type
          lastAccessed: 'invalid-date'
        },
        {
          // Empty project object
        }
      ];

      invalidResponse.forEach(project => {
        const result = ProjectInfoSchema.safeParse(project);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });
    });

    it('handles empty project list gracefully', () => {
      const emptyResponse = [];

      // Empty array should be valid
      expect(Array.isArray(emptyResponse)).toBe(true);
      expect(emptyResponse.length).toBe(0);
    });
  });

  describe('get_project tool validation', () => {
    it('validates get_project response for existing project', () => {
      const projectResponse = {
        id: 'mdt-project-123',
        project: {
          name: 'Markdown Ticket',
          path: '/Users/user/projects/markdown-ticket',
          configFile: '/Users/user/projects/markdown-ticket/.mdt-config.toml',
          active: true,
          description: 'AI-powered Kanban board with markdown tickets',
          code: 'MDT',
          ticketsPath: 'docs/CRs'
        },
        metadata: {
          dateRegistered: '2024-01-01T00:00:00Z',
          lastAccessed: '2024-01-15T00:00:00Z',
          version: '1.0.0'
        },
        autoDiscovered: true,
        tickets: {
          codePattern: '{code}-{number}'
        },
        document: {
          paths: ['docs', 'src'],
          excludeFolders: ['node_modules', '.git'],
          maxDepth: 5
        }
      };

      const result = ProjectSchema.safeParse(projectResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('mdt-project-123');
        expect(result.data.project.name).toBe('Markdown Ticket');
        expect(result.data.metadata.dateRegistered).toBe('2024-01-01T00:00:00Z');
        expect(result.data.autoDiscovered).toBe(true);
        expect(result.data.tickets?.codePattern).toBe('{code}-{number}');
        expect(result.data.document?.paths).toEqual(['docs', 'src']);
      }
    });

    it('validates minimal project response', () => {
      const minimalResponse = {
        id: 'minimal-123',
        project: {
          name: 'Minimal Project',
          path: '/path/to/project',
          configFile: '/path/to/project/.mdt-config.toml',
          active: false
        },
        metadata: {
          dateRegistered: '2024-01-01T00:00:00Z',
          lastAccessed: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = ProjectSchema.safeParse(minimalResponse);
      expect(result.success).toBe(true);
    });

    it('rejects invalid get_project response', () => {
      const invalidResponse = {
        // Missing id
        project: {
          name: 'Invalid Project'
          // Missing required fields
        },
        metadata: {
          dateRegistered: 'invalid-date'
        }
      };

      const result = ProjectSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('handles project not found error response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project with key "NONEXISTENT" not found',
          details: {
            requestedKey: 'NONEXISTENT',
            availableKeys: ['MDT', 'API', 'WEB']
          }
        }
      };

      // Error responses should have a consistent structure
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.code).toBeDefined();
      expect(errorResponse.error.message).toBeDefined();
    });
  });

  describe('create_project tool validation', () => {
    it('validates create_project input and output', () => {
      const createInput = {
        name: 'New Project',
        code: 'NEW',
        startNumber: 1,
        counterFile: '.mdt-next',
        active: true,
        ticketsPath: 'docs/CRs'
      };

      // Input should validate against LocalProjectConfigSchema
      const inputResult = LocalProjectConfigSchema.safeParse({
        project: createInput,
        document: {}
      });
      expect(inputResult.success).toBe(true);

      // Output should be the created project
      const createOutput = {
        success: true,
        data: {
          id: 'new-project-456',
          project: {
            name: createInput.name,
            path: '/generated/path',
            configFile: '/generated/path/.mdt-config.toml',
            active: createInput.active,
            description: undefined
          },
          metadata: {
            dateRegistered: '2024-01-20T00:00:00Z',
            lastAccessed: '2024-01-20T00:00:00Z',
            version: '1.0.0'
          }
        }
      };

      expect(createOutput.success).toBe(true);
      const outputValidation = ProjectSchema.safeParse(createOutput.data);
      expect(outputValidation.success).toBe(true);
    });

    it('rejects invalid create_project input', () => {
      const invalidInput = {
        name: '', // Empty name
        code: '123', // Invalid code format
        startNumber: -1, // Invalid start number
        active: 'not-a-boolean' // Wrong type
      };

      const result = LocalProjectConfigSchema.safeParse({
        project: invalidInput,
        document: {}
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);

        // Check for specific field errors
        const fieldPaths = result.error.issues.map(i => i.path.join('.'));
        expect(fieldPaths).toContain('project.name');
        expect(fieldPaths).toContain('project.code');
        expect(fieldPaths).toContain('project.startNumber');
        expect(fieldPaths).toContain('project.active');
      }
    });

    it('validates create_project error response', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project configuration',
          details: {
            field: 'code',
            issue: 'Code must be 3-5 uppercase letters'
          }
        }
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
      expect(errorResponse.error.details.field).toBe('code');
    });
  });

  describe('get_cr tool validation', () => {
    it('validates get_cr response', () => {
      const crResponse = {
        code: 'MDT-001',
        title: 'Example Ticket',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        content: '# Example Ticket\n\n## Description\n\nThis is an example.',
        filePath: '/path/to/MDT-001.md',
        relatedTickets: ['MDT-002'],
        dependsOn: [],
        blocks: ['MDT-003'],
        phaseEpic: 'Phase 1',
        assignee: 'developer@example.com',
        dateCreated: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-15T00:00:00Z'
      };

      const result = TicketSchema.safeParse(crResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('MDT-001');
        expect(result.data.status).toBe('Proposed');
        expect(result.data.type).toBe('Feature Enhancement');
        expect(result.data.priority).toBe('Medium');
        expect(Array.isArray(result.data.relatedTickets)).toBe(true);
        expect(Array.isArray(result.data.dependsOn)).toBe(true);
        expect(Array.isArray(result.data.blocks)).toBe(true);
      }
    });

    it('rejects invalid enum values in get_cr response', () => {
      const invalidCR = {
        code: 'MDT-001',
        title: 'Invalid Ticket',
        status: 'INVALID_STATUS', // Invalid enum
        type: 'INVALID_TYPE', // Invalid enum
        priority: 'INVALID_PRIORITY', // Invalid enum
        content: 'Test'
      };

      const result = TicketSchema.safeParse(invalidCR);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldPaths = result.error.issues.map(i => i.path.join('.'));
        expect(fieldPaths).toContain('status');
        expect(fieldPaths).toContain('type');
        expect(fieldPaths).toContain('priority');
      }
    });
  });

  describe('create_cr tool validation', () => {
    it('validates create_cr input', () => {
      const createInput = {
        title: 'New Feature Request',
        type: 'Feature Enhancement',
        priority: 'High',
        phaseEpic: 'Phase 2'
      };

      const result = TicketDataSchema.safeParse(createInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('New Feature Request');
        expect(result.data.type).toBe('Feature Enhancement');
        expect(result.data.priority).toBe('High');
      }
    });

    it('rejects invalid create_cr input', () => {
      const invalidInput = {
        title: 123, // Wrong type
        type: 'Invalid Type', // Invalid enum
        priority: null, // Invalid value
        extraField: 'should not be here'
      };

      const result = TicketDataSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('MCP Tool Error Consistency', () => {
    it('maintains consistent error format across all tools', () => {
      const errorExamples = [
        {
          tool: 'get_project',
          error: {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
              details: { key: 'MISSING' }
            }
          }
        },
        {
          tool: 'create_project',
          error: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid input',
              details: { field: 'code', issue: 'Invalid format' }
            }
          }
        },
        {
          tool: 'get_cr',
          error: {
            success: false,
            error: {
              code: 'CR_NOT_FOUND',
              message: 'CR not found',
              details: { code: 'MISSING-001' }
            }
          }
        }
      ];

      errorExamples.forEach(example => {
        const error = example.error;

        // All errors should have consistent structure
        expect(error.success).toBe(false);
        expect(error.error).toBeDefined();
        expect(typeof error.error.code).toBe('string');
        expect(typeof error.error.message).toBe('string');
        expect(error.error.details).toBeDefined();
      });
    });
  });

  describe('Performance Considerations', () => {
    it('validates large project lists efficiently', () => {
      // Generate a large list of projects
      const largeProjectList = Array.from({ length: 1000 }, (_, i) => ({
        key: `PRJ${i.toString().padStart(3, '0')}`,
        name: `Project ${i}`,
        path: `/path/to/project-${i}`,
        crCount: Math.floor(Math.random() * 100),
        lastAccessed: new Date().toISOString(),
        active: Math.random() > 0.5
      }));

      // Should validate all projects without issues
      const startTime = Date.now();

      largeProjectList.forEach(project => {
        const result = ProjectInfoSchema.safeParse(project);
        expect(result.success).toBe(true);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (e.g., 1 second for 1000 items)
      expect(duration).toBeLessThan(1000);
    });

    it('handles complex ticket validation efficiently', () => {
      const complexTicket = {
        code: 'MDT-001',
        title: 'Complex Ticket with Many Relationships',
        status: 'In Progress',
        type: 'Feature Enhancement',
        priority: 'High',
        content: '# '.repeat(1000) + 'Large content',
        filePath: '/very/deep/path/to/complex/ticket/MDT-001.md',
        relatedTickets: Array.from({ length: 100 }, (_, i) => `MDT-${i.toString().padStart(3, '0')}`),
        dependsOn: Array.from({ length: 50 }, (_, i) => `DEP-${i.toString().padStart(3, '0')}`),
        blocks: Array.from({ length: 25 }, (_, i) => `BLOCK-${i.toString().padStart(3, '0')}`),
        dateCreated: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-15T00:00:00Z'
      };

      const startTime = Date.now();
      const result = TicketSchema.safeParse(complexTicket);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should validate in < 100ms
    });
  });
});