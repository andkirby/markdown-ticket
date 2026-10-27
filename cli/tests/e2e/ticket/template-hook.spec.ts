/** MDT-261: real Lefthook composition and isolated commit enforcement. */
import { existsSync } from 'node:fs'
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { ProjectConfigSchema } from '@mdt/domain-contracts'
import { getTicketsPath } from '@mdt/shared/models/Project.js'
import { initGitRepository, ProcessHelper, ProjectFactory, runGitCommand, TestEnvironment } from '@mdt/shared/test-lib'
import { parseToml } from '@mdt/shared/utils/toml.js'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const repository = resolve(import.meta.dir, '../../../..')
const hookRemote = 'https://github.com/rikby/agent-commit-hooks.git'
const hookRef = 'v0.5.0'
const ticketPath = 'docs/CRs/GUARD-001-hook-example.md'
const document = (body: string) => `---\ncode: GUARD-001\nstatus: Proposed\ntype: Architecture\npriority: Medium\n---\n\n# Hook example\n\n${body}`
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\''`)}'`

describe('MDT-261 shared remote hook', () => {
  let environment: TestEnvironment
  let cwd: string
  let processes: ProcessHelper
  let cliEnvironment: Record<string, string>

  beforeEach(async () => {
    environment = new TestEnvironment()
    await environment.setup()
    cwd = (await new ProjectFactory(environment).createProject('empty', { code: 'GUARD' })).path
    await initGitRepository(cwd)
    await runGitCommand(cwd, ['add', '--', '.mdt-config.toml'])
    await runGitCommand(cwd, ['commit', '-m', 'initial fixture'])
    processes = new ProcessHelper()
    const bin = join(environment.getTempDirectory(), 'hook-bin')
    await mkdir(bin)
    await writeFile(join(bin, 'mdt-cli'), `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(join(repository, 'cli/dist/index.js'))} "$@"\n`, { mode: 0o755 })
    cliEnvironment = { PATH: `${bin}:${process.env.PATH}` }
  })

  afterEach(async () => environment.cleanup())

  async function install() {
    await writeFile(join(cwd, 'lefthook.yml'), `remotes:\n  - git_url: ${hookRemote}\n    ref: ${hookRef}\n    configs:\n      - configs/mdt/check-ticket-templates.yml\n`)
    const result = await processes.executeProcess('lefthook', ['install'], { cwd })
    expect(result.exitCode).toBe(0)
  }

  async function stage(body: string) {
    await writeFile(join(cwd, ticketPath), document(body))
    await runGitCommand(cwd, ['add', '--', ticketPath])
  }

  test('the full actual effective config retains the guard, remote scripts and CSS gate', async () => {
    const result = await processes.executeProcess('lefthook', ['dump', '--format', 'json'], { cwd: repository })
    expect(result.exitCode).toBe(0)
    const config = JSON.parse(result.stdout)
    expect(config['pre-commit'].scripts['check-ticket-templates.sh'].runner).toBe('sh')
    expect(config['pre-commit'].commands['mdt-ticket-templates']).toBeUndefined()
    expect(existsSync(join(repository, 'scripts/check-ticket-templates.sh'))).toBe(false)
    const remote = config.remotes.find((entry: { git_url: string }) => entry.git_url === hookRemote)
    expect(remote.ref).toBe(hookRef)
    expect(remote.configs.filter((path: string) => path === 'configs/mdt/check-ticket-templates.yml')).toHaveLength(1)
    expect(config['pre-commit'].scripts['block-mdt-incomplete-tasks.sh']).toBeDefined()
    const localConfig = join(repository, 'lefthook-local.yml')
    if (existsSync(localConfig) && (await readFile(localConfig, 'utf8')).includes('parse-css'))
      expect(config['pre-commit'].commands['parse-css']).toBeDefined()
  })

  test('executes the actual registered root job against isolated staged blobs', async () => {
    const rootGit = async (args: string[], env: Record<string, string> = {}) => {
      const result = await processes.executeProcess('git', args, { cwd: repository, env })
      expect(result.exitCode).toBe(0)
      return result.stdout.trim()
    }
    const indexPath = resolve(repository, await rootGit(['rev-parse', '--git-path', 'index']))
    const originalIndex = await readFile(indexPath)
    const objectsPath = resolve(repository, await rootGit(['rev-parse', '--git-path', 'objects']))
    const objectDirectory = join(environment.getTempDirectory(), 'root-job-objects')
    const alternateIndex = join(environment.getTempDirectory(), 'root-job-index')
    await mkdir(objectDirectory)
    const env = {
      GIT_INDEX_FILE: alternateIndex,
      GIT_OBJECT_DIRECTORY: objectDirectory,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: objectsPath,
      GIT_OPTIONAL_LOCKS: '0',
      ...cliEnvironment,
    }
    // HEAD/config stay readable through alternates; all new objects and index
    // writes stay outside the actual repository and its working tree.
    await rootGit(['read-tree', 'HEAD'], env)
    const config = ProjectConfigSchema.parse(parseToml(await rootGit(['show', 'HEAD:.mdt-config.toml'], env)))
    const probeKey = `${config.project.code}-99999`
    const probePath = `${getTicketsPath(config)}/${probeKey}-root-hook-probe.md`
    const blobInput = join(environment.getTempDirectory(), 'root-job-body.md')
    expect(existsSync(join(repository, probePath))).toBe(false)
    const stageBlob = async (body: string) => {
      await writeFile(blobInput, document(body).replace('GUARD-001', probeKey))
      const oid = await rootGit(['hash-object', '-w', '--no-filters', '--', blobInput], env)
      await rootGit(['update-index', '--add', '--cacheinfo', `100644,${oid},${probePath}`], env)
    }
    const args = ['run', 'pre-commit', '--job', 'check-ticket-templates.sh', '--force', '--no-auto-install']
    await stageBlob('## Problem Statement\n[What architectural problem are we solving?]\n')
    const blocked = await processes.executeProcess('lefthook', args, { cwd: repository, env })
    expect(blocked.exitCode).not.toBe(0)
    expect(blocked.stdout + blocked.stderr).toContain(probeKey)
    expect(blocked.stdout + blocked.stderr).toContain('before committing')
    expect(await readFile(indexPath)).toEqual(originalIndex)

    await stageBlob('## Problem\nGenerated instructions reach commits unfinished.\n\n## Outcome\nReport the remaining ticket content before committing.\n')
    const accepted = await processes.executeProcess('lefthook', args, { cwd: repository, env })
    expect(accepted.exitCode).toBe(0)
    expect(accepted.stdout + accepted.stderr).toContain('validation passed')
    expect(await readFile(indexPath)).toEqual(originalIndex)
    expect(existsSync(join(repository, probePath))).toBe(false)
    expect(await readFile(alternateIndex)).not.toEqual(originalIndex)
  }, 30_000)

  test('a real commit is blocked for a scaffold and accepted after the staged body is completed', async () => {
    await install()
    const before = (await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout
    await stage('## Problem Statement\n[What architectural problem are we solving?]\n')
    const blocked = await processes.executeProcess('git', ['commit', '-m', 'unfinished fixture'], { cwd, env: cliEnvironment })
    expect(blocked.exitCode).not.toBe(0)
    expect(blocked.stdout + blocked.stderr).toContain('GUARD-001')
    expect(blocked.stdout + blocked.stderr).toContain('before committing')
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).toBe(before)

    await stage('## Problem\nAgents miss unfinished template instructions.\n\n## Outcome\nBlock those commits and explain the missing content.\n')
    const accepted = await processes.executeProcess('git', ['commit', '-m', 'completed fixture'], { cwd, env: cliEnvironment })
    expect(accepted.exitCode).toBe(0)
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).not.toBe(before)
    expect((await readFile(join(cwd, ticketPath), 'utf8'))).toContain('Block those commits')
  }, 30_000)

  test('an unavailable validator blocks the real commit with a setup remedy', async () => {
    await install()
    const toolPath = join(environment.getTempDirectory(), 'without-mdt-cli')
    await mkdir(toolPath)
    for (const tool of ['git', 'sh', 'lefthook']) {
      const executable = Bun.which(tool)
      if (!executable)
        throw new Error(`Required hook test tool is unavailable: ${tool}`)
      await symlink(executable, join(toolPath, tool))
    }
    await stage('## Problem\nA validator build is required.\n\n## Outcome\nFail explicitly when unavailable.\n')
    const before = (await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout
    const result = await processes.executeProcess('git', ['commit', '-m', 'missing validator fixture'], { cwd, env: { PATH: toolPath, MDT_CLI: 'mdt-cli' } })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout + result.stderr).toContain('not found')
    expect(result.stdout + result.stderr).toContain('Install the MDT CLI')
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).toBe(before)
  }, 30_000)
})
