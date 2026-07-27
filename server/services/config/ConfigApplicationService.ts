/**
 * Configuration application service (MDT-168).
 *
 * THE one configuration application boundary. Resolves a selector to its scope,
 * validates the full candidate change against the strict patch schemas, delegates
 * persistence to the correct scope-specific storage adapter (which performs one
 * atomic write per config file), runs explicit injected post-write side effects,
 * and returns the effective saved value for refresh.
 *
 * Validation order (fail-closed):
 *  1. Authorize (caller responsibility — owner-only via route policy)
 *  2. Resolve & classify against the default-deny ALLOWLIST
 *  3. Reject guarded selectors routed through the scalar writer
 *  4. Strict full-candidate validation (never converts invalid to default)
 *  5. Single atomic write (rejected request -> no write)
 *  6. Post-write side effects (failures reported distinct from write)
 */
import type { ConfigSelector } from '@mdt/domain-contracts'
import type { ConfigSideEffectResult } from './ConfigSideEffectRegistry.js'
import type { ConfigStorageAdapter, ScopeWriteResult } from './types.js'
import {
  Exposure,
  findSelector,
  strictPatchValidator,
} from '@mdt/domain-contracts'
import { ConfigSideEffectRegistry } from './ConfigSideEffectRegistry.js'

/** A field-level validation/config error carrying the offending selector. */
export class ConfigValidationError extends Error {
  constructor(
    public readonly selector: string,
    message: string,
  ) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}

/** Result of a successful apply operation. */
interface ApplyConfigResult {
  selector: string
  effective: unknown
  filePath: string
  sideEffects: ConfigSideEffectResult[]
}

/**
 * Resolves which storage adapter owns a selector scope.
 * Implemented by the composition root (server.ts) which knows the concrete
 * adapter instances and the project path for project-scope selectors.
 */
export interface StorageAdapterResolver {
  resolve: (selector: ConfigSelector) => ConfigStorageAdapter<unknown>
}

interface ConfigApplicationServiceOptions {
  readonly adapterResolver: StorageAdapterResolver
  readonly sideEffects?: ConfigSideEffectRegistry
}

export class ConfigApplicationService {
  private readonly adapterResolver: StorageAdapterResolver
  private readonly sideEffects: ConfigSideEffectRegistry

  constructor(opts: ConfigApplicationServiceOptions) {
    this.adapterResolver = opts.adapterResolver
    this.sideEffects = opts.sideEffects ?? new ConfigSideEffectRegistry([])
  }

  /**
   * Apply a scalar selector mutation. Validates strictly, writes atomically via
   * the resolved adapter, runs side effects, returns effective value.
   *
   * Throws ConfigValidationError for unknown/disallowed/guarded/invalid input.
   * Guarded selectors must use the dedicated guarded-operation methods.
   */
  async applyConfig(
    selector: string,
    value: unknown,
  ): Promise<ApplyConfigResult> {
    // 2. Resolve & classify against the default-deny allowlist.
    const descriptor = findSelector(selector)
    if (!descriptor) {
      throw new ConfigValidationError(
        selector,
        `Unknown selector "${selector}" is not on the allowlist.`,
      )
    }
    if (descriptor.exposure === Exposure.FILE_ONLY) {
      throw new ConfigValidationError(
        selector,
        `Selector "${selector}" is file-only and cannot be mutated.`,
      )
    }
    if (descriptor.exposure === Exposure.READ_ONLY) {
      throw new ConfigValidationError(
        selector,
        `Selector "${selector}" is read-only and cannot be mutated.`,
      )
    }

    // 3. Reject guarded selectors routed through the scalar writer.
    if (descriptor.exposure === Exposure.GUARDED) {
      throw new ConfigValidationError(
        selector,
        `Selector "${selector}" is guarded and requires an explicit operation-specific workflow with confirmation.`,
      )
    }

    // 4. Strict full-candidate validation (never converts invalid to default).
    const schema = strictPatchValidator(selector)
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      throw new ConfigValidationError(
        selector,
        firstIssue?.message ?? `Invalid value for "${selector}".`,
      )
    }
    const validatedValue = parsed.data

    // 5. Single atomic write via the resolved scope adapter.
    const adapter = this.adapterResolver.resolve(descriptor)
    const writeResult: ScopeWriteResult = await adapter.write((current) => {
      return applySelectorToConfig(descriptor, current, validatedValue)
    })

    // 6. Post-write side effects (failures reported, do not roll back the write).
    const sideEffectResults = await this.sideEffects.runForScope(
      descriptor.scope,
    )

    return {
      selector,
      effective: writeResult.effective,
      filePath: writeResult.filePath,
      sideEffects: sideEffectResults,
    }
  }

  /**
   * Read the effective config object for a scope, resolved via any selector
   * belonging to that scope. The controller iterates allowlisted selectors to
   * build the exposure-metadata response (BR-1.1/BR-1.2).
   */
  async readScopeConfig(descriptor: ConfigSelector): Promise<unknown> {
    const adapter = this.adapterResolver.resolve(descriptor)
    return adapter.read()
  }

  /**
   * Apply a GUARDED operation (project code, ticketsPath, or registry path).
   *
   * Guarded operations are NEVER ordinary scalar patches (BR-4.1). They require
   * an explicit confirmation token, run operation-specific validation, and keep
   * registry identity and local config consistent (BR-4.2). They write via the
   * resolved scope adapter (one atomic write per file) and fire side effects.
   *
   * Throws ConfigValidationError if confirmation is missing or the value is
   * invalid.
   */
  async applyGuardedConfig(
    selector: string,
    value: unknown,
    options: { confirmed: boolean },
  ): Promise<ApplyConfigResult> {
    // 1. Confirmation is mandatory for guarded operations.
    if (!options?.confirmed) {
      throw new ConfigValidationError(
        selector,
        `Guarded operation "${selector}" requires explicit confirmation.`,
      )
    }

    // 2. Resolve & classify — must be a guarded selector on the allowlist.
    const descriptor = findSelector(selector)
    if (!descriptor) {
      throw new ConfigValidationError(
        selector,
        `Unknown selector "${selector}" is not on the allowlist.`,
      )
    }
    if (descriptor.exposure !== Exposure.GUARDED) {
      throw new ConfigValidationError(
        selector,
        `Selector "${selector}" is not a guarded operation; use the scalar patch endpoint.`,
      )
    }

    // 3. Strict operation-specific validation (never converts invalid to default).
    const schema = strictPatchValidator(selector)
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      throw new ConfigValidationError(
        selector,
        firstIssue?.message
        ?? `Invalid value for guarded selector "${selector}".`,
      )
    }
    const validatedValue = parsed.data

    // 4. Atomic write via the resolved adapter. Registry/local consistency is the
    //    adapter's responsibility: each adapter writes its own file atomically.
    //    A guarded operation that spans registry + local config must be issued as
    //    separate operation-specific calls so each file is written atomically and
    //    the invariant holds (BR-4.2).
    const adapter = this.adapterResolver.resolve(descriptor)
    const writeResult: ScopeWriteResult = await adapter.write((current) => {
      return applySelectorToConfig(descriptor, current, validatedValue)
    })

    // 5. Post-write side effects (discovery/watcher/registry reload).
    const sideEffectResults = await this.sideEffects.runForScope(
      descriptor.scope,
    )

    return {
      selector,
      effective: writeResult.effective,
      filePath: writeResult.filePath,
      sideEffects: sideEffectResults,
    }
  }
}

/**
 * Immutably set a dotted selector path on a config object, returning a new object.
 * Used by the application service to merge a validated scalar into the full
 * candidate before the adapter persists it.
 */
function applySelectorToConfig(
  descriptor: ConfigSelector,
  current: unknown,
  value: unknown,
): unknown {
  const segments = descriptor.selector.split('.')
  const root = structuredCloneSafe(current as Record<string, unknown>)
  let node: Record<string, unknown> = root
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]
    if (
      node[seg] === undefined
      || node[seg] === null
      || typeof node[seg] !== 'object'
    ) {
      node[seg] = {}
    }
    node = node[seg] as Record<string, unknown>
  }
  node[segments[segments.length - 1]] = value
  return root
}

/** structuredClone fallback for config objects (no functions/classes expected). */
function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}
