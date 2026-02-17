/**
 * Integration tests for ProjectDiscoveryService end-to-end discovery flow
 *
 * Tests the complete project discovery subsystem including:
 * 1. Full discovery flow with valid projects
 * 2. Mixed valid and invalid projects handling
 * 3. Both strategies (global-only and project-first) working together
 * 4. Error handling for missing directories
 * 5. Error handling for invalid configs
 */

import type { Project } from '../../../models/Project.js'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TestEnvironment } from '../../../test-lib/index.js'
import { ProjectDiscoveryService } from '../ProjectDiscoveryService.js'

describe('ProjectDiscoveryService - Integration Tests', () => {
  let testEnv: TestEnvironment
  let tempDir: string
  let configDir: string
  let service: ProjectDiscoveryService

  beforeAll(async () => {
    // Create isolated test environment
    testEnv = new TestEnvironment()
    await testEnv.setup()

    tempDir = testEnv.getTempDirectory()
    configDir = testEnv.getConfigDirectory()

    // Create projects registry directory
    const projectsRegistryDir = join(configDir, 'projects')
    mkdirSync(projectsRegistryDir, { recursive: true })

    // Initialize service with quiet mode
    service = new ProjectDiscoveryService(true)
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  describe('Scenario 1: Full discovery flow with valid projects', () => {
    let projectPath: string

    beforeAll(() => {
      // Create a valid project with local config
      projectPath = join(tempDir, 'projects', 'VALID')
      mkdirSync(projectPath, { recursive: true })

      const configContent = `[project]
name = "Valid Project"
code = "VALID"
startNumber = 1
counterFile = ".mdt-next"

[document]
paths = ["docs"]
excludeFolders = ["node_modules"]
maxDepth = 3
`
      writeFileSync(join(projectPath, '.mdt-config.toml'), configContent)

      // Create project in registry
      const registryContent = `[project]
path = "${projectPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'VALID.toml'), registryContent)
    })

    afterAll(() => {
      // Cleanup test project
      rmSync(projectPath, { recursive: true, force: true })
      rmSync(join(configDir, 'projects', 'VALID.toml'), { force: true })
    })

    it('should discover valid project from registry', () => {
      const projects = service.getRegisteredProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe('VALID')
      expect(projects[0].project.name).toBe('Valid Project')
      expect(projects[0].project.code).toBe('VALID')
      expect(projects[0].project.path).toBe(projectPath)
    })

    it('should auto-discover project with valid config', () => {
      const projects = service.autoDiscoverProjects([join(tempDir, 'projects')])

      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe('VALID')
      expect(projects[0].autoDiscovered).toBe(true)
    })
  })

  describe('Scenario 2: Mixed valid and invalid projects handling', () => {
    let validProjectPath: string
    let invalidProjectPath: string
    let missingConfigPath: string

    beforeAll(() => {
      // Create valid project
      validProjectPath = join(tempDir, 'projects', 'GOOD')
      mkdirSync(validProjectPath, { recursive: true })
      const validConfig = `[project]
name = "Good Project"
code = "GOOD"
startNumber = 1
counterFile = ".mdt-next"
`
      writeFileSync(join(validProjectPath, '.mdt-config.toml'), validConfig)

      const goodRegistry = `[project]
path = "${validProjectPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'GOOD.toml'), goodRegistry)

      // Create invalid project (malformed config)
      invalidProjectPath = join(tempDir, 'projects', 'BAD')
      mkdirSync(invalidProjectPath, { recursive: true })
      const invalidConfig = `invalid toml content [[[
`
      writeFileSync(join(invalidProjectPath, '.mdt-config.toml'), invalidConfig)

      const badRegistry = `[project]
path = "${invalidProjectPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'BAD.toml'), badRegistry)

      // Create project with missing local config
      missingConfigPath = join(tempDir, 'projects', 'NOCONFIG')
      mkdirSync(missingConfigPath, { recursive: true })

      const noConfigRegistry = `[project]
path = "${missingConfigPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'NOCONFIG.toml'), noConfigRegistry)
    })

    afterAll(() => {
      rmSync(validProjectPath, { recursive: true, force: true })
      rmSync(invalidProjectPath, { recursive: true, force: true })
      rmSync(missingConfigPath, { recursive: true, force: true })
      rmSync(join(configDir, 'projects', 'GOOD.toml'), { force: true })
      rmSync(join(configDir, 'projects', 'BAD.toml'), { force: true })
      rmSync(join(configDir, 'projects', 'NOCONFIG.toml'), { force: true })
    })

    it('should return only valid projects from registry', () => {
      const projects = service.getRegisteredProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe('GOOD')
      expect(projects[0].project.name).toBe('Good Project')
    })

    it('should auto-discover only valid projects', () => {
      const projects = service.autoDiscoverProjects([join(tempDir, 'projects')])

      // Should find only GOOD project (BAD has invalid config, NOCONFIG has no config)
      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe('GOOD')
    })
  })

  describe('Scenario 3: Both strategies (global-only and project-first) working together', () => {
    let globalOnlyProjectPath: string
    let projectFirstProjectPath: string

    beforeAll(() => {
      // Create global-only project (no local config, full data in registry)
      globalOnlyProjectPath = join(tempDir, 'projects', 'GLOBAL')
      mkdirSync(globalOnlyProjectPath, { recursive: true })

      const globalOnlyRegistry = `[project]
name = "Global Only Project"
code = "GLOBAL"
id = "GLOBAL"
path = "${globalOnlyProjectPath}"
ticketsPath = "docs/CRs"
description = "Project with full data in registry"
active = true
dateRegistered = "2024-01-01"

[document]
paths = ["docs"]
excludeFolders = []
maxDepth = 3

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
globalOnly = true
`
      writeFileSync(join(configDir, 'projects', 'GLOBAL.toml'), globalOnlyRegistry)

      // Create project-first project (local config exists, minimal data in registry)
      projectFirstProjectPath = join(tempDir, 'projects', 'LOCAL')
      mkdirSync(projectFirstProjectPath, { recursive: true })

      const localConfig = `[project]
name = "Local Config Project"
code = "LOCAL"
id = "LOCAL"
startNumber = 1
counterFile = ".mdt-next"
description = "Project with local config"

[document]
paths = ["docs"]
maxDepth = 2
`
      writeFileSync(join(projectFirstProjectPath, '.mdt-config.toml'), localConfig)

      const projectFirstRegistry = `[project]
path = "${projectFirstProjectPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'LOCAL.toml'), projectFirstRegistry)
    })

    afterAll(() => {
      rmSync(globalOnlyProjectPath, { recursive: true, force: true })
      rmSync(projectFirstProjectPath, { recursive: true, force: true })
      rmSync(join(configDir, 'projects', 'GLOBAL.toml'), { force: true })
      rmSync(join(configDir, 'projects', 'LOCAL.toml'), { force: true })
    })

    it('should discover both global-only and project-first projects', () => {
      const projects = service.getRegisteredProjects()

      expect(projects).toHaveLength(2)

      // Find global-only project
      const globalOnly = projects.find(p => p.id === 'GLOBAL')
      expect(globalOnly).toBeDefined()
      expect(globalOnly!.project.name).toBe('Global Only Project')
      expect(globalOnly!.metadata.globalOnly).toBe(true)
      expect(globalOnly!.project.configFile).toBe('') // No local config

      // Find project-first project
      const projectFirst = projects.find(p => p.id === 'LOCAL')
      expect(projectFirst).toBeDefined()
      expect(projectFirst!.project.name).toBe('Local Config Project')
      expect(projectFirst!.metadata.globalOnly).toBeUndefined()
      expect(projectFirst!.project.configFile).toContain('.mdt-config.toml')
    })

    it('should merge registry metadata for project-first projects', () => {
      const projects = service.getRegisteredProjects()
      const localProject = projects.find(p => p.id === 'LOCAL')

      expect(localProject).toBeDefined()
      expect(localProject!.metadata.dateRegistered).toBe('2024-01-01')
      expect(localProject!.metadata.version).toBe('1.0.0')
    })
  })

  describe('Scenario 4: Error handling for missing directories', () => {
    beforeAll(() => {
      // Create registry entry for non-existent project
      const nonExistentPath = join(tempDir, 'projects', 'NONEXISTENT')
      const registryContent = `[project]
path = "${nonExistentPath}"
active = true

[metadata]
dateRegistered = "2024-01-01"
lastAccessed = "2024-01-01"
version = "1.0.0"
`
      writeFileSync(join(configDir, 'projects', 'NONEXISTENT.toml'), registryContent)
    })

    afterAll(() => {
      rmSync(join(configDir, 'projects', 'NONEXISTENT.toml'), { force: true })
    })

    it('should skip projects with missing directories', () => {
      const projects = service.getRegisteredProjects()

      // Should return empty array since project directory doesn't exist
      expect(projects).toHaveLength(0)
    })

    it('should handle auto-discovery with non-existent search paths gracefully', () => {
      const projects = service.autoDiscoverProjects(['/non/existent/path'])

      // Should not throw error, just return empty array
      expect(projects).toHaveLength(0)
    })
  })

  describe('Scenario 5: Error handling for invalid configs', () => {
    let mismatchedIdPath: string
    let duplicateCodePath1: string
    let duplicateCodePath2: string

    beforeAll(() => {
      // Create project with ID that doesn't match directory name
      mismatchedIdPath = join(tempDir, 'projects', 'MISMATCHED')
      mkdirSync(mismatchedIdPath, { recursive: true })
      const mismatchedConfig = `[project]
id = "DIFFERENT"
name = "Mismatched Project"
code = "MISMATCHED"
startNumber = 1
counterFile = ".mdt-next"
`
      writeFileSync(join(mismatchedIdPath, '.mdt-config.toml'), mismatchedConfig)

      // Create projects with duplicate codes (no ID)
      duplicateCodePath1 = join(tempDir, 'projects', 'DUP1')
      mkdirSync(duplicateCodePath1, { recursive: true })
      const dup1Config = `[project]
name = "Duplicate One"
code = "DUPLICATE"
startNumber = 1
counterFile = ".mdt-next"
`
      writeFileSync(join(duplicateCodePath1, '.mdt-config.toml'), dup1Config)

      duplicateCodePath2 = join(tempDir, 'projects', 'DUP2')
      mkdirSync(duplicateCodePath2, { recursive: true })
      const dup2Config = `[project]
name = "Duplicate Two"
code = "DUPLICATE"
startNumber = 1
counterFile = ".mdt-next"
`
      writeFileSync(join(duplicateCodePath2, '.mdt-config.toml'), dup2Config)
    })

    afterAll(() => {
      rmSync(mismatchedIdPath, { recursive: true, force: true })
      rmSync(duplicateCodePath1, { recursive: true, force: true })
      rmSync(duplicateCodePath2, { recursive: true, force: true })
    })

    it('should skip projects with mismatched ID and directory name', () => {
      const projects = service.autoDiscoverProjects([join(tempDir, 'projects')])

      const mismatched = projects.find(p => p.id === 'MISMATCHED')
      expect(mismatched).toBeUndefined()
    })

    it('should skip duplicate projects by code (no ID)', () => {
      const projects = service.autoDiscoverProjects([join(tempDir, 'projects')])

      // Should only find one of the duplicates (the first one discovered)
      const duplicates = projects.filter(p => p.project.code === 'DUPLICATE')
      expect(duplicates).toHaveLength(1)
    })
  })

  describe('Scenario 6: Register project with both strategies', () => {
    let globalOnlyProject: Project
    let projectFirstProject: Project

    beforeAll(() => {
      // Create global-only project object
      globalOnlyProject = {
        id: 'REGGLOBAL',
        project: {
          name: 'Registered Global',
          code: 'REGGLOBAL',
          id: 'REGGLOBAL',
          path: join(tempDir, 'projects', 'REGGLOBAL'),
          configFile: '', // Empty indicates global-only
          ticketsPath: 'docs/CRs',
          active: true,
          description: '',
        },
        metadata: {
          dateRegistered: '2024-01-01',
          lastAccessed: '2024-01-01',
          version: '1.0.0',
        },
      }

      // Create project-first project object
      const localProjectPath = join(tempDir, 'projects', 'REGLOCAL')
      mkdirSync(localProjectPath, { recursive: true })
      const localConfig = `[project]
name = "Registered Local"
code = "REGLOCAL"
id = "REGLOCAL"
startNumber = 1
counterFile = ".mdt-next"
`
      writeFileSync(join(localProjectPath, '.mdt-config.toml'), localConfig)

      projectFirstProject = {
        id: 'REGLOCAL',
        project: {
          name: 'Registered Local',
          code: 'REGLOCAL',
          id: 'REGLOCAL',
          path: localProjectPath,
          configFile: join(localProjectPath, '.mdt-config.toml'),
          active: true,
          description: '',
        },
        metadata: {
          dateRegistered: '2024-01-01',
          lastAccessed: '2024-01-01',
          version: '1.0.0',
        },
      }
    })

    afterAll(() => {
      rmSync(join(configDir, 'projects', 'REGGLOBAL.toml'), { force: true })
      rmSync(join(configDir, 'projects', 'REGLOCAL.toml'), { force: true })
      rmSync(projectFirstProject.project.path, { recursive: true, force: true })
    })

    it('should register global-only project with full data in registry', () => {
      service.registerProject(globalOnlyProject)

      const registryPath = join(configDir, 'projects', 'REGGLOBAL.toml')
      const exists = existsSync(registryPath)
      expect(exists).toBe(true)

      // Read and verify registry content
      const content = readFileSync(registryPath, 'utf-8')
      expect(content).toContain('name = "Registered Global"')
      expect(content).toContain('code = "REGGLOBAL"')
      expect(content).toContain('globalOnly = true')
    })

    it('should register project-first project with minimal reference', () => {
      service.registerProject(projectFirstProject)

      const registryPath = join(configDir, 'projects', 'REGLOCAL.toml')
      const exists = existsSync(registryPath)
      expect(exists).toBe(true)

      // Read and verify registry content (should have minimal data)
      const content = readFileSync(registryPath, 'utf-8')
      expect(content).toContain('path =')
      expect(content).not.toContain('name = "Registered Local"') // Name should NOT be in registry
    })
  })
})
