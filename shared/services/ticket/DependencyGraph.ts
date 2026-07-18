/**
 * Dependency Graph (MDT-189 TASK-graph)
 *
 * The single interpreter of ticket dependency edges. Pure functions over
 * `Ticket[]`; no file I/O, no mutation, no service deps. Every future
 * consumer (CLI, HTTP, MCP, UI) reads through this module (C-6).
 *
 * Canonical edge: `dependsOn`. `blocks := inverse(dependsOn)` after migration
 * (C-7). This module computes both directions; persistence of the derived
 * `blocks` value happens in `TicketService`/`MarkdownService`, not here.
 *
 * Key resolution (C-10, mirrors `keyNormalizer.ts` / MDT-187):
 *   - Stored value matches `^[A-Z]+-\d+$` → use as-is (cross-project).
 *   - Otherwise → prefix with `{activeProjectCode}-` and zero-pad to 3 digits
 *     via the shared `normalizeKey` helper.
 *
 * Cycle detection: iterative three-color DFS (WHITE/GRAY/BLACK), O(V+E).
 * Returns the cycle path (e.g. `["MDT-100","MDT-101","MDT-100"]`) or `null`.
 * Self-edges (`A dependsOn A`) are reported as `[A, A]`.
 */

import type { SatisfactionKind } from '@mdt/domain-contracts'
import type { Ticket } from '../../models/Ticket.js'
import {
  classifyViolation,
  MISSING_DEP_STATUS,

} from '@mdt/domain-contracts'
import { normalizeKey } from '../../utils/keyNormalizer.js'

/**
 * A compiled dependency graph.
 *
 * - `nodes` keys every ticket by its canonical code (`{PROJECT}-###`).
 * - `edges` maps each source key to the canonical keys it `dependsOn`.
 *
 * Both maps use canonical keys; callers should never need to re-normalize.
 * Lookups for unknown keys return `undefined` (Map default) — `violations`
 * treats a missing target as a `broken-plan` (Edge-2).
 */
export interface DepGraph {
  /** All tickets keyed by canonical code (`{PROJECT}-###`). */
  nodes: Map<string, Ticket>
  /** Adjacency: source canonical key → canonical keys it dependsOn. */
  edges: Map<string, string[]>
}

/**
 * A single unresolved dependency edge, ready for formatter rendering.
 *
 * `action` carries a human-readable resolution hint:
 *   - `broken-plan` → `'reject-<KEY> | unlink-<KEY>'`
 *   - `waiting`     → `'none (informational)'`
 *   - `satisfied`   → `'none'` (violations() never emits satisfied rows)
 */
export interface Violation {
  dep: string
  status: string
  kind: SatisfactionKind
  action: string
}

const CROSS_PROJECT_KEY_PATTERN = /^[A-Z]+-\d+$/

/**
 * Resolve a stored dependsOn value to a canonical key, given the active
 * project code for context.
 *
 *   "VOC-053" → "VOC-053"            (cross-project, used as-is)
 *   "053"     → "{CODE}-053"         (same-project bare number)
 *   "MDT-053" → "MDT-053"            (already canonical, normalized)
 *
 * Values that cannot be normalized (rare; would indicate corrupt data) are
 * returned uppercased-and-trimmed as a best-effort so the edge still appears
 * in the graph rather than silently disappearing.
 */
export function resolveDepKey(rawKey: string, activeProjectCode: string): string {
  const trimmed = rawKey.trim()
  if (!trimmed)
    return ''
  if (CROSS_PROJECT_KEY_PATTERN.test(trimmed))
    return trimmed
  try {
    return normalizeKey(trimmed, activeProjectCode)
  }
  catch {
    return trimmed.toUpperCase()
  }
}

/**
 * Build a dependency graph from a flat list of tickets.
 *
 * - `activeProjectCode` is used to resolve bare-number dependsOn entries
 *   (e.g. `["053"]` → `"{CODE}-053"`) per the key resolution rule.
 * - Duplicate dependsOn entries collapse to a single edge (Edge-6).
 * - Tickets are keyed by their own `code` field (already canonical on disk).
 * - Edges pointing at unresolvable targets are preserved; `violations`
 *   classifies them as `broken-plan` (Edge-2) rather than dropping them.
 */
export function buildGraph(tickets: Ticket[], activeProjectCode: string): DepGraph {
  const nodes = new Map<string, Ticket>()
  const edges = new Map<string, string[]>()

  for (const ticket of tickets) {
    if (!ticket.code)
      continue
    nodes.set(ticket.code, ticket)
    edges.set(ticket.code, [])
  }

  for (const ticket of tickets) {
    if (!ticket.code)
      continue
    const seen = new Set<string>()
    const resolved: string[] = []
    for (const raw of ticket.dependsOn ?? []) {
      const key = resolveDepKey(raw, activeProjectCode)
      if (!key || seen.has(key))
        continue
      seen.add(key)
      resolved.push(key)
    }
    edges.set(ticket.code, resolved)
  }

  return { nodes, edges }
}

/**
 * Compute the violation rows for a single ticket against a graph.
 *
 * - Satisfied deps (`Implemented`) are omitted from the result — the caller
 *   prints a violation *table*, not a full report.
 * - Missing targets produce `status: 'missing'`, `kind: 'broken-plan'`.
 * - Unknown statuses on resolved targets fall through to `kind: 'waiting'`
 *   via the safe default in `classifyViolation` (Edge-1).
 *
 * The returned array is ordered by the ticket's dependsOn declaration order
 * (stable for deterministic test output and consistent CLI rendering).
 */
export function violations(ticket: Ticket, graph: DepGraph): Violation[] {
  const declared = graph.edges.get(ticket.code) ?? []
  const result: Violation[] = []

  for (const depKey of declared) {
    const depTicket = graph.nodes.get(depKey)
    const status = depTicket ? depTicket.status : MISSING_DEP_STATUS
    const kind = classifyViolation(status)
    if (kind === 'satisfied')
      continue

    result.push({
      dep: depKey,
      status,
      kind,
      action: violationAction(depKey, kind),
    })
  }

  return result
}

/**
 * Resolution-hint text for a violation row. Kept here so the CLI formatter
 * and any future guardrail (MDT-191) share one source of truth.
 */
function violationAction(depKey: string, kind: SatisfactionKind): string {
  if (kind === 'broken-plan') {
    return `reject-${depKey} | unlink-${depKey}`
  }
  return 'none (informational)'
}

/**
 * Detect a cycle in the dependency graph via iterative three-color DFS.
 *
 * Returns the first cycle found as a path of canonical keys
 * (e.g. `["MDT-100", "MDT-101", "MDT-100"]`), or `null` if the graph is
 * acyclic. Self-edges (`A dependsOn A`) yield `["A", "A"]`.
 *
 * Iterative (not recursive) to avoid stack overflow on large graphs and to
 * keep the 5-node synthetic-cycle test deterministic. O(V+E).
 */
export function detectCycle(graph: DepGraph): string[] | null {
  const WHITE = 0 // unvisited
  const GRAY = 1 // on the current DFS stack
  const BLACK = 2 // fully explored, no cycle through it

  const color = new Map<string, number>()
  for (const key of graph.nodes.keys()) color.set(key, WHITE)

  for (const start of graph.nodes.keys()) {
    if (color.get(start) !== WHITE)
      continue

    // Each stack frame records the node and an iterator over its out-edges.
    const stack: Array<{ node: string, successors: string[], index: number }> = []
    const path: string[] = []
    color.set(start, GRAY)
    path.push(start)
    stack.push({ node: start, successors: graph.edges.get(start) ?? [], index: 0 })

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!

      if (frame.index >= frame.successors.length) {
        // Done with this node — pop, mark black, remove from path.
        color.set(frame.node, BLACK)
        path.pop()
        stack.pop()
        continue
      }

      const next = frame.successors[frame.index]!
      frame.index += 1

      const nextColor = color.get(next)
      if (nextColor === BLACK)
        continue

      if (nextColor === GRAY) {
        // Back-edge → cycle. Slice the path from the first occurrence of
        // `next` to the current node, then close the loop.
        const startIdx = path.indexOf(next)
        return [...path.slice(startIdx), next]
      }

      // WHITE — descend.
      color.set(next, GRAY)
      path.push(next)
      stack.push({ node: next, successors: graph.edges.get(next) ?? [], index: 0 })
    }
  }

  return null
}

/**
 * Topologically sort the graph (dependencies before dependents).
 *
 * Deterministic: ties are broken by insertion order (the order tickets
 * appear in the input to `buildGraph`), so the same graph always yields the
 * same order. If the graph contains a cycle, the cyclic nodes are emitted
 * in insertion order after the acyclic prefix — `topoSort` does not throw,
 * callers that need cycle detection should call `detectCycle` first.
 *
 * Implementation: iterative post-order DFS. We emit each node to a
 * temporary stack when its entire sub-tree has been explored, then reverse
 * the stack so dependencies appear before dependents.
 *
 * O(V+E).
 */
export function topoSort(graph: DepGraph): Ticket[] {
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const key of graph.nodes.keys()) color.set(key, WHITE)

  const postOrder: string[] = []

  for (const start of graph.nodes.keys()) {
    if (color.get(start) !== WHITE)
      continue

    // Each stack frame carries the node and an index into its successors.
    const stack: Array<{ node: string, successors: string[], index: number }> = []
    color.set(start, GRAY)
    stack.push({ node: start, successors: graph.edges.get(start) ?? [], index: 0 })

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!

      // Find the next unvisited successor.
      while (frame.index < frame.successors.length) {
        const next = frame.successors[frame.index]!
        const nextColor = color.get(next)
        frame.index += 1
        if (nextColor === WHITE) {
          color.set(next, GRAY)
          stack.push({ node: next, successors: graph.edges.get(next) ?? [], index: 0 })
          // Descend — the new top is `next`; resume the outer while.
          break
        }
      }

      // If the now-top frame has no more successors to visit, finish it.
      const top = stack[stack.length - 1]!
      if (top.index >= top.successors.length) {
        color.set(top.node, BLACK)
        postOrder.push(top.node)
        stack.pop()
      }
    }
  }

  // Post-order DFS naturally emits dependencies before dependents
  // (a node is appended only after all its successors are finished), so
  // postOrder is already the topological order — no reversal needed.
  const result: Ticket[] = []
  for (const key of postOrder) {
    const ticket = graph.nodes.get(key)
    if (ticket)
      result.push(ticket)
  }
  return result
}

/**
 * Compute the inverse adjacency: for each canonical key, the list of keys
 * that *depend on it* (i.e. the `blocks` map per C-7).
 *
 *   `inverse(g).get(B)` → every key `A` such that `A dependsOn B`.
 *
 * Returned arrays are deduplicated and sorted lexicographically for stable
 * output (the migration script and the derived-blocks write-back both rely on
 * determinism). Keys with no inbound dependents are present as empty arrays
 * so the map is total over `g.nodes`.
 */
export function inverse(graph: DepGraph): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const key of graph.nodes.keys()) result.set(key, [])

  for (const [source, targets] of graph.edges) {
    for (const target of targets) {
      const bucket = result.get(target)
      if (bucket && !bucket.includes(source))
        bucket.push(source)
    }
  }

  for (const bucket of result.values()) bucket.sort()
  return result
}
