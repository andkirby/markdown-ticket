/**
 * Storage adapter contracts for configuration management (MDT-168).
 *
 * Each scope (global, user, project, registry) owns exactly one config file.
 * Adapters read tolerantly (normalize stored values to a valid shape for
 * display) and write atomically (write-temp-then-rename, preserving unrelated
 * fields). The application service delegates to the resolved adapter.
 */
import type {
  GlobalConfig,
  LocalProjectConfig,
  ProjectRegistryEntry,
  UserConfig,
} from '@mdt/domain-contracts'

/** A single field-level mutation applied to a config object. */
export interface ConfigFieldMutation {
  selector: string
  value: unknown
}

/** Result of a successful scope write. */
export interface ScopeWriteResult {
  /** The effective config object after the write. */
  effective: unknown
  /** The config file path that was written. */
  filePath: string
}

/** Read + atomic-write contract for one config scope. */
export interface ConfigStorageAdapter<TConfig> {
  /** Scope name this adapter owns. */
  readonly scope: 'global' | 'user' | 'project' | 'registry'
  /** Tolerantly read + normalize the persisted config for display. */
  read: () => Promise<TConfig>
  /**
   * Apply a mutator to the current config and write atomically. The mutator
   * receives a mutable copy of the current config and must return the full
   * object to persist. The adapter handles read-merge-write-atomic-persist.
   */
  write: (mutator: (current: TConfig) => TConfig) => Promise<ScopeWriteResult>
}

/** Re-export the loaded config shapes for type narrowing in the service. */
export type {
  GlobalConfig,
  LocalProjectConfig,
  ProjectRegistryEntry,
  UserConfig,
}
