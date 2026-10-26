/** MDT-261: real Lefthook composition and isolated commit enforcement. */
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { ProjectConfigSchema } from '@mdt/domain-contracts'
import { getTicketsPath } from '@mdt/shared/models/Project.js'
import { initGitRepository, ProcessHelper, ProjectFactory, runGitCommand, TestEnvironment } from '@mdt/shared/test-lib'
import { parseToml } from '@mdt/shared/utils/toml.js'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const repository = resolve(import.meta.dir, '../../../..')
const launcher = join(repository, 'scripts/check-ticket-templates.sh')
const ticketPath = 'docs/CRs/GUARD-001-hook-example.md'
const document = (body: string) => `---\ncode: GUARD-001\nstatus: Proposed\ntype: Architecture\npriority: Medium\n---\n\n# Hook example\n\n${body}`
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\''`)}'`

describe('MDT-261 actual local hook', () => {
  let environment: TestEnvironment
  let cwd: string
  let processes: ProcessHelper

  beforeEach(async () => {
    environment = new TestEnvironment()
    await environment.setup()
    cwd = (await new ProjectFactory(environment).createProject('empty', { code: 'GUARD' })).path
    await initGitRepository(cwd)
    await runGitCommand(cwd, ['add', '--', '.mdt-config.toml'])
    await runGitCommand(cwd, ['commit', '-m', 'initial fixture'])
    processes = new ProcessHelper()
  })

  afterEach(async () => environment.cleanup())

  async function install(script = launcher) {
    await writeFile(join(cwd, 'lefthook.yml'), `pre-commit:\n  commands:\n    mdt-ticket-templates:\n      run: ${JSON.stringify(`sh ${shellQuote(script)}`)}\n`)
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
    expect(config['pre-commit'].commands['mdt-ticket-templates'].run).toContain('scripts/check-ticket-templates.sh')
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
    const args = ['run', 'pre-commit', '--job', 'mdt-ticket-templates', '--force', '--no-auto-install']
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
  })

  test('a real commit is blocked for a scaffold and accepted after the staged body is completed', async () => {
    await install()
    const before = (await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout
    await stage('## Problem Statement\n[What architectural problem are we solving?]\n')
    const blocked = await processes.executeProcess('git', ['commit', '-m', 'unfinished fixture'], { cwd })
    expect(blocked.exitCode).not.toBe(0)
    expect(blocked.stdout + blocked.stderr).toContain('GUARD-001')
    expect(blocked.stdout + blocked.stderr).toContain('before committing')
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).toBe(before)

    await stage('## Problem\nAgents miss unfinished template instructions.\n\n## Outcome\nBlock those commits and explain the missing content.\n')
    const accepted = await processes.executeProcess('git', ['commit', '-m', 'completed fixture'], { cwd })
    expect(accepted.exitCode).toBe(0)
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).not.toBe(before)
    expect((await readFile(join(cwd, ticketPath), 'utf8'))).toContain('Block those commits')
  })

  test('an unavailable validator blocks the real commit with a build remedy', async () => {
    const script = join(cwd, 'scripts/check-ticket-templates.sh')
    await mkdir(join(cwd, 'scripts'), { recursive: true })
    await copyFile(launcher, script)
    await install(script)
    await stage('## Problem\nA validator build is required.\n\n## Outcome\nFail explicitly when unavailable.\n')
    const before = (await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout
    const result = await processes.executeProcess('git', ['commit', '-m', 'missing validator fixture'], { cwd })
    expect(result.exitCode).not.toBe(0)
    expect(result.stdout + result.stderr).toContain('validator build is missing')
    expect(result.stdout + result.stderr).toContain('bun run build:shared')
    expect((await runGitCommand(cwd, ['rev-parse', 'HEAD'])).stdout).toBe(before)
  })
})
