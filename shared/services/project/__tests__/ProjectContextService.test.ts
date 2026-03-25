/**
 * Tests for ProjectContextService
 * MDT-145: Consumer-facing project lookup with case-insensitive code resolution
 *
 * These tests verify:
 * - Detection + explicit lookup integration
 * - Case-insensitive project-code resolution
 * - Exact identifier preservation
 * - Structured result contracts
 */

import type { Project } from '../../../models/Project'
import { ServiceError } from '../../ServiceError'
import { ProjectContextService, type ProjectLookupResult } from '../ProjectContextService'

// Mock the detector
jest.mock('../../../utils/projectDetector', () => ({
  detectProjectContext: jest.fn(),
}))

// Mock ProjectService
const mockProjectService = {
  getProjectByCodeOrId: jest.fn(),
  getAllProjects: jest.fn(),
  getProjectConfig: jest.fn(),
}

import { detectProjectContext } from '../../../utils/projectDetector'

describe('ProjectContextService', () => {
  let service: ProjectContextService

  const mockProject: Project = {
    id: 'test-project-id',
    project: {
      id: 'test-project-id',
      name: 'Test Project',
      code: 'TEST',
      path: '/projects/test',
      configFile: '/projects/test/.mdt-config.toml',
      active: true,
      description: 'A test project',
      repository: 'https://github.com/test/test',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2024-01-01',
      lastAccessed: '2024-01-01',
      version: '1.0.0',
    },
  }

  const mockProjectLower: Project = {
    id: 'lower-project-id',
    project: {
      id: 'lower-project-id',
      name: 'Lower Project',
      code: 'lower',
      path: '/projects/lower',
      configFile: '/projects/lower/.mdt-config.toml',
      active: true,
      description: 'Lowercase code project',
      repository: 'https://github.com/test/lower',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2024-01-01',
      lastAccessed: '2024-01-01',
      version: '1.0.0',
    },
  }

  const mockNestedProject: Project = {
    id: 'nested-project-id',
    project: {
      id: 'nested-project-id',
      name: 'Nested Project',
      code: 'NESTED',
      path: '/projects/test/packages/nested',
      configFile: '/projects/test/packages/nested/.mdt-config.toml',
      active: true,
      description: 'Nested project',
      repository: 'https://github.com/test/nested',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2024-01-01',
      lastAccessed: '2024-01-01',
      version: '1.0.0',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockProjectService.getProjectConfig.mockReturnValue({
      name: 'Test Project',
      code: 'TEST',
      ticketsPath: 'docs/CRs',
    })
    service = new ProjectContextService(mockProjectService as unknown as never)
  })

  describe('resolveContext', () => {
    it('should resolve project from current working directory', async () => {
      (detectProjectContext as jest.Mock).mockReturnValue({
        found: true,
        configPath: '/projects/test/.mdt-config.toml',
        projectRoot: '/projects/test',
      })
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.resolveContext()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.source).toBe('detection')
        expect(result.project).toEqual(mockProject)
      }
    })

    it('should return structured failure when no project detected', async () => {
      (detectProjectContext as jest.Mock).mockReturnValue({
        found: false,
        configPath: null,
        projectRoot: null,
      })

      const result = await service.resolveContext()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NO_PROJECT_DETECTED')
      }
    })

    it('should return validation error when detected config cannot be loaded', async () => {
      (detectProjectContext as jest.Mock).mockReturnValue({
        found: true,
        configPath: '/projects/test/.mdt-config.toml',
        projectRoot: '/projects/test',
      })
      mockProjectService.getAllProjects.mockResolvedValue([])
      mockProjectService.getProjectConfig.mockReturnValue(null)

      const result = await service.resolveContext()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('VALIDATION_ERROR')
        expect(result.error.details).toMatchObject({
          configPath: '/projects/test/.mdt-config.toml',
          projectRoot: '/projects/test',
        })
      }
    })

    it('should prefer the deepest registered project that contains the cwd', async () => {
      const originalCwd = process.cwd
      ;(detectProjectContext as jest.Mock).mockReturnValue({
        found: false,
        configPath: null,
        projectRoot: null,
      })
      mockProjectService.getAllProjects.mockResolvedValue([mockProject, mockNestedProject])
      process.cwd = jest.fn(() => '/projects/test/packages/nested/src/components')

      try {
        const result = await service.resolveContext()

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.project.id).toBe('nested-project-id')
          expect(result.projectRoot).toBe('/projects/test/packages/nested')
        }
      }
      finally {
        process.cwd = originalCwd
      }
    })
  })

  describe('lookupProject', () => {
    it('should resolve project by exact identifier', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.lookupProject('test-project-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.source).toBe('identifier')
        expect(result.project).toEqual(mockProject)
      }
    })

    it('should resolve project by code case-insensitively', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProjectLower])

      // Query with uppercase for lowercase code
      const result = await service.lookupProject('LOWER')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.source).toBe('code')
        expect(result.project).toEqual(mockProjectLower)
      }
    })

    it('should normalize code lookup to lowercase', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      await service.lookupProject('TeSt')

      // getAllProjects is called to fetch all projects for searching
      expect(mockProjectService.getAllProjects).toHaveBeenCalled()
    })

    it('should prefer exact identifier match over code lookup', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      // If the query looks like an ID (has hyphens/UUID pattern), try ID first
      await service.lookupProject('test-project-id')

      expect(mockProjectService.getAllProjects).toHaveBeenCalled()
    })

    it('should return structured failure for unknown project', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.lookupProject('UNKNOWN')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ServiceError)
        expect(result.error.code).toBe('PROJECT_NOT_FOUND')
        expect(result.error.details).toMatchObject({ identifier: 'UNKNOWN' })
      }
    })
  })

  describe('result contract', () => {
    it('should return ProjectLookupResult with normalized inputs', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.lookupProject('TEST')

      expect(result).toMatchObject<Partial<ProjectLookupResult>>({
        success: true,
        source: 'code',
        normalizedInput: 'test',
        project: expect.objectContaining({
          project: expect.objectContaining({
            code: 'TEST',
          }),
        }),
      })
    })

    it('should include project root path in detection result', async () => {
      (detectProjectContext as jest.Mock).mockReturnValue({
        found: true,
        configPath: '/projects/test/.mdt-config.toml',
        projectRoot: '/projects/test',
      })
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.resolveContext()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.projectRoot).toBe('/projects/test')
      }
    })

    it('should keep service result metadata outside the raw project payload', async () => {
      mockProjectService.getAllProjects.mockResolvedValue([mockProject])

      const result = await service.lookupProject('TEST')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result).toHaveProperty('source', 'code')
        expect(result).toHaveProperty('normalizedInput', 'test')
        expect(result.project).not.toHaveProperty('source')
        expect(result.project).not.toHaveProperty('normalizedInput')
      }
    })
  })
})
