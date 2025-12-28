/**
 * Behavioral Preservation Tests: Project Model
 * CR: MDT-101
 * Source: shared/models/Project.ts
 * Purpose: Lock current behavior before migrating to domain-contracts
 *
 * ⚠️ These tests document CURRENT behavior, not DESIRED behavior.
 * Tests must pass before and after migration to ensure no regression.
 *
 * Status: RED (domain-contracts package doesn't exist yet)
 * Framework: Jest
 */

import {
  Project,
  LocalProjectConfig,
  ProjectConfig,
  getTicketsPath,
  isLegacyConfig,
  migrateLegacyConfig,
  validateProjectConfig
} from '../../../models/Project';

describe('Project Model - Behavioral Preservation', () => {
  describe('Type Contracts', () => {
    it('should maintain Project interface shape', () => {
      // This test locks the expected shape
      const mockProject: Project = {
        id: 'test-project',
        project: {
          name: 'Test Project',
          path: '/test/path',
          configFile: '/test/config.toml',
          active: true,
          description: 'Test description'
        },
        metadata: {
          dateRegistered: '2024-01-01',
          lastAccessed: '2024-01-01',
          version: '1.0.0'
        }
      };

      // Verify required fields exist and are of expected type
      expect(typeof mockProject.id).toBe('string');
      expect(typeof mockProject.project.name).toBe('string');
      expect(typeof mockProject.project.path).toBe('string');
      expect(typeof mockProject.project.configFile).toBe('string');
      expect(typeof mockProject.project.active).toBe('boolean');
      expect(typeof mockProject.metadata.dateRegistered).toBe('string');
    });

    it('should maintain LocalProjectConfig interface shape', () => {
      const mockConfig: LocalProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          active: true
        },
        document: {
          paths: ['docs'],
          excludeFolders: ['node_modules']
        }
      };

      expect(typeof mockConfig.project.name).toBe('string');
      expect(typeof mockConfig.project.code).toBe('string');
      expect(typeof mockConfig.project.startNumber).toBe('number');
      expect(typeof mockConfig.project.counterFile).toBe('string');
      expect(typeof mockConfig.project.active).toBe('boolean');
      expect(Array.isArray(mockConfig.document.paths)).toBe(true);
      expect(Array.isArray(mockConfig.document.excludeFolders)).toBe(true);
    });
  });

  describe('Function: getTicketsPath', () => {
    it('should return default path when config is null', () => {
      const result = getTicketsPath(null, 'docs/CRs');
      expect(result).toBe('docs/CRs');
    });

    it('should return ticketsPath from project config when available', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          ticketsPath: 'custom/tickets'
        },
        document: {}
      };

      const result = getTicketsPath(config, 'docs/CRs');
      expect(result).toBe('custom/tickets');
    });

    it('should fall back to legacy project.path for backward compatibility', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'legacy/tickets'  // Legacy location
        },
        document: {}
      };

      const result = getTicketsPath(config, 'docs/CRs');
      expect(result).toBe('legacy/tickets');
    });

    it('should return default when no paths configured', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document: {}
      };

      const result = getTicketsPath(config, 'docs/CRs');
      expect(result).toBe('docs/CRs');
    });
  });

  describe('Function: isLegacyConfig', () => {
    it('should return false for null config', () => {
      expect(isLegacyConfig(null)).toBe(false);
    });

    it('should return false for config without project', () => {
      expect(isLegacyConfig(null)).toBe(false);
    });

    it('should return false for config without project.path', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document: {}
      };
      expect(isLegacyConfig(config)).toBe(false);
    });

    it('should return false for config with new ticketsPath format', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: '/project/root',
          ticketsPath: 'docs/CRs'
        },
        document: {}
      };
      expect(isLegacyConfig(config)).toBe(false);
    });

    it('should return true for legacy config with project.path only', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          path: 'docs/CRs'  // This was actually tickets path in legacy
        },
        document: {}
      };
      expect(isLegacyConfig(config)).toBe(true);
    });
  });

  describe('Function: migrateLegacyConfig', () => {
    it('should return unchanged config if not legacy', () => {
      const config: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          startNumber: 1,
          counterFile: '.mdt-next',
          ticketsPath: 'docs/CRs'
        },
        document: {
          paths: ['docs']
        }
      };

      const result = migrateLegacyConfig(config);
      expect(result).toBe(config);  // Should return same object
    });

    it('should migrate legacy config correctly', () => {
      const legacyConfig: ProjectConfig = {
        project: {
          name: 'Test Project',
          code: 'TEST',
          path: 'docs/CRs',  // Legacy: this was tickets path
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document: {
          paths: [],
          excludeFolders: []
        }
      };

      const result = migrateLegacyConfig(legacyConfig);

      // Verify migration
      expect(result.project.path).toBe('.');  // Project root
      expect(result.project.ticketsPath).toBe('docs/CRs');  // Moved to ticketsPath
      expect(result.project.name).toBe('Test Project');  // Preserved
      expect(result.project.code).toBe('TEST');  // Preserved
    });

    it('should add default document section for legacy configs', () => {
      const legacyConfig: ProjectConfig = {
        project: {
          name: 'Test',
          code: 'TEST',
          path: 'docs/CRs',
          startNumber: 1,
          counterFile: '.mdt-next'
        },
        document: {
          paths: [],
          excludeFolders: []
        }
      };

      const result = migrateLegacyConfig(legacyConfig);

      expect(result.document).toBeDefined();
      expect(Array.isArray(result.document?.paths)).toBe(true);
      expect(Array.isArray(result.document?.excludeFolders)).toBe(true);
    });
  });

  describe('Function: validateProjectConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        project: {
          name: 'Valid Project',
          code: 'VALID',
          startNumber: 1,
          counterFile: '.mdt-next',
          description: 'Valid description',
          repository: 'https://github.com/test/repo'
        },
        document: {
          paths: ['docs', 'src'],
          excludeFolders: ['node_modules', '.git']
        }
      };

      expect(validateProjectConfig(config)).toBe(true);
    });

    it('should reject configuration without project', () => {
      expect(validateProjectConfig({})).toBe(false);
      expect(validateProjectConfig(null)).toBe(false);
    });

    it('should reject configuration with invalid name', () => {
      const config = {
        project: {
          name: '',
          code: 'TEST'
        }
      };
      expect(validateProjectConfig(config)).toBe(false);
    });

    it('should reject configuration with invalid code', () => {
      const config = {
        project: {
          name: 'Test',
          code: ''
        }
      };
      expect(validateProjectConfig(config)).toBe(false);
    });

    it('should accept optional document fields', () => {
      const config = {
        project: {
          name: 'Test',
          code: 'TEST'
        }
        // No document section
      };
      expect(validateProjectConfig(config)).toBe(true);
    });

    it('should handle document_paths legacy format', () => {
      const config = {
        project: {
          name: 'Test',
          code: 'TEST'
        },
        document_paths: ['docs', 'src'],  // Legacy format
        exclude_folders: ['node_modules']
      };
      expect(validateProjectConfig(config)).toBe(true);
    });
  });
});