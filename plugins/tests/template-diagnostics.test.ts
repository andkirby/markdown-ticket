import { resolve } from 'node:path'
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { describe, expect, test } from 'bun:test'
import { MDT_TOOLS } from '../_lib/mdt-tools.js'
import { runCli } from '../_lib/run-cli.js'
import { MDT_TOOLS as installedTools } from '../bb/lib/mdt-tools.js'
import { runCli as installedRunCli } from '../bb/lib/run-cli.js'

describe('MDT-261 native tool diagnostic preservation', () => {
  test.each([[MDT_TOOLS, runCli], [installedTools, installedRunCli]])('preserves one complete CLI envelope for shared DSH and installed BB tools', async (tools, run) => {
    const tool = tools.find(t => t.name === 'mdt_ticket_create')!
    const args = { title: 'Architecture example', type: 'architecture' }
    expect(tool.argv(args)).toContain('--json')
    const envelope = JSON.stringify({ schemaVersion: 1, ok: true, command: 'ticket.create', data: { created: true }, diagnostics: [{ code: 'TICKET_TEMPLATE_UNFILLED', severity: 'warning', message: 'Replace unfinished instructions before committing.', ticketKey: 'MDT-001', filePath: 'tickets/MDT-001.md' }] })
    const output = await run(async () => ({ exitCode: 0, stdout: envelope, stderr: '' }), { bin: 'mdt-cli', args: tool.argv(args) })
    expect(output).toBe(envelope)
    expect(JSON.parse(output).diagnostics).toHaveLength(1)
    expect(JSON.parse(output).ok).toBe(true)
  })
})

describe('MDT-261 native runner with real CLI creation', () => {
  test.each([runCli, installedRunCli])('retains actual diagnostic output for each native adapter runner', async (run) => {
    const environment = new TestEnvironment()
    await environment.setup()
    try {
      const project = await new ProjectFactory(environment).createProject('empty', { code: 'NATIV' })
      const tool = MDT_TOOLS.find(t => t.name === 'mdt_ticket_create')!
      const output = await run(async ({ argv }) => {
        const child = Bun.spawn(['bun', ...argv], { cwd: project.path, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' })
        const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited])
        return { exitCode, stdout, stderr }
      }, { bin: resolve(import.meta.dir, '../../cli/dist/index.js'), args: tool.argv({ title: 'Native architecture example', type: 'architecture' }) })
      const result = JSON.parse(output)
      expect(result.ok).toBe(true)
      expect(result.data.created).toBe(true)
      expect(result.diagnostics).toHaveLength(1)
      expect(result.diagnostics[0].code).toBe('TICKET_TEMPLATE_UNFILLED')
    }
    finally { await environment.cleanup() }
  })
})
