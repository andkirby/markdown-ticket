/**
 * Pure migration logic for the blocks backfill (MDT-189 TASK-migration).
 *
 * This module contains the testable core: given a list of tickets, compute
 * the diff between stored `blocks` and the derived `inverse(dependsOn)`,
 * classifying each per-ticket change as `added`, `removed`, or `contradiction`.
 *
 * The script (`scripts/migrate-blocks.ts`) imports these pure functions and
 * wraps them with file I/O, interactive prompts, and report writing. Tests
 * exercise this module against in-memory fixtures — no real files, no
 * project fixture stack.
 *
 * Architecture D2: migration does not route through TicketService. This lib
 * has no service dependencies, only the graph module. Writes happen in the
 * script via direct frontmatter rewrite.
 *
 * Classification rules (ticket spec §3.2):
 *   - `added`         — stored blocks is missing an entry the derived map has
 *                       (will be written by migration).
 *   - `removed`       — stored blocks has an entry the derived map lacks
 *                       (will be cleared by migration).
 *   - `contradiction` — both `A dependsOn B` and `A blocks B`. The default
 *                       resolution is to keep dependsOn and drop blocks
 *                       (dependsOn is the canonical edge per C-7).
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import {
  buildGraph,
  inverse,
  resolveDepKey,
} from '@mdt/shared/services/ticket/DependencyGraph.js'

/** Per-ticket diff entry describing what the migration would change. */
export interface MigrationChange {
  /** Canonical ticket code being changed. */
  ticketCode: string
  /** Source file path (for the script's write step; empty for in-memory tests). */
  filePath: string
  /** Existing blocks entries as currently stored. */
  storedBlocks: string[]
  /** Derived blocks entries (the target state). */
  derivedBlocks: string[]
  /** Entries that will be added to blocks. */
  added: string[]
  /** Entries that will be removed from blocks. */
  removed: string[]
  /** True when stored AND derived both contain edges that contradict each other. */
  isContradiction: boolean
  /**
   * For contradictions: the dependsOn target that appears in both dependsOn
   * and blocks of the same ticket. Empty for non-contradictions.
   */
  contradictionTargets: string[]
}

/** Aggregate plan across all tickets in a project. */
export interface MigrationPlan {
  changes: MigrationChange[]
  /** Codes of tickets with no diff (no migration work needed). */
  unchanged: string[]
  /** Count helpers for summary reporting. */
  counts: {
    total: number
    changed: number
    contradictions: number
    unchanged: number
  }
}

/**
 * Detect contradictions on a single ticket: keys that appear in BOTH its
 * dependsOn and its blocks. Per Edge-5, the migration must prompt before
 * reconciling these.
 *
 * Both sides are canonicalized against the active project code so that
 * `053` and `MDT-053` are recognized as the same target.
 */
export function detectContradictions(
  ticket: Ticket,
  activeProjectCode: string,
): string[] {
  const depends = new Set(
    (ticket.dependsOn ?? [])
      .map(raw => resolveDepKey(raw, activeProjectCode))
      .filter((k): k is string => Boolean(k)),
  )
  const contradictions: string[] = []
  for (const raw of ticket.blocks ?? []) {
    const key = resolveDepKey(raw, activeProjectCode)
    if (key && depends.has(key) && !contradictions.includes(key)) {
      contradictions.push(key)
    }
  }
  return contradictions
}

/**
 * Compute the per-ticket diff: what would `blocks` look like if recomputed
 * as the sorted inverse of `dependsOn`? Returns null when no change needed.
 */
export function computeTicketChange(
  ticket: Ticket,
  derivedBlocks: string[],
  activeProjectCode: string,
): MigrationChange | null {
  const storedBlocks = (ticket.blocks ?? []).slice()
  const derivedSet = new Set(derivedBlocks)
  const storedSet = new Set(
    storedBlocks
      .map(raw => resolveDepKey(raw, activeProjectCode))
      .filter((k): k is string => Boolean(k)),
  )

  const added = derivedBlocks.filter(k => !storedSet.has(k))
  const removed = storedBlocks
    .map(raw => resolveDepKey(raw, activeProjectCode))
    .filter(k => Boolean(k) && !derivedSet.has(k))

  const contradictionTargets = detectContradictions(ticket, activeProjectCode)

  if (added.length === 0 && removed.length === 0 && contradictionTargets.length === 0) {
    return null
  }

  return {
    ticketCode: ticket.code,
    filePath: ticket.filePath ?? '',
    storedBlocks,
    derivedBlocks,
    added,
    removed,
    isContradiction: contradictionTargets.length > 0,
    contradictionTargets,
  }
}

/**
 * Build the full migration plan over a list of tickets. Tickets with no diff
 * are listed in `unchanged`; tickets with a diff appear in `changes`.
 */
export function computeMigrationPlan(
  tickets: Ticket[],
  activeProjectCode: string,
): MigrationPlan {
  const graph = buildGraph(tickets, activeProjectCode)
  const derived = inverse(graph)

  const changes: MigrationChange[] = []
  const unchanged: string[] = []

  for (const ticket of tickets) {
    const derivedBlocks = derived.get(ticket.code) ?? []
    const change = computeTicketChange(ticket, derivedBlocks, activeProjectCode)
    if (change) {
      changes.push(change)
    }
    else {
      unchanged.push(ticket.code)
    }
  }

  const contradictions = changes.filter(c => c.isContradiction).length

  return {
    changes,
    unchanged,
    counts: {
      total: tickets.length,
      changed: changes.length,
      contradictions,
      unchanged: unchanged.length,
    },
  }
}

/**
 * Apply the migration plan to a single ticket's blocks array in memory.
 *
 * Default contradiction resolution (C-7): keep dependsOn, drop the
 * contradicted blocks entries. The caller may pass an explicit override
 * per ticket code for cases where a human chose otherwise during the
 * interactive prompt.
 *
 * Returns the canonical new blocks array (sorted, de-duplicated). Pure;
 * does not touch the file system.
 */
export function applyChangeToBlocks(
  change: MigrationChange,
  keepDependsOnForContradictions: boolean = true,
): string[] {
  // Start from the derived map (which is already sorted + deduped). For
  // contradictions, the derived map has already dropped the contradicted
  // entries because dependsOn is canonical — derived is inverse(dependsOn),
  // so it never includes the contradicted target in this ticket's blocks.
  // For non-contradictions, derived is the target state directly.
  if (change.isContradiction && !keepDependsOnForContradictions) {
    // Edge case: human chose to keep blocks instead. Re-add the stored
    // contradicted entries to the derived set, then re-sort.
    const merged = new Set([...change.derivedBlocks, ...change.contradictionTargets])
    return [...merged].sort()
  }
  return change.derivedBlocks.slice()
}

/**
 * Post-migration invariant check: for every ticket, does
 * `blocks === sorted(inverse(all dependsOn edges pointing at me))`?
 *
 * Returns the count of invariant-satisfying tickets vs the total. The
 * migration is complete when 100% hold.
 */
export function verifyInvariant(
  tickets: Ticket[],
  activeProjectCode: string,
): { total: number, satisfied: number, violating: string[] } {
  const graph = buildGraph(tickets, activeProjectCode)
  const derived = inverse(graph)

  const violating: string[] = []
  for (const ticket of tickets) {
    const expected = derived.get(ticket.code) ?? []
    const actual = (ticket.blocks ?? [])
      .map(raw => resolveDepKey(raw, activeProjectCode))
      .filter((k): k is string => Boolean(k))
      .sort()
    // Compare as sorted canonical arrays.
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      violating.push(ticket.code)
    }
  }

  return {
    total: tickets.length,
    satisfied: tickets.length - violating.length,
    violating,
  }
}
