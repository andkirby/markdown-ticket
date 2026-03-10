import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { getConfigDir } from '@mdt/shared/utils/constants.js'
import * as chokidar from 'chokidar'

export interface ProjectPath { id: string; path: string }

export interface WorktreeWatcherEntry {
  watcherId: string
  projectId: string
  ticketCode: string
  watchPath: string
  watcher: chokidar.FSWatcher
}

const OPTS = { ignoreInitial: true, persistent: true, awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 } }

export class PathWatcherService extends EventEmitter {
  private watchers = new Map<string, chokidar.FSWatcher>()
  private worktreeWatchers = new Map<string, WorktreeWatcherEntry>()
  private watchPaths = new Map<string, string>()
  private worktreeService = new WorktreeService({ enabled: true })

  initMultiProjectWatcher(projectPaths: ProjectPath[]): this {
    for (const p of projectPaths) {
      if (this.watchers.has(p.id)) continue
      this.watchPaths.set(p.id, p.path)
      this.createWatcher(p.id, p.path, w => {
        w.on('add', fp => this.handleFileEvent('add', fp, p.id))
          .on('change', fp => this.handleFileEvent('change', fp, p.id))
          .on('unlink', fp => this.handleFileEvent('unlink', fp, p.id))
          .on('error', e => this.emit('error', { error: e, projectId: p.id }))
          .on('ready', () => this.emit('ready', { projectId: p.id }))
        this.watchers.set(p.id, w)
      })
    }
    return this
  }

  initGlobalRegistryWatcher(): void {
    const rp = path.join(getConfigDir(), 'projects')
    if (!fs.existsSync(rp)) return
    this.createWatcher('__global_registry__', path.join(rp, '*.toml'), w => {
      w.on('add', fp => this.handleRegistryEvent('add', fp))
        .on('change', fp => this.handleRegistryEvent('change', fp))
        .on('unlink', fp => this.handleRegistryEvent('unlink', fp))
        .on('error', e => console.error('Global registry watcher error:', e))
        .on('ready', () => console.warn(`Global registry watcher ready: ${rp}`))
      this.watchers.set('__global_registry__', w)
    })
  }

  addWatcher(pid: string, tc: string, wp: string): string | null {
    const wid = `${pid}__worktree__${tc}`
    if (this.worktreeWatchers.has(wid)) return wid
    try {
      const w = chokidar.watch(path.join(wp, '*.md'), OPTS)
        .on('add', fp => this.handleFileEvent('add', fp, pid))
        .on('change', fp => this.handleFileEvent('change', fp, pid))
        .on('unlink', fp => this.handleFileEvent('unlink', fp, pid))
        .on('error', e => this.emit('worktree-error', { error: e, projectId: pid, ticketCode: tc }))
        .on('ready', () => this.emit('worktree-ready', { projectId: pid, ticketCode: tc, watcherId: wid }))
      this.worktreeWatchers.set(wid, { watcherId: wid, projectId: pid, ticketCode: tc, watchPath: path.join(wp, '*.md'), watcher: w })
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
    if (!entry) return
    try {
      await entry.watcher.close()
      this.worktreeWatchers.delete(wid)
    }
    catch (e) {
      console.error(`Error closing worktree watcher ${wid}:`, e)
      this.worktreeWatchers.delete(wid)
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
    if (pid === 'debug') return path.join(process.cwd(), '..', 'debug-tasks')
    if (pid === 'markdown-ticket') return path.join(process.cwd(), '..', 'docs', 'CRs')
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

  private handleFileEvent(et: string, fp: string, pid: string): void {
    const fn = fp.split('/').pop()
    if (!fn?.endsWith('.md')) return
    const parts = fp.split('/')
    const pd = parts.length >= 2 ? parts[parts.length - 2] : ''
    const isSub = /^[A-Z]+-\d+$/.test(pd)
    const efn = isSub ? `${pd}.md` : fn
    const eet = isSub ? 'change' : et
    this.emit('file-change', { eventType: eet, filename: efn, projectId: pid, timestamp: Date.now() })
  }

  private createWatcher(id: string, wp: string, init: (w: chokidar.FSWatcher) => void): void {
    try {
      init(chokidar.watch(wp, OPTS))
    }
    catch (e) {
      console.error(`Failed to create watcher for ${id}:`, e)
      this.emit('error', { error: e, projectId: id })
    }
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
