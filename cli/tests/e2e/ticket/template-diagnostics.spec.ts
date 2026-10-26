/** MDT-261: creation acceptance through the compiled CLI process. */
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

const entrypoint = resolve(import.meta.dir, '../../../dist/index.js')

describe('MDT-261 creation diagnostics', () => {
  let environment: TestEnvironment
  let cwd: string

  beforeEach(async () => {
    environment = new TestEnvironment()
    await environment.setup()
    const project = await new ProjectFactory(environment).createProject('empty', { code: 'GUARD' })
    cwd = project.path
  })

  afterEach(async () => environment.cleanup())

  test.each([undefined, '', ' \n\t'])('generated_body_notice with body %j', async (stdin) => {
    const result = await runCli(
      ['ticket', 'create', '--json', ...(stdin === undefined ? [] : ['--stdin']), 'architecture', 'Creation guard example'],
      { cwd, entrypoint, stdin },
    )
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.ok).toBe(true)
    expect(output.data.created).toBe(true)
    const notices = output.diagnostics.filter((item: { code: string }) => item.code === 'TICKET_TEMPLATE_UNFILLED')
    expect(notices).toHaveLength(1)
    expect(notices[0].severity).toBe('warning')
    expect(notices[0].message).toMatch(/before commit/i)
    expect(JSON.stringify(notices[0])).toContain(output.data.ticket.key)
    expect((await readdir(join(cwd, 'docs/CRs'))).filter(file => file.endsWith('.md'))).toHaveLength(1)
  })

  test('authored_body_clean', async () => {
    const result = await runCli(
      ['ticket', 'create', '--json', '--stdin', 'feature', 'Creation guard example'],
      { cwd, entrypoint, stdin: '## Problem\nAgents overlook template text.\n\n## Outcome\nReport unfinished content before commit.\n' },
    )
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.ok).toBe(true)
    expect(output.diagnostics).toEqual([])
  })

  test('supplied_instruction_notice', async () => {
    const result = await runCli(
      ['ticket', 'create', '--json', '--stdin', 'architecture', 'Creation guard example'],
      { cwd, entrypoint, stdin: '## Problem Statement\n[What architectural problem are we solving?]\n' },
    )
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout)
    expect(output.ok).toBe(true)
    expect(output.diagnostics.length).toBeGreaterThan(0)
    expect(output.diagnostics[0].severity).toBe('warning')
    expect(output.diagnostics[0].message).toMatch(/before commit/i)
  })

  test.each([{ format: [] }, { format: ['--yaml'] }])('renders the shared creation notice once with format %j', async ({ format }) => {
    const result = await runCli(['ticket', 'create', ...format, 'architecture', 'Visible creation notice'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('TICKET_TEMPLATE_UNFILLED')
    expect(result.stdout.match(/TICKET_TEMPLATE_UNFILLED/g)).toHaveLength(1)
    expect(result.stdout).toContain('before committing')
    expect(result.stderr).toBe('')
    if (format.length > 0) {
      expect(result.stdout).toContain('ok: true')
      expect(result.stdout).toContain('diagnostics:')
    }
    else {
      expect(result.stdout).toContain('Created')
      expect(result.stdout.match(/Replace template instructions with ticket-specific content before committing\./g)).toHaveLength(1)
    }
  })
})
