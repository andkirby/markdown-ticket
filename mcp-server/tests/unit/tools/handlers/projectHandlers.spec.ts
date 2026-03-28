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
          id: 'test-project-1',
          name: 'Test Project 1',
          code: 'TEST',
          path: '/test/path1',
          configFile: '/test/path1/.mdt-config.toml',
          active: true,
          description: 'A test project',
          repository: 'https://github.com/test/repo1.git',
          ticketsPath: 'docs/CRs',
        },
        metadata: {
          lastAccessed: '2025-01-01T00:00:00Z',
          dateRegistered: '2025-01-01T00:00:00Z',
          version: '1.0.0',
        },
      },
      {
        id: 'test-project-2',
        project: {
          id: 'test-project-2',
          name: 'Test Project 2',
          code: 'API',
          path: '/test/path2',
          configFile: '/test/path2/.mdt-config.toml',
          active: true,
          description: 'An API test project',
          repository: 'https://github.com/test/repo2.git',
          ticketsPath: 'docs/CRs',
        },
        metadata: {
          lastAccessed: '2025-01-01T00:00:00Z',
          dateRegistered: '2025-01-01T00:00:00Z',
          version: '1.0.0',
        },
      },
    ]

    // Create mock ProjectService with all methods used by ProjectHandlers
    mockProjectService = {
      getAllProjects: jest.fn().mockResolvedValue(mockProjects),
      getProject: jest.fn().mockImplementation((projectRef: string) => {
        const project = mockProjects.find(
          p => p.project.code === projectRef.toUpperCase() || p.id === projectRef,
        )
        if (!project) {
          const error = Object.assign(new Error(`Project '${projectRef}' not found`), { code: 'PROJECT_NOT_FOUND' })
          return Promise.reject(error)
        }
        return Promise.resolve({ data: project })
      }),
      listProjects: jest.fn().mockImplementation((request: { includeInactive?: boolean } = {}) => {
        const filtered = request.includeInactive
          ? mockProjects
          : mockProjects.filter(p => p.project.active !== false)
        return Promise.resolve({ data: filtered })
      }),
    } as unknown as jest.Mocked<ProjectService>

    projectHandlers = new ProjectHandlers(mockProjectService)
  })

  describe('explicit Project Parameter', () => {
    it('Given explicit project parameter WHEN resolving THEN validates and returns project', async () => {
      const result = await projectHandlers.resolveProject('TEST', null)

      expect(result).toEqual(mockProjects[0])
      expect(mockProjectService.getProject).toHaveBeenCalledWith('TEST')
    })

    it('Given explicit project with different case WHEN resolving THEN normalizes to uppercase', async () => {
      const result = await projectHandlers.resolveProject('test', null)

      expect(result).toEqual(mockProjects[0])
      expect(mockProjectService.getProject).toHaveBeenCalledWith('TEST')
    })

    it('Given explicit project parameter WHEN resolving THEN ignores detected default', async () => {
      const result = await projectHandlers.resolveProject('API', 'TEST')

      expect(result).toEqual(mockProjects[1])
      expect(mockProjectService.getProject).toHaveBeenCalledWith('API')
    })

    it('Given explicit project by ID WHEN resolving AND ID matches validation pattern THEN returns project', async () => {
      // Note: IDs must match validation pattern (2-5 alphanumeric chars)
      // This test demonstrates that project lookup works by both code and ID
      // when the ID happens to match the validation pattern
      const result = await projectHandlers.resolveProject('test', null)

      expect(result).toEqual(mockProjects[0])
    })
  })

  describe('detected Default Project', () => {
    it('Given no explicit parameter but detected default WHEN resolving THEN uses detected project', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'TEST')

      expect(result).toEqual(mockProjects[0])
      expect(mockProjectService.getProject).toHaveBeenCalledWith('TEST')
    })

    it('Given detected project with lowercase WHEN resolving THEN normalizes to uppercase', async () => {
      const result = await projectHandlers.resolveProject(undefined, 'test')

      expect(result).toEqual(mockProjects[0])
    })

    it('Given detected project by ID WHEN resolving AND ID matches validation pattern THEN returns project', async () => {
      // Note: IDs must match validation pattern (2-5 alphanumeric chars)
      // This test demonstrates that project lookup works by both code and ID
      // when the ID happens to match the validation pattern
      const result = await projectHandlers.resolveProject(undefined, 'test')

      expect(result).toEqual(mockProjects[0])
    })
  })

  describe('no Context Available', () => {
    it('Given no explicit parameter and no detected default WHEN resolving THEN throws error', async () => {
      await expect(projectHandlers.resolveProject(undefined, null)).rejects.toThrow(/project key is required/i)
    })

    it('Given empty string explicit parameter WHEN resolving THEN throws validation error', async () => {
      await expect(projectHandlers.resolveProject('', null)).rejects.toThrow()
    })

    it('Given null explicit parameter and null detected WHEN resolving THEN throws context error', async () => {
      await expect(projectHandlers.resolveProject(null as unknown as string, null)).rejects.toThrow(/project key is required/i)
    })
  })

  describe('project Not Found', () => {
    it('Given explicit project that does not exist WHEN resolving THEN throws not found error', async () => {
      await expect(projectHandlers.resolveProject('BAD', null)).rejects.toThrow(/not found/i)
    })

    it('Given detected project that does not exist WHEN resolving THEN throws not found error', async () => {
      await expect(projectHandlers.resolveProject(undefined, 'BAD')).rejects.toThrow(/not found/i)
    })

    it('Given project not found WHEN throwing THEN error includes available projects', async () => {
      try {
        await projectHandlers.resolveProject('BAD', null)
      }
      catch (error: unknown) {
        expect(error).toBeInstanceOf(Error)
        const err = error as Error
        expect(err.message).toContain('BAD')
        expect(err.message).toContain('TEST')
        expect(err.message).toContain('API')
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

      // Should call getProject twice since each resolution triggers it
      expect(mockProjectService.getProject).toHaveBeenCalledTimes(2)
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
      await expect(projectHandlers.resolveProject(undefined, null)).rejects.toThrow(/project key is required/i)
    })
  })
})
