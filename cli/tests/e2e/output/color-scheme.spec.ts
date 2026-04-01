/**
 * CLI Color Scheme E2E Tests (UAT Task 8)
 *
 * Tests for per-element color assignments.
 * Uses NO_COLOR=0 to force colors on for testing.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('CLI Color Scheme', () => {
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
      description: 'Test project for color scheme',
    })

    projectDir = project.path
    projectCode = project.key

    const cr = await projectFactory.createTestCR(projectCode, {
      title: 'Color Test Ticket',
      type: 'Feature Enhancement',
      status: 'Implemented',
      priority: 'High',
      content: 'Testing color output',
    })

    ticketKey = cr.crCode!
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should render ticket key in light-cyan when colors enabled', async () => {
    // Force colors by removing NO_COLOR and setting a pseudo-TTY indicator
    const result = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
      env: { NO_COLOR: '0', FORCE_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // Light-cyan is \x1B[96m
    expect(result.stdout).toContain('\x1B[96m')
    expect(result.stdout).toContain(ticketKey)
  })

  test('should render ticket title in white (bold) when colors enabled', async () => {
    const result = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
      env: { NO_COLOR: '0', FORCE_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // Title should be present with bold formatting
    expect(result.stdout).toContain('Color Test Ticket')
    expect(result.stdout).toContain('\x1B[1m') // bold
  })

  test('should render project code in dark cyan when colors enabled', async () => {
    const result = await runCli(['project', 'current'], {
      cwd: projectDir,
      env: { NO_COLOR: '0', FORCE_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // Dark cyan is \x1B[36m — check that the project code is colorized
    expect(result.stdout).toContain('\x1B[36m')
    expect(result.stdout).toContain(projectCode)
  })

  test('should render project ID in gray when colors enabled', async () => {
    const result = await runCli(['project', 'current'], {
      cwd: projectDir,
      env: { NO_COLOR: '0', FORCE_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // Gray is \x1B[90m
    expect(result.stdout).toContain('\x1B[90m')
  })

  test('should render file paths in gray when colors enabled', async () => {
    const result = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
      env: { NO_COLOR: '0', FORCE_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // Path line (after second separator) should contain gray ANSI
    const lines = result.stdout.split('\n')
    const separatorCount = lines.reduce((acc, line) => acc + (line.startsWith('─') ? 1 : 0), 0)
    const afterSecondSep = lines.slice(lines.findIndex(l => l.startsWith('─'), lines.findIndex(l => l.startsWith('─')) + 1) + 1)
    const pathLine = afterSecondSep.find(line => line.trim().length > 0 && !line.includes('status') && !line.includes('priority') && !line.includes('type') && !line.includes('phase') && !line.includes('created') && !line.includes('modified') && !line.startsWith('─'))
    expect(pathLine).toBeDefined()
    expect(pathLine).toContain('\x1B[90m')
  })

  test('should not render ANSI codes when NO_COLOR is set', async () => {
    const result = await runCli(['ticket', 'get', ticketKey], {
      cwd: projectDir,
      env: { NO_COLOR: '1' },
    })

    expect(result.exitCode).toBe(0)
    // No ANSI escape codes should be present
    expect(result.stdout).not.toContain('\x1B[')
  })
})
