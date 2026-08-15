/**
 * CloudProjectionReadModel — backend-owned cache of projected headers + applied
 * cloud revision (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local projection read model,
 *         docs/CRs/MDT-226/requirements.md C-2, C-6, BR-1.9.
 *
 * Owns the local cache of complete projected headers, the applied cloud
 * revision, atomic persistence, duplicate/gap decisions, and the rule that a
 * canonical local ticket suppresses the same-number projection. It publishes a
 * backend ticket-view change only after state and cursor are applied. It
 * exposes no cloud transport state to React.
 *
 * Persistence mirrors the projection-sync atomic-write pattern: temp-then-rename
 * with user-only permissions (0600 files, 0700 dirs).
 */

import type { ProjectedHeader } from '@mdt/domain-contracts'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

/** One projected ticket entry held in the read model. */
export interface ProjectedTicketEntry {
  ticketNumber: number
  projectionVersion: number
  projectRevision: number
  lifecycle: 'active' | 'deleted'
  header: ProjectedHeader
}

/** Persisted read-model state (atomic single-file replacement). */
export interface ReadModelState {
  cloudProjectId: string
  /** Highest applied AND persisted cloud revision. */
  appliedCursor: number
  /** Whether the stream is currently live. */
  live: boolean
  /** Projected entries keyed by ticket number. */
  entries: Record<number, ProjectedTicketEntry>
}

export interface CloudProjectionReadModelOptions {
  /**
   * Root directory for read-model state. The state file lives at
   * `{rootDir}/projects/{localProjectId}/projection-read-model.json`. Defaults
   * to the shared CONFIG_DIR. Pass a temp dir in tests.
   */
  rootDir?: string
  localProjectId: string
}

/** Callback invoked after the read model state changes (SSE fan-out trigger). */
export type ReadModelChangeCallback = (cloudProjectId: string) => void

/** Monotonic tmp-file suffix so concurrent saves cannot collide. */
let persistCounter = 0

export class CloudProjectionReadModel {
  private readonly rootDir: string
  private readonly localProjectId: string
  private readonly stateFile: string
  private state: ReadModelState
  private onChange?: ReadModelChangeCallback

  constructor(opts: CloudProjectionReadModelOptions) {
    this.rootDir = opts.rootDir ?? defaultConfigDir()
    this.localProjectId = opts.localProjectId
    this.stateFile = join(this.rootDir, 'projects', this.localProjectId, 'projection-read-model.json')
    this.state = {
      cloudProjectId: '',
      appliedCursor: 0,
      live: false,
      entries: {},
    }
  }

  /** Set the callback invoked after a state change (drives SSE fan-out). */
  setChangeListener(cb: ReadModelChangeCallback): void {
    this.onChange = cb
  }

  /** Load persisted state. No-op (fresh state) if the file does not exist. */
  async load(cloudProjectId: string): Promise<void> {
    let raw: string
    try {
      raw = await readFile(this.stateFile, 'utf8')
    }
    catch (err) {
      if (isNotFound(err)) {
        this.state = freshState(cloudProjectId)
        return
      }
      throw err
    }
    try {
      const parsed = JSON.parse(raw) as Partial<ReadModelState>
      this.state = {
        cloudProjectId: parsed.cloudProjectId ?? cloudProjectId,
        appliedCursor: typeof parsed.appliedCursor === 'number' ? parsed.appliedCursor : 0,
        live: false,
        entries: parsed.entries ?? {},
      }
    }
    catch {
      this.state = freshState(cloudProjectId)
    }
  }

  /** Current applied cursor (highest applied+persisted revision). */
  get appliedCursor(): number {
    return this.state.appliedCursor
  }

  /** Whether the stream is live. */
  get live(): boolean {
    return this.state.live
  }

  /**
   * Whether the read model is stale (not currently live). Inverse of
   * {@link live}; exposed so the unified-ticket provider contract
   * (`{ entries, stale }`) can be satisfied without the adapter negating
   * `live` at every read.
   */
  get stale(): boolean {
    return !this.state.live
  }

  /**
   * Apply a projection delta. Revision-aware application is idempotent:
   * duplicate/older revisions are ignored; a tombstone removes the entry.
   * Returns true if state changed.
   */
  applyDelta(
    projectRevision: number,
    ticketNumber: number,
    projectionVersion: number,
    lifecycle: 'active' | 'deleted',
    header: ProjectedHeader,
  ): boolean {
    if (projectRevision <= this.state.appliedCursor) {
      // Duplicate or older revision — ignore (C-6), regardless of live state.
      return false
    }
    if (lifecycle === 'deleted') {
      if (!(ticketNumber in this.state.entries)) {
        return false
      }
      delete this.state.entries[ticketNumber]
    }
    else {
      this.state.entries[ticketNumber] = {
        ticketNumber,
        projectionVersion,
        projectRevision,
        lifecycle: 'active',
        header,
      }
    }
    return true
  }

  /**
   * Advance the applied cursor to the high-water revision after a catch-up
   * batch is applied. Marks the stream live. Single cursor-mutation point.
   */
  advanceCursor(highWaterRevision: number): void {
    this.advanceCursorTo(highWaterRevision)
    this.state.live = true
  }

  /** Mark the stream stale (disconnected) — keeps entries visible. */
  markStale(): void {
    this.state.live = false
  }

  /**
   * Detect a live revision gap. During live delivery, a non-contiguous revision
   * triggers one catch-up from the last applied cursor (Edge-2).
   */
  isLiveGap(incomingRevision: number): boolean {
    if (!this.state.live)
      return false
    return incomingRevision > this.state.appliedCursor + 1
  }

  /**
   * Atomically persist state + cursor BEFORE acknowledgement (C-6). Persists the
   * cursor only after applying state.
   *
   * The tmp name is unique per save: catch-up delivers many envelopes in quick
   * succession and their persists run concurrently — a shared `.tmp` path made
   * concurrent renames fail with ENOENT (found on the deployed 2026-08-15
   * probe; unit tests emit envelopes one-at-a-time and never collide).
   */
  async persist(): Promise<void> {
    await mkdir(join(this.rootDir, 'projects', this.localProjectId), {
      recursive: true,
      mode: 0o700,
    })
    const tmp = `${this.stateFile}.${process.pid}.${persistCounter++}.tmp`
    await writeFile(tmp, JSON.stringify(this.state, null, 2), { mode: 0o600 })
    await rename(tmp, this.stateFile)
  }

  /**
   * Apply a delta, advance the cursor, persist, then notify. This is the
   * atomic apply-persist-ack-notify sequence used by the stream manager.
   */
  async applyPersistNotify(delta: {
    projectRevision: number
    ticketNumber: number
    projectionVersion: number
    lifecycle: 'active' | 'deleted'
    header: ProjectedHeader
  }): Promise<boolean> {
    const changed = this.applyDelta(
      delta.projectRevision,
      delta.ticketNumber,
      delta.projectionVersion,
      delta.lifecycle,
      delta.header,
    )
    this.advanceCursorTo(delta.projectRevision)
    await this.persist()
    if (this.onChange) {
      this.onChange(this.state.cloudProjectId)
    }
    return changed
  }

  /** Single source of truth for moving the applied cursor forward. */
  private advanceCursorTo(revision: number): void {
    this.state.appliedCursor = Math.max(this.state.appliedCursor, revision)
  }

  /**
   * Build the unified ticket view: canonical local codes suppress same-number
   * projections (BR-1.9, local-wins). Returns active entries whose code does
   * not match a local canonical code.
   */
  unifiedView(localCodes: Set<string>): ProjectedTicketEntry[] {
    const out: ProjectedTicketEntry[] = []
    for (const entry of Object.values(this.state.entries)) {
      if (entry.lifecycle !== 'active')
        continue
      if (localCodes.has(entry.header.code))
        continue
      out.push(entry)
    }
    return out
  }

  /** Current entries (for tests/inspection). */
  entries(): ProjectedTicketEntry[] {
    return Object.values(this.state.entries)
  }
}

function freshState(cloudProjectId: string): ReadModelState {
  return { cloudProjectId, appliedCursor: 0, live: false, entries: {} }
}

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException)?.code === 'ENOENT'
}

function defaultConfigDir(): string {
  return process.env.CONFIG_DIR
    ?? join(homedir(), '.config', 'markdown-ticket')
}
