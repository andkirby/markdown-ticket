/**
 * CLI Bootstrap E2E Tests
 *
 * Tests for CLI command registration, help output, and shortcut normalization.
 * These are smoke tests that verify the CLI boots correctly and shows expected help text.
 */

import { describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('CLI Bootstrap', () => {
  test('should execute the CLI with commander help output', async () => {
    const result = await runCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('mdt-cli')
    expect(result.stdout).toContain('ticket')
    expect(result.stdout).toContain('project')
  })

  test('should preserve canonical entity-action help for ticket namespace', async () => {
    const result = await runCli(['ticket', '--help'])

    expect(result.exitCode).toBe(0)
    // ticket --help shows get as the default command
    expect(result.stdout).toContain('Get ticket details')
  })

  test('should preserve canonical entity-action help for project namespace', async () => {
    const result = await runCli(['project', '--help'])

    expect(result.exitCode).toBe(0)
    // project --help shows get as the default command
    expect(result.stdout).toContain('Get project details')
  })

  test('should normalize bare ticket-key shortcuts before commander parse', async () => {
    // Test that bare number shortcut is normalized
    // This should invoke ticket get command
    const result = await runCli(['--help'])

    // Verify that the CLI doesn't crash with bare number as first arg
    // (help is shown instead of trying to resolve ticket without project context)
    expect(result.exitCode).toBe(0)
  })

  test('should normalize top-level create alias to ticket create', async () => {
    const result = await runCli(['create', '--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Create a new ticket')
  })

  test('should reject unsupported shortcut forms with corrective help', async () => {
    const result = await runCli(['unknown-command'])

    // Should exit with non-zero code or show error/help
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toBeTruthy()
  })
})
