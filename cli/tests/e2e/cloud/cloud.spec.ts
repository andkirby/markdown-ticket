/**
 * E2E: mdt-cli cloud — presentation paths (TEST-e2e-help-guide,
 * TEST-e2e-non-interactive, TEST-local-only-unchanged, TEST-e2e-output-formats).
 *
 * Source: docs/CRs/MDT-202/tests.md § E2E (black-box) coverage.
 *
 * These tests cover the cloud command group's presentation behavior that does
 * not require a live coordinator:
 *   - `cloud --help` and `cloud --guide` expose the approved command set.
 *   - Commands run outside a project exit NO_PROJECT_CONTEXT (2).
 *   - Destructive commands in a non-TTY without `--yes` exit
 *     CONFIRMATION_REQUIRED (12) instead of hanging.
 *   - Local-only ticket commands behave identically when no cloud connection
 *     exists (C-3).
 *
 * Coordinator-backed paths (enable/connect/status against a fake Worker) are
 * the manual live-smoke checklist; this file stays deterministic.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

const CLOUD_COMMANDS = [
  'enable',
  'login',
  'connect',
  'status',
  'doctor',
  'members',
  'credentials',
  'disable',
  'migrate-legacy',
]

describe('mdt-cli cloud — presentation paths', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)
    const project = await projectFactory.createProject('empty', {
      code: 'CLD',
      name: 'Cloud E2E Project',
      description: 'Cloud CLI E2E',
    })
    projectDir = project.path
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('cloud --help exposes every approved subcommand and no provider workflow', async () => {
    const result = await runCli(['cloud', '--help'])
    expect(result.exitCode).toBe(0)
    for (const cmd of CLOUD_COMMANDS) {
      expect(result.stdout).toContain(cmd)
    }
    // Wrangler must not appear as a user workflow.
    expect(result.stdout.toLowerCase()).not.toContain('wrangler')
  })

  test('cloud --guide lists every subcommand with its options', async () => {
    const result = await runCli(['cloud', '--guide'])
    expect(result.exitCode).toBe(0)
    for (const cmd of CLOUD_COMMANDS) {
      expect(result.stdout).toContain(cmd)
    }
    // enable must document --owner; connect must document the uuid argument.
    expect(result.stdout).toContain('--owner')
    expect(result.stdout).toContain('cloud-project-uuid')
  })

  test('enable outside a project exits NO_PROJECT_CONTEXT (2)', async () => {
    const result = await runCli(['cloud', 'enable', '--owner', 'nobody@example.com'], { cwd: '/tmp' })
    expect(result.exitCode).toBe(2)
    expect(result.stderr).toContain('No project context')
  })

  test('connect outside a project exits NO_PROJECT_CONTEXT (2)', async () => {
    const result = await runCli(['cloud', 'connect', '8a4d-uuid'], { cwd: '/tmp' })
    expect(result.exitCode).toBe(2)
  })

  test('disable in a non-TTY without --yes exits CONFIRMATION_REQUIRED (12) and never hangs', async () => {
    // The e2e runner spawns with stdio: 'pipe' (non-TTY). disable requires
    // confirmation; without --yes it must exit 12 immediately.
    const result = await runCli(['cloud', 'disable'], { cwd: projectDir, timeout: 8000 })
    expect(result.timedOut).toBe(false)
    expect(result.exitCode).toBe(12)
    expect(result.stderr.toLowerCase()).toContain('confirm')
  })

  test('members remove in a non-TTY without --yes exits CONFIRMATION_REQUIRED (12)', async () => {
    const result = await runCli(['cloud', 'members', 'remove', 'alice@example.com', '--kind', 'human'], {
      cwd: projectDir,
      timeout: 8000,
    })
    expect(result.timedOut).toBe(false)
    expect(result.exitCode).toBe(12)
  })

  test('credentials remove in a non-TTY without --yes exits CONFIRMATION_REQUIRED (12)', async () => {
    const result = await runCli(['cloud', 'credentials', 'remove', 'runtime-a'], {
      cwd: projectDir,
      timeout: 8000,
    })
    expect(result.timedOut).toBe(false)
    expect(result.exitCode).toBe(12)
  })

  test('migrate-legacy in a non-TTY without --yes exits CONFIRMATION_REQUIRED (12)', async () => {
    const result = await runCli(['cloud', 'migrate-legacy'], { cwd: projectDir, timeout: 8000 })
    expect(result.timedOut).toBe(false)
    expect(result.exitCode).toBe(12)
  })

  test('status outside a project exits NO_PROJECT_CONTEXT (2) with --json structured error', async () => {
    const result = await runCli(['cloud', 'status', '--json'], { cwd: '/tmp' })
    expect(result.exitCode).toBe(2)
    // Structured error envelope on stderr.
    const envelope = JSON.parse(result.stderr)
    expect(envelope.ok).toBe(false)
    expect(envelope.error.code).toBe('NO_PROJECT_CONTEXT')
  })

  test('local-only ticket list still works when cloud group is present (C-3)', async () => {
    const result = await runCli(['ticket', 'list'], { cwd: projectDir })
    expect(result.exitCode).toBe(0)
  })
})
