/**
 * Ticket get/attr --project E2E Tests (MDT-143 UAT round 2026-04-03)
 *
 * `-p/--project` must resolve a ticket within the given project from a
 * non-project cwd, reject unknown project codes, and keep cwd behavior
 * identical when omitted.
 */

import { dirname } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Ticket get/attr --project', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let nonProjectDir: string
  let projectCode: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for --project E2E',
    })

    projectDir = project.path
    projectCode = project.key
    // Parent of the project dir: no .mdt-config.toml → no cwd detection
    nonProjectDir = dirname(projectDir)

    await projectFactory.createTestCR(projectCode, {
      title: 'Project Flag Target',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: 'Ticket used by --project flag tests',
    })
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('ticket get resolves a numeric key via -p from a non-project cwd', async () => {
    const result = await runCli(['ticket', 'get', '-p', projectCode, '1', '--json'], { cwd: nonProjectDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`"${projectCode}-001"`)
    expect(result.stdout).toContain('Project Flag Target')
  })

  test('ticket get resolves a full-format key via --project even with a foreign prefix', async () => {
    const result = await runCli(['ticket', 'get', '--project', projectCode, `OTHER-1`, '--json'], { cwd: nonProjectDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`"${projectCode}-001"`)
  })

  test('ticket get -p rejects an unknown project with structured error and exit 1', async () => {
    const result = await runCli(['ticket', 'get', '-p', 'NOPE', '1', '--json'], { cwd: nonProjectDir })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Project NOPE not found')
  })

  test('ticket attr applies an update via -p from a non-project cwd', async () => {
    const result = await runCli(
      ['ticket', 'attr', '-p', projectCode, '1', 'status=Approved', '--json'],
      { cwd: nonProjectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('status')

    // Verify persisted frontmatter, not just stdout (attr regression lesson)
    const verify = await runCli(['ticket', 'get', '-p', projectCode, '1', '--json'], { cwd: nonProjectDir })
    expect(verify.stdout).toContain('Approved')
  })

  test('ticket attr -p rejects an unknown project with exit 1', async () => {
    const result = await runCli(['ticket', 'attr', '-p', 'NOPE', '1', 'status=Approved', '--json'], { cwd: nonProjectDir })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Project NOPE not found')
  })

  test('omitting -p keeps cwd-detected behavior inside the project', async () => {
    const result = await runCli(['ticket', 'get', '1', '--json'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain(`${projectCode}-001`)
  })
})
