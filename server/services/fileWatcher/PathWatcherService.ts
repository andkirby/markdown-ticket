import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { getConfigDir } from '@mdt/shared/utils/constants.js'
import * as chokidar from 'chokidar'

export interface ProjectPath { id: string, path: string, projectRoot?: string, projectCode?: string }

export interface WorktreeWatcherEntry {
  watcherId: string
  projectId: string
  ticketCode: string
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
  projectId: string
  timestamp: number
  subdocument: SubdocumentInfo | null
  source: 'main' | 'worktree'
}

const OPTS = { ignoreInitial: true, persistent: true, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 } }

export class PathWatcherService extends EventEmitter {
  private watchers = new Map<string, chokidar.FSWatcher>()
  private worktreeWatchers = new Map<string, WorktreeWatcherEntry>()
  private watchPaths = new Map<string, string>()
  private worktreeService = new WorktreeService({ enabled: true })
  /** Active worktree ticket codes to exclude from main watcher (MDT-142 C2) */
  private activeWorktreeExclusions = new Set<string>()
  /** MDT-142: Map project root -> { projectId, projectCode } for worktree HEAD monitoring */
  private projectRegistry = new Map<string, { projectId: string, projectCode: string }>()

  initMultiProjectWatcher(projectPaths: ProjectPath[]): this {
    for (const p of projectPaths) {
      if (this.watchers.has(p.id))
        continue
      const { basePath, watchPattern } = this.buildTwoLevelWatchPath(p.path)
      this.watchPaths.set(p.id, basePath)
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

  initGlobalRegistryWatcher(): void {
    const rp = path.join(getConfigDir(), 'projects')
    if (!fs.existsSync(rp))
      return
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

    // Register project for HEAD monitoring
    this.projectRegistry.set(projectPath, { projectId, projectCode: code })

    console.warn(`[Worktree] Checking ${projectId} at ${projectPath} (code: ${code})`)
    try {
      const worktrees = await this.worktreeService.detect(projectPath, code)
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

    const headPattern = path.join(worktreesDir, '*', 'HEAD')
    console.warn(`[Worktree] Watching ${worktreesDir}/*/HEAD for ${projectId}`)

    this.createWatcher(watcherId, headPattern, (w) => {
      w.on('add', (fp: string) => this.handleWorktreeHeadEvent('add', fp, projectId, projectCode, projectPath))
        .on('unlink', (fp: string) => this.handleWorktreeHeadEvent('unlink', fp, projectId, projectCode, projectPath))
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

    if (event === 'add') {
      // New worktree created - read HEAD to get branch name and extract ticket code
      try {
        const headContent = fs.readFileSync(headPath, 'utf8').trim()
        // HEAD contains: "ref: refs/heads/MDT-142-some-feature" or a commit hash
        const branchMatch = headContent.match(/refs\/heads\/([A-Z]+-\d+)/)
        if (branchMatch) {
          const ticketCode = branchMatch[1]
          // Derive worktree path from the worktree name
          // The worktree directory is typically at projectRoot/../worktree-name or similar
          // We need to find the actual worktree path
          const gitPath = path.join(projectPath, '.git', 'worktrees', worktreeName, 'gitdir')
          if (fs.existsSync(gitPath)) {
            // gitdir file contains path to .git in worktree, e.g., /path/to/worktree/.git
            const gitdirContent = fs.readFileSync(gitPath, 'utf8').trim()
            const worktreeGitDir = path.dirname(gitdirContent)
            const worktreePath = path.dirname(worktreeGitDir)

            console.warn(`[Worktree] Detected new worktree ${ticketCode} at ${worktreePath}`)
            this.addWatcher(projectId, ticketCode, worktreePath)
            this.emit('worktree-added', { projectId, ticketCode, worktreePath })
          }
          else {
            // Fallback: try to find worktree by searching common locations
            console.warn(`[Worktree] Could not find gitdir for ${worktreeName}, trying detection...`)
            this.worktreeService.detect(projectPath, projectCode).then((worktrees) => {
              const worktreePath = worktrees.get(ticketCode)
              if (worktreePath) {
                console.warn(`[Worktree] Found worktree ${ticketCode} at ${worktreePath}`)
                this.addWatcher(projectId, ticketCode, worktreePath)
                this.emit('worktree-added', { projectId, ticketCode, worktreePath })
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
      // Worktree removed - find and close the watcher
      // We need to match by worktree name pattern
      const watcherToRemove = Array.from(this.worktreeWatchers.entries())
        .find(([wid, _entry]) => wid.includes(worktreeName))

      if (watcherToRemove) {
        const [_wid, entry] = watcherToRemove
        console.warn(`[Worktree] Detected removed worktree ${entry.ticketCode}`)
        this.removeWorktreeWatcher(projectId, entry.ticketCode)
          .then(() => this.emit('worktree-removed', { projectId, ticketCode: entry.ticketCode }))
          .catch(e => console.warn(`[Worktree] Failed to remove watcher:`, e))
      }
    }
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
      this.worktreeWatchers.set(wid, { watcherId: wid, projectId: pid, ticketCode: tc, watchPath: recursivePath, watcher: w })
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
    const entry = this.worktreeWatchers.get(wid)
    if (!entry)
      return
    try {
      await entry.watcher.close()
      this.worktreeWatchers.delete(wid)
      // MDT-142 C2: Remove from exclusion set
      this.activeWorktreeExclusions.delete(tc)
    }
    catch (e) {
      console.error(`Error closing worktree watcher ${wid}:`, e)
      this.worktreeWatchers.delete(wid)
      this.activeWorktreeExclusions.delete(tc)
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
      const ticketMatch = dir.match(/^([A-Z]+-\d+)$/)
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
    const slugMatch = fn?.match(/^([A-Z]+-\d+)(?:-.+)?\.md$/)
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
      projectId: pid,
      timestamp: Date.now(),
      subdocument,
      source,
    }

    this.emit('file-change', payload)
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

  stop(): void {
    this.watchers.forEach((w, pid) => {
      console.warn(`Stopping file watcher for project: ${pid}`)
      w.close().catch(e => console.error(`Error closing watcher for ${pid}:`, e))
    })
    this.watchers.clear()
    this.watchPaths.clear()
    this.worktreeWatchers.forEach((e, wid) => {
      console.warn(`Stopping worktree watcher: ${wid}`)
      e.watcher.close().catch(er => console.error(`Error closing worktree watcher ${wid}:`, er))
    })
    this.worktreeWatchers.clear()
  }
}
