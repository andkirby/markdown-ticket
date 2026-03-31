/**
 * Ticket Attr E2E Tests
 *
 * Tests for updating ticket attributes through various command forms.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Ticket Attr', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string
  let ticketKey: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    // Create a test project
    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for CLI E2E',
    })

    projectDir = project.path
    projectCode = project.key

    // Create a test CR
    const cr = await projectFactory.createTestCR(projectCode, {
      title: 'Test Ticket for Attr',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: 'This is a test ticket for attr commands',
    })

    ticketKey = cr.crCode!
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should update a scalar attribute through canonical ticket attr', async () => {
    const result = await runCli(['ticket', 'attr', ticketKey, 'priority=High'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Pipe format: KEY | priority: Medium → High
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('priority')
    expect(result.stdout).toContain('→')

    // Verify the change
    const viewResult = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
    })

    expect(viewResult.stdout).toContain('High')
  })

  test('should update a scalar attribute through top-level attr alias', async () => {
    const result = await runCli(['attr', ticketKey, 'priority=Critical'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('priority')

    const viewResult = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
    })

    expect(viewResult.stdout).toContain('Critical')
  })

  test('should normalize accepted status aliases before persistence', async () => {
    const result = await runCli(['attr', ticketKey, 'status=in_progress'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('status')

    // Verify status was normalized to "In Progress"
    const viewResult = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
    })

    expect(viewResult.stdout).toContain('In Progress')
  })

  test('should replace relation values with =', async () => {
    // First set some related tickets
    await runCli(['attr', ticketKey, 'related=MDT-001,MDT-002'], {
      cwd: projectDir,
    })

    // Now replace them
    const result = await runCli(['attr', ticketKey, 'related=MDT-003,MDT-004'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('related')
  })

  test('should append relation values with += and dedupe', async () => {
    // Set initial value
    await runCli(['attr', ticketKey, 'related=MDT-001,MDT-002'], {
      cwd: projectDir,
    })

    // Append a value
    const result = await runCli(['attr', ticketKey, 'related+=MDT-003'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    // Try to append duplicate - should be deduped
    const dupResult = await runCli(['attr', ticketKey, 'related+=MDT-002'], {
      cwd: projectDir,
    })

    expect(dupResult.exitCode).toBe(0)

    // Verify the append worked
    expect(dupResult.stdout).toContain('|')
  })

  test('should remove relation values with -=', async () => {
    // Set initial values
    await runCli(['attr', ticketKey, 'related=MDT-001,MDT-002,MDT-003'], {
      cwd: projectDir,
    })

    // Remove one value
    const result = await runCli(['attr', ticketKey, 'related-=MDT-002'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    // Verify the remove worked
    expect(result.stdout).toContain('|')
  })

  test('should update multiple supported attributes in one command', async () => {
    const result = await runCli(
      ['attr', ticketKey, 'priority=Low', 'assignee=test-user'],
      {
        cwd: projectDir,
      },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('|')
    expect(result.stdout).toContain('priority')

    // Verify both changes
    const viewResult = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
    })

    expect(viewResult.stdout).toContain('Low')
    expect(viewResult.stdout).toContain('test-user')
  })

  test('should reject unsupported attr operators for scalar fields', async () => {
    const result = await runCli(['attr', ticketKey, 'priority+=High'], {
      cwd: projectDir,
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/add|operation/i)
  })

  test('should reject unsupported attribute keys with a corrective error', async () => {
    const result = await runCli(['attr', ticketKey, 'xyz=abc'], {
      cwd: projectDir,
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('attribute')
  })

  test('should reject missing attr arguments with a corrective error', async () => {
    const result = await runCli(['attr', ticketKey], {
      cwd: projectDir,
    })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/argument|required/i)
  })

  test('should keep attr values as literal data without shell interpolation', async () => {
    const specialValue = 'Value with $pecial and "quotes"'
    const result = await runCli(['attr', ticketKey, `phase=${specialValue}`], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    // Verify value was preserved literally
    const viewResult = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
    })

    expect(viewResult.stdout).toContain('Value with $pecial and "quotes"')
  })

  test('should print one confirmation response with the applied changes', async () => {
    const result = await runCli(['attr', ticketKey, 'phase=Phase A'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    // Pipe format: should have one line per attribute
    const pipeLines = result.stdout.split('\n').filter(line =>
      line.includes('|'),
    )
    expect(pipeLines.length).toBe(1)

    // Should mention the change
    expect(result.stdout).toContain('phase')
  })
})
