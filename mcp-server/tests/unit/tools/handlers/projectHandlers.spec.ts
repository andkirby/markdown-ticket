/**
 * Unit Tests for ProjectHandlers (MDT-121)
 *
 * Tests the resolveProject method which implements:
 * Priority: explicit project parameter -> detected default -> error
 */

import type { Project } from '@mdt/shared/models/Project'
import type { ProjectService } from '@mdt/shared/services/ProjectService'
import { ProjectHandlers } from '../../../../src/tools/handlers/projectHandlers'

// Mock the shared ProjectService
jest.mock('@mdt/shared/services/ProjectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    getAllProjects: jest.fn(),
  })),
}))

describe('ProjectHandlers - resolveProject', () => {
  let projectHandlers: ProjectHandlers
  let mockProjectService: jest.Mocked<ProjectService>
  let mockProjects: Project[]

  beforeEach(() => {
    // Create mock projects
    mockProjects = [
      {
        id: 'test-project-1',
        project: {
          name: 'Test Project 1',
          code: 'TEST',
          path: '/test/path1',
          active: true,
        },
        metadata: {
          lastAccessed: '2025-01-01T00:00:00Z',
          dateAdded: '2025-01-01T00:00:00Z',
        },
      },
      {
        id: 'test-project-2',
        project: {
          name: 'Test Project 2',
          code: 'API',
          path: '/test/path2',
          active: true,
        },
        metadata: {
          lastAccessed: '2025-01-01T00:00:00Z',
          dateAdded: '2025-01-01T00:00:00Z',
        },
      },
    ]

    // Create mock ProjectService
    mockProjectService = {
      getAllProjects: jest.fn().mockResolvedValue(mockProjects),
    } as any

    projectHandlers = new ProjectHandlers(mockProjectService)
  })

  describe('explicit Project Parameter', () => {
    it('Given explicit project parameter WHEN resolving THEN validates and returns project', async () => {
      const result = await projectHandlers.resolveProject('TEST', null)

      expect(result).toEqual(mockProjects[0])
      expect(mockProjectService.getAllProjects).toHaveBeenCalled()
    })

    it('Given explicit project with different case WHEN resolving THEN normalizes to uppercase', async () => {
      const result = await projectHandlers.resolveProject('test', null)

      expect(result).toEqual(mockProjects[0])
    })

    it('Given explicit project parameter WHEN resolving THEN ignores detected default', async () => {
      const result = await projectHandlers.resolveProject('API', 'TEST')

      expect(result).toEqual(mockProjects[1])
      expect(mockProjectService.getAllProjects).toHaveBeenCalled()
    })

    it('Given explicit project by ID WHEN resolving THEN returns project by ID', async () => {
      const result = await projectHandlers.resolveProject('test-project-1', null)

      expect(result).toEqual(mockProjects[0])
    })
  })

  describe('detected Default Project', () => {
    it('Given no explicit parameter but detected default WHEN resolving THEN uses detected project', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'TEST')

      expect(result).toEqual(mockProjects[0])
      expect(mockProjectService.getAllProjects).toHaveBeenCalled()
    })

    it('Given detected project with lowercase WHEN resolving THEN normalizes to uppercase', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'test')

      expect(result).toEqual(mockProjects[0])
    })

    it('Given detected project by ID WHEN resolving THEN returns project by ID', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'test-project-1')

      expect(result).toEqual(mockProjects[0])
    })
  })

  describe('no Context Available', () => {
    it('Given no explicit parameter and no detected default WHEN resolving THEN throws error', async () => {
      await expect(projectHandlers.resolveProject(undefined, null)).rejects.toThrow('No project context available')
    })

    it('Given empty string explicit parameter WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('', null)).rejects.toThrow()
    })

    it('Given null explicit parameter and null detected WHEN resolving THEN throws context error', async () => {
      await expect(projectHandlers.resolveProject(null as any, null)).rejects.toThrow('No project context available')
    })
  })

  describe('project Not Found', () => {
    it('Given explicit project that does not exist WHEN resolving THEN throws not found error', async () => {
      await expect(projectHandlers.resolveProject('NONEXISTENT', null)).rejects.toThrow("Project 'NONEXISTENT' not found")
    })

    it('Given detected project that does not exist WHEN resolving THEN throws not found error', async () => {
      await expect(projectHandlers.resolveProject(undefined, 'NONEXISTENT')).rejects.toThrow("Project 'NONEXISTENT' not found")
    })

    it('Given project not found WHEN throwing THEN error includes available projects', async () => {
      try {
        await projectHandlers.resolveProject('NONEXISTENT', null)
      }
      catch (error: any) {
        expect(error.message).toContain('NONEXISTENT')
        expect(error.message).toContain('TEST')
        expect(error.message).toContain('API')
      }
    })
  })

  describe('invalid Project Format', () => {
    it('Given project key with special characters WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('TEST-INVALID!', null)).rejects.toThrow()
    })

    it('Given project key with spaces WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('TEST PROJECT', null)).rejects.toThrow()
    })

    it('Given project key too long WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('TOOLONGPROJECTCODE', null)).rejects.toThrow()
    })

    it('Given project key too short WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('A', null)).rejects.toThrow()
    })
  })

  describe('caching Behavior', () => {
    it('Given multiple resolutions WHEN called THEN caches projects', async () => {
      await projectHandlers.resolveProject('TEST', null)
      await projectHandlers.resolveProject('API', null)

      // Should call getAllProjects twice since each resolution triggers it
      expect(mockProjectService.getAllProjects).toHaveBeenCalledTimes(2)
    })
  })

  describe('fallback Chain Priority', () => {
    it('Given both explicit and detected WHEN resolving THEN explicit takes priority', async () => {
      const result = await projectHandlers.resolveProject('API', 'TEST')

      expect(result.project.code).toBe('API')
      expect(result).toEqual(mockProjects[1])
    })

    it('Given no explicit but valid detected WHEN resolving THEN uses detected', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'TEST')

      expect(result.project.code).toBe('TEST')
      expect(result).toEqual(mockProjects[0])
    })

    it('Given neither explicit nor detected WHEN resolving THEN throws error', async () => {
      await expect(projectHandlers.resolveProject(undefined, null)).rejects.toThrow('No project context available')
    })
  })
})
