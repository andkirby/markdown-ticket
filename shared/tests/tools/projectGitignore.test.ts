/**
 * Unit tests for the MDT gitignore scaffold module (MDT-143 TASK-cli-init-gitignore)
 *
 * Canonical entry list and git policy: docs/MDT_WORKING_STATE_FILES.md.
 * The shared scaffold constant must mirror that document.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ensureProjectGitignore,
  GITIGNORE_BLOCK_END,
  GITIGNORE_BLOCK_START,
  renderMdtGitignoreBlock,
} from '../../tools/projectGitignore.js'

describe('projectGitignore scaffold', () => {
  let projectRoot: string

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'mdt-gitignore-'))
  })

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true })
  })

  it('creates .gitignore with the managed block in a fresh folder', () => {
    const result = ensureProjectGitignore(projectRoot, 'docs/CRs', 'MDT')

    expect(result).toBe('created')
    const content = readFileSync(join(projectRoot, '.gitignore'), 'utf8')
    expect(content).toBe(`${renderMdtGitignoreBlock('docs/CRs', 'MDT')}\n`)
    expect(content).toContain('!docs/CRs/MDT-*.md')
  })

  it('appends the block to an existing user .gitignore preserving every user line', () => {
    const userLines = ['# user rules', 'node_modules/', '*.log']
    writeFileSync(join(projectRoot, '.gitignore'), `${userLines.join('\n')}\n`, 'utf8')

    const result = ensureProjectGitignore(projectRoot, 'docs/CRs', 'MDT')

    expect(result).toBe('merged')
    const content = readFileSync(join(projectRoot, '.gitignore'), 'utf8')
    for (const line of userLines) {
      expect(content).toContain(line)
    }
    expect(content.indexOf(GITIGNORE_BLOCK_START)).toBeGreaterThan(0)
    expect(content).toContain('!docs/CRs/MDT-*.md')
  })

  it('second run is a byte-identical no-op', () => {
    ensureProjectGitignore(projectRoot, 'docs/CRs', 'MDT')
    const first = readFileSync(join(projectRoot, '.gitignore'), 'utf8')

    const result = ensureProjectGitignore(projectRoot, 'docs/CRs', 'MDT')

    expect(result).toBe('unchanged')
    expect(readFileSync(join(projectRoot, '.gitignore'), 'utf8')).toBe(first)
  })

  it('replaces a stale managed block without touching unmanaged lines', () => {
    const stale = [
      '# user',
      GITIGNORE_BLOCK_START,
      'stale-entry',
      GITIGNORE_BLOCK_END,
    ].join('\n')
    writeFileSync(join(projectRoot, '.gitignore'), `${stale}\n`, 'utf8')

    const result = ensureProjectGitignore(projectRoot, 'issues', 'ABC')

    expect(result).toBe('merged')
    const content = readFileSync(join(projectRoot, '.gitignore'), 'utf8')
    expect(content).toContain('# user')
    expect(content).not.toContain('stale-entry')
    expect(content).toContain('!issues/ABC-*.md')
  })

  it('managed block appears exactly once when appended after user content', () => {
    writeFileSync(join(projectRoot, '.gitignore'), 'a\n', 'utf8')

    ensureProjectGitignore(projectRoot, 'docs/CRs', 'MDT')

    const content = readFileSync(join(projectRoot, '.gitignore'), 'utf8')
    expect(content.split(GITIGNORE_BLOCK_START).length - 1).toBe(1)
    expect(content.split(GITIGNORE_BLOCK_END).length - 1).toBe(1)
  })

  it('entry list is depth-explicit and omits broad dot patterns', () => {
    const entries = renderMdtGitignoreBlock('docs/CRs', 'MDT').split('\n')

    expect(entries).toContain('/.mdt-next')
    expect(entries).toContain('/.mdt/')
    expect(entries).toContain('**/.checkpoint.yaml')
    expect(entries).toContain('**/*.tasks-status.yaml')
    // broad dot patterns swallow tool configs (.prettierrc.json etc.) — never scaffold them
    expect(entries).not.toContain('**/.*.json')
    expect(entries).not.toContain('**/.*.yaml')
    // the ticket-file negation must be the last entry so it wins (last match wins)
    expect(entries[entries.length - 2]).toBe('!docs/CRs/MDT-*.md')
    expect(entries[entries.length - 1]).toBe(GITIGNORE_BLOCK_END)
  })
})
