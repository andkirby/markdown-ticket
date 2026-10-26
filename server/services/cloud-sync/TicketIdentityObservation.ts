import type { TicketIdentityDiagnostic } from '@mdt/domain-contracts'

export interface TicketIdentityObservationState {
  projectId: string
  state: 'ready' | 'verification_pending'
  diagnostics: TicketIdentityDiagnostic[]
  updatedAt: string
  reason?: 'verification_failed' | 'changes_pending'
}

interface TicketIdentityObservationOptions {
  observe: (projectId: string) => Promise<TicketIdentityDiagnostic[]>
  onChange: (projectId: string) => void
  delayMs?: number
}

/** Bounded observation adapter. Reads return cache only; this owns no cloud writes. */
export class TicketIdentityObservation {
  private readonly cache = new Map<string, TicketIdentityObservationState>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly active = new Map<string, Promise<void>>()
  private readonly dirty = new Set<string>()
  private readonly published = new Map<string, string>()
  private stopped = false

  constructor(private readonly options: TicketIdentityObservationOptions) {}

  schedule(projectId: string): void {
    if (this.stopped)
      return
    if (this.active.has(projectId)) {
      this.dirty.add(projectId)
      return
    }
    if (this.timers.has(projectId))
      return
    this.markPending(projectId)
    const timer = setTimeout(() => {
      this.timers.delete(projectId)
      void this.refresh(projectId)
    }, this.options.delayMs ?? 100)
    timer.unref?.()
    this.timers.set(projectId, timer)
  }

  /** Explicit startup/recovery trigger. Repeated events join the same bounded wave. */
  async refresh(projectId: string): Promise<void> {
    if (this.stopped)
      return
    const timer = this.timers.get(projectId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(projectId)
    }
    const active = this.active.get(projectId)
    if (active) {
      this.dirty.add(projectId)
      return active
    }
    this.markPending(projectId)
    const work = this.runWave(projectId)
    this.active.set(projectId, work)
    try {
      await work
    }
    finally {
      this.active.delete(projectId)
      this.dirty.delete(projectId)
    }
  }

  get(projectId: string): TicketIdentityObservationState | undefined {
    const state = this.cache.get(projectId)
    return state ? { ...state, diagnostics: state.diagnostics.map(diagnostic => ({ ...diagnostic })) } : undefined
  }

  stop(): void {
    this.stopped = true
    for (const timer of this.timers.values())
      clearTimeout(timer)
    this.timers.clear()
    this.dirty.clear()
  }

  private markPending(projectId: string): void {
    const previous = this.cache.get(projectId)
    this.cache.set(projectId, {
      projectId,
      diagnostics: previous?.diagnostics ?? [],
      state: 'verification_pending',
      updatedAt: previous?.updatedAt ?? new Date().toISOString(),
      reason: 'changes_pending',
    })
  }

  private async runWave(projectId: string): Promise<void> {
    // A new event during the first scan earns one trailing scan. A continuous
    // event storm cannot turn this wave into a cloud polling loop.
    for (let pass = 0; pass < 2 && !this.stopped; pass++) {
      this.dirty.delete(projectId)
      let diagnostics: TicketIdentityDiagnostic[]
      try {
        diagnostics = await this.options.observe(projectId)
      }
      catch {
        if (!this.stopped) {
          this.publish({
            projectId,
            state: 'verification_pending',
            diagnostics: this.cache.get(projectId)?.diagnostics ?? [],
            updatedAt: new Date().toISOString(),
            reason: 'verification_failed',
          })
        }
        return // No timed retry and no exception contents in the cache.
      }
      if (this.stopped)
        return
      this.publish({ projectId, state: 'ready', diagnostics, updatedAt: new Date().toISOString() })
      if (!this.dirty.has(projectId))
        return
    }
    if (!this.stopped && this.dirty.has(projectId)) {
      this.publish({
        projectId,
        state: 'verification_pending',
        diagnostics: this.cache.get(projectId)?.diagnostics ?? [],
        updatedAt: new Date().toISOString(),
        reason: 'changes_pending',
      })
    }
  }

  private publish(next: TicketIdentityObservationState): void {
    const fingerprint = JSON.stringify({ state: next.state, reason: next.reason, diagnostics: next.diagnostics.map(({ lastVerifiedAt: _timestamp, ...diagnostic }) => diagnostic) })
    const changed = this.published.get(next.projectId) !== fingerprint
    this.published.set(next.projectId, fingerprint)
    this.cache.set(next.projectId, { ...next, diagnostics: next.diagnostics.map(diagnostic => ({ ...diagnostic })) })
    if (changed) {
      try {
        this.options.onChange(next.projectId)
      }
      catch {
        // The cached result remains readable if notification delivery fails.
      }
    }
  }
}
