/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { PROJECT_CODE_PATTERN_BODY, TICKET_NUMBER_MAX_DIGITS, TICKET_NUMBER_MIN_DIGITS } from '@mdt/domain-contracts'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { getConfigDir } from '@mdt/shared/utils/constants.js'
import * as chokidar from 'chokidar'

// Ticket folder ("MDT-142") and ticket slug file ("MDT-142-title.md") shapes,
// derived from the canonical key contract (MDT-254) so alphanumeric project
// codes (TP0) and 4-5 digit numbers are recognized.
const TICKET_DIR_PATTERN = new RegExp(`^(${PROJECT_CODE_PATTERN_BODY}-\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}})$`)
const TICKET_SLUG_FILE_PATTERN = new RegExp(`^(${PROJECT_CODE_PATTERN_BODY}-\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}})(?:-.+)?\\.md$`)

export interface ProjectPath { id: string, path: string, projectRoot?: string, projectCode?: string }

export interface WorktreeWatcherEntry {
  watcherId: string
  projectId: string
  ticketCode: string
  worktreePath: string
  watchPath: string
  watcher: chokidar.FSWatcher
}

/** Subdocument metadata extracted from file path */
export interface SubdocumentInfo {
  code: string // e.g., "architecture", "bdd", "tests"
  filePath: string // e.g., "MDT-142/architecture.md"
}

/** Extended file-change event with subdocument metadata (MDT-142) */
export interface FileChangeEventPayload {
  eventType: 'add' | 'change' | 'unlink'
  filename: string
  /** Internal only: preserve the actual slugged path for identity checks/cache invalidation. */
  physicalFilePath: string
  projectId: string
  timestamp: number
  subdocument: SubdocumentInfo | null
  source: 'main' | 'worktree'
}

/** Configured document change event. */
export interface DocumentChangeEventPayload {
  eventType: 'add' | 'change' | 'unlink'
  filePath: string
  absoluteFilePath: string
  projectId: string
  timestamp: number
}

// ponytail: followSymlinks:false avoids ELOOP crashes when a watched tree contains
// recursive symlinks (e.g. Xcode's Ruby.framework/Headers/ruby/ruby/...). MDT only
// needs markdown files, never symlink targets. Re-enable per-watcher if a project
// legitimately stores tickets behind symlinks.
const OPTS = { ignoreInitial: true, persistent: true, followSymlinks: false, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 } }

export class PathWatcherService extends EventEmitter {
  private watchers = new Map<string, chokidar.FSWatcher>()
  private worktreeWatchers = new Map<string, WorktreeWatcherEntry>()
  private worktreeHeads = new Map<string, WorktreeWatcherEntry>()
  private worktreeLifetime = Symbol('worktree service lifetime')
  private projectLifetimes = new Map<string, symbol>()
  private headDiscoveries = new Map<string, { projectId: string, token: symbol, ticketCode?: string }>()
  private watchPaths = new Map<string, string>()
  private projectRoots = new Map<string, string>()
  private ticketPaths = new Map<string, string>()
  private worktreeService = new WorktreeService({ enabled: true })
  /** Active worktree ticket codes to exclude from main watcher (MDT-142 C2) */
  private activeWorktreeExclusions = new Set<string>()

  initMultiProjectWatcher(projectPaths: ProjectPath[]): this {
    for (const p of projectPaths) {
      if (this.watchers.has(p.id))
        continue
      const { basePath, watchPattern } = this.buildTwoLevelWatchPath(p.path)
      this.watchPaths.set(p.id, basePath)
      if (p.projectRoot)
        this.projectRoots.set(p.id, p.projectRoot)
      this.ticketPaths.set(p.id, this.getRelativeTicketPath(p.path, p.projectRoot))
      this.createWatcher(p.id, watchPattern, (w) => {
        w.on('add', fp => this.handleFileEvent('add', fp, p.id, 'main'))
          .on('change', fp => this.handleFileEvent('change', fp, p.id, 'main'))
          .on('unlink', fp => this.handleFileEvent('unlink', fp, p.id, 'main'))
          .on('error', e => this.emit('error', { error: e, projectId: p.id }))
          .on('ready', () => this.emit('ready', { projectId: p.id }))
        this.watchers.set(p.id, w)
      })
    }
    return this
  }

  initDocumentWatchers(projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string): number {
    let count = 0
    this.projectRoots.set(projectId, projectRoot)
    if (ticketsPath)
      this.ticketPaths.set(projectId, this.normalizeRelativePath(ticketsPath))

    for (const documentPath of documentPaths) {
      const normalizedPath = this.normalizeRelativePath(documentPath)
      if (!normalizedPath || normalizedPath.includes('..'))
        continue

      if (this.isPathInsideTicketPath(normalizedPath, this.ticketPaths.get(projectId)))
        continue

      const absolutePath = path.resolve(projectRoot, normalizedPath)
      if (!this.isInsideRoot(absolutePath, projectRoot))
        continue

      const watcherId = `${projectId}__document__${normalizedPath}`
      if (this.watchers.has(watcherId))
        continue

      // MDT-221 UAT r2 (OBL-24): watch HTML too — the handler has accepted
      // .html/.htm document events since MDT-221, but this pattern was
      // **/*.md, so external HTML edits never reached the SSE refresh path
      // (BR-1.9 was shipped but inert).
      const watchPattern = normalizedPath.endsWith('.md')
        ? absolutePath
        : path.join(absolutePath, '**/*.{md,html,htm}')

      this.createWatcher(watcherId, watchPattern, (w) => {
        w.on('add', fp => this.handleDocumentEvent('add', fp, projectId, projectRoot))
          .on('change', fp => this.handleDocumentEvent('change', fp, projectId, projectRoot))
          .on('unlink', fp => this.handleDocumentEvent('unlink', fp, projectId, projectRoot))
          .on('error', e => this.emit('error', { error: e, projectId }))
          .on('ready', () => this.emit('document-ready', { projectId, watcherId }))
        this.watchers.set(watcherId, w)
      })
      count++
    }

    return count
  }

  async reconfigureDocumentWatchers(projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string): Promise<number> {
    const prefix = `${projectId}__document__`
    const watcherIds = Array.from(this.watchers.keys()).filter(id => id.startsWith(prefix))

    await Promise.all(watcherIds.map(async (watcherId) => {
      const watcher = this.watchers.get(watcherId)
      this.watchers.delete(watcherId)
      try {
        await watcher?.close()
      }
      catch (error) {
        this.emit('error', { error, projectId })
      }
    }))

    return this.initDocumentWatchers(projectId, projectRoot, documentPaths, ticketsPath)
  }

  initGlobalRegistryWatcher(): void {
    const rp = path.join(getConfigDir(), 'projects')
    // The registry dir is app-owned state. A first run (or run-scoped test
    // CONFIG_DIR) may not have it yet — create it so the watcher is live for
    // projects registered later; bailing here would leave runtime
    // registration deaf until a restart (MDT-183 UAT, BR-7).
    if (!fs.existsSync(rp))
      fs.mkdirSync(rp, { recursive: true })
    this.createWatcher('__global_registry__', path.join(rp, '*.toml'), (w) => {
      w.on('add', fp => this.handleRegistryEvent('add', fp))
        .on('change', fp => this.handleRegistryEvent('change', fp))
        .on('unlink', fp => this.handleRegistryEvent('unlink', fp))
        .on('error', e => console.error('Global registry watcher error:', e))
        .on('ready', () => console.warn(`Global registry watcher ready: ${rp}`))
      this.watchers.set('__global_registry__', w)
    })
  }

  /**
   * MDT-142: Auto-discover worktrees for a project and create watchers.
   * Call this after initMultiProjectWatcher() to set up worktree watchers.
   */
  async initWorktreeWatchers(projectId: string, projectPath: string, projectCode?: string): Promise<number> {
    let count = 0
    const code = projectCode || projectId.toUpperCase()

    const ownsProject = this.captureProjectLifetime(projectId)

    console.warn(`[Worktree] Checking ${projectId} at ${projectPath} (code: ${code})`)
    try {
      const worktrees = await this.worktreeService.detect(projectPath, code)
      if (!ownsProject())
        return 0
      console.warn(`[Worktree] Found ${worktrees.size} worktrees for ${projectId}:`, Object.fromEntries(worktrees))
      for (const [ticketCode, worktreePath] of worktrees) {
        const result = this.addWatcher(projectId, ticketCode, worktreePath)
        if (result) {
          console.warn(`[Worktree] Created watcher for ${ticketCode} at ${worktreePath}`)
          count++
        }
      }

      // MDT-142 C3: Watch .git/worktrees for runtime worktree detection
      this.initWorktreeHeadWatcher(projectPath, projectId, code)
    }
    catch (e) {
      console.warn(`[Worktree] Failed to detect worktrees for ${projectId}:`, e)
    }
    return count
  }

  /**
   * MDT-142 C3: Watch .git/worktrees star dir HEAD for worktree add/remove detection.
   * When a HEAD file appears, a new worktree was created.
   * When a HEAD file disappears, a worktree was removed.
   */
  initWorktreeHeadWatcher(projectPath: string, projectId: string, projectCode: string): void {
    const worktreesDir = path.join(projectPath, '.git', 'worktrees')
    if (!fs.existsSync(worktreesDir)) {
      console.warn(`[Worktree] No .git/worktrees directory for ${projectId}`)
      return
    }

    const watcherId = `${projectId}__worktree_heads`
    if (this.watchers.has(watcherId))
      return
    const ownsProject = this.captureProjectLifetime(projectId)

    // HEAD additions are ignored during the initial scan. Retain identities of
    // existing worktrees too, so their later unlink does not depend on a folder name.
    try {
      for (const name of fs.readdirSync(worktreesDir)) {
        const headPath = path.join(worktreesDir, name, 'HEAD')
        try {
          const ticketCode = this.readWorktreeTicketCode(headPath, projectCode)
          const selected = ticketCode ? this.worktreeWatchers.get(`${projectId}__worktree__${ticketCode}`) : undefined
          const worktreePath = this.readWorktreeRoot(path.join(worktreesDir, name, 'gitdir'))
          if (ticketCode && selected && path.resolve(selected.worktreePath) === path.resolve(worktreePath))
            this.worktreeHeads.set(headPath, selected)
        }
        catch {
          // Git may remove metadata while the initial scan is in progress.
        }
      }
    }
    catch (error) {
      console.warn(`[Worktree] Failed to scan HEAD identities for ${projectId}:`, error)
    }

    const headPattern = path.join(worktreesDir, '*', 'HEAD')
    console.warn(`[Worktree] Watching ${worktreesDir}/*/HEAD for ${projectId}`)

    this.createWatcher(watcherId, headPattern, (w) => {
      w.on('add', (fp: string) => {
        if (ownsProject())
          this.handleWorktreeHeadEvent('add', fp, projectId, projectCode, projectPath)
      })
        .on('unlink', (fp: string) => {
          if (ownsProject())
            this.handleWorktreeHeadEvent('unlink', fp, projectId, projectCode, projectPath)
        })
        .on('error', (e: Error) => console.error(`[Worktree] HEAD watcher error for ${projectId}:`, e))
      this.watchers.set(watcherId, w)
    })
  }

  /**
   * MDT-142 C3: Handle worktree HEAD file changes.
   * Extract ticket code from branch name and create/remove worktree watcher.
   */
  private handleWorktreeHeadEvent(
    event: 'add' | 'unlink',
    headPath: string,
    projectId: string,
    projectCode: string,
    projectPath: string,
  ): void {
    // HEAD path: /path/to/project/.git/worktrees/worktree-name/HEAD
    // Extract worktree name from path
    const parts = headPath.split(path.sep)
    const worktreesIdx = parts.lastIndexOf('worktrees')
    if (worktreesIdx === -1)
      return

    const worktreeName = parts[worktreesIdx + 1]
    if (!worktreeName)
      return
    const ownsProject = this.captureProjectLifetime(projectId)

    if (event === 'add') {
      const token = Symbol('worktree HEAD discovery')
      this.headDiscoveries.set(headPath, { projectId, token })
      // New worktree created - read HEAD to get branch name and extract ticket code
      try {
        // HEAD contains: "ref: refs/heads/MDT-142-some-feature" or a commit hash
        const ticketCode = this.readWorktreeTicketCode(headPath, projectCode)
        if (ticketCode) {
          this.headDiscoveries.set(headPath, { projectId, token, ticketCode })
          const registerWorktree = (worktreePath: string, verifiedHeadPath?: string) => {
            if (!ownsProject() || this.headDiscoveries.get(headPath)?.token !== token)
              return
            const selected = this.worktreeWatchers.get(`${projectId}__worktree__${ticketCode}`)
            if (selected) {
              if (verifiedHeadPath && path.resolve(selected.worktreePath) === path.resolve(worktreePath))
                this.worktreeHeads.set(verifiedHeadPath, selected)
              return
            }
            const watcherId = this.addWatcher(projectId, ticketCode, worktreePath)
            const registered = watcherId ? this.worktreeWatchers.get(watcherId) : undefined
            if (registered) {
              if (verifiedHeadPath)
                this.worktreeHeads.set(verifiedHeadPath, registered)
              this.emit('worktree-added', { projectId, ticketCode, worktreePath })
            }
          }
          // Derive worktree path from the worktree name
          // The worktree directory is typically at projectRoot/../worktree-name or similar
          // We need to find the actual worktree path
          const gitPath = path.join(projectPath, '.git', 'worktrees', worktreeName, 'gitdir')
          if (fs.existsSync(gitPath)) {
            // gitdir file contains path to .git in worktree, e.g., /path/to/worktree/.git
            const worktreePath = this.readWorktreeRoot(gitPath)

            console.warn(`[Worktree] Detected new worktree ${ticketCode} at ${worktreePath}`)
            registerWorktree(worktreePath, headPath)
          }
          else {
            // Fallback: try to find worktree by searching common locations
            console.warn(`[Worktree] Could not find gitdir for ${worktreeName}, trying detection...`)
            this.worktreeService.detect(projectPath, projectCode).then((worktrees) => {
              const worktreePath = worktrees.get(ticketCode)
              if (worktreePath) {
                console.warn(`[Worktree] Found worktree ${ticketCode} at ${worktreePath}`)
                registerWorktree(worktreePath, this.readWorktreeHeadPath(worktreePath))
              }
            }).catch(e => console.warn(`[Worktree] Failed to detect worktree:`, e))
          }
        }
      }
      catch (e) {
        console.warn(`[Worktree] Failed to read HEAD file ${headPath}:`, e)
      }
    }
    else if (event === 'unlink') {
      this.headDiscoveries.delete(headPath)
      const entry = this.worktreeHeads.get(headPath)
      this.worktreeHeads.delete(headPath)
      if (entry && this.worktreeWatchers.get(entry.watcherId) === entry) {
        console.warn(`[Worktree] Detected removed worktree ${entry.ticketCode}`)
        this.removeWorktreeWatcher(projectId, entry.ticketCode)
          .then(() => {
            if (ownsProject() && !this.worktreeWatchers.has(`${projectId}__worktree__${entry.ticketCode}`))
              this.emit('worktree-removed', { projectId, ticketCode: entry.ticketCode })
          })
          .catch(e => console.warn(`[Worktree] Failed to remove watcher:`, e))
      }
    }
  }

  private captureProjectLifetime(projectId: string): () => boolean {
    const lifetime = this.worktreeLifetime
    const projectLifetime = this.projectLifetimes.get(projectId) ?? Symbol('project worktree lifetime')
    this.projectLifetimes.set(projectId, projectLifetime)
    return () => this.worktreeLifetime === lifetime && this.projectLifetimes.get(projectId) === projectLifetime
  }

  private readWorktreeTicketCode(headPath: string, projectCode: string): string | null {
    const headContent = fs.readFileSync(headPath, 'utf8').trim()
    if (!headContent.startsWith('ref: refs/heads/'))
      return null
    const ticketCode = this.worktreeService.extractTicketCode(headContent.slice('ref: '.length))
    return ticketCode?.startsWith(`${projectCode}-`) ? ticketCode : null
  }

  private readWorktreeHeadPath(worktreePath: string): string | undefined {
    try {
      const gitPointer = fs.readFileSync(path.join(worktreePath, '.git'), 'utf8').trim()
      if (gitPointer.startsWith('gitdir: '))
        return path.join(path.resolve(worktreePath, gitPointer.slice('gitdir: '.length)), 'HEAD')
    }
    catch {
      // Detection can identify a root before its metadata becomes readable.
      // Without the root's own Git pointer, no HEAD ownership can be inferred.
    }
    return undefined
  }

  private readWorktreeRoot(gitdirPath: string): string {
    const target = fs.readFileSync(gitdirPath, 'utf8').trim()
    return path.dirname(path.resolve(path.dirname(gitdirPath), target))
  }

  addWatcher(pid: string, tc: string, wp: string): string | null {
    const wid = `${pid}__worktree__${tc}`
    if (this.worktreeWatchers.has(wid))
      return wid
    try {
      // MDT-142 C2: Track active worktree for exclusion from main watcher
      this.activeWorktreeExclusions.add(tc)

      // MDT-142 C1: Use recursive pattern for worktree watcher too
      const recursivePath = path.join(wp, '**/*.md')
      const w = chokidar.watch(recursivePath, OPTS)
        .on('add', fp => this.handleFileEvent('add', fp, pid, 'worktree'))
        .on('change', fp => this.handleFileEvent('change', fp, pid, 'worktree'))
        .on('unlink', fp => this.handleFileEvent('unlink', fp, pid, 'worktree'))
        .on('error', e => this.emit('worktree-error', { error: e, projectId: pid, ticketCode: tc }))
        .on('ready', () => this.emit('worktree-ready', { projectId: pid, ticketCode: tc, watcherId: wid }))
      this.worktreeWatchers.set(wid, { watcherId: wid, projectId: pid, ticketCode: tc, worktreePath: wp, watchPath: recursivePath, watcher: w })
      return wid
    }
    catch (e) {
      console.error(`Failed to create worktree watcher for ${tc}:`, e)
      this.emit('error', { error: e, projectId: pid })
      return null
    }
  }

  async removeWorktreeWatcher(pid: string, tc: string): Promise<void> {
    const wid = `${pid}__worktree__${tc}`
    for (const [headPath, discovery] of this.headDiscoveries) {
      if (discovery.projectId === pid && discovery.ticketCode === tc)
        this.headDiscoveries.delete(headPath)
    }
    const entry = this.worktreeWatchers.get(wid)
    if (!entry)
      return
    this.worktreeWatchers.delete(wid)
    this.activeWorktreeExclusions.delete(tc)
    for (const [headPath, owner] of this.worktreeHeads) {
      if (owner === entry) {
        this.worktreeHeads.delete(headPath)
        this.headDiscoveries.delete(headPath)
      }
    }
    try {
      await entry.watcher.close()
    }
    catch (e) {
      console.error(`Error closing worktree watcher ${wid}:`, e)
    }
  }

  getProjectWorktreeWatchers(pid: string): WorktreeWatcherEntry[] {
    return Array.from(this.worktreeWatchers.values()).filter(e => e.projectId === pid)
  }

  getWorktreeWatcherCount(): number {
    return this.worktreeWatchers.size
  }

  getProjectPath(pid: string): string {
    const rp = this.watchPaths.get(pid)
    if (rp) {
      const gi = rp.indexOf('*')
      return gi !== -1 ? rp.substring(0, gi) : rp
    }
    if (pid === 'debug')
      return path.join(process.cwd(), '..', 'debug-tasks')
    if (pid === 'markdown-ticket')
      return path.join(process.cwd(), '..', 'docs', 'CRs')
    return path.join(process.cwd(), '..')
  }

  getProjectRoot(pid: string): string | null {
    return this.projectRoots.get(pid) ?? null
  }

  private handleRegistryEvent(et: string, fp: string): void {
    const etm: Record<string, string> = { add: 'project-created', change: 'project-updated', unlink: 'project-deleted' }
    const pid = path.basename(fp, '.toml')
    const now = Date.now()
    const eid = `evt_${now}_${Math.random().toString(36).slice(2, 11)}`
    this.emit(etm[et], { projectId: pid, timestamp: now, eventId: eid, source: 'file_watcher' })
    this.emit('registry-change', { type: etm[et], data: { projectId: pid, timestamp: now, eventId: eid, source: 'file_watcher' } })
  }

  /**
   * Parse subdocument info from file path (MDT-142)
   * Examples:
   *   "docs/CRs/MDT-142/architecture.md" -> { code: "architecture", filePath: "MDT-142/architecture.md" }
   *   "docs/CRs/MDT-142/prep/architecture.md" -> { code: "prep/architecture", filePath: "MDT-142/prep/architecture.md" }
   *   "docs/CRs/MDT-142.md" -> null (main ticket file)
   */
  private parseSubdocumentInfo(fp: string): { ticketCode: string, subdocument: SubdocumentInfo | null } | null {
    const parts = fp.split('/')
    const fn = parts[parts.length - 1]

    // Search backwards to find ticket folder (e.g., MDT-142)
    for (let i = parts.length - 2; i >= 0; i--) {
      const dir = parts[i]
      const ticketMatch = dir.match(TICKET_DIR_PATTERN)
      if (ticketMatch) {
        const ticketCode = ticketMatch[1]
        const relativeParts = parts.slice(i + 1)

        // Extract subdocument code from filename
        const codeMatch = fn.match(/^(.+)\.md$/)
        if (codeMatch && codeMatch[1] !== ticketCode) {
          // Build relative path from ticket folder to file
          // e.g., for "docs/CRs/MDT-142/prep/architecture.md" -> "prep/architecture"
          const relativePath = relativeParts.join('/')
          return {
            ticketCode,
            subdocument: {
              code: relativePath.replace(/\.md$/, ''), // "prep/architecture"
              filePath: `${ticketCode}/${relativePath}`, // "MDT-142/prep/architecture.md"
            },
          }
        }
        // Main ticket file inside folder (MDT-142/MDT-142.md) - treat as main file
        return { ticketCode, subdocument: null }
      }
    }

    // Check if this is a slug file (e.g., MDT-142-some-title.md)
    const slugMatch = fn?.match(TICKET_SLUG_FILE_PATTERN)
    if (slugMatch) {
      return { ticketCode: slugMatch[1], subdocument: null }
    }

    return null
  }

  private handleFileEvent(et: string, fp: string, pid: string, source: 'main' | 'worktree'): void {
    const fn = fp.split('/').pop()
    if (!fn?.endsWith('.md'))
      return

    // MDT-142: Parse subdocument info
    const parsed = this.parseSubdocumentInfo(fp)
    if (!parsed)
      return // Not a ticket file

    const { ticketCode, subdocument } = parsed

    // MDT-142 C2: Worktree exclusion - skip if this ticket has an active worktree watcher
    // and the event is coming from the main watcher
    if (source === 'main' && this.activeWorktreeExclusions.has(ticketCode)) {
      // Skip this event - the worktree watcher will emit it
      return
    }

    // Determine the filename to emit
    // For subdocuments, emit the full relative path (e.g., "MDT-142/architecture.md")
    // For main files, emit the ticket filename (e.g., "MDT-142.md")
    const emitFilename = subdocument ? subdocument.filePath : `${ticketCode}.md`

    // MDT-142: Preserve eventType for subdocuments (don't coalesce 'add' to 'change')
    const eventType = et as 'add' | 'change' | 'unlink'

    const payload: FileChangeEventPayload = {
      eventType,
      filename: emitFilename,
      physicalFilePath: path.resolve(fp),
      projectId: pid,
      timestamp: Date.now(),
      subdocument,
      source,
    }

    this.emit('file-change', payload)
  }

  private handleDocumentEvent(et: string, fp: string, pid: string, projectRoot: string): void {
    // MDT-221: emit document-change for .html/.htm too so selected HTML
    // previews refresh on external edit (BR-1.9). Ticket files (.md only)
    // are handled separately by handleFileEvent.
    if (!/\.(?:md|html|htm)$/.test(fp))
      return

    const absoluteFilePath = path.resolve(fp)
    if (!this.isInsideRoot(absoluteFilePath, projectRoot))
      return

    const filePath = this.normalizeRelativePath(path.relative(projectRoot, absoluteFilePath))
    if (!filePath || this.isPathInsideTicketPath(filePath, this.ticketPaths.get(pid)))
      return

    const payload: DocumentChangeEventPayload = {
      eventType: et as 'add' | 'change' | 'unlink',
      filePath,
      absoluteFilePath,
      projectId: pid,
      timestamp: Date.now(),
    }

    this.emit('document-change', payload)
  }

  private getRelativeTicketPath(watchPath: string, projectRoot?: string): string {
    if (!projectRoot)
      return ''

    const basePath = this.normalizeBasePath(watchPath)
    return this.normalizeRelativePath(path.relative(projectRoot, basePath))
  }

  private normalizeRelativePath(value: string): string {
    return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
  }

  private isPathInsideTicketPath(filePath: string, ticketsPath?: string): boolean {
    if (!ticketsPath)
      return false

    return filePath === ticketsPath || filePath.startsWith(`${ticketsPath}/`)
  }

  private isInsideRoot(targetPath: string, rootPath: string): boolean {
    const relativePath = path.relative(rootPath, targetPath)
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  }

  private createWatcher(id: string, wp: string, init: (w: chokidar.FSWatcher) => void): void {
    try {
      const w = chokidar.watch(wp, OPTS)
      init(w)
      this.watchers.set(id, w)
    }
    catch (e) {
      console.error(`Failed to create watcher for ${id}:`, e)
      this.emit('error', { error: e, projectId: id })
    }
  }

  /**
   * Build a recursive watch pattern from a project watch path.
   * Supports arbitrary nesting depth (e.g., MDT-142/prep/architecture.md).
   */
  private buildTwoLevelWatchPath(watchPath: string): { basePath: string, watchPattern: string } {
    if (watchPath.endsWith('.md') && !watchPath.includes('*')) {
      const lastSlash = watchPath.lastIndexOf('/')
      return {
        basePath: lastSlash === -1 ? '' : watchPath.slice(0, lastSlash + 1),
        watchPattern: watchPath,
      }
    }

    const basePath = this.normalizeBasePath(watchPath)
    return {
      basePath,
      watchPattern: `${basePath}**/*.md`,
    }
  }

  private normalizeBasePath(watchPath: string): string {
    if (watchPath.endsWith('*.md')) {
      return watchPath.slice(0, -'*.md'.length)
    }

    if (watchPath.endsWith('*')) {
      return watchPath.slice(0, -1)
    }

    return watchPath.replace(/\/?$/, '/')
  }

  /**
   * MDT-183: Stop all watchers for a specific project.
   * Removes main watcher, document watchers, worktree HEAD watcher, and individual worktree watchers.
   */
  async stopProject(projectId: string): Promise<void> {
    // Relinquish ownership before any await so old cleanup cannot affect a restart.
    this.projectLifetimes.delete(projectId)
    const ownedWatchers: Array<[string, chokidar.FSWatcher]> = []
    for (const [id, watcher] of this.watchers) {
      if (id === projectId || id === `${projectId}__worktree_heads`
        || id.startsWith(`${projectId}__document__`) || id.startsWith(`${projectId}__worktree__`)) {
        this.watchers.delete(id)
        ownedWatchers.push([id, watcher])
      }
    }
    for (const [id, entry] of this.worktreeWatchers) {
      if (entry.projectId === projectId) {
        this.worktreeWatchers.delete(id)
        this.activeWorktreeExclusions.delete(entry.ticketCode)
        ownedWatchers.push([id, entry.watcher])
      }
    }
    for (const [headPath, entry] of this.worktreeHeads) {
      if (entry.projectId === projectId)
        this.worktreeHeads.delete(headPath)
    }
    for (const [headPath, entry] of this.headDiscoveries) {
      if (entry.projectId === projectId)
        this.headDiscoveries.delete(headPath)
    }
    this.watchPaths.delete(projectId)
    this.projectRoots.delete(projectId)
    this.ticketPaths.delete(projectId)

    await Promise.all(ownedWatchers.map(async ([id, watcher]) => {
      try {
        await watcher.close()
      }
      catch (error) {
        console.error(`Error closing watcher ${id}:`, error)
      }
    }))
  }

  stop(): void {
    this.worktreeLifetime = Symbol('worktree service lifetime')
    const ownedWatchers: Array<[string, chokidar.FSWatcher]> = [
      ...this.watchers,
      ...Array.from(this.worktreeWatchers, ([id, entry]): [string, chokidar.FSWatcher] => [id, entry.watcher]),
    ]
    this.watchers.clear()
    this.worktreeWatchers.clear()
    this.projectLifetimes.clear()
    this.headDiscoveries.clear()
    this.worktreeHeads.clear()
    this.activeWorktreeExclusions.clear()
    this.watchPaths.clear()
    this.projectRoots.clear()
    this.ticketPaths.clear()
    for (const [id, watcher] of ownedWatchers) {
      watcher.close().catch(error => console.error(`Error closing watcher ${id}:`, error))
    }
  }
}
