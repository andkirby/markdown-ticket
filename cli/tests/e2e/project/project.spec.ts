/**
 * Project Namespace E2E Tests
 *
 * Tests for project operations: current, get, info, list, ls, init.
 */

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Project Namespace', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let _configDir: string
  let projectCode: string
  let projectCode2: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    _configDir = testEnv.getConfigDirectory()
    projectFactory = new ProjectFactory(testEnv)

    // Create a test project
    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for CLI E2E',
    })

    projectDir = project.path
    projectCode = project.key

    // Create another project for list tests
    const project2 = await projectFactory.createProject('empty', {
      code: 'PROJ',
      name: 'Second Project',
      description: 'Second test project',
    })

    projectCode2 = project2.key
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should show current project details through project current', async () => {
    const result = await runCli(['project', 'current'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain('Test Project')
  })

  test('should show the same current project details through bare project shortcut', async () => {
    const result = await runCli(['project'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain('Test Project')
  })

  test('should list projects through project list', async () => {
    const result = await runCli(['project', 'list'], {
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain(projectCode2)
  })

  test('should list projects through project ls', async () => {
    const result = await runCli(['project', 'ls'], {
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain(projectCode2)
  })

  test('should resolve explicit project lookup through project get', async () => {
    const result = await runCli(['project', 'get', projectCode], {
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain('Test Project')
  })

  test('should resolve explicit project lookup through project info', async () => {
    const result = await runCli(['project', 'info', projectCode], {
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain('Test Project')
  })

  test('should resolve bare project code shortcut case-insensitively', async () => {
    const result = await runCli(['project', projectCode.toLowerCase()], {
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain('Test Project')
  })

  test('should treat lowercase list and ls as reserved list aliases', async () => {
    const result = await runCli(['project', 'ls'], {
    })

    expect(result.exitCode).toBe(0)
    // Should list projects, not look up a project named "ls"
    expect(result.stdout).toContain(projectCode)
    expect(result.stdout).toContain(projectCode2)
  })

  test('should initialize a project in the current folder through project init', async () => {
    // Create a temporary directory for init
    const tempDir = join(testEnv.getTempDirectory(), 'init-test')
    await mkdir(tempDir, { recursive: true })

    const result = await runCli(['project', 'init', 'NEW', 'New Project'], {
      cwd: tempDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Initialized')

    // Verify .mdt-config.toml exists
    const configPath = join(tempDir, '.mdt-config.toml')
    const exists = await Bun.file(configPath).exists()
    expect(exists).toBe(true)
  })
})
