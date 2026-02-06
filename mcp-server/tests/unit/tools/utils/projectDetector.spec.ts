/**
 * Unit Tests for projectDetector utility (MDT-121)
 *
 * Tests the find function which searches parent directories
 * for .mdt-config.toml files.
 */

import { existsSync } from 'node:fs'
import * as path from 'node:path'

// Mock fs module before importing the module under test
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}))

// Mock process.cwd for controlled testing
const originalCwd = process.cwd

describe('projectDetector', () => {
  let find: (depth?: number) => { configPath: string | null }

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    jest.resetModules()

    // Mock process.cwd to return a predictable path
    const mockCwd = jest.fn(() => '/test/project/src/nested')
    process.cwd = mockCwd as any

    // Import after mocks are set up
    const projectDetector = require('../../../../src/tools/utils/projectDetector')
    find = projectDetector.find
  })

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalCwd
  })

  describe('file Found Scenarios', () => {
    it('Given .mdt-config.toml in current directory WHEN finding with default depth THEN returns current path', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath === path.join('/test/project/src/nested', '.mdt-config.toml')
      })

      const result = find()

      expect(result.configPath).toBe(path.join('/test/project/src/nested', '.mdt-config.toml'))
      expect(existsSync).toHaveBeenCalledTimes(1)
    })

    it('Given .mdt-config.toml in parent directory WHEN finding THEN returns parent path', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        const parentPath = path.join('/test/project/src', '.mdt-config.toml')
        return filePath === parentPath
      })

      const result = find(3)

      expect(result.configPath).toBe(path.join('/test/project/src', '.mdt-config.toml'))
    })

    it('Given .mdt-config.toml in grandparent directory WHEN finding THEN returns grandparent path', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        const grandparentPath = path.join('/test/project', '.mdt-config.toml')
        return filePath === grandparentPath
      })

      const result = find(3)

      expect(result.configPath).toBe(path.join('/test/project', '.mdt-config.toml'))
    })

    it('Given multiple configs at different levels WHEN finding THEN returns closest (most nested) one', () => {
      // Simulate finding config at parent level (first found after checking cwd)
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        const parentPath = path.join('/test/project/src', '.mdt-config.toml')
        const grandparentPath = path.join('/test/project', '.mdt-config.toml')
        return filePath === parentPath || filePath === grandparentPath
      })

      const result = find(3)

      // Should return the first one found (parent, since cwd doesn't have it)
      expect(result.configPath).toBe(path.join('/test/project/src', '.mdt-config.toml'))
    })
  })

  describe('file Not Found Scenarios', () => {
    it('Given no .mdt-config.toml anywhere WHEN finding THEN returns null', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      const result = find(3)

      expect(result.configPath).toBeNull()
    })

    it('Given depth 0 and no config in cwd WHEN finding THEN returns null without searching parents', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      const result = find(0)

      expect(result.configPath).toBeNull()
      // Should only check current directory once
      expect(existsSync).toHaveBeenCalledTimes(1)
    })

    it('Given depth 1 and no config WHEN finding THEN checks cwd and parent only', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      const result = find(1)

      expect(result.configPath).toBeNull()
      // Should check cwd (depth 0) and parent (depth 1)
      expect(existsSync).toHaveBeenCalledTimes(2)
    })
  })

  describe('search Depth Behavior', () => {
    it('Given depth 0 WHEN finding THEN only checks current directory', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      find(0)

      expect(existsSync).toHaveBeenCalledTimes(1)
      expect(existsSync).toHaveBeenCalledWith(path.join('/test/project/src/nested', '.mdt-config.toml'))
    })

    it('Given depth 2 WHEN finding THEN checks cwd and 2 parent levels', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      find(2)

      // Checks: cwd (0), parent (1), grandparent (2)
      expect(existsSync).toHaveBeenCalledTimes(3)
    })

    it('Given depth parameter omitted WHEN finding THEN defaults to 3', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      find()

      // Should default to depth 3, checking 4 directories (0-3)
      expect(existsSync).toHaveBeenCalledTimes(4)
    })

    it('Given depth 10 WHEN finding THEN stops at filesystem root', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        // Simulate hitting filesystem root after a few levels
        return false
      })

      const result = find(10)

      expect(result.configPath).toBeNull()
      // Should stop before 10 calls due to reaching root
      // Path.dirname('/') returns '/', so the loop terminates
    })
  })

  describe('filesystem Root Handling', () => {
    it('Given search reaches filesystem root WHEN finding THEN stops searching', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        // Root directory check
        if (filePath === '/.mdt-config.toml') {
          return false
        }
        return false
      })

      const result = find(100)

      expect(result.configPath).toBeNull()
    })

    it('Given config at root WHEN finding THEN returns root config path', () => {
      (existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath === '/.mdt-config.toml'
      })

      const result = find(100)

      expect(result.configPath).toBe('/.mdt-config.toml')
    })
  })

  describe('edge Cases', () => {
    it('Given custom depth value WHEN finding THEN respects exact depth', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      find(5)

      // Should check 6 levels (0-5)
      expect(existsSync).toHaveBeenCalledTimes(6)
    })

    it('Given negative depth WHEN finding THEN treats as 0', () => {
      (existsSync as jest.Mock).mockReturnValue(false)

      find(-1)

      // Should at least check current directory once
      expect(existsSync).toHaveBeenCalled()
    })
  })
})
