/**
 * Configuration side-effect registry (MDT-168).
 *
 * Explicit injected post-write effects. Side effects are NOT buried in TOML
 * helpers — they are dependencies registered here and run by the application
 * service after a successful write. Each effect defines its failure behavior;
 * an effect failure is reported distinctly from the write success (Edge-3).
 *
 * Effects must be idempotent: re-running them after a prior failure converges
 * the system to the correct state without duplicating watchers (Edge-4).
 */

/** A single side effect keyed by the selector scope that triggers it. */
export interface ConfigSideEffect {
  /** Stable name for logging/diagnostics. */
  readonly name: string
  /** Selector scopes that trigger this effect (e.g. 'project', 'global'). */
  readonly triggers: readonly string[]
  /** Run the effect. Must not throw fatally; report failures via the result. */
  run: () => Promise<ConfigSideEffectResult>
}

export interface ConfigSideEffectResult {
  readonly name: string
  readonly ok: boolean
  readonly message?: string
}

/**
 * Registry that resolves which effects to run for a written selector and runs
 * them, collecting per-effect results so callers can distinguish write success
 * from effect failure (Edge-3).
 */
export class ConfigSideEffectRegistry {
  private readonly effects: ConfigSideEffect[]

  constructor(effects: ConfigSideEffect[] = []) {
    this.effects = effects
  }

  /** Run all effects whose triggers include the given scope. */
  async runForScope(scope: string): Promise<ConfigSideEffectResult[]> {
    const matching = this.effects.filter(e => e.triggers.includes(scope))
    const results: ConfigSideEffectResult[] = []
    for (const effect of matching) {
      try {
        const result = await effect.run()
        results.push(result)
      }
      catch (error) {
        // An effect throwing must not crash the write path; report as failure.
        results.push({
          name: effect.name,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return results
  }

  /** Whether any effect is registered for a scope (useful for tests). */
  hasEffectsForScope(scope: string): boolean {
    return this.effects.some(e => e.triggers.includes(scope))
  }
}
