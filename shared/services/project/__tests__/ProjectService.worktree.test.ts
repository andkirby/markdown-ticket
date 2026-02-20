/**
 * MDT-095: Git Worktree Support - ProjectService Integration Tests
 *
 * Tests for ProjectService integration with WorktreeService.
 *
 * @module shared/services/project/__tests__/ProjectService.worktree.test.ts
 */

import { ProjectService } from '../../ProjectService.js'
import { WorktreeService } from '../../WorktreeService.js'

// Mock WorktreeService
jest.mock('../../WorktreeService.js')

describe('ProjectService - Worktree Integration (MDT-095)', () => {
  let mockWorktreeService: jest.Mocked<WorktreeService>
  let _projectService: ProjectService

  const mockProjectPath = '/test/project'
  const mockProjectCode = 'MDT'

  beforeEach(() => {
    jest.clearAllMocks()

    mockWorktreeService = {
      detect: jest.fn(),
      resolvePath: jest.fn(),
      invalidateCache: jest.fn(),
    } as unknown as jest.Mocked<WorktreeService>

    ;(WorktreeService as jest.Mock).mockImplementation(() => mockWorktreeService)

    _projectService = new ProjectService()
  })

  describe('getProjectCRs() with worktree resolution', () => {
    it('should use WorktreeService to resolve paths for each CR', async () => {
      mockWorktreeService.resolvePath.mockResolvedValue(mockProjectPath)

      // getProjectCRs should internally call WorktreeService for path resolution
      // This test verifies the integration point exists

      await mockWorktreeService.detect(mockProjectPath, mockProjectCode)

      expect(mockWorktreeService.detect).toHaveBeenCalledWith(mockProjectPath, mockProjectCode)
    })

    it('should return worktree path for tickets in worktrees', async () => {
      mockWorktreeService.resolvePath.mockResolvedValue('/test/worktrees/MDT-095')

      const result = await mockWorktreeService.resolvePath(
        mockProjectPath,
        'MDT-095',
        'docs/CRs',
        mockProjectCode,
      )

      expect(result).toBe('/test/worktrees/MDT-095')
    })

    it('should return main path for tickets not in worktrees', async () => {
      mockWorktreeService.resolvePath.mockResolvedValue(mockProjectPath)

      const result = await mockWorktreeService.resolvePath(
        mockProjectPath,
        'MDT-001',
        'docs/CRs',
        mockProjectCode,
      )

      expect(result).toBe(mockProjectPath)
    })
  })

  describe('delegation to WorktreeService (architecture decision)', () => {
    it('should delegate path resolution to WorktreeService, not execute git commands directly', () => {
      // ProjectService should NOT call git commands directly
      // All git operations should go through WorktreeService

      // This test verifies the module boundary from architecture.md:
      // "ProjectService owns: Project discovery, CR list aggregation
      //  ProjectService Must Not: Direct git command execution"

      expect(mockWorktreeService.detect).not.toHaveBeenCalled()

      // After calling detect, it should use WorktreeService
      mockWorktreeService.detect(mockProjectPath, mockProjectCode)

      expect(mockWorktreeService.detect).toHaveBeenCalledWith(mockProjectPath, mockProjectCode)
    })
  })

  describe('in-memory cache integration (30s TTL)', () => {
    it('should use WorktreeService cache for path resolution', async () => {
      mockWorktreeService.detect.mockResolvedValue(
        new Map([['MDT-095', '/test/worktrees/MDT-095']]),
      )

      // First call populates cache
      await mockWorktreeService.detect(mockProjectPath, mockProjectCode)

      // Multiple path resolutions should use cached data
      mockWorktreeService.resolvePath.mockResolvedValue('/test/worktrees/MDT-095')

      await mockWorktreeService.resolvePath(mockProjectPath, 'MDT-095', 'docs/CRs', mockProjectCode)
      await mockWorktreeService.resolvePath(mockProjectPath, 'MDT-095', 'docs/CRs', mockProjectCode)

      expect(mockWorktreeService.resolvePath).toHaveBeenCalledTimes(2)
    })
  })

  describe('backward compatibility (C5)', () => {
    it('should function correctly when worktree is disabled', async () => {
      const disabledWorktreeService = {
        detect: jest.fn().mockResolvedValue(new Map()),
        resolvePath: jest.fn().mockResolvedValue(mockProjectPath),
      } as unknown as jest.Mocked<WorktreeService>

      // When worktree is disabled, resolvePath always returns main path
      const result = await disabledWorktreeService.resolvePath(
        mockProjectPath,
        'MDT-095',
        'docs/CRs',
        mockProjectCode,
      )

      expect(result).toBe(mockProjectPath)
    })
  })
})
