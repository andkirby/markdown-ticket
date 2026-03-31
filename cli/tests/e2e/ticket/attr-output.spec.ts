/**
 * Attr Output Format E2E Tests (UAT Task 8)
 *
 * Tests for pipe-separated attr confirmation and no-op behavior.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Attr Output Format', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string
  let ticketKey: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for attr output',
    })

    projectDir = project.path
    projectCode = project.key

    const cr = await projectFactory.createTestCR(projectCode, {
      title: 'Attr Output Test Ticket',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: 'Testing attr output format',
    })

    ticketKey = cr.crCode!
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should print pipe-separated old→new confirmation on successful update', async () => {
    const result = await runCli(['ticket', 'attr', ticketKey, 'status=Implemented'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Pipe format: KEY | field: oldValue → newValue
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('→')
    expect(result.stdout).toContain('status:')
    expect(result.stdout).toContain('Proposed')
    expect(result.stdout).toContain('Implemented')
  })

  test('should print multiple pipe-separated changes when updating multiple attributes', async () => {
    // First set a known state
    await runCli(['ticket', 'attr', ticketKey, 'priority=Medium', 'assignee=alice'], {
      cwd: projectDir,
    })

    const result = await runCli(
      ['ticket', 'attr', ticketKey, 'priority=High', 'assignee=bob'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    // Should have pipe-separated lines for both fields
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('priority:')
    expect(result.stdout).toContain('assignee:')
    expect(result.stdout).toContain('→')
  })

  test('should print unchanged message and exit 0 when value is already set', async () => {
    // Set status to a known value first
    await runCli(['ticket', 'attr', ticketKey, 'status=Implemented'], {
      cwd: projectDir,
    })

    // Try to set it again
    const result = await runCli(['ticket', 'attr', ticketKey, 'status=Implemented'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('unchanged')
    expect(result.stdout).toContain('Implemented')
    // Should NOT contain the arrow for no-op
    expect(result.stdout).not.toContain('→')
  })
})
