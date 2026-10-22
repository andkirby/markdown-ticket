/**
 * Selector Ordering Utilities (MDT-129)
 *
 * Pure functions for computing project order in rail and panel views.
 * Implements BR-6 ordering requirements (BR-6.3 refined by UAT 2026-10-22):
 * - Active project always first (rail)
 * - Favorites before non-favorites
 * - Favorites sorted by lastUsedAt desc, count desc (recency outranks lifetime count)
 * - Non-favorites sorted by lastUsedAt desc, count desc
 * - Full ties resolve by project key ascending (C11, deterministic)
 *
 * The same comparator (sortProjectsByOrderingRules) backs the rail and the
 * project browser panel so the two surfaces cannot drift again.
 */

import type { SelectorPreferences } from '../components/ProjectSelector/types'

/**
 * Project enriched with selector state for ordering logic
 */
export interface ProjectWithSelectorState {
  key: string
  name: string
  code: string
  favorite: boolean
  lastUsedAt: string | null
  count: number
}

/**
 * Compute rail order with active project prioritization and visible count limit
 * Implements BR-6.1, BR-6.2, BR-6.3, BR-6.4, BR-6.5
 */
export function computeRailOrder(
  projects: ProjectWithSelectorState[],
  activeProjectKey: string,
  preferences: SelectorPreferences,
): ProjectWithSelectorState[] {
  if (projects.length === 0) {
    return []
  }

  // Separate active project from others
  const activeProject = projects.find(p => p.key === activeProjectKey)
  const otherProjects = projects.filter(p => p.key !== activeProjectKey)

  // Sort other projects: favorites first, then non-favorites
  const sortedOthers = sortProjectsByOrderingRules(otherProjects)

  // Build result with active project first, then fill remaining slots
  const result: ProjectWithSelectorState[] = []

  if (activeProject) {
    result.push(activeProject)
  }

  // Fill remaining visible slots
  const remainingSlots = Math.max(0, preferences.visibleCount - result.length)
  result.push(...sortedOthers.slice(0, remainingSlots))

  return result
}

/**
 * Compute panel order showing all projects
 * Implements BR-4.3, BR-4.4
 */
export function computePanelOrder(
  projects: ProjectWithSelectorState[],
  activeProjectKey: string,
): ProjectWithSelectorState[] {
  if (projects.length === 0) {
    return []
  }

  // Separate active project from others
  const activeProject = projects.find(p => p.key === activeProjectKey)
  const otherProjects = projects.filter(p => p.key !== activeProjectKey)

  // Sort all other projects by ordering rules
  const sortedOthers = sortProjectsByOrderingRules(otherProjects)

  // Return active project first, then all others
  if (activeProject) {
    return [activeProject, ...sortedOthers]
  }

  return sortedOthers
}

/**
 * Ordering comparator shared by the rail and the project browser panel:
 * 1. Favorites before non-favorites
 * 2. lastUsedAt desc (recency; a recently used project outranks a stale
 *    high-count one — UAT 2026-10-22)
 * 3. count desc as tie-break
 * 4. project key ascending (C11: deterministic across reloads)
 */
export function compareByOrderingRules(
  a: ProjectWithSelectorState,
  b: ProjectWithSelectorState,
): number {
  if (a.favorite !== b.favorite)
    return a.favorite ? -1 : 1

  return compareLastUsedAt(a.lastUsedAt, b.lastUsedAt)
    || b.count - a.count
    || a.key.localeCompare(b.key)
}

/**
 * Sort projects by the shared ordering rules (see compareByOrderingRules).
 */
export function sortProjectsByOrderingRules(
  projects: ProjectWithSelectorState[],
): ProjectWithSelectorState[] {
  return [...projects].sort(compareByOrderingRules)
}

/**
 * Compare two lastUsedAt timestamps for sorting
 * null values (never used) sort last
 */
function compareLastUsedAt(a: string | null, b: string | null): number {
  if (a === null && b === null)
    return 0
  if (a === null)
    return 1 // null sorts last
  if (b === null)
    return -1

  // Both are non-null - compare as dates (newest first)
  return b.localeCompare(a)
}
