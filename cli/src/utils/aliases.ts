/**
 * CLI Alias Mappings (derived from @mdt/domain-contracts)
 *
 * Single source of truth for CLI-specific shorthand aliases.
 * Canonical values are imported from domain-contracts — no string literals
 * for domain values exist in this file.
 *
 * Only CLI convenience tokens (e.g., "bug", "p1", "in-progress") are
 * defined here; the canonical enum values are self-mapped at module load.
 */

import { CRPriority, CRPriorities, CRStatus, CRStatuses, CRType, CRTypes } from '@mdt/domain-contracts/types'

// -------------------------------------------------------------------
// Type aliases
// -------------------------------------------------------------------

/**
 * CLI-specific shorthand aliases for CR types.
 * Keys are CLI tokens; values reference CRType constants.
 */
const CLI_TYPE_SHORTHANDS: Record<string, string> = {
  bug: CRType.BUG_FIX,
  feature: CRType.FEATURE_ENHANCEMENT,
  architecture: CRType.ARCHITECTURE,
  debt: CRType.TECHNICAL_DEBT,
  'tech-debt': CRType.TECHNICAL_DEBT,
  techdebt: CRType.TECHNICAL_DEBT,
  documentation: CRType.DOCUMENTATION,
  docs: CRType.DOCUMENTATION,
  research: CRType.RESEARCH,
}

/**
 * Full type token map: CLI shorthands + canonical values as self-mapping.
 */
export const TYPE_TOKENS: Record<string, string> = { ...CLI_TYPE_SHORTHANDS }

for (const canonical of CRTypes) {
  TYPE_TOKENS[canonical.toLowerCase()] = canonical
}

// -------------------------------------------------------------------
// Priority aliases
// -------------------------------------------------------------------

const CLI_PRIORITY_SHORTHANDS: Record<string, string> = {
  p1: CRPriority.CRITICAL,
  p2: CRPriority.HIGH,
  p3: CRPriority.MEDIUM,
  p4: CRPriority.LOW,
}

/**
 * Full priority token map: CLI shorthands + canonical values as self-mapping.
 */
export const PRIORITY_TOKENS: Record<string, string> = { ...CLI_PRIORITY_SHORTHANDS }

for (const canonical of CRPriorities) {
  PRIORITY_TOKENS[canonical.toLowerCase()] = canonical
}

// -------------------------------------------------------------------
// Status aliases
// -------------------------------------------------------------------

const CLI_STATUS_SHORTHANDS: Record<string, string> = {
  proposed: CRStatus.PROPOSED,
  approved: CRStatus.APPROVED,
  in_progress: CRStatus.IN_PROGRESS,
  'in-progress': CRStatus.IN_PROGRESS,
  inprogress: CRStatus.IN_PROGRESS,
  implemented: CRStatus.IMPLEMENTED,
  rejected: CRStatus.REJECTED,
  on_hold: CRStatus.ON_HOLD,
  'on-hold': CRStatus.ON_HOLD,
  onhold: CRStatus.ON_HOLD,
  partial: CRStatus.PARTIALLY_IMPLEMENTED,
}

/**
 * Full status token map: CLI shorthands + canonical values as self-mapping.
 */
export const STATUS_ALIASES: Record<string, string> = { ...CLI_STATUS_SHORTHANDS }

for (const canonical of CRStatuses) {
  STATUS_ALIASES[canonical.toLowerCase().replace(/\s+/g, '_')] = canonical
}

// -------------------------------------------------------------------
// Defaults (canonical constants)
// -------------------------------------------------------------------

/** Default ticket type */
export const DEFAULT_TYPE = CRType.FEATURE_ENHANCEMENT

/** Default ticket priority */
export const DEFAULT_PRIORITY = CRPriority.MEDIUM
