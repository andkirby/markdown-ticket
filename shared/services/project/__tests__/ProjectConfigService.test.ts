import { fileExists, readFile, writeFile } from '../../../utils/file-utils'
import { buildConfigFilePath, buildRegistryFilePath } from '../../../utils/path-resolver'
import { parseToml, stringify } from '../../../utils/toml'
import { ProjectConfigService } from '../ProjectConfigService'

jest.mock('../../../utils/file-utils')
jest.mock('../../../utils/toml')
jest.mock('../../../utils/path-resolver')

describe('projectConfigService', () => {
  let service: ProjectConfigService

  beforeEach(() => {
    service = new ProjectConfigService(true)
    jest.clearAllMocks()
    ;(stringify as jest.Mock).mockImplementation(value => JSON.stringify(value))
  })

  describe('getGlobalConfig', () => {
    it('should return default config when file does not exist', () => {
      (fileExists as jest.Mock).mockReturnValue(false)
      const config = service.getGlobalConfig()
      expect(config.discovery.autoDiscover).toBe(true)
    })

    it('should return parsed config when file exists', () => {
      (fileExists as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockReturnValue('discovery.autoDiscover = false');
      (parseToml as jest.Mock).mockReturnValue({ discovery: { autoDiscover: false } })

      const config = service.getGlobalConfig()
      expect(config.discovery.autoDiscover).toBe(false)
    })
  })

  describe('getProjectConfig', () => {
    it('should return null when config file does not exist', () => {
      (buildConfigFilePath as jest.Mock).mockReturnValue('/config.toml');
      (fileExists as jest.Mock).mockReturnValue(false)

      const config = service.getProjectConfig('/project')
      expect(config).toBeNull()
    })

    it('should return null on validation failure', () => {
      (buildConfigFilePath as jest.Mock).mockReturnValue('/config.toml');
      (fileExists as jest.Mock).mockReturnValue(true);
      (readFile as jest.Mock).mockReturnValue('content');
      (parseToml as jest.Mock).mockReturnValue({ invalid: 'config' })

      const config = service.getProjectConfig('/project')
      expect(config).toBeNull()
    })
  })

  describe('createOrUpdateLocalConfig', () => {
    it('should skip creation in global-only mode', () => {
      service.createOrUpdateLocalConfig('proj', '/path', 'Name', 'CODE', undefined, undefined, true)
      expect(writeFile).not.toHaveBeenCalled()
    })
  })

  describe('updateProject', () => {
    it('should throw error when project not found', () => {
      (buildRegistryFilePath as jest.Mock).mockReturnValue('/reg/proj.toml');
      (fileExists as jest.Mock).mockReturnValue(false)

      expect(() => service.updateProject('proj', {})).toThrow('not found in registry')
    })

    it('should update project when valid', () => {
      const data = { project: { path: '/proj' }, metadata: { lastAccessed: '2024-01-01' } }
      ;(buildRegistryFilePath as jest.Mock).mockReturnValue('/reg.toml')
      ;(buildConfigFilePath as jest.Mock).mockReturnValue('/proj/config.toml')
      ;(fileExists as jest.Mock).mockReturnValue(true)
      ;(readFile as jest.Mock).mockReturnValue('[project]\npath = "/proj"\n\n[metadata]\nlastAccessed = "2024-01-01"')
      ;(parseToml as jest.Mock).mockReturnValue(data)
      service.updateProject('proj', { name: 'New' })
      expect(writeFile).toHaveBeenCalledTimes(2)
    })

    it('updates global-only projects in the registry only', () => {
      const registryData = {
        project: {
          path: '/global',
          name: 'Global Project',
          code: 'GLOB',
          description: 'Old description',
          repository: '',
        },
        metadata: {
          globalOnly: true,
          lastAccessed: '2024-01-01',
        },
      }

      ;(buildRegistryFilePath as jest.Mock).mockReturnValue('/registry/GLOB.toml')
      ;(fileExists as jest.Mock).mockReturnValue(true)
      ;(readFile as jest.Mock).mockReturnValue('registry-content')
      ;(parseToml as jest.Mock).mockReturnValue(registryData)

      service.updateProject('GLOB', {
        description: 'New description',
        repository: 'https://example.com/repo.git',
      })

      expect(buildConfigFilePath).not.toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalledTimes(1)
      expect(writeFile).toHaveBeenCalledWith('/registry/GLOB.toml', expect.any(String))
      expect(registryData.project.description).toBe('New description')
      expect(registryData.project.repository).toBe('https://example.com/repo.git')
    })

    it('updates project-first operational fields in local config and keeps registry minimal', () => {
      const registryData = {
        project: {
          path: '/local',
          active: true,
        },
        metadata: {
          lastAccessed: '2024-01-01',
        },
      }
      const localConfig = {
        project: {
          name: 'Local Project',
          code: 'LOCL',
          description: 'Old description',
          repository: '',
        },
      }

      ;(buildRegistryFilePath as jest.Mock).mockReturnValue('/registry/LOCL.toml')
      ;(buildConfigFilePath as jest.Mock).mockReturnValue('/local/.mdt-config.toml')
      ;(fileExists as jest.Mock).mockReturnValue(true)
      ;(readFile as jest.Mock)
        .mockReturnValueOnce('registry-content')
        .mockReturnValueOnce('local-content')
      ;(parseToml as jest.Mock)
        .mockReturnValueOnce(registryData)
        .mockReturnValueOnce(localConfig)

      service.updateProject('LOCL', {
        name: 'Updated Local',
        description: 'Updated description',
        repository: 'https://example.com/local.git',
      })

      expect(writeFile).toHaveBeenCalledTimes(2)
      expect(writeFile).toHaveBeenNthCalledWith(1, '/registry/LOCL.toml', expect.any(String))
      expect(writeFile).toHaveBeenNthCalledWith(2, '/local/.mdt-config.toml', expect.any(String))
      expect(registryData.project).not.toHaveProperty('name')
      expect(registryData.project).not.toHaveProperty('description')
      expect(registryData.project).not.toHaveProperty('repository')
      expect(localConfig.project.name).toBe('Updated Local')
      expect(localConfig.project.description).toBe('Updated description')
      expect(localConfig.project.repository).toBe('https://example.com/local.git')
    })
  })

  describe('updateProjectByPath', () => {
    it('updates an auto-discovered project local config without a registry file', () => {
      const localConfig = {
        project: {
          name: 'Auto Project',
          code: 'AUTO',
          description: 'Old description',
          repository: '',
        },
      }

      ;(buildConfigFilePath as jest.Mock).mockReturnValue('/auto/.mdt-config.toml')
      ;(fileExists as jest.Mock).mockReturnValue(true)
      ;(readFile as jest.Mock).mockReturnValue('local-content')
      ;(parseToml as jest.Mock).mockReturnValue(localConfig)

      service.updateProjectByPath('AUTO', '/auto', {
        description: 'Updated auto description',
      })

      expect(buildRegistryFilePath).not.toHaveBeenCalled()
      expect(writeFile).toHaveBeenCalledTimes(1)
      expect(writeFile).toHaveBeenCalledWith('/auto/.mdt-config.toml', expect.any(String))
      expect(localConfig.project.description).toBe('Updated auto description')
    })

    it('throws without writing when local config is missing', () => {
      ;(buildConfigFilePath as jest.Mock).mockReturnValue('/missing/.mdt-config.toml')
      ;(fileExists as jest.Mock).mockReturnValue(false)

      expect(() => service.updateProjectByPath('MISS', '/missing', { description: 'Nope' }))
        .toThrow('local config not found')
      expect(writeFile).not.toHaveBeenCalled()
    })
  })
})
