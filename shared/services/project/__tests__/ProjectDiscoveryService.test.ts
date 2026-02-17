/**
 * ProjectDiscoveryService Tests
 *
 * Tests the refactored service behavior:
 * 1. Orchestrates between dependencies (factory, loader, registry, scanner)
 * 2. Uses factory methods for construction (not inline construction)
 * 3. Uses validation helpers for consistency
 * 4. Supports both global-only and project-first strategies
 * 5. Maintains backward compatibility
 */

import type { Project } from '../../../models/Project.js'
import { directoryExists } from '../../../utils/file-utils.js'
import { validateProjectIdMatchesDirectory } from '../../../utils/project-validation-helpers.js'
import { ProjectDiscoveryService } from '../ProjectDiscoveryService.js'

// Mock the filesystem utilities to avoid real filesystem access
jest.mock('../../../utils/file-utils.js')

// Mock the validation helpers to track calls
jest.mock('../../../utils/project-validation-helpers.js')

describe('ProjectDiscoveryService', () => {
  let service: ProjectDiscoveryService
  let mockRegistry: {
    getRegisteredProjects: jest.Mock
    registerProject: jest.Mock
  }
  let mockLoader: {
    getProjectConfig: jest.Mock
  }
  let mockScanner: {
    autoDiscoverProjects: jest.Mock
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock directoryExists to return true by default
    ;(directoryExists as jest.Mock).mockReturnValue(true)

    // Mock validateProjectIdMatchesDirectory to return true by default
    ;(validateProjectIdMatchesDirectory as jest.Mock).mockReturnValue(true)

    // Create mock dependencies
    mockRegistry = {
      getRegisteredProjects: jest.fn(),
      registerProject: jest.fn(),
    }
    mockLoader = {
      getProjectConfig: jest.fn(),
    }
    mockScanner = {
      autoDiscoverProjects: jest.fn(),
    }

    // Create service instance
    service = new ProjectDiscoveryService(true)

    // Inject mock dependencies using private property access
    ;(service as unknown as { registry: typeof mockRegistry }).registry = mockRegistry
    ;(service as unknown as { configLoader: typeof mockLoader }).configLoader = mockLoader
    ;(service as unknown as { scanner: typeof mockScanner }).scanner = mockScanner
  })

  describe('getRegisteredProjects', () => {
    describe('orchestration', () => {
      it('should orchestrate between registry, loader, and factory for project-first strategy', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST', startNumber: 10 },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        service.getRegisteredProjects()

        // Verify orchestration: registry was consulted
        expect(mockRegistry.getRegisteredProjects).toHaveBeenCalled()
        // Verify orchestration: loader was consulted for local config
        expect(mockLoader.getProjectConfig).toHaveBeenCalledWith('/path/to/test')
      })

      it('should orchestrate between registry and factory for global-only strategy', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/global',
              name: 'GlobalProject',
              code: 'GLB',
            },
            metadata: {
              dateRegistered: '2024-01-01',
              globalOnly: true,
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])

        service.getRegisteredProjects()

        // Verify orchestration: registry was consulted
        expect(mockRegistry.getRegisteredProjects).toHaveBeenCalled()
        // Verify: loader NOT consulted for global-only (full data in registry)
        expect(mockLoader.getProjectConfig).not.toHaveBeenCalled()
      })
    })

    describe('validation helper usage', () => {
      it('should use validateProjectIdMatchesDirectory for registry entries with explicit ID', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: {
              path: '/path/to/test',
              id: 'test',
            },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        service.getRegisteredProjects()

        // Verify validation helper was called with registry ID
        expect(validateProjectIdMatchesDirectory).toHaveBeenCalledWith('test', 'test')
      })

      it('should use validateProjectIdMatchesDirectory for local config with explicit ID', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { id: 'test', name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        service.getRegisteredProjects()

        // Verify validation helper was called with local config ID
        expect(validateProjectIdMatchesDirectory).toHaveBeenCalledWith('test', 'test')
      })

      it('should skip project when validation fails for registry ID', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: {
              path: '/path/to/test',
              id: 'wrong-id',
            },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)
        // Validation fails - ID doesn't match directory
        ;(validateProjectIdMatchesDirectory as jest.Mock).mockReturnValue(false)

        const projects = service.getRegisteredProjects()

        expect(projects).toEqual([])
        expect(validateProjectIdMatchesDirectory).toHaveBeenCalledWith('wrong-id', 'test')
      })

      it('should skip project when validation fails for local config ID', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { id: 'wrong-id', name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)
        // First call (registry ID) passes, second call (local ID) fails
        ;(validateProjectIdMatchesDirectory as jest.Mock)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false)

        const projects = service.getRegisteredProjects()

        expect(projects).toEqual([])
      })
    })

    describe('factory method usage', () => {
      it('should use factory.createFromConfig for project-first strategy', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST', startNumber: 10 },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        // Spy on factory method
        const factory = (service as unknown as { factory: { createFromConfig: jest.Mock } }).factory
        const createFromConfigSpy = jest.spyOn(factory, 'createFromConfig')

        service.getRegisteredProjects()

        // Verify factory method was called with correct arguments
        expect(createFromConfigSpy).toHaveBeenCalledWith(
          localConfig,
          '/path/to/test',
          expect.stringContaining('test.toml'),
        )

        createFromConfigSpy.mockRestore()
      })

      it('should use factory.createFromRegistry for global-only strategy', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/global',
              name: 'GlobalProject',
              code: 'GLB',
            },
            metadata: {
              dateRegistered: '2024-01-01',
              globalOnly: true,
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])

        // Spy on factory method
        const factory = (service as unknown as { factory: { createFromRegistry: jest.Mock } }).factory
        const createFromRegistrySpy = jest.spyOn(factory, 'createFromRegistry')

        service.getRegisteredProjects()

        // Verify factory method was called with correct arguments
        expect(createFromRegistrySpy).toHaveBeenCalledWith(
          registryEntry.data,
          '/path/to/global',
          expect.stringContaining('global.toml'),
        )

        createFromRegistrySpy.mockRestore()
      })
    })

    describe('global-only strategy', () => {
      it('should detect global-only strategy from metadata.globalOnly flag', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/global',
              name: 'GlobalProject',
              code: 'GLB',
            },
            metadata: {
              dateRegistered: '2024-01-01',
              globalOnly: true,
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])

        const projects = service.getRegisteredProjects()

        expect(projects).toHaveLength(1)
        expect(projects[0].project.name).toBe('GlobalProject')
        expect(projects[0].metadata.globalOnly).toBe(true)
      })

      it('should detect global-only strategy from presence of name in registry', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/global',
              name: 'GlobalProject', // Name in registry indicates global-only
              code: 'GLB',
            },
            metadata: {
              dateRegistered: '2024-01-01',
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])

        const projects = service.getRegisteredProjects()

        expect(projects).toHaveLength(1)
        expect(projects[0].project.name).toBe('GlobalProject')
        expect(projects[0].metadata.globalOnly).toBe(true)
      })

      it('should skip global-only project when directory does not exist', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/nonexistent',
              name: 'GlobalProject',
              code: 'GLB',
            },
            metadata: {
              dateRegistered: '2024-01-01',
              globalOnly: true,
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        ;(directoryExists as jest.Mock).mockReturnValue(false)

        const projects = service.getRegisteredProjects()

        expect(projects).toEqual([])
      })

      it('should construct project from registry data for global-only strategy', () => {
        const registryEntry = {
          file: 'global.toml',
          data: {
            project: {
              path: '/path/to/global',
              name: 'GlobalProject',
              code: 'GLB',
              startNumber: 50,
              ticketsPath: 'custom/tickets',
            },
            metadata: {
              dateRegistered: '2024-01-01',
              globalOnly: true,
              version: '2.0.0',
            },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])

        const projects = service.getRegisteredProjects()

        expect(projects[0].project.name).toBe('GlobalProject')
        expect(projects[0].project.code).toBe('GLB')
        expect(projects[0].project.startNumber).toBe(50)
        expect(projects[0].project.ticketsPath).toBe('custom/tickets')
        expect(projects[0].metadata.version).toBe('2.0.0')
      })
    })

    describe('project-first strategy', () => {
      it('should read complete project definition from local config', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: {
            name: 'Test',
            code: 'TEST',
            startNumber: 10,
            ticketsPath: 'docs/specs',
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        const projects = service.getRegisteredProjects()

        expect(projects).toHaveLength(1)
        expect(projects[0].project.name).toBe('Test')
        expect(projects[0].project.code).toBe('TEST')
        expect(projects[0].project.startNumber).toBe(10)
        expect(projects[0].project.ticketsPath).toBe('docs/specs')
      })

      it('should merge registry metadata with local config project', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: {
              dateRegistered: '2024-01-01',
              lastAccessed: '2024-02-01',
              version: '1.5.0',
            },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        const projects = service.getRegisteredProjects()

        expect(projects[0].metadata.dateRegistered).toBe('2024-01-01')
        expect(projects[0].metadata.lastAccessed).toBe('2024-02-01')
        expect(projects[0].metadata.version).toBe('1.5.0')
      })

      it('should skip project-first when local config is missing', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(null) // No local config

        const projects = service.getRegisteredProjects()

        expect(projects).toEqual([])
      })

      it('should skip project when directory does not exist', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)
        ;(directoryExists as jest.Mock).mockReturnValue(false)

        const projects = service.getRegisteredProjects()

        expect(projects).toEqual([])
      })
    })

    describe('backward compatibility', () => {
      it('should return empty array when no projects registered', () => {
        mockRegistry.getRegisteredProjects.mockReturnValue([])
        const projects = service.getRegisteredProjects()
        expect(projects).toEqual([])
      })

      it('should handle valid registered project with project-first strategy', () => {
        const registryEntry = {
          file: 'test.toml',
          data: {
            project: { path: '/path/to/test' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'Test', code: 'TEST', startNumber: 10 },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        const projects = service.getRegisteredProjects()
        expect(projects[0].project.name).toBe('Test')
        expect(projects[0].project.code).toBe('TEST')
      })

      it('should use code from local config when provided', () => {
        const registryEntry = {
          file: 'myproj.toml',
          data: {
            project: { path: '/path' },
            metadata: { dateRegistered: '2024-01-01' },
          },
        }
        const localConfig = {
          project: { name: 'My', code: 'MY' },
        }

        mockRegistry.getRegisteredProjects.mockReturnValue([registryEntry])
        mockLoader.getProjectConfig.mockReturnValue(localConfig)

        const projects = service.getRegisteredProjects()
        expect(projects[0].project.code).toBe('MY')
      })

      it('should handle multiple registered projects', () => {
        const registryEntries = [
          {
            file: 'project1.toml',
            data: {
              project: { path: '/path/to/proj1' },
              metadata: { dateRegistered: '2024-01-01' },
            },
          },
          {
            file: 'project2.toml',
            data: {
              project: { path: '/path/to/proj2' },
              metadata: { dateRegistered: '2024-01-02' },
            },
          },
        ]
        const localConfigs = [
          { project: { name: 'Project1', code: 'PRJ1' } },
          { project: { name: 'Project2', code: 'PRJ2' } },
        ]

        mockRegistry.getRegisteredProjects.mockReturnValue(registryEntries)
        mockLoader.getProjectConfig
          .mockReturnValueOnce(localConfigs[0])
          .mockReturnValueOnce(localConfigs[1])

        const projects = service.getRegisteredProjects()
        expect(projects).toHaveLength(2)
        expect(projects[0].project.code).toBe('PRJ1')
        expect(projects[1].project.code).toBe('PRJ2')
      })

      it('should handle errors gracefully and continue processing', () => {
        const registryEntries = [
          {
            file: 'bad.toml',
            data: {
              project: { path: '/bad/path' },
              metadata: { dateRegistered: '2024-01-01' },
            },
          },
          {
            file: 'good.toml',
            data: {
              project: { path: '/good/path' },
              metadata: { dateRegistered: '2024-01-02' },
            },
          },
        ]

        mockRegistry.getRegisteredProjects.mockReturnValue(registryEntries)
        mockLoader.getProjectConfig
          .mockImplementationOnce(() => {
            throw new Error('Config load error')
          })
          .mockReturnValueOnce({ project: { name: 'Good', code: 'GOOD' } })

        const projects = service.getRegisteredProjects()

        // Should skip the bad entry and continue with good entry
        expect(projects).toHaveLength(1)
        expect(projects[0].project.code).toBe('GOOD')
      })
    })
  })

  describe('autoDiscoverProjects', () => {
    it('should delegate to scanner', () => {
      const mockProjects = [{ id: 'test', project: { name: 'Test' } } as Project]
      mockScanner.autoDiscoverProjects.mockReturnValue(mockProjects)

      const result = service.autoDiscoverProjects(['/search'])

      expect(mockScanner.autoDiscoverProjects).toHaveBeenCalledWith(['/search'])
      expect(result).toEqual(mockProjects)
    })

    it('should use default search paths when none provided', () => {
      const mockProjects = [{ id: 'test', project: { name: 'Test' } } as Project]
      mockScanner.autoDiscoverProjects.mockReturnValue(mockProjects)

      service.autoDiscoverProjects([])

      expect(mockScanner.autoDiscoverProjects).toHaveBeenCalledWith([])
    })
  })

  describe('registerProject', () => {
    it('should delegate to registry', () => {
      const project = { id: 'test', project: { name: 'Test' } } as Project
      service.registerProject(project)

      expect(mockRegistry.registerProject).toHaveBeenCalledWith(project, undefined)
    })

    it('should pass document discovery settings to registry', () => {
      const project = { id: 'test', project: { name: 'Test' } } as Project
      const docSettings = {
        paths: ['docs'],
        maxDepth: 3,
      }

      service.registerProject(project, docSettings)

      expect(mockRegistry.registerProject).toHaveBeenCalledWith(project, docSettings)
    })
  })

  describe('public API compatibility', () => {
    it('should implement IProjectDiscoveryService interface', () => {
      expect(service.getRegisteredProjects).toBeDefined()
      expect(service.autoDiscoverProjects).toBeDefined()
      expect(service.registerProject).toBeDefined()
    })

    it('should not break existing consumers with method signatures', () => {
      // Verify method signatures match the interface
      expect(typeof service.getRegisteredProjects).toBe('function')
      expect(service.getRegisteredProjects.length).toBe(0) // No parameters

      expect(typeof service.autoDiscoverProjects).toBe('function')
      // Note: length is 0 because searchPaths has a default value
      expect(service.autoDiscoverProjects.length).toBe(0)

      expect(typeof service.registerProject).toBe('function')
      // Note: length is 2 (project + optional documentDiscoverySettings)
      expect(service.registerProject.length).toBe(2)
    })
  })
})
