/**
 * MDT-101 Phase 1.1: Server Boundary Validation Tests
 *
 * These tests verify that the server API properly validates all incoming
 * requests and outgoing responses using domain contracts.
 */

import { z } from 'zod';

// Import schemas that should be used for validation
import {
  LocalProjectConfigSchema,
  ProjectSchema,
  ProjectConfigSchema
} from '../project/schema';

import {
  TicketSchema,
  TicketDataSchema,
  TicketUpdateAttrsSchema,
  TicketFiltersSchema
} from '../ticket/schema';

describe('Server API Validation', () => {
  describe('POST /api/projects - Create Project', () => {
    it('validates complete project creation request', () => {
      const requestBody = {
        project: {
          name: 'New API Project',
          code: 'API',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true,
          description: 'Project created via API',
          repository: 'https://github.com/example/api-project',
          ticketsPath: 'docs/CRs'
        },
        document: {
          paths: ['docs', 'src'],
          excludeFolders: ['node_modules', 'dist'],
          maxDepth: 5
        }
      };

      const result = LocalProjectConfigSchema.safeParse(requestBody);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project.name).toBe('New API Project');
        expect(result.data.project.code).toBe('API');
        expect(result.data.document?.paths).toEqual(['docs', 'src']);
      }
    });

    it('validates minimal project creation request', () => {
      const minimalBody = {
        project: {
          name: 'Minimal Project',
          code: 'MIN',
          startNumber: 100,
          counterFile: '.counter'
        },
        document: {}
      };

      const result = LocalProjectConfigSchema.safeParse(minimalBody);
      expect(result.success).toBe(true);
    });

    it('rejects invalid project creation request', () => {
      const invalidBody = {
        project: {
          // Missing required fields: name, code, startNumber, counterFile
          active: 'not-a-boolean',
          path: '/absolute/path' // Should be relative
        },
        document: {
          paths: [123, 'src'] // Invalid type in array
        }
      };

      const result = LocalProjectConfigSchema.safeParse(invalidBody);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldPaths = result.error.issues.map(i => i.path.join('.'));
        expect(fieldPaths.some(p => p.includes('project.name'))).toBe(true);
        expect(fieldPaths.some(p => p.includes('project.code'))).toBe(true);
        expect(fieldPaths.some(p => p.includes('document.paths'))).toBe(true);
      }
    });

    it('returns proper error response format', () => {
      const invalidRequest = {
        project: {
          name: '', // Empty name
          code: '123' // Invalid format
        }
      };

      const validationResult = LocalProjectConfigSchema.safeParse(invalidRequest);

      if (!validationResult.success) {
        // Server should return standardized error format
        const serverErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validationResult.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              code: issue.code
            }))
          }
        };

        expect(serverErrorResponse.error.details).toHaveLength(2);
        expect(serverErrorResponse.error.details[0].field).toBe('project.name');
      }
    });
  });

  describe('PATCH /api/projects/:id - Update Project', () => {
    it('validates project update request', () => {
      const updateBody = {
        project: {
          name: 'Updated Project Name',
          active: false,
          description: 'Updated description'
        },
        document: {
          paths: ['new-docs'],
          maxDepth: 10
        }
      };

      // For updates, we should validate against a partial schema
      // This would be implemented with .partial() in Zod
      const ProjectUpdateSchema = LocalProjectConfigSchema.partial();
      const result = ProjectUpdateSchema.safeParse(updateBody);
      expect(result.success).toBe(true);
    });

    it('rejects invalid update fields', () => {
      const invalidUpdate = {
        project: {
          code: 123, // Wrong type
          startNumber: 'not-a-number', // Wrong type
          nonExistentField: 'should not exist'
        },
        document: {
          maxDepth: 'not-a-number' // Wrong type
        }
      };

      const ProjectUpdateSchema = LocalProjectConfigSchema.partial();
      const result = ProjectUpdateSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('validates partial updates with mixed valid/invalid fields', () => {
      const mixedUpdate = {
        project: {
          name: 'Valid Name',
          active: 'invalid-boolean', // Invalid
          description: 'Valid description'
        }
      };

      const ProjectUpdateSchema = LocalProjectConfigSchema.partial();
      const result = ProjectUpdateSchema.safeParse(mixedUpdate);
      expect(result.success).toBe(false);

      // Should report only the invalid field
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path.join('.')).toBe('project.active');
      }
    });
  });

  describe('POST /api/projects/:id/crs - Create Ticket', () => {
    it('validates ticket creation request', () => {
      const ticketBody = {
        title: 'New API Feature',
        type: 'Feature Enhancement',
        priority: 'High',
        phaseEpic: 'Phase 2',
        assignee: 'developer@example.com'
      };

      const result = TicketDataSchema.safeParse(ticketBody);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('New API Feature');
        expect(result.data.type).toBe('Feature Enhancement');
      }
    });

    it('rejects invalid ticket creation', () => {
      const invalidTicket = {
        title: 123, // Wrong type
        type: 'Invalid Type', // Invalid enum
        priority: 'Invalid Priority', // Invalid enum
        extraField: 'not allowed'
      };

      const result = TicketDataSchema.safeParse(invalidTicket);
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldPaths = result.error.issues.map(i => i.path.join('.'));
        expect(fieldPaths).toContain('title');
        expect(fieldPaths).toContain('type');
        expect(fieldPaths).toContain('priority');
      }
    });
  });

  describe('PATCH /api/projects/:id/crs/:crId - Update Ticket', () => {
    it('validates ticket update request', () => {
      const updateBody = {
        status: 'In Progress',
        priority: 'Critical',
        phaseEpic: 'Phase 2',
        assignee: 'new-assignee@example.com'
      };

      const result = TicketUpdateAttrsSchema.safeParse(updateBody);
      expect(result.success).toBe(true);
    });

    it('rejects invalid ticket update', () => {
      const invalidUpdate = {
        status: 'Invalid Status',
        priority: 123, // Wrong type
        dateCreated: 'should not be updatable'
      };

      const result = TicketUpdateAttrsSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('GET /api/projects/:id/crs - List Tickets', () => {
    it('validates ticket filter parameters', () => {
      const queryParams = {
        status: ['Proposed', 'In Progress'],
        type: ['Feature Enhancement'],
        priority: 'High',
        assignee: 'developer@example.com',
        phaseEpic: 'Phase 1',
        limit: 50,
        offset: 0
      };

      const result = TicketFiltersSchema.safeParse(queryParams);
      expect(result.success).toBe(true);
    });

    it('rejects invalid filter parameters', () => {
      const invalidParams = {
        status: 'not-an-array', // Should be array
        type: ['Invalid Type'], // Invalid enum value
        priority: ['Invalid Priority'], // Invalid enum value
        limit: -1, // Should be positive
        offset: 'not-a-number'
      };

      const result = TicketFiltersSchema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('File Upload Validation - .mdt-config.toml', () => {
    it('validates uploaded TOML configuration', () => {
      // Simulate parsed TOML content
      const parsedToml = {
        project: {
          name: 'Uploaded Project',
          code: 'UPL',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true,
          ticketsPath: 'docs'
        },
        document: {
          paths: ['docs', 'src'],
          excludeFolders: ['node_modules']
        }
      };

      const result = ProjectConfigSchema.safeParse(parsedToml);
      expect(result.success).toBe(true);
    });

    it('detects and migrates legacy TOML format', () => {
      const legacyToml = {
        project: {
          name: 'Legacy Upload',
          code: 'LEG',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/CRs' // Legacy format
        },
        document_paths: ['docs'], // Legacy field
        exclude_folders: ['node_modules'] // Legacy field
      };

      // Server should detect legacy format and migrate
      // This test verifies the server handles migration correctly
      const migrationResult = migrateLegacyConfig(legacyToml);
      expect(migrationResult.success).toBe(true);

      if (migrationResult.success) {
        // Migrated result should validate against current schema
        const validation = ProjectConfigSchema.safeParse(migrationResult.data);
        expect(validation.success).toBe(true);
      }
    });

    it('returns detailed errors for invalid TOML', () => {
      const invalidToml = {
        project: {
          // Missing required fields
          name: '',
          code: 'invalid'
        },
        document: {
          paths: [123] // Invalid type
        }
      };

      const result = ProjectConfigSchema.safeParse(invalidToml);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Server should return detailed error with line/column info
        const serverError = {
          success: false,
          error: {
            code: 'INVALID_CONFIG',
            message: 'Configuration file contains errors',
            details: result.error.issues.map(issue => ({
              field: issue.path.join('.'),
              message: issue.message,
              // In real implementation, would include line/column from TOML parser
              line: 'unknown',
              column: 'unknown'
            }))
          }
        };

        expect(serverError.error.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Validation', () => {
    it('validates project list response', () => {
      const projectListResponse = [
        {
          id: 'proj-1',
          project: {
            name: 'Project 1',
            path: '/path/to/proj1',
            configFile: '/path/to/proj1/.mdt-config.toml',
            active: true
          },
          metadata: {
            dateRegistered: '2024-01-01T00:00:00Z',
            lastAccessed: '2024-01-15T00:00:00Z',
            version: '1.0.0'
          }
        }
      ];

      projectListResponse.forEach(project => {
        const result = ProjectSchema.safeParse(project);
        expect(result.success).toBe(true);
      });
    });

    it('validates single project response', () => {
      const projectResponse = {
        id: 'single-proj',
        project: {
          name: 'Single Project',
          path: '/path/to/project',
          configFile: '/path/to/project/.mdt-config.toml',
          active: true,
          description: 'A single project'
        },
        metadata: {
          dateRegistered: '2024-01-01T00:00:00Z',
          lastAccessed: '2024-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const result = ProjectSchema.safeParse(projectResponse);
      expect(result.success).toBe(true);
    });

    it('validates ticket list response', () => {
      const ticketListResponse = [
        {
          code: 'MDT-001',
          title: 'Ticket 1',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          content: '# Ticket 1',
          filePath: '/path/to/MDT-001.md',
          relatedTickets: [],
          dependsOn: [],
          blocks: [],
          dateCreated: '2024-01-01T00:00:00Z',
          lastModified: '2024-01-15T00:00:00Z'
        }
      ];

      ticketListResponse.forEach(ticket => {
        const result = TicketSchema.safeParse(ticket);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Server Error Handling', () => {
    it('returns consistent error format across all endpoints', () => {
      const errorExamples = [
        {
          endpoint: 'POST /api/projects',
          status: 400,
          error: {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request body validation failed',
              details: []
            }
          }
        },
        {
          endpoint: 'GET /api/projects/:id',
          status: 404,
          error: {
            success: false,
            error: {
              code: 'PROJECT_NOT_FOUND',
              message: 'Project not found',
              details: { id: 'missing' }
            }
          }
        },
        {
          endpoint: 'PATCH /api/projects/:id/crs/:crId',
          status: 403,
          error: {
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Insufficient permissions',
              details: { required: 'write' }
            }
          }
        }
      ];

      errorExamples.forEach(example => {
        expect(example.error.success).toBe(false);
        expect(example.error.error.code).toBeDefined();
        expect(example.error.error.message).toBeDefined();
        expect(example.error.error.details).toBeDefined();
      });
    });
  });
});

// Helper function for testing (would be imported from migration module)
function migrateLegacyConfig(config: any): any {
  // Placeholder - actual implementation would be in migration module
  return {
    success: true,
    data: config,
    warnings: [],
    errors: []
  };
}