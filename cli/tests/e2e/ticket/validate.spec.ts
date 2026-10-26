import { existsSync } from 'node:fs'
/** MDT-261: staged ticket acceptance through the compiled CLI and real Git index. */
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { initGitRepository, ProcessHelper, ProjectFactory, runGitCommand, TestEnvironment } from '@mdt/shared/test-lib'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

const entrypoint = resolve(import.meta.dir, '../../../dist/index.js')
const ticketPath = 'docs/CRs/GUARD-001-guard-example.md'
const authored = '## Problem\nAgents overlook unfinished templates.\n\n## Outcome\nExplain the missing content before commit.\n'
const unfinished = '## Problem Statement\n[What architectural problem are we solving?]\n'
const document = (body: string) => `---\ncode: GUARD-001\nstatus: Proposed\ntype: Architecture\npriority: Medium\n---\n\n# Guard example\n\n${body}`

describe('MDT-261 staged ticket validation', () => {
  let environment: TestEnvironment
  let cwd: string

  beforeEach(async () => {
    environment = new TestEnvironment()
    await environment.setup()
    const project = await new ProjectFactory(environment).createProject('empty', { code: 'GUARD' })
    cwd = project.path
    await initGitRepository(cwd)
    await runGitCommand(cwd, ['add', '--', '.mdt-config.toml'])
    await runGitCommand(cwd, ['commit', '-m', 'fixture config'])
  })

  afterEach(async () => environment.cleanup())

  async function stage(body: string, path = ticketPath) {
    await mkdir(dirname(join(cwd, path)), { recursive: true })
    await writeFile(join(cwd, path), document(body))
    await runGitCommand(cwd, ['add', '--', path])
  }

  test.each([
    unfinished,
    `${authored}\n## Rationale\n[Why this architectural change is needed]\n`,
    '## Problem\n<!-- mdt:placeholder:problem -->\nDescribe the problem here.\n',
    '## Problem\n\n## Outcome\n',
  ])('unfinished_staged_body: %s', async (body) => {
    await stage(body)
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.ok).toBe(false)
    expect(output.diagnostics.length).toBeGreaterThan(0)
    expect(JSON.stringify(output.diagnostics)).toContain('GUARD-001')
    expect(JSON.stringify(output.diagnostics)).toContain(ticketPath)
  })

  test('genuine_staged_body including quoted examples and intake criteria', async () => {
    await stage(`${authored}\nExample:\n\n> [What architectural problem are we solving?]\n\n\`\`\`md\n<!-- mdt:placeholder:problem -->\n\`\`\`\n\n- [ ] Add coverage\nTODO: retain a compatibility note.\n`)
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout || result.stderr).ok).toBe(true)
  })

  test.each([true, false])('staged_version_wins when staged unfinished=%j', async (stagedUnfinished) => {
    await stage(stagedUnfinished ? unfinished : authored)
    await writeFile(join(cwd, ticketPath), document(stagedUnfinished ? authored : unfinished))
    const before = await runGitCommand(cwd, ['diff', '--cached', '--binary'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(stagedUnfinished ? 1 : 0)
    expect(JSON.parse(result.stdout || result.stderr).ok).toBe(!stagedUnfinished)
    expect((await runGitCommand(cwd, ['diff', '--cached', '--binary'])).stdout).toBe(before.stdout)
  })

  test('validator_failure_visible for malformed staged configuration', async () => {
    await stage(authored)
    await writeFile(join(cwd, '.mdt-config.toml'), '[project\n')
    await runGitCommand(cwd, ['add', '--', '.mdt-config.toml'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.ok).toBe(false)
    expect(output.error.message).toMatch(/config|snapshot|validat/i)
  })

  test('changed_primary_scope skips an unchanged historical ticket and staged subdocument', async () => {
    await stage(unfinished)
    await runGitCommand(cwd, ['commit', '-m', 'historical scaffold fixture'])
    await mkdir(join(cwd, 'docs/CRs/GUARD-001'), { recursive: true })
    await writeFile(join(cwd, 'docs/CRs/GUARD-001/requirements.md'), unfinished)
    await runGitCommand(cwd, ['add', '--', 'docs/CRs/GUARD-001/requirements.md'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout || result.stderr).ok).toBe(true)
  })

  test('reads a renamed ticket whose filename contains spaces', async () => {
    await stage(authored)
    await runGitCommand(cwd, ['commit', '-m', 'original ticket'])
    const renamed = 'docs/CRs/GUARD-001-renamed ticket.md'
    await rename(join(cwd, ticketPath), join(cwd, renamed))
    await writeFile(join(cwd, renamed), document(unfinished))
    await runGitCommand(cwd, ['add', '-A'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    expect(JSON.stringify(JSON.parse(result.stdout || result.stderr).diagnostics)).toContain(renamed)
  })

  test('skips a staged deleted ticket', async () => {
    await stage(unfinished)
    await runGitCommand(cwd, ['commit', '-m', 'historical scaffold'])
    await unlink(join(cwd, ticketPath))
    await runGitCommand(cwd, ['add', '-u'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).data.checked).toBe(0)
  })

  test('uses staged non-default ticket directory even when working config differs', async () => {
    const configPath = join(cwd, '.mdt-config.toml')
    const original = await readFile(configPath, 'utf8')
    await writeFile(configPath, original.replace('docs/CRs', 'tickets with spaces'))
    await runGitCommand(cwd, ['add', '--', '.mdt-config.toml'])
    const configuredPath = 'tickets with spaces/GUARD-001-guard example.md'
    await stage(unfinished, configuredPath)
    await writeFile(configPath, original)
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    expect(JSON.stringify(JSON.parse(result.stdout || result.stderr).diagnostics)).toContain(configuredPath)
  })

  test('does not use unstaged ticket-path configuration', async () => {
    await stage(authored)
    const configPath = join(cwd, '.mdt-config.toml')
    const original = await readFile(configPath, 'utf8')
    await writeFile(configPath, original.replace('docs/CRs', 'tickets with spaces'))
    await mkdir(join(cwd, 'tickets with spaces'), { recursive: true })
    await writeFile(join(cwd, 'tickets with spaces/GUARD-001-example.md'), document(unfinished))
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).data.checked).toBe(1)
  })

  test('inspects epics and accepts quoted identity scalars with YAML comments', async () => {
    const content = document(unfinished)
      .replace('code: GUARD-001', 'code: "GUARD-001" # identity')
      .replace('status: Proposed', 'status: \'Proposed\' # intake\nlevel: epic')
    await writeFile(join(cwd, ticketPath), content)
    await runGitCommand(cwd, ['add', '--', ticketPath])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.diagnostics.length).toBeGreaterThan(0)
    expect(output.diagnostics[0].ticketKey).toBe('GUARD-001')
  })

  test.each(['\n', '\r\n'])('accepts padded frontmatter delimiters with newline %j', async (newline) => {
    const content = document(authored).split('\n').join(newline).replace(`---${newline}`, `---  ${newline}`).replace(`${newline}---${newline}`, `${newline}---\t${newline}`)
    await writeFile(join(cwd, ticketPath), content)
    await runGitCommand(cwd, ['add', '--', ticketPath])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.ok).toBe(true)
    expect(output.data.checked).toBe(1)
    expect(output.diagnostics).toEqual([])
  })

  test.each([
    ['  code: GUARD-001', '  status: Proposed'],
    ['code : GUARD-001', 'status : Proposed'],
  ])('accepts trimmed legacy identity keys %j', async (code, status) => {
    const content = document(authored).replace('code: GUARD-001', code).replace('status: Proposed', status)
    await writeFile(join(cwd, ticketPath), content)
    await runGitCommand(cwd, ['add', '--', ticketPath])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.ok).toBe(true)
    expect(output.data.checked).toBe(1)
    expect(output.diagnostics).toEqual([])
  })

  test.each(['"Implemented" # completed', '\'Implemented\' # completed'])('does not exempt completed Implementation Notes with status %s', async (status) => {
    await writeFile(join(cwd, ticketPath), document(`${authored}\n## Implementation Notes\n*To be filled during/after implementation*\n`).replace('status: Proposed', `status: ${status}`))
    await runGitCommand(cwd, ['add', '--', ticketPath])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    const output = JSON.parse(result.stdout || result.stderr)
    expect(output.diagnostics.length).toBeGreaterThan(0)
    expect(output.diagnostics.some((finding: { instruction?: string }) => finding.instruction?.includes('To be filled'))).toBe(true)
  })

  test('respects an alternate GIT_INDEX_FILE without changing either index', async () => {
    await stage(authored)
    const alternate = join(environment.getTempDirectory(), 'alternate-index')
    await copyFile(join(cwd, '.git/index'), alternate)
    await writeFile(join(cwd, ticketPath), document(unfinished))
    const helper = new ProcessHelper()
    const add = await helper.executeProcess('git', ['add', '--', ticketPath], { cwd, env: { GIT_INDEX_FILE: alternate } })
    expect(add.exitCode).toBe(0)
    const primaryBefore = await readFile(join(cwd, '.git/index'))
    const alternateBefore = await readFile(alternate)
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint, env: { GIT_INDEX_FILE: alternate } })
    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout || result.stderr).diagnostics.length).toBeGreaterThan(0)
    expect(await readFile(join(cwd, '.git/index'))).toEqual(primaryBefore)
    expect(await readFile(alternate)).toEqual(alternateBefore)
    expect(process.env.GIT_INDEX_FILE).not.toBe(alternate)
  })

  test('rejects removed staged project configuration instead of silently skipping', async () => {
    await stage(unfinished)
    await unlink(join(cwd, '.mdt-config.toml'))
    await runGitCommand(cwd, ['add', '-u'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(1)
    expect(JSON.parse(result.stdout || result.stderr).error.message).toContain('configuration')
  })

  test('returns not applicable in a repository with no index/HEAD MDT configuration', async () => {
    await runGitCommand(cwd, ['rm', '--', '.mdt-config.toml'])
    await runGitCommand(cwd, ['commit', '-m', 'non-MDT fixture'])
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint })
    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).data.applicable).toBe(false)
  })

  test('does not create or probe a runtime CONFIG_DIR during offline validation', async () => {
    await stage(authored)
    const configDir = join(environment.getTempDirectory(), 'must-remain-absent')
    expect(existsSync(configDir)).toBe(false)
    const result = await runCli(['ticket', 'validate', '--staged', '--json'], { cwd, entrypoint, env: { CONFIG_DIR: configDir } })
    expect(result.exitCode).toBe(0)
    expect(existsSync(configDir)).toBe(false)
  })
})
