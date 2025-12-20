/**
 * MDT-101 Phase 1.1: Project Validation Tests
 *
 * These tests implement the enhanced validation rules for ProjectSchema.
 * All tests are written in RED state - they will fail until the validation
 * module is implemented in src/validation/project.ts
 */

import { z } from 'zod';
import {
  validateProjectCode,
  validateProjectPath,
  validateCrossFieldConsistency,
  validateDocumentConfiguration,
  ProjectValidationOptions
} from './project';

// Import schemas for testing (these will be implemented)
import { LocalProjectConfigSchema } from '../project/schema';

describe('Project Custom Validation Rules', () => {
  describe('Code Pattern Validation', () => {
    describe('validateProjectCode()', () => {
      it('accepts valid 3-character uppercase codes', () => {
        const validCodes = ['MDT', 'API', 'WEB', 'UIX', 'DEV'];
        validCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data).toBe(code);
          }
        });
      });

      it('accepts valid 5-character uppercase codes', () => {
        const validCodes = ['FRONT', 'BACK1', 'DATA2'];
        validCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(true);
        });
      });

      it('rejects lowercase codes', () => {
        const invalidCodes = ['mdt', 'api', 'Web', 'web'];
        invalidCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('uppercase');
          }
        });
      });

      it('rejects codes with special characters', () => {
        const invalidCodes = ['MDT-1', 'API_1', 'WEB.1', 'M@T'];
        invalidCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(false);
        });
      });

      it('rejects codes that are too short', () => {
        const invalidCodes = ['A', 'AB'];
        invalidCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('at least 3');
          }
        });
      });

      it('rejects codes that are too long', () => {
        const invalidCodes = ['TOOLONG', 'VERYLONG'];
        invalidCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('no more than 5');
          }
        });
      });

      it('rejects reserved system codes', () => {
        const reservedCodes = ['SYS', 'ADMIN', 'ROOT', 'SYSTEM'];
        reservedCodes.forEach(code => {
          const result = validateProjectCode(code);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('reserved');
          }
        });
      });

      it('checks for code uniqueness against existing projects', () => {
        const existingCodes = ['MDT', 'API', 'WEB'];
        const options: ProjectValidationOptions = {
          existingCodes
        };

        // Unique code should pass
        let result = validateProjectCode('NEW', options);
        expect(result.success).toBe(true);

        // Duplicate code should fail
        result = validateProjectCode('MDT', options);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('already exists');
        }
      });
    });
  });

  describe('Path Validation', () => {
    describe('validateProjectPath()', () => {
      it('accepts valid relative paths', () => {
        const validPaths = [
          'docs',
          'docs/CRs',
          'src/components',
          './relative',
          '../sibling',
          'deeply/nested/path/structure'
        ];

        validPaths.forEach(path => {
          const result = validateProjectPath(path);
          expect(result.success).toBe(true);
        });
      });

      it('rejects absolute paths in LocalProjectConfig', () => {
        const absolutePaths = [
          '/absolute/path',
          '/docs/CRs',
          'C:\\windows\\path',
          'C:/windows/path'
        ];

        absolutePaths.forEach(path => {
          const result = validateProjectPath(path, { allowAbsolute: false });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('relative');
          }
        });
      });

      it('rejects paths with parent directory references', () => {
        const unsafePaths = [
          '../../../etc/passwd',
          'docs/../../../secret',
          '../outside/project'
        ];

        unsafePaths.forEach(path => {
          const result = validateProjectPath(path);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues[0].message).toContain('parent directory');
          }
        });
      });

      it('rejects empty paths', () => {
        const result = validateProjectPath('');
        expect(result.success).toBe(false);
      });

      it('allows absolute paths in unified Project context', () => {
        const absolutePath = '/Users/user/projects/my-project';
        const result = validateProjectPath(absolutePath, { allowAbsolute: true });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(absolutePath);
        }
      });

      it('validates path characters', () => {
        const invalidPaths = [
          'path with spaces',
          'path\twith\ttabs',
          'path\nwith\nnewlines',
          'path*with*asterisks',
          'path?with?questions',
          'path|with|pipes',
          'path<with>brackets'
        ];

        invalidPaths.forEach(path => {
          const result = validateProjectPath(path);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('ticketsPath validation', () => {
      it('validates ticketsPath separately from project path', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next',
            ticketsPath: 'custom/tickets'
          },
          document: {}
        };

        const result = LocalProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      });

      it('warns when ticketsPath conflicts with excludeFolders', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next',
            ticketsPath: 'docs'
          },
          document: {
            paths: ['docs'],
            excludeFolders: ['docs']
          }
        };

        // This should pass validation but include a warning
        const result = LocalProjectConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
        // TODO: Add warning validation when implemented
      });
    });
  });

  describe('Cross-Field Validation', () => {
    describe('validateCrossFieldConsistency()', () => {
      it('requires operational fields when project is active', () => {
        const activeConfig = {
          project: {
            name: 'Active Project',
            code: 'ACT',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: true,
            // Missing operational fields
          },
          document: {}
        };

        const result = validateCrossFieldConsistency(activeConfig);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.length).toBeGreaterThan(0);
        }
      });

      it('makes operational fields optional when project is inactive', () => {
        const inactiveConfig = {
          project: {
            name: 'Inactive Project',
            code: 'INACT',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: false
          },
          document: {}
        };

        const result = validateCrossFieldConsistency(inactiveConfig);
        expect(result.success).toBe(true);
      });

      it('validates active project with all required fields', () => {
        const validActiveConfig = {
          project: {
            name: 'Valid Active Project',
            code: 'VALID',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: true,
            ticketsPath: 'docs/CRs'
          },
          document: {
            paths: ['docs']
          }
        };

        const result = validateCrossFieldConsistency(validActiveConfig);
        expect(result.success).toBe(true);
      });

      it('validates legacy vs new format detection', () => {
        const legacyConfig = {
          project: {
            name: 'Legacy Project',
            code: 'LEG',
            startNumber: 1,
            counterFile: '.mdt-next',
            path: 'docs/CRs' // This was actually tickets path
          },
          document: {}
        };

        const newConfig = {
          project: {
            name: 'New Project',
            code: 'NEW',
            startNumber: 1,
            counterFile: '.mdt-next',
            path: '.', // Project root
            ticketsPath: 'docs/CRs' // Explicit tickets path
          },
          document: {}
        };

        // Should detect legacy format correctly
        const legacyResult = validateCrossFieldConsistency(legacyConfig);
        expect(legacyResult.success).toBe(true);

        // Should validate new format correctly
        const newResult = validateCrossFieldConsistency(newConfig);
        expect(newResult.success).toBe(true);
      });
    });
  });

  describe('Document Configuration Validation', () => {
    describe('validateDocumentConfiguration()', () => {
      it('validates empty document configuration', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next'
          },
          document: {}
        };

        const result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(true);
      });

      it('validates complete document configuration', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next'
          },
          document: {
            paths: ['docs', 'src', 'tests'],
            excludeFolders: ['node_modules', '.git', 'dist'],
            maxDepth: 5
          }
        };

        const result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(true);
      });

      it('validates paths are strings', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next'
          },
          document: {
            paths: ['docs', 123, 'src'] // Invalid number in paths
          }
        };

        const result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('string');
        }
      });

      it('validates maxDepth is reasonable', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next'
          },
          document: {
            maxDepth: 0 // Invalid - should be at least 1
          }
        };

        const result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(false);

        // Test reasonable maximum
        config.document.maxDepth = 100; // Too high
        result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(false);

        // Test valid range
        config.document.maxDepth = 10;
        result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(true);
      });

      it('warns about redundant exclusions', () => {
        const config = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 1,
            counterFile: '.mdt-next'
          },
          document: {
            paths: ['docs', 'src'],
            excludeFolders: ['docs', 'node_modules'] // 'docs' is in both
          }
        };

        const result = validateDocumentConfiguration(config.document);
        expect(result.success).toBe(true);
        // TODO: Add warning validation for redundant exclusions
      });
    });
  });

  describe('Integration with Zod Schema', () => {
    it('integrates custom validation with LocalProjectConfigSchema', () => {
      // This test verifies that custom validation can be integrated
      // with the main Zod schema through refine() or superRefine()

      const validConfig = {
        project: {
          name: 'Integration Test',
          code: 'INT',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true,
          ticketsPath: 'docs/CRs'
        },
        document: {
          paths: ['docs'],
          maxDepth: 5
        }
      };

      // Schema with custom validation integrated
      const EnhancedProjectSchema = LocalProjectConfigSchema
        .refine(data => validateCrossFieldConsistency(data).success, {
          message: 'Cross-field validation failed'
        })
        .refine(data => validateDocumentConfiguration(data.document).success, {
          message: 'Document configuration invalid'
        });

      const result = EnhancedProjectSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
  });
});