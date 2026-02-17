/**
 * Unit tests for ProjectFactory
 */

import type { ProjectConfig } from '../../../models/Project.js'
import type { RegistryData } from '../types.js'
import { beforeEach, describe, expect, it } from '@jest/globals'
import { ProjectFactory } from '../ProjectFactory.js'

describe('ProjectFactory', () => {
  let factory: ProjectFactory

  beforeEach(() => {
    factory = new ProjectFactory()
  })

  describe('createFromConfig', () => {
    describe('with valid config', () => {
      it('should create Project with all required fields', () => {
        const config: ProjectConfig = {
          project: {
            id: 'myproject',
            name: 'My Project',
            code: 'MDT',
            startNumber: 100,
            counterFile: '.mdt-next',
            active: true,
            description: 'Test project',
            repository: 'https://github.com/test/repo',
            ticketsPath: 'docs/CRs',
          },
          document: {
            paths: ['docs'],
          },
        }

        const project = factory.createFromConfig(
          config,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.id).toBe('myproject')
        expect(project.project.name).toBe('My Project')
        expect(project.project.code).toBe('MDT')
        expect(project.project.path).toBe('/path/to/myproject')
        expect(project.project.active).toBe(true)
        expect(project.registryFile).toBe('/registry/myproject.toml')
      })

      it('should use directory name as ID when config.id is not set', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.id).toBe('myproject')
      })

      it('should use directory name as ID for nested paths', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/home/user/projects/myproject')

        expect(project.id).toBe('myproject')
      })

      it('should set default values for optional fields', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.project.active).toBe(true)
        expect(project.project.description).toBe('')
        expect(project.project.repository).toBe('')
        expect(project.project.ticketsPath).toBe('docs/CRs')
        expect(project.metadata.version).toBe('1.0.0')
      })

      it('should not mark as autoDiscovered when using createFromConfig directly', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.autoDiscovered).toBeUndefined()
      })

      it('should store explicit ID in project.id field', () => {
        const config: ProjectConfig = {
          project: {
            id: 'explicit-id',
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/directory-name')

        expect(project.id).toBe('explicit-id')
        expect(project.project.id).toBe('explicit-id')
      })

      it('should set configFile path correctly', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.project.configFile).toBe('/path/to/myproject/.mdt-config.toml')
      })

      it('should set active to true when config.project.active is undefined', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.project.active).toBe(true)
      })

      it('should set active to false when config.project.active is false', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
            active: false,
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.project.active).toBe(false)
      })
    })

    describe('with minimal config', () => {
      it('should create Project with minimal valid config', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createFromConfig(config, '/path/to/myproject')

        expect(project.id).toBe('myproject')
        expect(project.project.name).toBe('My Project')
        expect(project.project.code).toBe('MDT')
        expect(project.project.active).toBe(true)
      })
    })
  })

  describe('createFromRegistry', () => {
    describe('with complete registry data', () => {
      it('should create global-only Project', () => {
        const registryData: RegistryData = {
          project: {
            id: 'myproject',
            name: 'My Project',
            code: 'MDT',
            path: '/path/to/myproject',
            startNumber: 100,
            counterFile: 'counter.json',
            active: true,
            description: 'Test project',
            repository: 'https://github.com/test/repo',
            ticketsPath: 'docs/CRs',
          },
          metadata: {
            dateRegistered: '2024-01-01',
            lastAccessed: '2024-01-15',
            version: '1.0.0',
            globalOnly: true,
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.id).toBe('myproject')
        expect(project.project.name).toBe('My Project')
        expect(project.metadata.globalOnly).toBe(true)
        expect(project.registryFile).toBe('/registry/myproject.toml')
        expect(project.project.configFile).toBe('')
      })

      it('should use directory name as ID when registry.id is not set', () => {
        const registryData: RegistryData = {
          project: {
            name: 'My Project',
            code: 'MDT',
            path: '/path/to/myproject',
          },
          metadata: {
            dateRegistered: '2024-01-01',
            lastAccessed: '2024-01-15',
            version: '1.0.0',
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.id).toBe('myproject')
      })

      it('should include document settings from registry', () => {
        const registryData: RegistryData = {
          project: {
            name: 'My Project',
            code: 'MDT',
            path: '/path/to/myproject',
            document: {
              paths: ['docs', 'src'],
              excludeFolders: ['node_modules', '.git'],
              maxDepth: 5,
            },
          },
          metadata: {
            dateRegistered: '2024-01-01',
            lastAccessed: '2024-01-15',
            version: '1.0.0',
            globalOnly: true,
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.document).toEqual({
          paths: ['docs', 'src'],
          excludeFolders: ['node_modules', '.git'],
          maxDepth: 5,
        })
      })
    })

    describe('with minimal registry data', () => {
      it('should set default values for optional fields', () => {
        const registryData: RegistryData = {
          project: {
            name: 'My Project',
            code: 'MDT',
            path: '/path/to/myproject',
          },
          metadata: {
            dateRegistered: '2024-01-01',
            lastAccessed: '2024-01-15',
            version: '1.0.0',
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.project.active).toBe(true)
        expect(project.project.startNumber).toBe(1)
        expect(project.metadata.version).toBe('1.0.0')
        expect(project.project.counterFile).toBe('.mdt-next')
      })

      it('should use projectId as fallback for name', () => {
        const registryData: RegistryData = {
          project: {
            code: 'MDT',
            path: '/path/to/myproject',
          },
          metadata: {
            dateRegistered: '2024-01-01',
            lastAccessed: '2024-01-15',
            version: '1.0.0',
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        expect(project.project.name).toBe('myproject')
      })

      it('should set default metadata when not provided', () => {
        const registryData: RegistryData = {
          project: {
            name: 'My Project',
            code: 'MDT',
            path: '/path/to/myproject',
          },
          metadata: {
            dateRegistered: undefined as unknown as string,
            lastAccessed: undefined as unknown as string,
            version: undefined as unknown as string,
          },
        }

        const project = factory.createFromRegistry(
          registryData,
          '/path/to/myproject',
          '/registry/myproject.toml',
        )

        const today = new Date().toISOString().split('T')[0]
        expect(project.metadata.dateRegistered).toBe(today)
        expect(project.metadata.lastAccessed).toBe(today)
        expect(project.metadata.version).toBe('1.0.0')
      })
    })
  })

  describe('createAutoDiscovered', () => {
    describe('with valid config', () => {
      it('should create auto-discovered Project', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
            description: 'Test project',
          },
          document: {},
        }

        const project = factory.createAutoDiscovered(config, '/path/to/myproject')

        expect(project.id).toBe('myproject')
        expect(project.autoDiscovered).toBe(true)
        expect(project.project.configFile).toContain('.mdt-config.toml')
      })

      it('should set metadata with current date', () => {
        const config: ProjectConfig = {
          project: {
            name: 'My Project',
            code: 'MDT',
            startNumber: 1,
            counterFile: '.mdt-next',
          },
          document: {},
        }

        const project = factory.createAutoDiscovered(config, '/path/to/myproject')

        const today = new Date().toISOString().split('T')[0]
        expect(project.metadata.dateRegistered).toBe(today)
        expect(project.metadata.lastAccessed).toBe(today)
      })

      it('should inherit all fields from createFromConfig', () => {
        const config: ProjectConfig = {
          project: {
            id: 'explicit-id',
            name: 'My Project',
            code: 'MDT',
            startNumber: 100,
            counterFile: 'custom-counter.txt',
            active: false,
            description: 'Custom description',
            repository: 'https://github.com/custom/repo',
            ticketsPath: 'custom/tickets',
          },
          document: {
            paths: ['docs'],
          },
        }

        const project = factory.createAutoDiscovered(config, '/path/to/myproject')

        expect(project.id).toBe('explicit-id')
        expect(project.project.name).toBe('My Project')
        expect(project.project.code).toBe('MDT')
        expect(project.project.startNumber).toBe(100)
        expect(project.project.counterFile).toBe('custom-counter.txt')
        expect(project.project.active).toBe(false)
        expect(project.project.description).toBe('Custom description')
        expect(project.project.repository).toBe('https://github.com/custom/repo')
        expect(project.project.ticketsPath).toBe('custom/tickets')
        expect(project.autoDiscovered).toBe(true)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle paths with special characters', () => {
      const config: ProjectConfig = {
        project: {
          name: 'My Project',
          code: 'MDT',
          startNumber: 1,
          counterFile: '.mdt-next',
        },
        document: {},
      }

      const project = factory.createFromConfig(config, '/path/to/my-project')

      expect(project.id).toBe('my-project')
    })

    it('should handle paths with multiple segments', () => {
      const config: ProjectConfig = {
        project: {
          name: 'My Project',
          code: 'MDT',
          startNumber: 1,
          counterFile: '.mdt-next',
        },
        document: {},
      }

      const project = factory.createFromConfig(config, '/home/user/work/projects/myproject')

      expect(project.id).toBe('myproject')
      expect(project.project.path).toBe('/home/user/work/projects/myproject')
    })
  })
})
