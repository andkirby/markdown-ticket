import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * MDT working-state gitignore scaffold (MDT-143).
 *
 * Canonical phrasing source: docs/MDT_WORKING_STATE_FILES.md — change the
 * document first, then mirror changes here and in the repo .gitignore.
 *
 * Semantics (BR-16 / Edge-12 / C10):
 * - marker-delimited managed block inside the project's .gitignore
 * - create the file when absent, append the block when missing, replace a
 *   stale managed block, no-op when already current
 * - never modify unmanaged lines; re-running init produces no diff
 * - consumed by every project-init entrypoint that routes through
 *   ProjectManager.createProject (CLI, project:create script, web)
 */

/** Start marker of the managed block (stable contract — do not rename). */
export const GITIGNORE_BLOCK_START = '# >>> MDT working state (managed by mdt-cli project init) >>>'

/** End marker of the managed block (stable contract — do not rename). */
export const GITIGNORE_BLOCK_END = '# <<< MDT working state <<<'

/**
 * Fixed MDT working-state entries. Depth-explicit by convention:
 * a leading `/` anchors to the project root; a `**` prefix (double star +
 * slash) matches at any depth.
 * Broad dot-file patterns (any dot-prefixed json or yaml) are deliberately
 * absent — they swallow tool configs (`.prettierrc.json`, `.knip.json`).
 */
export const MDT_GITIGNORE_ENTRIES: readonly string[] = [
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

/**
 * Build the full entry list for a project, including the per-project
 * ticket-file negation. The negation must stay last inside the block so it
 * wins over the ignore entries above it (gitignore: last match wins) — a
 * ticket whose slug collides with an ignore pattern (e.g. "prompt") must
 * never be silently ignored.
 */
export function buildMdtGitignoreEntries(ticketsPath: string, projectCode: string): string[] {
  return [...MDT_GITIGNORE_ENTRIES, `!${ticketsPath}/${projectCode}-*.md`]
}

/** Render the complete managed block for a project. */
export function renderMdtGitignoreBlock(ticketsPath: string, projectCode: string): string {
  return [GITIGNORE_BLOCK_START, ...buildMdtGitignoreEntries(ticketsPath, projectCode), GITIGNORE_BLOCK_END]
    .join('\n')
}

/** Outcome of ensuring the managed block in a project's .gitignore. */
export type GitignoreScaffoldResult = 'created' | 'merged' | 'unchanged'

/**
 * Ensure the target `.gitignore` contains the managed MDT working-state block.
 *
 * - file absent → create it containing only the block
 * - file present without the block → append the block, separated by one
 *   blank line, preserving every existing byte of unmanaged content
 * - file present with a current block → no-op (byte-identical re-run)
 * - file present with a stale block → replace the managed region only
 */
export function ensureProjectGitignore(
  projectPath: string,
  ticketsPath: string,
  projectCode: string,
): GitignoreScaffoldResult {
  const gitignorePath = path.join(projectPath, '.gitignore')
  const desiredBlock = renderMdtGitignoreBlock(ticketsPath, projectCode)

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${desiredBlock}\n`, 'utf8')
    return 'created'
  }

  const existing = fs.readFileSync(gitignorePath, 'utf8')
  const startIdx = existing.indexOf(GITIGNORE_BLOCK_START)
  const endIdx = existing.indexOf(GITIGNORE_BLOCK_END)

  if (startIdx !== -1 && endIdx > startIdx) {
    const endOfBlock = endIdx + GITIGNORE_BLOCK_END.length
    if (existing.slice(startIdx, endOfBlock) === desiredBlock) {
      return 'unchanged'
    }
    fs.writeFileSync(gitignorePath, existing.slice(0, startIdx) + desiredBlock + existing.slice(endOfBlock), 'utf8')
    return 'merged'
  }

  // No managed block yet — append it with exactly one blank line of separation,
  // adding a trailing newline to the existing content only if it lacks one.
  const needsNewline = existing.length > 0 && !existing.endsWith('\n')
  const blankLine = existing.length === 0 || existing.endsWith('\n\n') ? '' : '\n'
  fs.writeFileSync(gitignorePath, `${existing}${needsNewline ? '\n' : ''}${blankLine}${desiredBlock}\n`, 'utf8')
  return 'merged'
}
