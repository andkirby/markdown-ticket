import type { TicketClaimResponse, TicketIdentityDiagnostic } from '@mdt/domain-contracts'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { CoordinatorError, CreationIdSchema } from '@mdt/domain-contracts'
import { MarkdownService } from '../MarkdownService.js'

const git = promisify(execFile)

export interface TicketIdentityFile {
  code: string
  ticketNumber: number
  creationId?: string
  claimedCode?: string
  absolutePath: string
  relativePath: string
  root: string
  valid: boolean
  contentHash?: string
}
export interface TicketIdentityInventory {
  physicalRepoPath: string
  roots: string[]
  minimumTicketNumber: number
  files: TicketIdentityFile[]
  diagnostics: TicketIdentityDiagnostic[]
}

/** Relative authorized paths only; the transport must never pick one arbitrary match. */
export class TicketIdentityConflictError extends Error {
  readonly code = 'ticket_key_ambiguous'
  readonly status = 409
  constructor(readonly key: string, readonly paths: string[]) {
    super(`Ticket ${key} is ambiguous: ${paths.join(', ')}`)
    this.name = 'TicketIdentityConflictError'
  }
}

export async function repositoryRoots(projectRoot: string): Promise<{ physicalRepoPath: string, roots: string[] }> {
  const root = await realpath(projectRoot)
  try {
    const { stdout } = await git('git', ['rev-parse', '--show-toplevel', '--git-common-dir'], { cwd: root })
    const [top, common] = stdout.trim().split('\n')
    if (!top || !common)
      throw new Error('Invalid repository identity')
    const physicalRepoPath = await realpath(path.resolve(root, common))
    const offset = path.relative(top, root)
    const worktrees = await git('git', ['worktree', 'list', '--porcelain', '-z'], { cwd: root })
    const roots = [...new Set(worktrees.stdout.split('\0').filter(line => line.startsWith('worktree ')).map(line => path.join(line.slice(9), offset)))]
    return { physicalRepoPath, roots: [root, ...roots.filter(item => item !== root)] }
  }
  catch (error) {
    // A non-Git project is supported. Permission, malformed output, or worktree
    // inventory errors must not silently turn a physical repository into one root.
    const stderr = error && typeof error === 'object' && 'stderr' in error ? String(error.stderr) : ''
    if (stderr.includes('not a git repository'))
      return { physicalRepoPath: root, roots: [root] }
    throw new CoordinatorError('reservation_state_conflict', { message: 'Cannot verify repository and worktree identity' })
  }
}

/** Fresh, fail-closed inventory; no cached WorktreeService map or number fallback. */
export async function scanTicketIdentities(projectRoot: string, ticketsPath: string, projectCode: string): Promise<TicketIdentityInventory> {
  const layout = await repositoryRoots(projectRoot)
  const files: TicketIdentityFile[] = []
  const diagnostics: TicketIdentityDiagnostic[] = []
  const scannedDirectories = new Set<string>()
  let highest = 0
  const escaped = projectCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^(${escaped}-(\\d+))(?:-.+)?\\.md$`, 'i')
  for (const [index, root] of layout.roots.entries()) {
    const configuredDir = path.resolve(root, ticketsPath)
    const dir = await realpath(configuredDir).catch(() => configuredDir)
    if (scannedDirectories.has(dir))
      continue
    scannedDirectories.add(dir)
    const relativeDirectory = path.relative(root, dir)
    const external = relativeDirectory === '..' || relativeDirectory.startsWith(`..${path.sep}`) || path.isAbsolute(relativeDirectory)
    const label = (file: string) => `${index ? `worktree-${index}/` : ''}${external ? path.join('tickets-root', path.relative(dir, file)) : path.relative(root, file)}`.split(path.sep).join('/')
    let names
    try {
      names = await readdir(dir, { withFileTypes: true })
    }
    catch (error) {
      const errno = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      const rootAvailable = await stat(root).then(value => value.isDirectory(), () => false)
      const cause = !rootAvailable ? 'worktree_unavailable' : errno === 'EACCES' || errno === 'EPERM' ? 'permission_denied' : 'tickets_directory_unavailable'
      diagnostics.push({
        code: projectCode.toUpperCase(),
        filePath: label(dir),
        state: 'verification_pending',
        cause,
        message: `Ticket inventory is incomplete (${cause}${errno === 'ENOENT' || errno === 'EACCES' || errno === 'EPERM' ? `: ${errno}` : ''})`,
        nextAction: !rootAvailable
          ? 'Restore or inspect this worktree or mount. Only after confirming it is permanently removed, review git worktree list --porcelain and git worktree prune --dry-run before pruning stale metadata.'
          : 'Verify the configured tickets directory exists and is readable, then explicitly retry. Preserve any existing files.',
      })
      continue
    }
    const candidates: string[] = []
    for (const item of names) {
      if (pattern.test(item.name)) {
        if (!item.isFile()) {
          diagnostics.push({ code: projectCode, filePath: label(path.join(dir, item.name)), state: 'verification_pending', message: 'Ticket entry is not a regular canonical file' })
          continue
        }
        candidates.push(path.join(dir, item.name))
      }
      else if (item.isFile() && item.name.toLowerCase().endsWith('.md')) {
        candidates.push(path.join(dir, item.name))
      }
      else if (item.isDirectory() && new RegExp(`^${escaped}-\\d+$`, 'i').test(item.name)) {
        const nested = path.join(dir, item.name, `${item.name}.md`)
        try {
          await readFile(nested)
          candidates.push(nested)
        }
        catch (error) {
          if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
            diagnostics.push({ code: item.name, filePath: label(nested), state: 'verification_pending', message: 'Canonical ticket file could not be read' })
        }
      }
    }
    for (const absolutePath of candidates) {
      const match = path.basename(absolutePath).match(pattern)
      let ticketNumber = Number(match?.[2])
      let code = `${projectCode.toUpperCase()}-${String(ticketNumber).padStart(3, '0')}`
      let creationId: string | undefined
      let claimedCode: string | undefined
      let contentHash: string | undefined
      let valid = !!match && Number.isSafeInteger(ticketNumber) && ticketNumber > 0 && ticketNumber < Number.MAX_SAFE_INTEGER
      try {
        const content = await readFile(absolutePath, 'utf8')
        contentHash = createHash('sha256').update(content).digest('hex')
        const ticket = await MarkdownService.parseMarkdownContent(content, absolutePath, root)
        claimedCode = ticket?.code.toUpperCase()
        if (!match) {
          const claimed = claimedCode?.match(new RegExp(`^${escaped}-(\\d+)$`, 'i'))
          if (!claimed)
            continue
          ticketNumber = Number(claimed[1])
          code = `${projectCode.toUpperCase()}-${String(ticketNumber).padStart(3, '0')}`
        }
        valid = valid && ticket?.code.toUpperCase() === code
        creationId = ticket?.creationId
        if (creationId && !CreationIdSchema.safeParse(creationId).success)
          valid = false
      }
      catch { valid = false }
      if (!match && !claimedCode)
        continue
      files.push({ code, claimedCode, ticketNumber, creationId, absolutePath, relativePath: label(absolutePath), root, valid, contentHash })
      if (!valid) {
        const unsafe = !Number.isSafeInteger(ticketNumber) || ticketNumber <= 0 || ticketNumber >= Number.MAX_SAFE_INTEGER
        diagnostics.push({ code, filePath: label(absolutePath), state: 'verification_pending', cause: unsafe ? 'unsupported_ticket_number' : 'invalid_ticket', message: unsafe ? 'Ticket number exceeds the supported safe range' : 'Ticket filename, frontmatter, or creation identity cannot be verified', nextAction: 'Preserve this file and resolve its filename, key and creation identity explicitly before creating another ticket.' })
      }
      if (Number.isSafeInteger(ticketNumber) && ticketNumber > 0 && ticketNumber < Number.MAX_SAFE_INTEGER)
        highest = Math.max(highest, ticketNumber)
    }
  }
  if (highest + 1 >= Number.MAX_SAFE_INTEGER) {
    const last = files.find(file => file.ticketNumber === highest)
    diagnostics.push({ code: last?.code ?? projectCode.toUpperCase(), filePath: last?.relativePath ?? '.', state: 'verification_pending', cause: 'number_range_exhausted', message: 'Ticket numbering has no supported next number', nextAction: 'Preserve allocated identities. Operator review is required before any further creation.' })
  }
  return { ...layout, files, diagnostics, minimumTicketNumber: highest + 1 }
}

/** Same creation may be present in distinct Git worktrees; two slugs in one root cannot. */
export function assertUnambiguousTicket(inventory: TicketIdentityInventory, code: string): void {
  const direct = inventory.files.filter(file => file.code.toUpperCase() === code.toUpperCase() || file.claimedCode === code.toUpperCase())
  const claimedIdentities = new Set(direct.map(file => file.creationId).filter(Boolean))
  const matches = inventory.files.filter(file => direct.includes(file) || (file.creationId && claimedIdentities.has(file.creationId)))
  const roots = new Set(matches.map(file => file.root))
  const identities = new Set(matches.map(file => file.creationId))
  if (direct.some(file => !file.valid) || matches.some(file => file.code.toUpperCase() !== code.toUpperCase()) || (matches.length > 1 && (roots.size !== matches.length || identities.size !== 1 || !matches[0].creationId)))
    throw new TicketIdentityConflictError(code, matches.map(file => file.relativePath).sort())
}

export function assertSafeTicketInventory(inventory: TicketIdentityInventory): void {
  if (inventory.diagnostics.length)
    throw new CoordinatorError('reservation_state_conflict', { message: `Canonical ticket inventory is incomplete or invalid: ${inventory.diagnostics.slice(0, 4).map(item => `${item.filePath} (${item.cause ?? 'invalid_ticket'}): ${item.nextAction ?? item.message}`).join('; ')}` })
  for (const file of inventory.files)
    assertUnambiguousTicket(inventory, file.code)
}

/** Observation never creates/acks/publishes. A number alone is not provenance. */
export function classifyTicketIdentity(file: TicketIdentityFile, claim?: TicketClaimResponse): TicketIdentityDiagnostic {
  const result = (state: TicketIdentityDiagnostic['state'], message: string): TicketIdentityDiagnostic => ({ code: file.code, filePath: file.relativePath, state, message })
  if (!file.valid || !claim || !file.creationId || (claim.state !== 'unreserved' && !claim.creationId))
    return result('verification_pending', 'Creation identity is unverified; inspect or explicitly reconcile this file')
  if (claim.ticketNumber !== file.ticketNumber || (claim.creationId && claim.creationId !== file.creationId))
    return result('conflict', 'Ticket number belongs to a different creation; preserve the file and resolve explicitly')
  if (claim.state === 'unreserved')
    return result('unmanaged', 'Ticket has no coordinator claim; explicit operator registration is required')
  if (claim.state === 'acknowledged')
    return result('verified', 'Existing ticket creation identity verified')
  return result('verification_pending', 'Ticket number is reserved or retired; explicit owned recovery or operator reconciliation is required')
}
