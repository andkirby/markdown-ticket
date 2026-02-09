/**
 * Unit Tests for projectDetector utility (MDT-121)
 *
 * Tests the find function which searches parent directories
 * for .mdt-config.toml files.
 */

import * as path from 'node:path'

// Mock fs module before importing the module under test
const mockExistsSync = jest.fn()
jest.mock('node:fs', () => ({
  existsSync: mockExistsSync,
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
    process.cwd = mockCwd as unknown as () => string

    // Import after mocks are set up
    // eslint-disable-next-line ts/no-require-imports
    const projectDetector = require('../../../../src/tools/utils/projectDetector')
    find = projectDetector.find
  })

  afterEach(() => {
    // Restore original process.cwd
    process.cwd = originalCwd
  })

  describe('file Found Scenarios', () => {
    it('Given .mdt-config.toml in current directory WHEN finding with default depth THEN returns current path', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath === path.join('/test/project/src/nested', '.mdt-config.toml')
      })

      const result = find()

      expect(result.configPath).toBe(path.join('/test/project/src/nested', '.mdt-config.toml'))
      expect(mockExistsSync).toHaveBeenCalledTimes(1)
    })

    it('Given .mdt-config.toml in parent directory WHEN finding THEN returns parent path', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        const parentPath = path.join('/test/project/src', '.mdt-config.toml')
        return filePath === parentPath
      })

      const result = find(3)

      expect(result.configPath).toBe(path.join('/test/project/src', '.mdt-config.toml'))
    })

    it('Given .mdt-config.toml in grandparent directory WHEN finding THEN returns grandparent path', () => {
      mockExistsSync.mockImplementation((filePath: string) => {
        const grandparentPath = path.join('/test/project', '.mdt-config.toml')
        return filePath === grandparentPath
      })

      const result = find(3)

      expect(result.configPath).toBe(path.join('/test/project', '.mdt-config.toml'))
    })

    it('Given multiple configs at different levels WHEN finding THEN returns closest (most nested) one', () => {
      // Simulate finding config at parent level (first found after checking cwd)
      mockExistsSync.mockImplementation((filePath: string) => {
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
      mockExistsSync.mockReturnValue(false)

      const result = find(3)

      expect(result.configPath).toBeNull()
    })

    it('Given depth 0 and no config in cwd WHEN finding THEN returns null without searching parents', () => {
      mockExistsSync.mockReturnValue(false)

      const result = find(0)

      expect(result.configPath).toBeNull()
      // Should only check current directory once
      expect(mockExistsSync).toHaveBeenCalledTimes(1)
    })

    it('Given depth 1 and no config WHEN finding THEN checks cwd and parent only', () => {
      mockExistsSync.mockReturnValue(false)

      const result = find(1)

      expect(result.configPath).toBeNull()
      // Should check cwd (depth 0) and parent (depth 1)
      expect(mockExistsSync).toHaveBeenCalledTimes(2)
    })
  })

  describe('search Depth Behavior', () => {
    it('Given depth 0 WHEN finding THEN only checks current directory', () => {
      mockExistsSync.mockReturnValue(false)

      find(0)

      expect(mockExistsSync).toHaveBeenCalledTimes(1)
      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/test/project/src/nested', '.mdt-config.toml'))
    })

    it('Given depth 2 WHEN finding THEN checks cwd and 2 parent levels', () => {
      mockExistsSync.mockReturnValue(false)

      find(2)

      // Checks: cwd (0), parent (1), grandparent (2)
      expect(mockExistsSync).toHaveBeenCalledTimes(3)
    })

    it('Given depth parameter omitted WHEN finding THEN defaults to 3', () => {
      mockExistsSync.mockReturnValue(false)

      find()

      // Should default to depth 3, checking 4 directories (0-3)
      expect(mockExistsSync).toHaveBeenCalledTimes(4)
    })

    it('Given depth 10 WHEN finding THEN stops at filesystem root', () => {
      mockExistsSync.mockImplementation((_filePath: string) => {
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
      mockExistsSync.mockImplementation((filePath: string) => {
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
      mockExistsSync.mockImplementation((filePath: string) => {
        return filePath === '/.mdt-config.toml'
      })

      const result = find(100)

      expect(result.configPath).toBe('/.mdt-config.toml')
    })
  })

  describe('edge Cases', () => {
    it('Given custom depth value WHEN finding THEN respects exact depth', () => {
      mockExistsSync.mockReturnValue(false)

      find(5)

      // Starting from /test/project/src/nested:
      // 0: /test/project/src/nested
      // 1: /test/project/src
      // 2: /test/project
      // 3: /test
      // 4: / (root - stops here because path.dirname('/') === '/')
      // Total: 5 calls (stops before 6th due to hitting root)
      expect(mockExistsSync).toHaveBeenCalledTimes(5)
    })

    it('Given negative depth WHEN finding THEN does not search', () => {
      mockExistsSync.mockReturnValue(false)

      const result = find(-1)

      // With negative depth, the loop condition i <= depth is never true
      // so no directories are checked
      expect(result.configPath).toBeNull()
      expect(mockExistsSync).not.toHaveBeenCalled()
    })
  })
})
