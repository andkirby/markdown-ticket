/** Read-only Git-index adapter for the shared ticket content policy (MDT-261). */
import type { StagedTicketValidationResult } from '@mdt/domain-contracts'
import { execFile } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { CanonicalProjectCodeSchema, ProjectConfigSchema, TICKET_NUMBER_MAX_DIGITS } from '@mdt/domain-contracts'
import { getTicketsPath } from '../../models/Project.js'
import { parseToml } from '../../utils/toml.js'
import { inspectTicketContent } from './content-inspection.js'

const execFileAsync = promisify(execFile)
const CONFIG_PATH = '.mdt-config.toml'
const REGULAR_MODES = new Set(['100644', '100755'])

interface IndexEntry {
  mode: string
  oid: string
  stage: number
  filePath: string
}

export class StagedTicketValidationError extends Error {
  readonly code = 'TICKET_VALIDATION_FAILED'
}

async function git(repoRoot: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync('git', ['--literal-pathspecs', '-C', repoRoot, ...args], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    })
    return result.stdout
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new StagedTicketValidationError(`Cannot inspect the staged Git snapshot: ${message}. Resolve the Git/index error and retry validation.`)
  }
}

function parseIndex(snapshot: string): IndexEntry[] {
  return snapshot.split('\0').filter(Boolean).map((record) => {
    const match = /^(\d{6}) ([0-9a-f]{40}|[0-9a-f]{64}) ([0-3])\t([\s\S]+)$/.exec(record)
    if (!match)
      throw new StagedTicketValidationError('Cannot parse the staged Git index. Repair the index and retry validation.')
    return { mode: match[1]!, oid: match[2]!, stage: Number(match[3]), filePath: match[4]! }
  })
}

async function hasHistoricalConfig(repoRoot: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['--literal-pathspecs', '-C', repoRoot, 'rev-parse', '--verify', '--quiet', 'HEAD'], {
      env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    })
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 1)
      return false
    throw new StagedTicketValidationError('Cannot inspect repository HEAD while resolving staged MDT configuration. Repair the Git repository and retry.')
  }
  return (await git(repoRoot, ['ls-tree', '--name-only', '-z', 'HEAD', '--', CONFIG_PATH])).split('\0').includes(CONFIG_PATH)
}

function configuredTicketDirectory(repoRoot: string, value: string): string {
  if (path.win32.isAbsolute(value) && !path.isAbsolute(value))
    throw new StagedTicketValidationError('Staged ticket configuration points outside this Git repository. Configure a repository-local ticketsPath before validating.')
  const resolved = path.resolve(repoRoot, value)
  const relative = path.relative(repoRoot, resolved)
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    throw new StagedTicketValidationError('Staged ticket configuration points outside this Git repository. Configure a repository-local ticketsPath before validating.')
  return relative.split(path.sep).join('/')
}

function ticketContext(document: string, ticketKey: string, filePath: string): { ticketKey: string, filePath: string, status?: string } {
  const frontmatter = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(document)
  if (!frontmatter)
    throw new StagedTicketValidationError(`Cannot validate ${filePath}: ticket frontmatter is missing or unclosed. Restore the frontmatter and retry.`)

  // MarkdownService's private parser imports constants that create config dirs.
  // Read only the scalar identity/status fields here, retaining its line/key trim
  // semantics; unrelated frontmatter fields are not this guard's responsibility.
  const values = new Map<string, string>()
  for (const line of frontmatter[1]!.split(/\r?\n/)) {
    const match = /^(code|key|status)[ \t]*:(.*)$/.exec(line.trim())
    if (!match)
      continue
    const key = match[1]!
    if (values.has(key))
      throw new StagedTicketValidationError(`Cannot validate ${filePath}: duplicate ${key} frontmatter. Resolve the ambiguity and retry.`)
    const raw = match[2]!.trim()
    let value: string
    if (raw.startsWith('"')) {
      const quoted = /^("(?:[^"\\]|\\.)*")[ \t]*(?:#.*)?$/.exec(raw)
      try {
        if (!quoted)
          throw new Error('unclosed quoted scalar')
        value = JSON.parse(quoted[1]!) as string
      }
      catch {
        throw new StagedTicketValidationError(`Cannot validate ${filePath}: malformed ${key} frontmatter. Correct the scalar value and retry.`)
      }
    }
    else if (raw.startsWith('\'')) {
      const quoted = /^'((?:[^']|'')*)'[ \t]*(?:#.*)?$/.exec(raw)
      if (!quoted)
        throw new StagedTicketValidationError(`Cannot validate ${filePath}: malformed ${key} frontmatter. Correct the scalar value and retry.`)
      value = quoted[1]!.replace(/''/g, '\'')
    }
    else {
      value = raw.replace(/[ \t]+#.*$/, '').trim()
    }
    values.set(key, value)
  }
  const code = values.get('code') ?? values.get('key')
  if (code !== ticketKey || (values.has('key') && values.get('key') !== ticketKey))
    throw new StagedTicketValidationError(`Cannot validate ${filePath}: frontmatter identity does not match ${ticketKey}. Correct the ticket key or filename and retry.`)
  return { ticketKey, filePath, status: values.get('status') }
}

/** Validate the entire staged version of changed primary tickets without writes. */
export async function validateStagedTickets(request: { repoRoot: string }): Promise<StagedTicketValidationResult> {
  const repoRoot = (await git(request.repoRoot, ['rev-parse', '--show-toplevel'])).trim()
  const snapshot = await git(repoRoot, ['ls-files', '--stage', '-z'])
  const entries = parseIndex(snapshot)
  if (entries.some(entry => entry.stage !== 0))
    throw new StagedTicketValidationError('The staged snapshot has unresolved merge entries. Resolve and stage conflicts before validating ticket content.')

  const configEntry = entries.find(entry => entry.filePath === CONFIG_PATH)
  if (!configEntry) {
    if (await hasHistoricalConfig(repoRoot))
      throw new StagedTicketValidationError('The tracked MDT configuration is absent from the staged snapshot. Stage a valid .mdt-config.toml before validating tickets.')
    return { applicable: false, checked: 0, diagnostics: [] }
  }
  if (!REGULAR_MODES.has(configEntry.mode))
    throw new StagedTicketValidationError('Staged .mdt-config.toml must be a regular file. Replace the symlink or unsupported index entry and retry.')

  let projectCode: string
  let directory: string
  try {
    const config = ProjectConfigSchema.parse(parseToml(await git(repoRoot, ['cat-file', 'blob', configEntry.oid])))
    projectCode = CanonicalProjectCodeSchema.parse(config.project.code)
    directory = configuredTicketDirectory(repoRoot, getTicketsPath(config))
  }
  catch (error) {
    if (error instanceof StagedTicketValidationError)
      throw error
    const message = error instanceof Error ? error.message : String(error)
    throw new StagedTicketValidationError(`Cannot validate staged .mdt-config.toml: ${message}. Correct and stage the configuration before retrying.`)
  }

  const changed = new Set((await git(repoRoot, ['diff', '--cached', '--no-ext-diff', '--no-renames', '--name-only', '--diff-filter=ACMR', '-z'])).split('\0').filter(Boolean))
  const filename = new RegExp(`^(${projectCode}-\\d{1,${TICKET_NUMBER_MAX_DIGITS}})(?:-[^/]*)?\\.md$`)
  const result: StagedTicketValidationResult = { applicable: true, checked: 0, diagnostics: [] }
  for (const entry of entries) {
    if (!changed.has(entry.filePath))
      continue
    const parent = path.posix.dirname(entry.filePath)
    if ((parent === '.' ? '' : parent) !== directory)
      continue
    const match = filename.exec(path.posix.basename(entry.filePath))
    if (!match)
      continue
    if (!REGULAR_MODES.has(entry.mode))
      throw new StagedTicketValidationError(`Cannot validate ${entry.filePath}: primary tickets must be regular staged files. Replace the symlink or unsupported entry and retry.`)
    const document = await git(repoRoot, ['cat-file', 'blob', entry.oid])
    result.diagnostics.push(...inspectTicketContent(document, ticketContext(document, match[1]!, entry.filePath)))
    result.checked += 1
  }
  if ((await git(repoRoot, ['ls-files', '--stage', '-z'])) !== snapshot)
    throw new StagedTicketValidationError('The Git index changed during ticket validation. Retry against a stable staged snapshot.')
  return result
}
