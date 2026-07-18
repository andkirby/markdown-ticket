/**
 * Prose Precondition Scanner (MDT-189 TASK-prose-scan)
 *
 * Surfaces CR-key tokens that appear in a ticket's prose precondition sections
 * but are missing from its structured `dependsOn` field. Informational only in
 * v1 — the CLI prints them as an "Unverifiable prose" section; no write
 * happens (architecture.md D4, bdd.md S8).
 *
 * Section-bounded, not whole-body, per BR-2.2 / bdd.md S9: casual mentions
 * like "See also MDT-030 for context" outside a precondition section must NOT
 * be flagged. The scanner therefore walks the markdown body honoring `## `
 * header boundaries and only scans content inside `## Precondition(s)` /
 * `## Prerequisite(s)` sections (case-insensitive).
 *
 * Lives in shared/ (not cli/) per AGENTS.md "CLI Business Logic Boundary" —
 * the MCP server will reuse this when wiring the deps surface.
 */

import type { Ticket } from '../../models/Ticket.js'
import { resolveDepKey } from './DependencyGraph.js'

/**
 * Header-line pattern. We scan only ATX-style `## ` headers (the project's
 * documented convention for ticket sections). `# ` (h1) and `### ` (h3) are
 * not treated as section boundaries for precondition scanning — tickets use
 * h2 for top-level prose sections.
 *
 * Anchored to `^## ` (exactly two hashes + a single space); the rest of the
 * line is captured as the section name. Trailing whitespace is trimmed by the
 * consumer, not the regex, to keep this polynomial-safe (no overlapping `\s`
 * and `.` quantifiers — eslint rule regexp/no-super-linear-backtracking).
 */
const SECTION_HEADER_PATTERN = /^## (.+)$/

/**
 * Recognized precondition-section names (lowercased for case-insensitive match).
 * Singular and plural both appear in existing tickets.
 */
const PRECONDITION_SECTION_NAMES = new Set([
  'precondition',
  'preconditions',
  'prerequisite',
  'prerequisites',
])

/**
 * CR-key token pattern for prose. Same shape as TICKET_KEY_INPUT_PATTERN in
 * domain-contracts (project code 2-5 chars, first letter, dash, 1-5 digits)
 * but global and word-bounded so it matches multiple tokens per line and
 * avoids mid-word false hits.
 *
 * Deliberately requires a project prefix: bare numbers ("see item 100") are
 * ambiguous in prose (could be a spec section, line number, list index) and
 * are not recognized. The BDD scenarios S8/S9 use fully-qualified keys
 * (VOC-049..VOC-052); this matches that surface exactly.
 */
const CR_KEY_TOKEN_PATTERN = /\b([A-Z][A-Z0-9]{1,4})-(\d{1,5})\b/g

/**
 * Returns true when a header line introduces a precondition section.
 * Whitespace-tolerant; case-insensitive on the section name.
 */
function isPreconditionHeader(headerLine: string): boolean {
  const match = headerLine.match(SECTION_HEADER_PATTERN)
  if (!match)
    return false
  const name = match[1]!.trim().toLowerCase()
  return PRECONDITION_SECTION_NAMES.has(name)
}

/**
 * Extract all CR-key tokens from a block of prose, returning them in the
 * canonical `{PROJECT}-###` form so they can be compared against the
 * ticket's `dependsOn` field.
 *
 * Only fully-qualified tokens (`PROJECT-###`) are recognized; bare numbers
 * are ignored (see `CR_KEY_TOKEN_PATTERN`). Tokens are resolved through
 * `resolveDepKey` for canonicalization, which for already-canonical
 * fully-qualified keys is a no-op but keeps the diff consistent with the
 * graph's view of `dependsOn`.
 */
function extractCrKeys(prose: string, activeProjectCode: string): string[] {
  const result: string[] = []
  for (const match of prose.matchAll(CR_KEY_TOKEN_PATTERN)) {
    const raw = match[0]!
    const resolved = resolveDepKey(raw, activeProjectCode)
    if (resolved && !result.includes(resolved))
      result.push(resolved)
  }
  return result
}

/**
 * Walk the ticket body honoring `## ` section headers and yield slices of
 * prose that belong to precondition sections. Each yielded slice is the raw
 * line-buffer for one precondition section (header excluded).
 */
function* iterPreconditionSlices(body: string): Generator<string> {
  let inPrecondition = false
  let buffer: string[] = []

  const flush = function* (): Generator<string> {
    if (buffer.length > 0) {
      yield buffer.join('\n')
      buffer = []
    }
  }

  for (const line of body.split('\n')) {
    if (SECTION_HEADER_PATTERN.test(line)) {
      // Section boundary — flush whatever we were accumulating.
      if (inPrecondition)
        yield* flush()
      inPrecondition = isPreconditionHeader(line)
    }
    else if (inPrecondition) {
      buffer.push(line)
    }
  }
  if (inPrecondition)
    yield* flush()
}

/**
 * Compute the prose-gap list for a ticket: CR-key tokens mentioned in
 * precondition sections that are NOT present in the ticket's structured
 * `dependsOn` field.
 *
 *   - Section-bounded: only `## Precondition(s)` / `## Prerequisite(s)` are
 *     scanned (BR-2.2, bdd.md S9).
 *   - Canonicalized: tokens are resolved against `activeProjectCode` (same
 *     rule as the graph) before diffing against `dependsOn`, which is also
 *     canonicalized. This makes `053` in prose match `MDT-053` in dependsOn.
 *   - De-duplicated and stable: the same gap key never appears twice; order
 *     follows first-mention in the prose.
 *
 * @returns the list of canonical dep keys missing from dependsOn. Empty when
 *          the ticket has no prose gaps (no precondition section, or every
 *          prose token is already structured).
 */
export function scanProseGaps(ticket: Ticket, activeProjectCode: string): string[] {
  const declared = new Set(
    (ticket.dependsOn ?? [])
      .map(raw => resolveDepKey(raw, activeProjectCode))
      .filter((key): key is string => Boolean(key)),
  )

  const mentioned: string[] = []
  for (const slice of iterPreconditionSlices(ticket.content ?? '')) {
    for (const key of extractCrKeys(slice, activeProjectCode)) {
      if (!declared.has(key) && !mentioned.includes(key)) {
        mentioned.push(key)
      }
    }
  }
  return mentioned
}
