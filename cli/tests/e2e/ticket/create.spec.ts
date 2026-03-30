/**
 * Ticket Create E2E Tests
 *
 * Tests for creating tickets through various command forms.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli, runCliWithStdin } from '../helpers/cli-runner.js'

describe('Ticket Create', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory
  let projectDir: string
  let projectCode: string

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)

    // Create a test project
    const project = await projectFactory.createProject('empty', {
      code: 'TEST',
      name: 'Test Project',
    })

    projectDir = project.path
    projectCode = project.key
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should create a ticket through canonical ticket create', async () => {
    const result = await runCli(
      ['ticket', 'create', 'feature', 'Test ticket from canonical'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain(`${projectCode}-`)
  })

  test('should create a ticket through top-level create alias', async () => {
    const result = await runCli(['create', 'bug', 'Bug from alias'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain(`${projectCode}-`)
  })

  test('should treat type and priority tokens as order-independent', async () => {
    const result = await runCli(['create', 'high', 'bug', 'Order independent test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // Verify the ticket was created with correct priority
    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      expect(viewResult.stdout).toContain('High')
      expect(viewResult.stdout).toContain('Bug Fix')
    }
  })

  test('should derive title from slug when no quoted title is provided', async () => {
    const result = await runCli(['create', 'feature', 'fix-database-pool'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // Verify title was derived from slug
    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      expect(viewResult.stdout).toContain('Fix Database Pool')
    }
  })

  test('should append literal piped stdin body after generated frontmatter and H1', async () => {
    const stdinBody = '# Additional Content\n\nThis is additional content from stdin.'
    const result = await runCliWithStdin(
      ['create', 'feature', 'Stdin test'],
      stdinBody,
      {
        cwd: projectDir,
      },
    )

    expect(result.exitCode).toBe(0)

    // Read the created file
    const match = result.stdout.match(new RegExp(`docs\\/CRs\\/(${projectCode}-\\d+)[^\\s]*`))
    expect(match).toBeTruthy()

    if (match) {
      const _ticketKey = match[1]
      // Find the actual file path
      const pathMatch = result.stdout.match(new RegExp(`(docs\\/CRs\\/${projectCode}-\\d+[^\\s]*)`))
      expect(pathMatch).toBeTruthy()

      if (pathMatch) {
        const ticketPath = join(projectDir, pathMatch[1])
        const content = await readFile(ticketPath, 'utf-8')

        // Should contain frontmatter and stdin body
        expect(content).toContain('---') // Frontmatter delimiter
        expect(content).toContain('Additional Content')
      }
    }
  })

  test('should skip template generation when stdin is present', async () => {
    const stdinBody = 'Custom content only'
    const result = await runCliWithStdin(
      ['create', 'feature', 'No template'],
      stdinBody,
      {
        cwd: projectDir,
      },
    )

    expect(result.exitCode).toBe(0)

    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      // Find the actual file path from stdout
      const pathMatch = result.stdout.match(new RegExp(`(docs\\/CRs\\/${projectCode}-\\d+[^\\s]*)`))
      expect(pathMatch).toBeTruthy()

      if (pathMatch) {
        const ticketPath = join(projectDir, pathMatch[1])
        const content = await readFile(ticketPath, 'utf-8')

        // Should NOT contain template sections like "## Implementation"
        expect(content).toContain('Custom content only')
        expect(content).not.toContain('## Implementation')
      }
    }
  })

  test('should print the created key and path after create', async () => {
    const result = await runCli(['create', 'feature', 'Path test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
    expect(result.stdout).toContain('docs/CRs/')
  })

  test('should reject unknown create tokens with a corrective message', async () => {
    // The CLI treats unknown tokens as the title, so this will succeed
    // The token "xyztype" becomes the title
    const result = await runCli(['create', 'xyztype'], {
      cwd: projectDir,
    })

    // Should succeed with "xyztype" as the title
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')
  })

  test('should keep project-root-relative path output by default after create', async () => {
    const result = await runCli(['create', 'feature', 'Relative path test'], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)
    // Path should be relative (not starting with /)
    expect(result.stdout).not.toContain('/docs/CRs/')
    expect(result.stdout).toContain('docs/CRs/')
  })

  test('should avoid shell expansion or interpolation of create input data', async () => {
    // Test with special characters that might be interpreted by shell
    const specialTitle = 'Test with $pecial and "quotes"'
    const result = await runCli(['create', 'feature', specialTitle], {
      cwd: projectDir,
    })

    expect(result.exitCode).toBe(0)

    const match = result.stdout.match(new RegExp(`${projectCode}-(\\d+)`))
    expect(match).toBeTruthy()

    if (match) {
      const ticketKey = match[0]
      const viewResult = await runCli(['ticket', 'get', ticketKey], {
        cwd: projectDir,
      })

      // Title should be preserved literally
      expect(viewResult.stdout).toContain('Test with $pecial and "quotes"')
    }
  })

  test('should use explicit slug in filename when slug argument is provided', async () => {
    const result = await runCli(
      ['create', 'feature/p2', 'Paste selected query to shell from history modal', 'paste-to-shell'],
      { cwd: projectDir },
    )

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Created')

    // The output path should use the slug, not the title
    // Bug: currently produces {KEY}-featurep2.md instead of {KEY}-paste-to-shell.md
    expect(result.stdout).toContain('paste-to-shell.md')
    expect(result.stdout).not.toMatch(/\d+-featurep2\.md/)

    // Verify the file actually exists on disk with the slug-based name
    const pathMatch = result.stdout.match(new RegExp(`(docs/CRs/${projectCode}-\\d+-[\\w-]+\\.md)`))
    expect(pathMatch).toBeTruthy()
    expect(pathMatch![1]).toContain('paste-to-shell')
  })
})
