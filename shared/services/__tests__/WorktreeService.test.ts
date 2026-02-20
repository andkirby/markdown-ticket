/**
 * MDT-095: Git Worktree Support - WorktreeService Unit Tests
 *
 * Tests for worktree detection, ticket code extraction, path resolution, and caching.
 *
 * @module shared/services/__tests__/WorktreeService.test.ts
 */

/* eslint-disable ts/no-explicit-any -- Jest mock return values require 'as any' type assertions */

import { execFile } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'

import { WorktreeService } from '../WorktreeService'

// Mock child_process. Set promisify.custom on execFile so that
// promisify(execFile) returns execFile itself (3-arg Promise-returning fn),
// making mockResolvedValueOnce work correctly without adding a callback arg.
jest.mock('node:child_process', () => {
  const { promisify } = require('node:util')
  const execFileMock = jest.fn()
  execFileMock[promisify.custom] = execFileMock
  return { execFile: execFileMock }
})

// Type assertion for mocked execFile
const mockExecFile = execFile as unknown as jest.Mock

// Helper to create temp directory structure
async function createTempDir(baseName: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp-test', baseName)
  return tempDir
}

// Helper to clean up temp directory
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true })
  }
  catch {
    // Ignore cleanup errors
  }
}

describe('WorktreeService', () => {
  let worktreeService: WorktreeService
  const mockProjectPath = '/test/project'
  const mockProjectCode = 'MDT'

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    worktreeService = new WorktreeService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('detect()', () => {
    it('should parse git worktree list output and extract ticket codes from branch names', async () => {
      // C1: Worktree detection completes within 100ms
      const porcelainOutput = `worktree /test/project
HEAD abc123
branch refs/heads/main

worktree /test/worktrees/MDT-095
HEAD def456
branch refs/heads/feature/MDT-095

worktree /test/worktrees/MDT-100
HEAD ghi789
branch refs/heads/bugfix/MDT-100
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.size).toBe(2)
      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095')
      expect(result.get('MDT-100')).toBe('/test/worktrees/MDT-100')
    })

    it('should handle git worktree list command failure gracefully', async () => {
      // C4: Failure in worktree detection never blocks core operations
      mockExecFile.mockRejectedValueOnce(new Error('git command failed'))

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.size).toBe(0)
    })

    it('should return empty map when no worktrees exist', async () => {
      const porcelainOutput = `worktree /test/project
HEAD abc123
branch refs/heads/main
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.size).toBe(0)
    })

    it('should ignore worktrees without matching ticket code pattern', async () => {
      const porcelainOutput = `worktree /test/project
HEAD abc123
branch refs/heads/main

worktree /test/worktrees/random-branch
HEAD def456
branch refs/heads/feature/some-feature

worktree /test/worktrees/MDT-095
HEAD ghi789
branch refs/heads/feature/MDT-095
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.size).toBe(1)
      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095')
    })

    it('should use execFile (not shell strings) to prevent command injection (C6)', async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any)

      await worktreeService.detect(mockProjectPath, mockProjectCode)

      // Verify execFile was called, not exec
      expect(mockExecFile).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['worktree', 'list', '--porcelain']),
        expect.any(Object),
      )
    })
  })

  describe('ticket code extraction from branch names', () => {
    it('should extract ticket code from feature/ prefix', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095
HEAD abc123
branch refs/heads/feature/MDT-095
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095')
    })

    it('should extract ticket code from bugfix/ prefix', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-100
HEAD abc123
branch refs/heads/bugfix/MDT-100
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.get('MDT-100')).toBe('/test/worktrees/MDT-100')
    })

    it('should extract ticket code from bare branch name', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095
HEAD abc123
branch refs/heads/MDT-095
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095')
    })

    it('should use first worktree when multiple worktrees have same ticket code (BR-8 edge case)', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095-first
HEAD abc123
branch refs/heads/feature/MDT-095

worktree /test/worktrees/MDT-095-second
HEAD def456
branch refs/heads/bugfix/MDT-095
`

      mockExecFile.mockResolvedValueOnce({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095-first')
    })
  })

  describe('resolvePath()', () => {
    it('should return worktree path when worktree exists and ticket file exists', async () => {
      const tempWorktreePath = await createTempDir('worktree-test-1')
      const tempTicketsPath = path.join(tempWorktreePath, 'docs', 'CRs')

      try {
        // Create temp directory structure
        const { mkdir } = await import('node:fs/promises')
        await mkdir(tempTicketsPath, { recursive: true })

        // Create ticket file
        const { writeFile } = await import('node:fs/promises')
        await writeFile(path.join(tempTicketsPath, 'MDT-095.md'), '# Test')

        const porcelainOutput = `worktree ${tempWorktreePath}
HEAD abc123
branch refs/heads/feature/MDT-095
`

        mockExecFile.mockResolvedValueOnce({
          stdout: porcelainOutput,
          stderr: '',
        } as any)

        // First detect to populate cache
        await worktreeService.detect(mockProjectPath, mockProjectCode)

        const result = await worktreeService.resolvePath(
          mockProjectPath,
          'MDT-095',
          'docs/CRs',
          mockProjectCode,
        )

        expect(result).toBe(tempWorktreePath)
      }
      finally {
        await cleanupTempDir(tempWorktreePath)
      }
    })

    it('should return main project path when no worktree exists', async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as any)

      await worktreeService.detect(mockProjectPath, mockProjectCode)

      const result = await worktreeService.resolvePath(
        mockProjectPath,
        'MDT-095',
        'docs/CRs',
        mockProjectCode,
      )

      expect(result).toBe(mockProjectPath)
    })

    it('should return main project path when worktree exists but ticket file does not', async () => {
      const tempWorktreePath = await createTempDir('worktree-test-2')
      const tempTicketsPath = path.join(tempWorktreePath, 'docs', 'CRs')

      try {
        // Create temp directory structure without ticket file
        const { mkdir } = await import('node:fs/promises')
        await mkdir(tempTicketsPath, { recursive: true })

        // Create other file, not the ticket file
        const { writeFile } = await import('node:fs/promises')
        await writeFile(path.join(tempTicketsPath, 'OTHER-123.md'), '# Test')

        const porcelainOutput = `worktree ${tempWorktreePath}
HEAD abc123
branch refs/heads/feature/MDT-095
`

        mockExecFile.mockResolvedValueOnce({
          stdout: porcelainOutput,
          stderr: '',
        } as any)

        await worktreeService.detect(mockProjectPath, mockProjectCode)

        const result = await worktreeService.resolvePath(
          mockProjectPath,
          'MDT-095',
          'docs/CRs',
          mockProjectCode,
        )

        expect(result).toBe(mockProjectPath)
      }
      finally {
        await cleanupTempDir(tempWorktreePath)
      }
    })

    it('should return main project path when worktree support is disabled', async () => {
      const worktreeServiceDisabled = new WorktreeService({ enabled: false })

      const result = await worktreeServiceDisabled.resolvePath(
        mockProjectPath,
        'MDT-095',
        'docs/CRs',
        mockProjectCode,
      )

      expect(result).toBe(mockProjectPath)
    })
  })

  describe('caching (C7: 30s TTL)', () => {
    it('should cache worktree mapping for 30 seconds', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095
HEAD abc123
branch refs/heads/feature/MDT-095
`

      mockExecFile.mockResolvedValue({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      // First call
      await worktreeService.detect(mockProjectPath, mockProjectCode)
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Second call within TTL - should use cache
      await worktreeService.detect(mockProjectPath, mockProjectCode)
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Advance past TTL (30s)
      jest.advanceTimersByTime(31000)

      // Third call after TTL - should refresh
      await worktreeService.detect(mockProjectPath, mockProjectCode)
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })

    it('should invalidate cache on demand', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095
HEAD abc123
branch refs/heads/feature/MDT-095
`

      mockExecFile.mockResolvedValue({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      await worktreeService.detect(mockProjectPath, mockProjectCode)
      expect(mockExecFile).toHaveBeenCalledTimes(1)

      // Invalidate cache
      worktreeService.invalidateCache(mockProjectPath)

      // Next call should refresh
      await worktreeService.detect(mockProjectPath, mockProjectCode)
      expect(mockExecFile).toHaveBeenCalledTimes(2)
    })

    it('should use stale data until fresh data available (never block)', async () => {
      const porcelainOutput = `worktree /test/worktrees/MDT-095
HEAD abc123
branch refs/heads/feature/MDT-095
`

      mockExecFile.mockResolvedValue({
        stdout: porcelainOutput,
        stderr: '',
      } as any)

      await worktreeService.detect(mockProjectPath, mockProjectCode)

      // Advance past TTL
      jest.advanceTimersByTime(31000)

      // Make git command hang - should still return stale data
      mockExecFile.mockImplementation(() => new Promise(() => {}))

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      // Should return cached data even if refresh is pending
      expect(result.get('MDT-095')).toBe('/test/worktrees/MDT-095')
    })
  })

  describe('scalability (C3: 10+ worktrees)', () => {
    it('should handle 10+ concurrent worktrees', async () => {
      // Generate porcelain output for 15 worktrees
      const worktrees = Array.from({ length: 15 }, (_, i) => {
        const code = `MDT-${String(100 + i).padStart(3, '0')}`
        return `worktree /test/worktrees/${code}
HEAD ${code.toLowerCase()}
branch refs/heads/feature/${code}
`
      }).join('\n')

      mockExecFile.mockResolvedValueOnce({
        stdout: worktrees,
        stderr: '',
      } as any)

      const result = await worktreeService.detect(mockProjectPath, mockProjectCode)

      expect(result.size).toBe(15)
      expect(result.get('MDT-100')).toBe('/test/worktrees/MDT-100')
      expect(result.get('MDT-114')).toBe('/test/worktrees/MDT-114')
    })
  })
})
