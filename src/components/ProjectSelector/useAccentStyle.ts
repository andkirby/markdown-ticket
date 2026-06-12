/**
 * Shared accent style hook for ProjectSelectorCard and ProjectSelectorChip.
 *
 * Centralises accent resolution, visibility gating, and brightness classification
 * so both components stay in sync. No behavior logic — pure derivation from props.
 */

import type { ProjectWithSelectorState } from './types'
import type { AccentBrightness } from '@/utils/accentColors'
import { getAccentBrightness, getFallbackAccent } from '@/utils/accentColors'

export interface UseAccentStyleOptions {
  project: ProjectWithSelectorState
  accentEnabled?: boolean
  accentStyle?: 'gradient' | 'flat' | 'plate'
  autocolor?: boolean
  hasAccent?: boolean
}

export interface AccentStyleResult {
  /** Inline style with `--project-accent` (undefined when no visible accent) */
  style: React.CSSProperties
  /** `'light'` or `'dark'` — set as `data-accent-brightness`, undefined when no visible accent */
  accentBrightness: AccentBrightness | undefined
}

export function getAccentStyle(options: UseAccentStyleOptions): AccentStyleResult {
  const {
    project,
    accentEnabled = true,
    autocolor = true,
    hasAccent = false,
  } = options

  const resolvedAccent = project.selectorState.accent ?? getFallbackAccent(project.project.code || project.id)
  const hasVisibleAccent = accentEnabled && (hasAccent || autocolor)

  const style = {
    '--project-accent': hasVisibleAccent ? resolvedAccent : undefined,
  } as React.CSSProperties

  const accentBrightness = hasVisibleAccent ? getAccentBrightness(resolvedAccent) : undefined

  return { style, accentBrightness }
}
