/**
 * Ticket List Enhancements E2E Tests (UAT Task 9)
 *
 * Tests for list filtering, pagination, output modes, and ls alias.
 */

import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

describe('Ticket List Enhancements', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
      description: 'Test project for list enhancements',
    })

    projectDir = project.path
    projectCode = project.key

    // Create multiple tickets for testing
    await projectFactory.createMultipleCRs(projectCode, [
      { title: 'Alpha Feature', type: 'Feature Enhancement', status: 'Implemented', priority: 'High', content: 'Alpha' },
      { title: 'Beta Bug', type: 'Bug Fix', status: 'In Progress', priority: 'Medium', content: 'Beta' },
      { title: 'Gamma Architecture', type: 'Architecture', status: 'Proposed', priority: 'Low', content: 'Gamma' },
      { title: 'Delta Tech Debt', type: 'Technical Debt', status: 'Implemented', priority: 'High', content: 'Delta' },
      { title: 'Epsilon Feature Two', type: 'Feature Enhancement', status: 'In Progress', priority: 'Low', content: 'Epsilon' },
      { title: 'Zeta Documentation', type: 'Documentation', status: 'Approved', priority: 'Medium', content: 'Zeta' },
      { title: 'Eta Research', type: 'Research', status: 'On Hold', priority: 'Low', content: 'Eta' },
      { title: 'Theta Feature Three', type: 'Feature Enhancement', status: 'Implemented', priority: 'Critical', content: 'Theta' },
      { title: 'Iota Bug Two', type: 'Bug Fix', status: 'Rejected', priority: 'Medium', content: 'Iota' },
      { title: 'Kappa Architecture Two', type: 'Architecture', status: 'In Progress', priority: 'High', content: 'Kappa' },
      { title: 'Lambda Extra', type: 'Feature Enhancement', status: 'Proposed', priority: 'Low', content: 'Lambda' },
    ])
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should default to 10 tickets sorted newest-first', async () => {
    const result = await runCli(['ticket', 'list'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // Should show exactly 10 tickets by default
    const ticketLines = result.stdout.split('\n').filter(line => /^\w+-\d+/.test(line.trim()))
    expect(ticketLines.length).toBe(10)
  })

  test('should show all tickets with --all flag', async () => {
    const result = await runCli(['ticket', 'list', '--all'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // Should show all 11 tickets
    const ticketLines = result.stdout.split('\n').filter(line => /^\w+-\d+/.test(line.trim()))
    expect(ticketLines.length).toBe(11)
    expect(result.stdout).toContain('11 tickets')
  })

  test('should show N tickets with --limit N', async () => {
    const result = await runCli(['ticket', 'list', '--limit', '3'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    const ticketLines = result.stdout.split('\n').filter(line => /^\w+-\d+/.test(line.trim()))
    expect(ticketLines.length).toBe(3)
    expect(result.stdout).toContain('3 tickets')
  })

  test('should filter by single field with exact match', async () => {
    const result = await runCli(['ticket', 'list', 'type=Bug Fix'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Beta Bug')
    expect(result.stdout).toContain('Iota Bug Two')
  })

  test('should filter by single field with fuzzy match (e.g., status=impl)', async () => {
    const result = await runCli(['ticket', 'list', 'status=impl'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // "impl" fuzzy matches "Implemented" (substring)
    expect(result.stdout).toContain('Alpha Feature')
    expect(result.stdout).toContain('Delta Tech Debt')
  })

  test('should filter by single field with comma-separated values (OR within field)', async () => {
    const result = await runCli(['ticket', 'list', 'status=implemented,proposed'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // Should match Implemented and Proposed tickets
    expect(result.stdout).toContain('Alpha Feature')
    expect(result.stdout).toContain('Gamma Architecture')
  })

  test('should combine multiple filters with AND across fields', async () => {
    const result = await runCli(['ticket', 'list', 'status=implemented', 'priority=high'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // Only Implemented + High tickets
    expect(result.stdout).toContain('Alpha Feature')
    expect(result.stdout).toContain('Delta Tech Debt')
    expect(result.stdout).not.toContain('Theta Feature Three') // Critical, not High
  })

  test('should show file paths only with --files', async () => {
    const result = await runCli(['ticket', 'list', '--files', '--limit', '2'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    const lines = result.stdout.split('\n').filter(Boolean)
    // Each line should be a file path (not contain brackets or badges)
    for (const line of lines) {
      expect(line).toMatch(/\.md$/)
      expect(line).not.toContain('[')
    }
  })

  test('should show info without paths with --info', async () => {
    const result = await runCli(['ticket', 'list', '--info', '--limit', '2'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    // Should have ticket info but no .md path lines
    expect(result.stdout).toContain('tickets')
    // Info mode should not have indented path lines
    const pathLines = result.stdout.split('\n').filter(line => line.trim().startsWith('docs/'))
    expect(pathLines.length).toBe(0)
  })

  test('should support ticket ls alias', async () => {
    const result = await runCli(['ticket', 'ls', '--limit', '3'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    const ticketLines = result.stdout.split('\n').filter(line => /^\w+-\d+/.test(line.trim()))
    expect(ticketLines.length).toBe(3)
  })

  test('should list tickets in a target project via --project', async () => {
    // Create a second project with a ticket
    const project2 = await projectFactory.createProject('empty', {
      code: 'PROJ',
      name: 'Second Project',
    })
    await projectFactory.createMultipleCRs('PROJ', [
      { title: 'Cross Project Ticket', type: 'Feature Enhancement', status: 'Proposed', priority: 'Medium', content: 'Xproj' },
    ])

    const result = await runCli(['ticket', 'list', '--project', 'PROJ'], { cwd: projectDir })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('PROJ-')
    expect(result.stdout).toContain('Cross Project Ticket')
    expect(result.stdout).not.toContain('TEST-')
  })

  test('should reject --project when the target project does not exist', async () => {
    const result = await runCli(['ticket', 'list', '--project', 'NOPE'], { cwd: projectDir })

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Project')
    expect(result.stderr).toContain('NOPE')
    expect(result.stderr).toContain('not found')
  })
})
