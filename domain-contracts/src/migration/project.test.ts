/**
 * MDT-101 Phase 1.1: Project Migration Tests
 *
 * These tests verify the migration functionality for legacy project configurations.
 * All tests are written in RED state - they will fail until the migration
 * module is implemented in src/migration/project.ts
 */

import {
  isLegacyConfig,
  migrateLegacyConfig,
  validateMigratedConfig,
  MigrationResult,
  LegacyConfigWarning
} from './project';

// Import current types for testing
import { ProjectConfig } from '../../../shared/models/Project';

describe('Legacy Configuration Migration', () => {
  describe('isLegacyConfig() - Detection', () => {
    it('detects legacy format when project.path exists and ticketsPath does not', () => {
      const legacyConfig: any = {
        project: {
          name: 'Legacy Project',
          code: 'LEG',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/CRs' // Legacy: path contains tickets path
        },
        document: {}
      };

      expect(isLegacyConfig(legacyConfig)).toBe(true);
    });

    it('returns false for new format with both path and ticketsPath', () => {
      const newConfig = {
        project: {
          name: 'New Project',
          code: 'NEW',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: '.', // New: path is project root
          ticketsPath: 'docs/CRs' // New: explicit tickets path
        },
        document: {}
      };

      expect(isLegacyConfig(newConfig)).toBe(false);
    });

    it('returns false when only ticketsPath exists (new format)', () => {
      const newConfig2 = {
        project: {
          name: 'New Project 2',
          code: 'NEW2',
          startNumber: 1,
          counterFile: '.mdt-next',
          ticketsPath: 'tickets'
          // No path field
        },
        document: {}
      };

      expect(isLegacyConfig(newConfig2)).toBe(false);
    });

    it('returns false when neither path nor ticketsPath exist', () => {
      const noPathConfig = {
        project: {
          name: 'No Path Project',
          code: 'NOPATH',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document: {}
      };

      expect(isLegacyConfig(noPathConfig)).toBe(false);
    });

    it('handles edge cases gracefully', () => {
      expect(isLegacyConfig(null)).toBe(false);
      expect(isLegacyConfig({})).toBe(false);
      expect(isLegacyConfig({ project: null })).toBe(false);
      expect(isLegacyConfig({ project: {} })).toBe(false);
    });

    it('detects legacy document field names', () => {
      const legacyDocConfig: any = {
        project: {
          name: 'Legacy Doc Project',
          code: 'LEGDOC',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document_paths: ['docs', 'src'], // Legacy field name
        exclude_folders: ['node_modules', 'dist'] // Legacy field name
      };

      // Should detect as legacy due to field names
      const migrationResult = migrateLegacyConfig(legacyDocConfig);
      expect(migrationResult.warnings).toContain(
        expect.objectContaining({
          type: 'legacy_field_names',
          fields: ['document_paths', 'exclude_folders']
        })
      );
    });
  });

  describe('migrateLegacyConfig() - Transformation', () => {
    it('migrates legacy path to ticketsPath and sets path to "."', () => {
      const legacyConfig: any = {
        project: {
          name: 'Legacy Project',
          code: 'LEG',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/CRs' // This was actually the tickets path
        },
        document: {}
      };

      const result = migrateLegacyConfig(legacyConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project.path).toBe('.');
        expect(result.data.project.ticketsPath).toBe('docs/CRs');
        expect(result.data.project.name).toBe('Legacy Project'); // Other fields preserved
        expect(result.data.project.code).toBe('LEG');
      }
    });

    it('preserves all other fields during migration', () => {
      const completeLegacyConfig: any = {
        project: {
          id: 'test-id',
          name: 'Complete Legacy Project',
          code: 'COMP',
          startNumber: 42,
          counterFile: '.custom-counter',
          path: 'cr',
          description: 'A complete legacy project',
          repository: 'https://github.com/legacy/repo',
          active: false
        },
        document: {
          paths: ['docs'],
          excludeFolders: ['node_modules'],
          maxDepth: 5
        }
      };

      const result = migrateLegacyConfig(completeLegacyConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        // Check all fields are preserved
        expect(result.data.project.id).toBe('test-id');
        expect(result.data.project.name).toBe('Complete Legacy Project');
        expect(result.data.project.code).toBe('COMP');
        expect(result.data.project.startNumber).toBe(42);
        expect(result.data.project.counterFile).toBe('.custom-counter');
        expect(result.data.project.path).toBe('.'); // Migrated
        expect(result.data.project.ticketsPath).toBe('cr'); // Migrated
        expect(result.data.project.description).toBe('A complete legacy project');
        expect(result.data.project.repository).toBe('https://github.com/legacy/repo');
        expect(result.data.project.active).toBe(false);
        expect(result.data.document?.paths).toEqual(['docs']);
        expect(result.data.document?.excludeFolders).toEqual(['node_modules']);
        expect(result.data.document?.maxDepth).toBe(5);
      }
    });

    it('adds document section if missing in legacy config', () => {
      const legacyWithoutDoc: any = {
        project: {
          name: 'Legacy Without Doc',
          code: 'LWD',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'tickets'
        }
        // No document section
      };

      const result = migrateLegacyConfig(legacyWithoutDoc);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.document).toBeDefined();
        expect(result.data.document!.paths).toEqual([]);
        expect(result.data.document!.excludeFolders).toEqual([]);
      }
    });

    it('migrates legacy document field names', () => {
      const legacyWithOldFields: any = {
        project: {
          name: 'Legacy Old Fields',
          code: 'LOF',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document_paths: ['old/docs', 'legacy/src'], // Legacy field name
        exclude_folders: ['old/node_modules', 'build'] // Legacy field name
      };

      const result = migrateLegacyConfig(legacyWithOldFields);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.document?.paths).toEqual(['old/docs', 'legacy/src']);
        expect(result.data.document?.excludeFolders).toEqual(['old/node_modules', 'build']);

        // Legacy fields should be removed
        expect((result.data as any).document_paths).toBeUndefined();
        expect((result.data as any).exclude_folders).toBeUndefined();

        // Should have warning about field migration
        expect(result.warnings).toContain(
          expect.objectContaining({
            type: 'legacy_field_names'
          })
        );
      }
    });

    it('returns config unchanged if not legacy format', () => {
      const newConfig = {
        project: {
          name: 'New Project',
          code: 'NEW',
          startNumber: 1,
          counterFile: '.mdt-next',
          ticketsPath: 'docs/CRs'
        },
        document: {}
      };

      const result = migrateLegacyConfig(newConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(newConfig); // Should be the same object reference
        expect(result.warnings).toHaveLength(0);
      }
    });

    it('handles mixed legacy and new fields', () => {
      const mixedConfig: any = {
        project: {
          name: 'Mixed Project',
          code: 'MIX',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/CRs', // Legacy path
          ticketsPath: 'tickets' // New ticketsPath - should take precedence
        },
        document_paths: ['docs'], // Legacy
        document: { // New
          excludeFolders: ['node_modules']
        }
      };

      const result = migrateLegacyConfig(mixedConfig);

      expect(result.success).toBe(true);
      if (result.success) {
        // New fields should take precedence
        expect(result.data.project.ticketsPath).toBe('tickets');
        expect(result.data.document).toEqual({
          excludeFolders: ['node_modules'],
          paths: ['docs'] // Legacy field merged
        });

        expect(result.warnings).toContain(
          expect.objectContaining({
            type: 'mixed_format_detected'
          })
        );
      }
    });
  });

  describe('validateMigratedConfig() - Post-Migration Validation', () => {
    it('validates successfully migrated configuration', () => {
      const validLegacyConfig: any = {
        project: {
          name: 'Valid Legacy',
          code: 'VAL',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs'
        }
      };

      const migrationResult = migrateLegacyConfig(validLegacyConfig);
      expect(migrationResult.success).toBe(true);

      if (migrationResult.success) {
        const validationResult = validateMigratedConfig(migrationResult.data);
        expect(validationResult.success).toBe(true);
      }
    });

    it('identifies issues in migrated configuration', () => {
      const problematicLegacyConfig: any = {
        project: {
          name: '', // Invalid: empty name
          code: '123', // Invalid: numbers only
          startNumber: -1, // Invalid: negative
          counterFile: '',
          path: 'docs'
        }
      };

      const migrationResult = migrateLegacyConfig(problematicLegacyConfig);
      // Migration should succeed even with invalid data
      expect(migrationResult.success).toBe(true);

      if (migrationResult.success) {
        const validationResult = validateMigratedConfig(migrationResult.data);
        expect(validationResult.success).toBe(false);
        if (!validationResult.success) {
          expect(validationResult.error.issues.length).toBeGreaterThan(0);
        }
      }
    });

    it('provides specific error messages for validation failures', () => {
      const invalidConfig: any = {
        project: {
          name: 'X', // Too short
          code: 'abcdefghijklmnopqrstuvwxyz', // Too long
          startNumber: 0, // Invalid
          counterFile: '',
          path: 'docs'
        }
      };

      const migrationResult = migrateLegacyConfig(invalidConfig);
      expect(migrationResult.success).toBe(true);

      if (migrationResult.success) {
        const validationResult = validateMigratedConfig(migrationResult.data);
        expect(validationResult.success).toBe(false);
        if (!validationResult.success) {
          const issues = validationResult.error.issues;
          expect(issues.some(i => i.path.includes('name'))).toBe(true);
          expect(issues.some(i => i.path.includes('code'))).toBe(true);
          expect(issues.some(i => i.path.includes('startNumber'))).toBe(true);
        }
      }
    });
  });

  describe('Migration Edge Cases', () => {
    it('handles null/undefined configurations', () => {
      expect(migrateLegacyConfig(null).success).toBe(false);
      expect(migrateLegacyConfig(undefined).success).toBe(false);
      expect(migrateLegacyConfig({}).success).toBe(false);
    });

    it('handles missing project section', () => {
      const noProject = {
        document: {}
      };

      const result = migrateLegacyConfig(noProject as any);
      expect(result.success).toBe(false);
    });

    it('preserves metadata during migration', () => {
      const legacyWithMeta: any = {
        project: {
          name: 'Legacy with Meta',
          code: 'META',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs',
          customField: 'preserved',
          anotherField: 42
        },
        metadata: {
          version: '1.0.0',
          created: '2024-01-01'
        },
        document: {}
      };

      const result = migrateLegacyConfig(legacyWithMeta);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).metadata).toEqual(legacyWithMeta.metadata);
        expect((result.data as any).customField).toBe('preserved');
        expect((result.data as any).anotherField).toBe(42);
      }
    });

    it('handles circular references safely', () => {
      const circularConfig: any = {
        project: {
          name: 'Circular',
          code: 'CIRC',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs'
        }
      };

      // Create circular reference
      circularConfig.self = circularConfig;

      // Should not throw and should handle gracefully
      expect(() => {
        const result = migrateLegacyConfig(circularConfig);
        expect(result.success).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Migration Result Structure', () => {
    it('returns proper success structure', () => {
      const config = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs'
        },
        document: {}
      };

      const result = migrateLegacyConfig(config);

      // Should have success, data, warnings, errors properties
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('errors');

      if (result.success) {
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });

    it('collects all warnings during migration', () => {
      const configWithIssues: any = {
        project: {
          name: 'Issues',
          code: 'ISS',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs',
          ticketsPath: 'conflict' // Conflicts with legacy path
        },
        document_paths: ['docs'], // Legacy field
        exclude_folders: ['node_modules'] // Legacy field
      };

      const result = migrateLegacyConfig(configWithIssues);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings.length).toBeGreaterThan(0);

        // Check for specific warning types
        const warningTypes = result.warnings.map(w => w.type);
        expect(warningTypes).toContain('legacy_field_names');
        expect(warningTypes).toContain('mixed_format_detected');
      }
    });
  });
});