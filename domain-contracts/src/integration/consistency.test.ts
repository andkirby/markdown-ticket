/**
 * Integration Tests for MDT-101: Cross-Interface Consistency
 *
 * This test suite verifies that the domain contracts package maintains
 * consistency across all system interfaces:
 * - MCP tools can validate responses using domain contracts
 * - Server services can parse incoming data with domain contracts
 * - Shared services can use domain contracts for type safety
 * - Same data shape works across CLI, MCP, and UI
 * - Validation errors are consistent across interfaces
 * - Enum values are identical everywhere
 * - Package structure maintains zero internal dependency rule
 */

import { z } from 'zod';

// Import domain contract schemas (when implemented)
// These imports will fail until schemas are implemented, which is expected
import {
  CRStatusSchema,
  CRTypeSchema,
  CRPrioritySchema,
  ProjectInfoSchema
} from '../types/schema';

import {
  TicketSchema,
  TicketDataSchema,
  TicketUpdateAttrsSchema,
  TicketFiltersSchema
} from '../ticket/schema';

import {
  LocalProjectConfigSchema,
  ProjectSchema,
  ProjectConfigSchema
} from '../project/schema';

// Import current implementations for behavioral preservation
import {
  CRStatus,
  CRType,
  CRPriority,
  ProjectInfo
} from '../../../shared/models/Types';

import {
  Ticket,
  TicketData,
  TicketUpdateAttrs,
  TicketFilters,
  normalizeTicket
} from '../../../shared/models/Ticket';

import {
  LocalProjectConfig,
  Project,
  ProjectConfig,
  validateProjectConfig
} from '../../../shared/models/Project';

describe('MDT-101 Integration Tests: Cross-Interface Consistency', () => {

  describe('1. Schema Validation Across All Boundaries', () => {

    describe('MCP Tools can validate responses using domain contracts', () => {

      it('should validate MCP tool responses with TicketSchema', () => {
        // Simulate MCP tool response for get_cr
        const mcpResponse = {
          code: 'MDT-001',
          title: 'Test Ticket',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          content: '# Test Content\n\n## Description\n\nTest description',
          filePath: '/path/to/ticket.md',
          relatedTickets: [],
          dependsOn: [],
          blocks: [],
          dateCreated: new Date(),
          lastModified: new Date()
        };

        // This will fail until TicketSchema is implemented
        const result = TicketSchema.safeParse(mcpResponse);
        expect(result.success).toBe(true);
      });

      it('should validate MCP tool responses with ProjectInfoSchema', () => {
        // Simulate MCP tool response for list_projects
        const mcpResponse = {
          key: 'MDT',
          name: 'Markdown Ticket',
          path: '/path/to/project',
          crCount: 42,
          lastAccessed: '2024-01-01T00:00:00Z'
        };

        const result = ProjectInfoSchema.safeParse(mcpResponse);
        expect(result.success).toBe(true);
      });

      it('should reject invalid MCP responses', () => {
        const invalidResponse = {
          code: 'MDT-001',
          title: 'Test Ticket',
          status: 'InvalidStatus', // Invalid enum value
          type: 'Feature Enhancement',
          priority: 'Medium'
        };

        const result = TicketSchema.safeParse(invalidResponse);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Invalid');
        }
      });
    });

    describe('Server services can parse incoming data with domain contracts', () => {

      it('should validate server API requests with TicketDataSchema', () => {
        // Simulate POST /api/projects/:id/crs request body
        const serverRequest = {
          title: 'New Ticket',
          type: 'Bug Fix',
          priority: 'High'
        };

        const result = TicketDataSchema.safeParse(serverRequest);
        expect(result.success).toBe(true);
      });

      it('should validate server update requests with TicketUpdateAttrsSchema', () => {
        // Simulate PATCH /api/projects/:id/crs/:crId request body
        const updateRequest = {
          priority: 'Critical',
          phaseEpic: 'Phase 1',
          assignee: 'user@example.com'
        };

        const result = TicketUpdateAttrsSchema.safeParse(updateRequest);
        expect(result.success).toBe(true);
      });

      it('should reject server requests with invalid data', () => {
        const invalidRequest = {
          title: 'New Ticket',
          type: 'Invalid Type' // Invalid enum value
        };

        const result = TicketDataSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
      });
    });

    describe('Shared services can use domain contracts for type safety', () => {

      it('should validate shared service data with TicketSchema', () => {
        // Simulate shared service internal data
        const sharedData = normalizeTicket({
          code: 'MDT-001',
          title: 'Test Ticket',
          status: 'In Progress',
          type: 'Architecture',
          priority: 'High',
          content: '# Test',
          filePath: '/test.md',
          dateCreated: new Date(),
          lastModified: new Date()
        });

        const result = TicketSchema.safeParse(sharedData);
        expect(result.success).toBe(true);
      });

      it('should validate shared service project data with LocalProjectConfigSchema', () => {
        const projectData: LocalProjectConfig = {
          project: {
            name: 'Test Project',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: true,
            ticketsPath: 'docs/CRs'
          },
          document: {
            paths: ['docs'],
            excludeFolders: ['node_modules'],
            maxDepth: 5
          }
        };

        const result = LocalProjectConfigSchema.safeParse(projectData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('2. Cross-Interface Consistency', () => {

    describe('Same data shape works across CLI, MCP, and UI', () => {

      it('should validate ticket data consistently across all interfaces', () => {
        const baseTicketData = {
          code: 'MDT-001',
          title: 'Cross-Interface Test',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          content: '# Test\n\nDescription',
          filePath: '/test/path.md',
          relatedTickets: ['MDT-002'],
          dependsOn: [],
          blocks: [],
          dateCreated: new Date(),
          lastModified: new Date()
        };

        // Should validate for all interfaces
        const mcpResult = TicketSchema.safeParse(baseTicketData);
        const serverResult = TicketSchema.safeParse(baseTicketData);
        const uiResult = TicketSchema.safeParse(baseTicketData);

        expect(mcpResult.success).toBe(true);
        expect(serverResult.success).toBe(true);
        expect(uiResult.success).toBe(true);
      });

      it('should validate project data consistently across all interfaces', () => {
        const baseProjectData: LocalProjectConfig = {
          project: {
            name: 'Cross-Interface Project',
            code: 'CIP',
            startNumber: 100,
            counterFile: '.counter',
            active: true
          },
          document: {}
        };

        // Should validate for all interfaces
        const mcpResult = LocalProjectConfigSchema.safeParse(baseProjectData);
        const serverResult = LocalProjectConfigSchema.safeParse(baseProjectData);
        const cliResult = LocalProjectConfigSchema.safeParse(baseProjectData);

        expect(mcpResult.success).toBe(true);
        expect(serverResult.success).toBe(true);
        expect(cliResult.success).toBe(true);
      });
    });

    describe('Validation errors are consistent across interfaces', () => {

      it('should generate consistent error messages for invalid enum values', () => {
        const invalidData = {
          code: 'MDT-001',
          title: 'Test',
          status: 'INVALID_STATUS',
          type: 'INVALID_TYPE',
          priority: 'INVALID_PRIORITY'
        };

        const mcpResult = TicketSchema.safeParse(invalidData);
        const serverResult = TicketSchema.safeParse(invalidData);

        expect(mcpResult.success).toBe(false);
        expect(serverResult.success).toBe(false);

        // Error messages should be consistent
        if (!mcpResult.success && !serverResult.success) {
          const mcpErrorMessages = mcpResult.error.issues.map(issue => issue.message);
          const serverErrorMessages = serverResult.error.issues.map(issue => issue.message);

          expect(mcpErrorMessages).toEqual(serverErrorMessages);
        }
      });

      it('should handle missing required fields consistently', () => {
        const incompleteData = {
          // Missing required fields
          title: 'Incomplete Ticket'
        };

        const mcpResult = TicketSchema.safeParse(incompleteData);
        const serverResult = TicketSchema.safeParse(incompleteData);

        expect(mcpResult.success).toBe(false);
        expect(serverResult.success).toBe(false);
      });
    });

    describe('Enum values are identical everywhere', () => {

      it('should maintain CRStatus enum consistency across all interfaces', () => {
        const validStatuses: CRStatus[] = [
          'Proposed', 'Approved', 'In Progress', 'Implemented',
          'Rejected', 'On Hold', 'Superseded', 'Deprecated',
          'Duplicate', 'Partially Implemented'
        ];

        validStatuses.forEach(status => {
          const statusResult = CRStatusSchema.safeParse(status);
          expect(statusResult.success).toBe(true);

          // Should also validate in ticket context
          const ticketResult = TicketSchema.safeParse({
            code: 'MDT-001',
            title: 'Test',
            status,
            type: 'Feature Enhancement',
            priority: 'Medium',
            content: 'Test',
            filePath: '/test.md',
            relatedTickets: [],
            dependsOn: [],
            blocks: [],
            dateCreated: new Date(),
            lastModified: new Date()
          });
          expect(ticketResult.success).toBe(true);
        });
      });

      it('should maintain CRType enum consistency across all interfaces', () => {
        const validTypes: CRType[] = [
          'Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'
        ];

        validTypes.forEach(type => {
          const typeResult = CRTypeSchema.safeParse(type);
          expect(typeResult.success).toBe(true);
        });
      });

      it('should maintain CRPriority enum consistency across all interfaces', () => {
        const validPriorities: CRPriority[] = ['Low', 'Medium', 'High', 'Critical'];

        validPriorities.forEach(priority => {
          const priorityResult = CRPrioritySchema.safeParse(priority);
          expect(priorityResult.success).toBe(true);
        });
      });
    });
  });

  describe('3. Package Structure Tests', () => {

    describe('domain-contracts can be imported by other packages', () => {

      it('should export all necessary schemas', () => {
        // These imports will fail until schemas are implemented
        expect(() => {
          const schemas = require('../types/schema');
          expect(schemas.CRStatusSchema).toBeDefined();
          expect(schemas.CRTypeSchema).toBeDefined();
          expect(schemas.CRPrioritySchema).toBeDefined();
          expect(schemas.ProjectInfoSchema).toBeDefined();
        }).not.toThrow();
      });

      it('should have proper TypeScript definitions', () => {
        // Verify types are exported correctly
        expect(() => {
          const types = require('../types/schema');
          // Type assertions should work if exports are correct
          const schema: z.ZodEnum<any> = types.CRStatusSchema;
          expect(schema).toBeDefined();
        }).not.toThrow();
      });
    });

    describe('Zero internal dependency rule is maintained', () => {

      it('should only depend on zod as external dependency', () => {
        // This is a structural test - we verify by examining package.json
        const fs = require('fs');
        const path = require('path');

        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Should only have zod as runtime dependency
        expect(Object.keys(packageJson.dependencies)).toEqual(['zod']);

        // zod should be at the expected version
        expect(packageJson.dependencies.zod).toMatch(/3/);
        expect(packageJson.dependencies.zod).toMatch(/^\^?3\./);
      });

      it('should not import from internal packages', () => {
        // Verify no internal imports in source files
        const fs = require('fs');
        const path = require('path');

        const srcDir = path.join(__dirname, '../');
        const files = fs.readdirSync(srcDir, { recursive: true });

        files.forEach((file: any) => {
          if (typeof file === 'string' && file.endsWith('.ts')) {
            const filePath = path.join(srcDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Should not import from internal packages
            expect(content).not.toMatch(/from ['"]@mdt\/shared/);
            expect(content).not.toMatch(/from ['"]@mdt\/server/);
            expect(content).not.toMatch(/from ['"]@mdt\/mcp-server/);

            // Should only import from zod or relative paths
            const imports = content.match(/from ['"][^'"]+['"]/g) || [];
            imports.forEach((imp: string) => {
              expect(imp).toMatch(/from ['"]zod['"]|from ['"]\.\/|from ['"]\.\.\//);
            });
          }
        });
      });
    });

    describe('Build and distribution structure', () => {

      it('should build successfully', () => {
        // This test would run npm run build in CI
        // For now, we verify build script exists
        const fs = require('fs');
        const path = require('path');

        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.scripts.build).toBe('tsc');
      });

      it('should have proper output structure', () => {
        // Verify package.json points to dist/ for outputs
        const fs = require('fs');
        const path = require('path');

        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.main).toBe('dist/index.js');
        expect(packageJson.types).toBe('dist/index.d.ts');
        expect(packageJson.files).toContain('dist');
      });
    });
  });

  describe('4. Behavioral Preservation Tests', () => {

    describe('Current TypeScript types are preserved', () => {

      it('should preserve Ticket interface behavior', () => {
        const currentTicket: Ticket = {
          code: 'MDT-001',
          title: 'Test Ticket',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          dateCreated: new Date(),
          lastModified: new Date(),
          content: '# Test Content',
          filePath: '/path/to/ticket.md',
          relatedTickets: ['MDT-002'],
          dependsOn: [],
          blocks: []
        };

        // Should validate with current types
        expect(typeof currentTicket.code).toBe('string');
        expect(currentTicket.status).toBe('Proposed');
        expect(Array.isArray(currentTicket.relatedTickets)).toBe(true);

        // Should also validate with new schema
        const schemaResult = TicketSchema.safeParse(currentTicket);
        expect(schemaResult.success).toBe(true);
      });

      it('should preserve ProjectConfig interface behavior', () => {
        const currentConfig: ProjectConfig = {
          project: {
            name: 'Test Project',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: true
          },
          document: {}
        };

        // Should validate with current validation function
        expect(validateProjectConfig(currentConfig)).toBe(true);

        // Should also validate with new schema
        const schemaResult = ProjectConfigSchema.safeParse(currentConfig);
        expect(schemaResult.success).toBe(true);
      });
    });

    describe('Enum values match exactly', () => {

      it('should match CRStatus enum values exactly', () => {
        const currentStatuses: CRStatus[] = [
          'Proposed', 'Approved', 'In Progress', 'Implemented',
          'Rejected', 'On Hold', 'Superseded', 'Deprecated',
          'Duplicate', 'Partially Implemented'
        ];

        currentStatuses.forEach(status => {
          const result = CRStatusSchema.safeParse(status);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(status);
          }
        });
      });

      it('should match CRType enum values exactly', () => {
        const currentTypes: CRType[] = [
          'Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation'
        ];

        currentTypes.forEach(type => {
          const result = CRTypeSchema.safeParse(type);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(type);
          }
        });
      });
    });
  });
});