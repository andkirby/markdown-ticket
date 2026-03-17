/**
 * Project Selector Types (MDT-129)
 *
 * Type definitions for the project selector component system.
 * Includes props, state interfaces, and data structures for rail+panel selector.
 */

import type { SelectorPreferences, SelectorStateEntry } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'

/**
 * User preferences loaded from CONFIG_DIR/user.toml [ui.projectSelector]
 * These are immutable user settings that control selector presentation
 */
export type { SelectorPreferences }

/**
 * Per-project selector state loaded from CONFIG_DIR/project-selector.json
 * This mutable state tracks usage and favorites across sessions
 */
export type SelectorState = SelectorStateEntry

/**
 * Project enriched with selector state for ordering and display logic
 * Combines immutable project data with mutable usage tracking
 */
export interface ProjectWithSelectorState extends Project {
  /** Selector state for this project */
  selectorState: SelectorState
  /** Shorthand for selectorState.favorite */
  favorite: boolean
  /** Shorthand for selectorState.lastUsedAt */
  lastUsedAt: string | null
  /** Shorthand for selectorState.count */
  count: number
}

/**
 * Combined selector data returned by useSelectorData hook
 * Provides both user preferences and current selector state
 */
export interface SelectorData {
  /** User preferences from user.toml */
  preferences: SelectorPreferences
  /** Per-project selector state keyed by project key (e.g., 'MDT', 'API') */
  selectorState: Record<string, SelectorState>
  /** Track project usage (increments count, updates lastUsedAt) */
  trackProjectUsage: (projectKey: string) => void
  /** Toggle favorite state for a project */
  toggleFavorite: (projectKey: string) => void
  /** Error message if data loading failed */
  error?: string
  /** Whether data has finished loading */
  loaded: boolean
}

/**
 * Props for the main ProjectSelector component
 *
 * ProjectSelector is self-contained and manages its own project switching
 * via useProjectManager.setSelectedProject. No props are required.
 */
export interface ProjectSelectorProps {
  /** Optional CSS class name for styling */
  className?: string
}
