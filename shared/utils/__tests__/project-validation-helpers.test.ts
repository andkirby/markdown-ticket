/**
 * Unit tests for project validation helpers
 */

import type { Project } from '../../models/Project.js'
import { describe, expect, it } from '@jest/globals'
import { fileExists } from '../file-utils.js'
import {
  validateConfigExists,
  validateNoDuplicateByCode,
  validateProjectIdMatchesDirectory,
} from '../project-validation-helpers.js'

// Mock file-utils
jest.mock('../file-utils.js')

/**
 * Create a mock project for testing validation functions
 * Creates a complete Project object with only the relevant fields customized
 */
function createMockProject(overrides: {
  id?: string
  code?: string
}): Project {
  return {
    id: overrides.id || 'temp-id',
    project: {
      id: overrides.id,
      name: 'Test Project',
      code: overrides.code,
      path: '/test/path',
      configFile: '/test/path/.mdt-config.toml',
      active: true,
      description: 'Test project description',
    },
    metadata: {
      dateRegistered: '2024-01-01',
      lastAccessed: '2024-01-01',
      version: '1.0.0',
    },
  }
}

describe('validateProjectIdMatchesDirectory', () => {
  describe('when ID matches directory name', () => {
    it('should return true for exact match', () => {
      expect(validateProjectIdMatchesDirectory('myproject', 'myproject')).toBe(true)
    })

    it('should return true for case-insensitive match', () => {
      expect(validateProjectIdMatchesDirectory('MyProject', 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory('MYPROJECT', 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory('myproject', 'MyProject')).toBe(true)
      expect(validateProjectIdMatchesDirectory('My-Project', 'my-project')).toBe(true)
    })

    it('should handle special characters in ID', () => {
      expect(validateProjectIdMatchesDirectory('my-project', 'my-project')).toBe(true)
      expect(validateProjectIdMatchesDirectory('my_project', 'my_project')).toBe(true)
      expect(validateProjectIdMatchesDirectory('my.project', 'my.project')).toBe(true)
    })
  })

  describe('when ID does not match directory name', () => {
    it('should return false for different ID', () => {
      expect(validateProjectIdMatchesDirectory('different-id', 'myproject')).toBe(false)
      expect(validateProjectIdMatchesDirectory('myproject1', 'myproject2')).toBe(false)
    })

    it('should be case-sensitive for mismatches', () => {
      expect(validateProjectIdMatchesDirectory('Different-Project', 'myproject')).toBe(false)
      expect(validateProjectIdMatchesDirectory('myproject', 'different-project')).toBe(false)
    })
  })

  describe('when ID is undefined', () => {
    it('should return true (no explicit ID to validate)', () => {
      expect(validateProjectIdMatchesDirectory(undefined, 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory(undefined, 'any-directory')).toBe(true)
    })

    it('should handle empty directory name', () => {
      expect(validateProjectIdMatchesDirectory(undefined, '')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(validateProjectIdMatchesDirectory('', '')).toBe(true)
      expect(validateProjectIdMatchesDirectory('myproject', '')).toBe(false)
      expect(validateProjectIdMatchesDirectory('', 'myproject')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(validateProjectIdMatchesDirectory('myproject', 'myproject')).toBe(true)
      expect(validateProjectIdMatchesDirectory(' myproject ', 'myproject')).toBe(false)
      expect(validateProjectIdMatchesDirectory('myproject', ' myproject')).toBe(false)
    })

    it('should handle unicode characters', () => {
      expect(validateProjectIdMatchesDirectory('проект', 'проект')).toBe(true)
      expect(validateProjectIdMatchesDirectory('プロジェクト', 'プロジェクト')).toBe(true)
    })
  })
})

describe('validateNoDuplicateByCode', () => {
  describe('when no duplicates exist', () => {
    it('should return true for unique codes', () => {
      const projects = [
        createMockProject({ id: 'proj1', code: 'AAA' }),
        createMockProject({ id: 'proj2', code: 'BBB' }),
        createMockProject({ id: 'proj3', code: 'CCC' }),
      ]
      expect(validateNoDuplicateByCode('DDD', projects)).toBe(true)
    })

    it('should return true when code is undefined', () => {
      const projects = [
        createMockProject({ id: 'proj1', code: 'AAA' }),
        createMockProject({ id: 'proj2', code: 'BBB' }),
      ]
      expect(validateNoDuplicateByCode(undefined, projects)).toBe(true)
    })

    it('should return true for empty project list', () => {
      expect(validateNoDuplicateByCode('AAA', [])).toBe(true)
    })
  })

  describe('when duplicates exist', () => {
    it('should return false for existing code', () => {
      const projects = [
        createMockProject({ id: undefined, code: 'AAA' }),
        createMockProject({ id: undefined, code: 'BBB' }),
      ]
      expect(validateNoDuplicateByCode('AAA', projects)).toBe(false)
    })

    it('should be case-insensitive', () => {
      const projects = [
        createMockProject({ id: undefined, code: 'AAA' }),
        createMockProject({ id: undefined, code: 'BBB' }),
      ]
      expect(validateNoDuplicateByCode('aaa', projects)).toBe(false)
      expect(validateNoDuplicateByCode('AaA', projects)).toBe(false)
      expect(validateNoDuplicateByCode('BBB', projects)).toBe(false)
    })

    it('should only check projects without explicit ID', () => {
      const projects = [
        createMockProject({ id: 'proj1', code: 'AAA' }), // Has ID
        createMockProject({ id: undefined, code: 'BBB' }), // No ID - should match
        createMockProject({ id: 'proj3', code: 'CCC' }),
      ]
      expect(validateNoDuplicateByCode('BBB', projects)).toBe(false)
      expect(validateNoDuplicateByCode('AAA', projects)).toBe(true) // Has ID, so not a duplicate
    })
  })

  describe('edge cases', () => {
    it('should handle projects without code', () => {
      const projects = [
        createMockProject({ id: undefined, code: undefined }),
        createMockProject({ id: undefined, code: 'AAA' }),
      ]
      expect(validateNoDuplicateByCode('AAA', projects)).toBe(false)
      expect(validateNoDuplicateByCode(undefined, projects)).toBe(true)
    })

    it('should handle mixed codes and undefined codes', () => {
      const projects = [
        createMockProject({ id: 'proj1', code: 'AAA' }),
        createMockProject({ id: undefined, code: undefined }),
        createMockProject({ id: undefined, code: 'BBB' }),
      ]
      expect(validateNoDuplicateByCode('BBB', projects)).toBe(false)
      expect(validateNoDuplicateByCode('CCC', projects)).toBe(true)
    })

    it('should handle special characters in codes', () => {
      const projects = [
        createMockProject({ id: undefined, code: 'A-B-C' }),
        createMockProject({ id: 'proj2', code: 'X_Y_Z' }),
      ]
      expect(validateNoDuplicateByCode('a-b-c', projects)).toBe(false)
    })
  })
})

describe('validateConfigExists', () => {
  describe('when config exists', () => {
    beforeEach(() => {
      jest.mocked(fileExists).mockReturnValue(true)
    })

    it('should return true for existing file', () => {
      expect(validateConfigExists('/path/to/.mdt-config.toml')).toBe(true)
    })

    it('should call fileExists with correct path', () => {
      validateConfigExists('/test/path/config.toml')
      expect(fileExists).toHaveBeenCalledWith('/test/path/config.toml')
    })
  })

  describe('when config does not exist', () => {
    beforeEach(() => {
      jest.mocked(fileExists).mockReturnValue(false)
    })

    it('should return false for non-existent file', () => {
      expect(validateConfigExists('/path/to/nonexistent.toml')).toBe(false)
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should handle empty path', () => {
      jest.mocked(fileExists).mockReturnValue(false)
      expect(validateConfigExists('')).toBe(false)
      expect(fileExists).toHaveBeenCalledWith('')
    })

    it('should handle paths with special characters', () => {
      jest.mocked(fileExists).mockReturnValue(true)
      expect(validateConfigExists('/path/to/my-project/config.toml')).toBe(true)
      expect(validateConfigExists('/path/to/my project/config.toml')).toBe(true)
    })

    it('should handle relative and absolute paths', () => {
      jest.mocked(fileExists).mockReturnValue(true)
      expect(validateConfigExists('./.mdt-config.toml')).toBe(true)
      expect(validateConfigExists('/absolute/path/.mdt-config.toml')).toBe(true)
    })
  })
})
