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

import { CRPriorities, CRPriority, CRType, CRTypes } from '@mdt/domain-contracts/types'

// -------------------------------------------------------------------
// Type aliases
// -------------------------------------------------------------------

/**
 * CLI-specific shorthand aliases for CR types.
 * Keys are CLI tokens; values reference CRType constants.
 */
const CLI_TYPE_SHORTHANDS: Record<string, string> = {
  'bug': CRType.BUG_FIX,
  'feature': CRType.FEATURE_ENHANCEMENT,
  'architecture': CRType.ARCHITECTURE,
  'debt': CRType.TECHNICAL_DEBT,
  'tech-debt': CRType.TECHNICAL_DEBT,
  'techdebt': CRType.TECHNICAL_DEBT,
  'documentation': CRType.DOCUMENTATION,
  'docs': CRType.DOCUMENTATION,
  'research': CRType.RESEARCH,
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
// MOVED: status token resolution now lives in the shared input gate
// `shared/services/ticket/attrResolver.ts`, so CLI attr mutation and list
// filtering apply the SAME alias meaning. Do not re-add a local status map
// here — it will drift from the shared resolver (that is how `open` ended up
// meaning two things). The CLI imports lookupStatusToken / resolveStatusToken
// directly where needed.

// -------------------------------------------------------------------
// Defaults (canonical constants)
// -------------------------------------------------------------------

/** Default ticket type */
export const DEFAULT_TYPE = CRType.FEATURE_ENHANCEMENT

/** Default ticket priority */
export const DEFAULT_PRIORITY = CRPriority.MEDIUM
