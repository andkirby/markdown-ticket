/**
 * Project Init Gitignore E2E (MDT-143 TASK-cli-init-gitignore)
 *
 * Covers BR-16 (init ensures a marker-delimited managed MDT block in .gitignore)
 * and Edge-12 (existing user .gitignore preserved, block appended exactly once,
 * re-run leaves the file byte-identical).
 * Canonical entry list and git policy: docs/MDT_WORKING_STATE_FILES.md.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { TestEnvironment } from '@mdt/shared/test-lib'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { runCli } from '../helpers/cli-runner.js'

const BLOCK_START = '# >>> MDT working state (managed by mdt-cli project init) >>>'
const BLOCK_END = '# <<< MDT working state <<<'

const EXPECTED_ENTRIES = [
  '/.mdt-next',
  '/.mdt/',
  '**/*.trace.md',
  '**/spec-trace*.md',
  '**/pipeline-state.json',
  '**/*.pipeline-state.json',
  '**/*.tasks-status.yaml',
  '**/.checkpoint.yaml',
  '**/poc/',
  '**/*prompt*.md',
]

async function readGitignore(dir: string): Promise<string> {
  return Bun.file(join(dir, '.gitignore')).text()
}

describe('project init gitignore scaffold', () => {
  let testEnv: TestEnvironment

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
  })

  afterAll(async () => {
    await testEnv.cleanup()
  })

  test('creates .gitignore with the managed MDT block in a fresh folder', async () => {
    const tempDir = join(testEnv.getTempDirectory(), 'init-git-fresh')
    await mkdir(tempDir, { recursive: true })

    const result = await runCli(['project', 'init', 'GIT', 'Gitignore Fresh'], { cwd: tempDir })

    expect(result.exitCode).toBe(0)
    const content = await readGitignore(tempDir)
    expect(content).toContain(BLOCK_START)
    expect(content).toContain(BLOCK_END)
    for (const entry of EXPECTED_ENTRIES) {
      expect(content).toContain(entry)
    }
    // ticket-file negation uses the project's tickets path and code
    expect(content).toContain('!docs/CRs/GIT-*.md')
    // init output surfaces the scaffolded gitignore
    expect(result.stdout).toContain('gitignore')
  })

  test('substitutes a custom tickets path into the ticket negation', async () => {
    const tempDir = join(testEnv.getTempDirectory(), 'init-git-custom-path')
    await mkdir(tempDir, { recursive: true })

    const result = await runCli(
      ['project', 'init', 'CUS', 'Custom Tickets Path', '--tickets-path', 'issues/tickets'],
      { cwd: tempDir },
    )

    expect(result.exitCode).toBe(0)
    const content = await readGitignore(tempDir)
    expect(content).toContain('!issues/tickets/CUS-*.md')
  })

  test('merges into an existing user .gitignore preserving user lines, exactly once, idempotent', async () => {
    const tempDir = join(testEnv.getTempDirectory(), 'init-git-merge')
    await mkdir(tempDir, { recursive: true })
    const userLines = ['# user rules', 'node_modules/', '*.log']
    await writeFile(join(tempDir, '.gitignore'), `${userLines.join('\n')}\n`, 'utf8')

    const first = await runCli(['project', 'init', 'MRG', 'Merge Project'], { cwd: tempDir })
    expect(first.exitCode).toBe(0)

    const afterFirst = await readGitignore(tempDir)
    for (const line of userLines) {
      expect(afterFirst).toContain(line)
    }
    // block appears exactly once, after the user content
    expect(afterFirst.split(BLOCK_START).length - 1).toBe(1)
    expect(afterFirst.indexOf(userLines[0])).toBeLessThan(afterFirst.indexOf(BLOCK_START))
    expect(afterFirst).toContain('!docs/CRs/MRG-*.md')

    // a second init run must leave the file byte-identical
    // (the re-run may be rejected because the code is already registered —
    // either way the managed file must not change)
    await runCli(['project', 'init', 'MRG', 'Merge Project'], { cwd: tempDir })
    const afterSecond = await readGitignore(tempDir)
    expect(afterSecond).toBe(afterFirst)
  })
})
