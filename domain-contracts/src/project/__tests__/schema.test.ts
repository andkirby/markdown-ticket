/**
 * Schema Business Rules Tests
 * Testing OUR rules, not Zod's functionality
 */

import { z } from 'zod';

// Import schemas to be tested
import {
  ProjectSchema,
  DocumentConfigSchema,
} from '../schema';

describe('ProjectSchema', () => {
  // Testing OUR regex rule for code field
  describe('code format', () => {
    // Valid cases - our rule accepts these
    it('accepts MIN boundary (2 chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'MD',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).not.toThrow();
    });

    it('accepts MAX boundary (5 chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'Z9999',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).not.toThrow();
    });

    it('accepts middle range (3-4 chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'MDT',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).not.toThrow();

      expect(() => ProjectSchema.parse({
        code: 'WEB1',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).not.toThrow();
    });

    // Invalid cases - our rule rejects these
    it('rejects below MIN (1 char)', () => {
      expect(() => ProjectSchema.parse({
        code: 'M',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).toThrow(/2-5 chars/);
    });

    it('rejects above MAX (6+ chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'TOOLONG',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).toThrow();
    });

    it('rejects wrong format (lowercase)', () => {
      expect(() => ProjectSchema.parse({
        code: 'mdt',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).toThrow(/uppercase/);
    });

    it('rejects wrong format (special chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'MD_1',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      })).toThrow();
    });
  });

  // Testing OUR length rule for name field
  describe('name length', () => {
    it('accepts MIN boundary (3 chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'MDT',
        name: 'ABC',
        id: 'test',
        ticketsPath: './cr',
      })).not.toThrow();
    });

    it('rejects below MIN (2 chars)', () => {
      expect(() => ProjectSchema.parse({
        code: 'MDT',
        name: 'AB',
        id: 'test',
        ticketsPath: './cr',
      })).toThrow(/at least 3/);
    });

    // Don't test empty string - that's Zod's job
  });

  // Testing OUR design choice for optional fields
  describe('optional fields', () => {
    it('accepts missing description', () => {
      const result = ProjectSchema.parse({
        code: 'MDT',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      });
      expect(result.description).toBeUndefined();
    });

    it('accepts missing repository', () => {
      const result = ProjectSchema.parse({
        code: 'MDT',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      });
      expect(result.repository).toBeUndefined();
    });

    it('accepts all optional fields', () => {
      const result = ProjectSchema.parse({
        code: 'MDT',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
        description: 'A project',
        repository: 'https://github.com/example/repo',
      });
      expect(result.description).toBe('A project');
      expect(result.repository).toBe('https://github.com/example/repo');
    });
  });

  // Testing OUR default value choice
  describe('default values', () => {
    it('defaults active to true', () => {
      const result = ProjectSchema.parse({
        code: 'MDT',
        name: 'Test Project',
        id: 'test',
        ticketsPath: './cr',
      });
      expect(result.active).toBe(true);
    });
  });
});

describe('DocumentConfigSchema', () => {
  // Testing OUR path validation rules
  describe('path security rules', () => {
    it('rejects parent directory references', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['../../../etc/passwd'],
        excludeFolders: ['node_modules'],
      })).toThrow(/Parent directory/);
    });

    it('rejects absolute paths', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['/etc/passwd'],
        excludeFolders: ['node_modules'],
      })).toThrow(/Absolute paths/);
    });

    // Valid cases
    it('accepts relative paths', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md', './cr'],
        excludeFolders: ['node_modules'],
      })).not.toThrow();
    });
  });

  // Testing OUR folder validation rule
  describe('exclude folders rule', () => {
    it('rejects paths with separators', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['path/to/folder'],
      })).toThrow(/folder names, not paths/);
    });

    // Valid cases
    it('accepts simple folder names', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules', '.git', 'dist'],
      })).not.toThrow();
    });
  });

  // Testing OUR range rule
  describe('maxDepth range', () => {
    it('accepts MIN boundary (1)', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 1,
      })).not.toThrow();
    });

    it('accepts MAX boundary (10)', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 10,
      })).not.toThrow();
    });

    it('rejects below MIN (0)', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 0,
      })).toThrow();
    });

    it('rejects above MAX (11)', () => {
      expect(() => DocumentConfigSchema.parse({
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 11,
      })).toThrow();
    });
  });
});