/**
 * Command Guide E2E Tests (UAT Task 10)
 *
 * Tests for --guide flag at global and per-namespace scope.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from './helpers/cli-runner.js'

describe('Command Guide', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for guide',
    })

    projectDir = project.path
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should print full command manual with --guide at global scope', async () => {
    const result = await runCli(['--guide'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Should contain the guide header
    expect(result.stdout).toContain('Command Reference')
    // Should list both namespaces
    expect(result.stdout).toContain('ticket')
    expect(result.stdout).toContain('project')
    // Should have examples
    expect(result.stdout).toContain('Examples:')
    // Should have version
    expect(result.stdout).toContain('Version:')
  })

  test('should print ticket commands only with ticket --guide', async () => {
    const result = await runCli(['ticket', '--guide'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Should be scoped to ticket
    expect(result.stdout).toContain('ticket')
    expect(result.stdout).toContain('Command Reference')
    // Should list ticket subcommands
    expect(result.stdout).toContain('get')
    expect(result.stdout).toContain('list')
    expect(result.stdout).toContain('create')
    expect(result.stdout).toContain('attr')
    // Should NOT contain project subcommands like "init"
    expect(result.stdout).not.toContain('init')
  })

  test('should print project commands only with project --guide', async () => {
    const result = await runCli(['project', '--guide'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Should be scoped to project
    expect(result.stdout).toContain('project')
    expect(result.stdout).toContain('Command Reference')
    // Should list project subcommands
    expect(result.stdout).toContain('current')
    expect(result.stdout).toContain('get')
    expect(result.stdout).toContain('info')
    expect(result.stdout).toContain('init')
    // Should NOT contain ticket subcommands like "attr"
    expect(result.stdout).not.toContain('attr')
  })

  test('should include all registered aliases in guide output', async () => {
    const result = await runCli(['--guide'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // ls alias for list
    expect(result.stdout).toContain('ls')
    // info alias for get
    expect(result.stdout).toContain('info')
    // list alias for ls
    expect(result.stdout).toContain('list')
  })
})
