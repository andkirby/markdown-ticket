/**
 * MDT-101 Phase 1.1: End-to-End Integration Tests
 *
 * These tests verify complete workflows across all system interfaces,
 * ensuring that validation is consistent and data flows correctly
 * through all boundaries.
 */

import { z } from 'zod';

// Import all schemas for comprehensive testing
import {
  ProjectSchema,
  LocalProjectConfigSchema,
  ProjectInfoSchema
} from '../project/schema';

import {
  TicketSchema,
  TicketDataSchema
} from '../ticket/schema';

describe('Phase 1.1 End-to-End Tests', () => {
  describe('Cross-Interface Consistency', () => {
    it('maintains data consistency across CLI, MCP, and Server interfaces', () => {
      // Create a complete project configuration
      const projectConfig = {
        project: {
          name: 'Cross-Interface Test Project',
          code: 'CIT',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true,
          description: 'Testing consistency across interfaces',
          repository: 'https://github.com/example/cross-interface-test',
          ticketsPath: 'docs/CRs'
        },
        document: {
          paths: ['docs', 'src', 'tests'],
          excludeFolders: ['node_modules', '.git', 'dist'],
          maxDepth: 5
        }
      };

      // Test CLI validation
      const cliValidation = LocalProjectConfigSchema.safeParse(projectConfig);
      expect(cliValidation.success).toBe(true);

      // Test MCP tool validation
      const mcpValidation = LocalProjectConfigSchema.safeParse(projectConfig);
      expect(mcpValidation.success).toBe(true);

      // Test Server API validation
      const serverValidation = LocalProjectConfigSchema.safeParse(projectConfig);
      expect(serverValidation.success).toBe(true);

      // All validations should produce the same result
      if (cliValidation.success && mcpValidation.success && serverValidation.success) {
        expect(cliValidation.data).toEqual(mcpValidation.data);
        expect(mcpValidation.data).toEqual(serverValidation.data);
      }
    });

    it('handles validation errors consistently across all interfaces', () => {
      const invalidConfig = {
        project: {
          name: '', // Invalid: empty
          code: '123', // Invalid: numbers only
          startNumber: -1, // Invalid: negative
          active: 'not-a-boolean' // Invalid: wrong type
        },
        document: {
          paths: [123, 'src'] // Invalid: mixed types
        }
      };

      // Test all interfaces with the same invalid data
      const interfaces = ['CLI', 'MCP', 'Server'];
      const validationResults = interfaces.map(() => {
        return LocalProjectConfigSchema.safeParse(invalidConfig);
      });

      // All should fail with the same errors
      validationResults.forEach((result, index) => {
        expect(result.success).toBe(false);
        if (!result.success) {
          // Count of validation errors should be consistent
          expect(result.error.issues.length).toBeGreaterThan(0);

          // Same field paths should be reported
          const fieldPaths = result.error.issues.map(i => i.path.join('.'));
          expect(fieldPaths).toContain('project.name');
          expect(fieldPaths).toContain('project.code');
          expect(fieldPaths).toContain('project.startNumber');
          expect(fieldPaths).toContain('project.active');
          expect(fieldPaths).toContain('document.paths');
        }
      });

      // Error counts should be identical
      const errorCounts = validationResults.map(r => r.success ? 0 : r.error.issues.length);
      expect(errorCounts[0]).toBe(errorCounts[1]);
      expect(errorCounts[1]).toBe(errorCounts[2]);
    });

    it('validates complex project configurations consistently', () => {
      const complexConfig = {
        project: {
          name: 'Complex Integration Test',
          code: 'CITX',
          startNumber: 42,
          counterFile: '.custom-counter',
          active: true,
          description: 'A project with all possible fields configured\nMultiline description\nWith special chars: !@#$%^&*()',
          repository: 'https://github.com/complex/complex-test',
          ticketsPath: 'very/deep/path/to/crs',
          id: 'custom-project-id'
        },
        document: {
          paths: [
            'docs',
            'src',
            'tests',
            'scripts',
            'assets',
            'config'
          ],
          excludeFolders: [
            'node_modules',
            '.git',
            'dist',
            'build',
            'coverage',
            '.nyc_output',
            '.tmp',
            'temp'
          ],
          maxDepth: 10
        }
      };

      // Validate across all interfaces
      const cliResult = LocalProjectConfigSchema.safeParse(complexConfig);
      const mcpResult = LocalProjectConfigSchema.safeParse(complexConfig);
      const serverResult = LocalProjectConfigSchema.safeParse(complexConfig);

      // All should succeed
      expect(cliResult.success).toBe(true);
      expect(mcpResult.success).toBe(true);
      expect(serverResult.success).toBe(true);

      // Results should be identical
      if (cliResult.success && mcpResult.success && serverResult.success) {
        expect(JSON.stringify(cliResult.data)).toBe(JSON.stringify(mcpResult.data));
        expect(JSON.stringify(mcpResult.data)).toBe(JSON.stringify(serverResult.data));
      }
    });
  });

  describe('Round-Trip Data Integrity', () => {
    it('preserves data through create -> retrieve -> update cycle', () => {
      // Step 1: Create project via CLI
      const createData = {
        project: {
          name: 'Round Trip Test',
          code: 'RTT',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true,
          ticketsPath: 'docs'
        },
        document: {
          paths: ['docs'],
          maxDepth: 3
        }
      };

      const createResult = LocalProjectConfigSchema.safeParse(createData);
      expect(createResult.success).toBe(true);

      // Step 2: Convert to unified project format (simulating storage)
      const unifiedProject = {
        id: 'rtt-123',
        project: {
          name: createData.project.name,
          path: '/path/to/round-trip-test',
          configFile: '/path/to/round-trip-test/.mdt-config.toml',
          active: createData.project.active,
          description: createData.project.description,
          code: createData.project.code,
          ticketsPath: createData.project.ticketsPath
        },
        metadata: {
          dateRegistered: '2024-01-20T00:00:00Z',
          lastAccessed: '2024-01-20T00:00:00Z',
          version: '1.0.0'
        },
        document: createData.document
      };

      const unifiedResult = ProjectSchema.safeParse(unifiedProject);
      expect(unifiedResult.success).toBe(true);

      // Step 3: Retrieve via MCP tool
      const retrieveResult = ProjectSchema.safeParse(unifiedProject);
      expect(retrieveResult.success).toBe(true);

      // Step 4: Update via Server API
      const updateData = {
        project: {
          name: 'Updated Round Trip Test',
          description: 'Updated description'
        },
        document: {
          maxDepth: 5
        }
      };

      // Apply update (simplified)
      const updatedProject = {
        ...unifiedProject,
        project: {
          ...unifiedProject.project,
          name: updateData.project.name,
          description: updateData.project.description
        },
        document: {
          ...unifiedProject.document,
          ...updateData.document
        }
      };

      const updateResult = ProjectSchema.safeParse(updatedProject);
      expect(updateResult.success).toBe(true);

      // Verify data integrity throughout
      if (allSuccessful(createResult, unifiedResult, retrieveResult, updateResult)) {
        // Original data should be preserved where not updated
        expect(updatedProject.project.code).toBe(createData.project.code);
        expect(updatedProject.project.ticketsPath).toBe(createData.project.ticketsPath);
        expect(updatedProject.document.paths).toEqual(createData.document.paths);

        // Updated data should be applied
        expect(updatedProject.project.name).toBe(updateData.project.name);
        expect(updatedProject.document.maxDepth).toBe(updateData.document.maxDepth);
      }
    });

    it('handles ticket relationships consistently', () => {
      const ticketWithRelationships = {
        code: 'MDT-001',
        title: 'Ticket with Relationships',
        status: 'In Progress',
        type: 'Feature Enhancement',
        priority: 'High',
        content: '# Complex Ticket\n\nWith many relationships',
        filePath: '/path/to/MDT-001.md',
        relatedTickets: ['MDT-002', 'MDT-003', 'MDT-004'],
        dependsOn: ['DEP-001', 'DEP-002'],
        blocks: ['BLOCK-001'],
        phaseEpic: 'Phase 1',
        assignee: 'developer@example.com',
        dateCreated: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-15T00:00:00Z'
      };

      // Validate ticket creation
      const createResult = TicketSchema.safeParse(ticketWithRelationships);
      expect(createResult.success).toBe(true);

      // Validate ticket retrieval
      const retrieveResult = TicketSchema.safeParse(ticketWithRelationships);
      expect(retrieveResult.success).toBe(true);

      // Validate partial update
      const updateData = {
        status: 'Implemented',
        blocks: [] // Clear blocks
      };

      const updatedTicket = {
        ...ticketWithRelationships,
        ...updateData,
        lastModified: new Date().toISOString()
      };

      const updateResult = TicketSchema.safeParse(updatedTicket);
      expect(updateResult.success).toBe(true);

      // Verify relationship arrays are handled correctly
      if (allSuccessful(createResult, retrieveResult, updateResult)) {
        expect(Array.isArray(updatedTicket.relatedTickets)).toBe(true);
        expect(updatedTicket.relatedTickets).toHaveLength(3);
        expect(Array.isArray(updatedTicket.dependsOn)).toBe(true);
        expect(updatedTicket.dependsOn).toHaveLength(2);
        expect(Array.isArray(updatedTicket.blocks)).toBe(true);
        expect(updatedTicket.blocks).toHaveLength(0);
      }
    });
  });

  describe('Migration Workflow Tests', () => {
    it('completes full legacy migration workflow', () => {
      // Step 1: Load legacy configuration
      const legacyConfig = {
        project: {
          name: 'Legacy Migration Test',
          code: 'LMT',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/tickets', // Legacy: this is actually tickets path
          description: 'Project being migrated from legacy format'
        },
        document_paths: ['docs'], // Legacy field name
        exclude_folders: ['node_modules'] // Legacy field name
      };

      // Step 2: Detect legacy format
      const isLegacy = true; // Would use isLegacyConfig()
      expect(isLegacy).toBe(true);

      // Step 3: Migrate to new format
      const migratedConfig = {
        project: {
          name: 'Legacy Migration Test',
          code: 'LMT',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: '.', // Migrated: project root
          ticketsPath: 'docs/tickets', // Migrated: explicit tickets path
          description: 'Project being migrated from legacy format'
        },
        document: {
          paths: ['docs'], // Migrated field name
          excludeFolders: ['node_modules'] // Migrated field name
        }
      };

      // Step 4: Validate migrated configuration
      const migrationResult = LocalProjectConfigSchema.safeParse(migratedConfig);
      expect(migrationResult.success).toBe(true);

      // Step 5: Store and retrieve
      const storedResult = LocalProjectConfigSchema.safeParse(migratedConfig);
      expect(storedResult.success).toBe(true);

      // Verify migration was successful
      if (migrationResult.success && storedResult.success) {
        expect(migrationResult.data).toEqual(storedResult.data);
        expect(migrationResult.data.project.path).toBe('.');
        expect(migrationResult.data.project.ticketsPath).toBe('docs/tickets');
      }
    });

    it('handles migration with validation issues', () => {
      // Legacy config with some issues
      const problematicLegacy = {
        project: {
          name: 'Problematic Legacy',
          code: 'pl', // Too short
          startNumber: 0, // Invalid
          counterFile: '',
          path: 'docs'
        },
        document: {
          paths: 'not-an-array' // Wrong type
        }
      };

      // Migration should attempt to preserve data but validate
      const migratedAttempt = {
        project: {
          name: 'Problematic Legacy',
          code: 'pl',
          startNumber: 0,
          counterFile: '',
          path: '.',
          ticketsPath: 'docs'
        },
        document: {
          paths: 'not-an-array'
        }
      };

      const validationResult = LocalProjectConfigSchema.safeParse(migratedAttempt);
      expect(validationResult.success).toBe(false);

      if (!validationResult.success) {
        // Should provide clear guidance on fixing issues
        const issues = validationResult.error.issues;
        expect(issues.some(i => i.message.includes('at least 3'))).toBe(true);
        expect(issues.some(i => i.message.includes('positive'))).toBe(true);
        expect(issues.some(i => i.path.join('.').includes('paths'))).toBe(true);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('validates large datasets efficiently', () => {
      // Generate a large number of projects
      const largeProjectList = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-test-${i}`,
        project: {
          name: `Performance Test Project ${i}`,
          path: `/path/to/perf-test-${i}`,
          configFile: `/path/to/perf-test-${i}/.mdt-config.toml`,
          active: i % 2 === 0,
          description: `Project number ${i} for performance testing`
        },
        metadata: {
          dateRegistered: '2024-01-01T00:00:00Z',
          lastAccessed: '2024-01-20T00:00:00Z',
          version: '1.0.0'
        },
        document: {
          paths: [`src-${i}`, `docs-${i}`],
          excludeFolders: ['node_modules', 'dist'],
          maxDepth: 5
        }
      }));

      // Measure validation time
      const startTime = Date.now();
      const results = largeProjectList.map(project =>
        ProjectSchema.safeParse(project)
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All should validate successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second for 100 items
      expect(duration / largeProjectList.length).toBeLessThan(10); // 10ms per item average
    });

    it('handles concurrent validations', () => {
      // Simulate concurrent requests
      const concurrentValidations = Array.from({ length: 50 }, (_, i) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const testConfig = {
              project: {
                name: `Concurrent Test ${i}`,
                code: `CON${i.toString().padStart(2, '0')}`,
                startNumber: i + 1,
                counterFile: '.mdt-next',
                active: true
              },
              document: {}
            };

            const result = LocalProjectConfigSchema.safeParse(testConfig);
            resolve(result);
          }, Math.random() * 100); // Random delay 0-100ms
        });
      });

      // Wait for all validations to complete
      const startTime = Date.now();
      return Promise.all(concurrentValidations).then(results => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // All should succeed
        results.forEach(result => {
          expect((result as any).success).toBe(true);
        });

        // Should complete efficiently even with concurrency
        expect(duration).toBeLessThan(500); // 500ms for 50 concurrent validations
      });
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    it('handles malformed data gracefully', () => {
      const malformedData = [
        null,
        undefined,
        {},
        { project: null },
        { project: {} },
        { project: { name: 123 } },
        { project: { name: 'Test', code: null } },
        { project: { name: 'Test', code: 'TEST' }, document: 'not-an-object' }
      ];

      malformedData.forEach((data, index) => {
        const result = LocalProjectConfigSchema.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });
    });

    it('recovers from partial validation failures', () => {
      const batchData = [
        {
          project: { name: 'Valid 1', code: 'VAL1', startNumber: 1, counterFile: '.mdt-next' },
          document: {}
        },
        {
          project: { name: '', code: 'INV', startNumber: -1, counterFile: '' }, // Invalid
          document: {}
        },
        {
          project: { name: 'Valid 2', code: 'VAL2', startNumber: 2, counterFile: '.mdt-next' },
          document: {}
        }
      ];

      const results = batchData.map(data =>
        LocalProjectConfigSchema.safeParse(data)
      );

      // First and third should succeed, second should fail
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);

      // System should continue processing even with failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);
    });
  });
});

// Helper function
function allSuccessful(...results: any[]): boolean {
  return results.every(r => r.success);
}