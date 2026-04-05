/**
 * MDT-147: resolveCurrentProject out-of-range fallback tests
 *
 * Tests the auto-registration fallback when detectProjectContext()
 * finds a local .mdt-config.toml but the project is not in the
 * global registry or auto-discovery results.
 */

import type { Project } from '../../../models/Project'
import type { IProjectCacheService, IProjectConfigService, IProjectDiscoveryService } from '../types'

import { ProjectService } from '../../ProjectService.js'

// Mock the detector
jest.mock('../../../utils/projectDetector', () => ({
  detectProjectContext: jest.fn(),
}))

// Mock WorktreeService
jest.mock('../../WorktreeService.js', () => ({
  WorktreeService: jest.fn().mockImplementation(() => ({})),
}))

// Capture factory instances for inspection; defaultFactoryReturn controls what createFromConfig returns
const factoryInstances: Array<{ createFromConfig: jest.Mock }> = []
let defaultFactoryReturn: Project | undefined

jest.mock('../../project/ProjectFactory.js', () => ({
  ProjectFactory: jest.fn().mockImplementation(() => {
    const instance = {
      createFromConfig: jest.fn().mockImplementation(() => defaultFactoryReturn),
    }
    factoryInstances.push(instance)
    return instance
  }),
}))

import { detectProjectContext } from '../../../utils/projectDetector'

const mockedDetect = detectProjectContext as jest.MockedFunction<typeof detectProjectContext>

function makeMockDiscovery(registered: Project[] = [], discovered: Project[] = []): IProjectDiscoveryService {
  return {
    getRegisteredProjects: jest.fn().mockResolvedValue(registered),
    autoDiscoverProjects: jest.fn().mockResolvedValue(discovered),
    registerProject: jest.fn(),
  } as unknown as IProjectDiscoveryService
}

function makeMockConfig(configForPath?: Record<string, any>): IProjectConfigService {
  return {
    getProjectConfig: jest.fn((p: string) => configForPath?.[p] ?? null),
    getGlobalConfig: jest.fn().mockReturnValue({ searchPaths: ['/projects'], maxDepth: 3 }),
  } as unknown as IProjectConfigService
}

function makeMockCache(): IProjectCacheService {
  return {
    get: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
    clear: jest.fn(),
    clearCache: jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
    getAllProjects: jest.fn().mockResolvedValue(null),
    getAllProjectsFromCache: jest.fn().mockResolvedValue(null),
    isCacheValid: jest.fn().mockReturnValue(false),
    getCacheAge: jest.fn().mockReturnValue(0),
    setCacheTTL: jest.fn(),
    setCachedProjects: jest.fn(),
  } as unknown as IProjectCacheService
}

describe('ProjectService - resolveCurrentProject out-of-range fallback (MDT-147)', () => {
  const outOfRangeProject: Project = {
    id: 'child-project',
    project: {
      id: 'child-project',
      name: 'Child Project',
      code: 'CH1',
      path: '/projects/parent-project/docs/child-project',
      configFile: '/projects/parent-project/docs/child-project/.mdt-config.toml',
      active: true,
      description: '',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-04-05',
      lastAccessed: '2026-04-05',
      version: '1.0.0',
    },
  }

  const parentProject: Project = {
    id: 'parent-project',
    project: {
      id: 'parent-project',
      name: 'Parent Project',
      code: 'PAR',
      path: '/projects/parent-project',
      configFile: '/projects/parent-project/.mdt-config.toml',
      active: true,
      description: '',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-01-01',
      lastAccessed: '2026-04-05',
      version: '1.0.0',
    },
  }

  const childConfig = {
    project: { name: 'Child Project', code: 'CH1', ticketsPath: 'docs/CRs' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    factoryInstances.length = 0
    defaultFactoryReturn = undefined
  })

  describe('out-of-range project auto-registration', () => {
    it('should build and register project when detection finds config but project is not in registry', async () => {
      const projectRoot = '/projects/parent-project/docs/child-project'

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      const discovery = makeMockDiscovery()
      const config = makeMockConfig({ [projectRoot]: childConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      defaultFactoryReturn = outOfRangeProject

      const result = await service.resolveCurrentProject({ cwd: projectRoot })

      // Verify factory was used
      const factoryInstance = factoryInstances[factoryInstances.length - 1]
      expect(factoryInstance.createFromConfig).toHaveBeenCalledWith(
        childConfig,
        projectRoot,
      )

      // Verify project was registered
      expect(discovery.registerProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'child-project',
          autoDiscovered: true,
        }),
      )

      // Verify result
      expect(result.data).toEqual(expect.objectContaining({ id: 'child-project' }))
      expect(result.data?.project.code).toBe('CH1')
    })

    it('should return outOfDiscoveryRange: true in context for out-of-range project', async () => {
      const projectRoot = '/projects/parent-project/docs/child-project'

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      const discovery = makeMockDiscovery()
      const config = makeMockConfig({ [projectRoot]: childConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      defaultFactoryReturn = outOfRangeProject

      const result = await service.resolveCurrentProject({ cwd: projectRoot })

      expect(result.context).toHaveProperty('outOfDiscoveryRange', true)
      expect(result.context).toHaveProperty('detectedFrom', projectRoot)
    })

    it('should NOT fall through to parent project when local config is detected', async () => {
      const projectRoot = '/projects/parent-project/docs/child-project'

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      // Parent is registered, child is not
      const discovery = makeMockDiscovery([parentProject])
      const config = makeMockConfig({ [projectRoot]: childConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      defaultFactoryReturn = outOfRangeProject

      const result = await service.resolveCurrentProject({ cwd: projectRoot })

      // Should return the out-of-range project, NOT the parent
      expect(result.data?.project.code).toBe('CH1')
      expect(result.data?.project.code).not.toBe('PAR')
    })
  })

  describe('in-range project resolution (regression guard)', () => {
    it('should resolve registered project normally without fallback', async () => {
      const projectRoot = '/projects/parent-project'
      const parentConfig = {
        project: { name: 'Parent Project', code: 'PAR', ticketsPath: 'docs/CRs' },
      }

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      const discovery = makeMockDiscovery([parentProject])
      const config = makeMockConfig({ [projectRoot]: parentConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      const result = await service.resolveCurrentProject({ cwd: projectRoot })

      // Should find existing project, no factory fallback
      expect(result.data?.project.code).toBe('PAR')
      expect(result.context).not.toHaveProperty('outOfDiscoveryRange')
    })

    it('should not call registerProject for in-range projects', async () => {
      const projectRoot = '/projects/parent-project'
      const parentConfig = {
        project: { name: 'Parent Project', code: 'PAR', ticketsPath: 'docs/CRs' },
      }

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      const discovery = makeMockDiscovery([parentProject])
      const config = makeMockConfig({ [projectRoot]: parentConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      await service.resolveCurrentProject({ cwd: projectRoot })

      expect(discovery.registerProject).not.toHaveBeenCalled()
    })
  })

  describe('auto-discovered flag', () => {
    it('should set autoDiscovered=true on the registered project', async () => {
      const projectRoot = '/projects/parent-project/docs/child-project'

      mockedDetect.mockReturnValue({
        found: true,
        projectRoot,
        configPath: `${projectRoot}/.mdt-config.toml`,
      })

      const discovery = makeMockDiscovery()
      const config = makeMockConfig({ [projectRoot]: childConfig })
      const cache = makeMockCache()
      const service = new ProjectService(discovery, config, cache)

      defaultFactoryReturn = { ...outOfRangeProject }

      await service.resolveCurrentProject({ cwd: projectRoot })

      expect(discovery.registerProject).toHaveBeenCalledWith(
        expect.objectContaining({
          autoDiscovered: true,
        }),
      )
    })
  })
})
