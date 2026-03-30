/**
 * Unit test for ProjectConfigService.configureDocumentsByPath
 *
 * Tests that document paths are correctly saved to [project.document.paths]
 * and NOT to the legacy [document.paths] section.
 *
 * NOTE: This test uses 'any' types because the current TypeScript definitions
 * don't match the actual TOML structure. The TOML uses [project.document]
 * but the types have document as a sibling of project.
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { ProjectConfigService } from '../../../services/project/ProjectConfigService'
import { ProjectFactory, TestEnvironment } from '../../../test-lib'
import { parseToml, stringify } from '../../../utils/toml'

describe('ProjectConfigService - configureDocumentsByPath', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let configService: ProjectConfigService

  beforeAll(async () => {
    // 1. Set up isolated environment
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // 2. Initialize project factory
    projectFactory = new ProjectFactory(testEnv)

    // 3. Create config service in quiet mode
    configService = new ProjectConfigService(true)
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  it('should save document paths to [project.document.paths]', async () => {
    // Create a test project
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project',
      code: 'TEST',
    })

    const documentPaths = ['docs', 'README.md', 'src']

    // Configure document paths
    await configService.configureDocumentsByPath(
      project.key,
      project.path,
      documentPaths,
    )

    // Read the config file
    const configPath = path.join(project.path, '.mdt-config.toml')
    const content = await fs.readFile(configPath, 'utf8')
    const config = parseToml(content) as any

    // RED PHASE: This test will FAIL because the code writes to document.paths
    // instead of project.document.paths
    // Verify paths are in [project.document.paths]
    expect(config.project?.document?.paths).toEqual(documentPaths)

    // Verify [document.paths] does NOT exist (legacy format)
    expect(config.document?.paths).toBeUndefined()
  })

  it('should preserve existing [project.document] settings', async () => {
    // Create a test project with existing config
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project 2',
      code: 'TEST2',
    })

    // Add existing document config
    const configPath = path.join(project.path, '.mdt-config.toml')
    const content = await fs.readFile(configPath, 'utf8')
    const config = parseToml(content) as any

    // Add excludeFolders and maxDepth under project.document
    if (!config.project) {
      config.project = {}
    }
    if (!config.project.document) {
      config.project.document = {}
    }
    config.project.document.excludeFolders = ['node_modules', '.git']
    config.project.document.maxDepth = 5

    await fs.writeFile(configPath, stringify(config))

    // Configure document paths
    const documentPaths = ['docs', 'server']
    await configService.configureDocumentsByPath(
      project.key,
      project.path,
      documentPaths,
    )

    // Read the config file
    const updatedContent = await fs.readFile(configPath, 'utf8')
    const updatedConfig = parseToml(updatedContent) as any

    // Verify paths are updated in [project.document.paths]
    expect(updatedConfig.project?.document?.paths).toEqual(documentPaths)

    // Verify other settings are preserved
    expect(updatedConfig.project?.document?.excludeFolders).toEqual(['node_modules', '.git'])
    expect(updatedConfig.project?.document?.maxDepth).toBe(5)

    // Verify [document.paths] does NOT exist
    expect(updatedConfig.document?.paths).toBeUndefined()
  })

  it('should update existing [project.document.paths]', async () => {
    // Create a test project
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project 3',
      code: 'TEST3',
    })

    // Configure initial paths
    const initialPaths = ['docs', 'README.md']
    await configService.configureDocumentsByPath(
      project.key,
      project.path,
      initialPaths,
    )

    // Update paths
    const updatedPaths = ['server', 'shared', 'tests']
    await configService.configureDocumentsByPath(
      project.key,
      project.path,
      updatedPaths,
    )

    // Read the config file
    const configPath = path.join(project.path, '.mdt-config.toml')
    const content = await fs.readFile(configPath, 'utf8')
    const config = parseToml(content) as any

    // Verify paths are updated in [project.document.paths]
    expect(config.project?.document?.paths).toEqual(updatedPaths)

    // Verify [document.paths] does NOT exist
    expect(config.document?.paths).toBeUndefined()
  })
})
