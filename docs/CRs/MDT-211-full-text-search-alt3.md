---
code: MDT-211
status: Proposed
dateCreated: 2026-07-26T09:29:28.393Z
type: Feature Enhancement
priority: Medium
relatedTickets: 210
---

# Add opt-in full-text search over ticket bodies (Alt 3)

## Problem

Ticket bodies are not searchable today. Surface search
(`title + code + description` substring) is the only path, even though the
server already reads file bodies on every list call (see **MDT-210** §"Current
data flow"). Users want an explicit "Full" control that opts into body search
without making the default path heavier.

Full alternatives analysis, rejected options, and rationale: see **MDT-210**.

## Scope (Alt 3 — in-memory substring, opt-in)

Three changes. Estimated ~1 day of work. No new dependencies, no platform
branching, no spawned subprocesses.

### Change 1 — Default list path → metadata-only scanner

Switch consumers of `ProjectService.getProjectCRs` on the list/board
endpoints to `getProjectCRsMetadata` (frontmatter only, no file body read).

- **Files:** `server/services/TicketService.ts` (`listCRs` path); any
  controller or route that currently calls `getProjectCRs` for listing.
- **Effect:** Default board/list load stops reading file bodies it never
  displays.
- **Risk:** Any caller that depends on `Ticket.content` from the list path
  must be identified and either kept on the full scanner or routed through
  `getCR` on demand.

### Change 2 — Add `query` to server-side `TicketFilters`

Extend `TicketService.matchesFilters` to honor a free-text `query` against
`title + code + description` (surface fields, no body):

```ts
if (filters.query?.trim()) {
  const q = filters.query.toLowerCase()
  const hay = `${ticket.title}\n${ticket.code}\n${ticket.description ?? ''}`.toLowerCase()
  if (!q.split(/\s+/).every(t => hay.includes(t)))
    return false
}
```

- **Files:** `shared/services/TicketService.ts:988`, `TicketFilters` type
  in `domain-contracts`.
- **Effect:** Server-side surface search consistent with client
  `matchesQuery` (`src/utils/ticketFilters.ts:78`).
- Reuse the existing `fuzzyMatch` helper for stylistic consistency.

### Change 3 — "Full" button → `?full=true` content scan

Same endpoint, same filter object. When `full` is on:

1. Server uses `scanMarkdownFiles` (full bodies) instead of the metadata
   scanner.
2. `matchesFilters` extends `hay` with `ticket.content`.
3. Response carries a per-result flag indicating body match, so the UI can
   show a "matched in body" badge (resolves MDT-179's deferred
   "match subtype" question).

Client:

1. New "Full" toggle in the search/filter UI (placement decided by
   `mdt:architecture`).
2. Toggling flips the request to `?full=true` and shows a loading state.
3. Result rows distinguish title matches from body matches visually.
4. Toggle state persists via the existing `filterPreferences` mechanism.

## Acceptance criteria

### Functional

- [ ] Default board/list load uses the metadata scanner; no file bodies read.
- [ ] Surface search (title+code+description) returns identical results
      before and after Change 1 (no regression).
- [ ] `TicketFilters.query` honored server-side; behavior matches client
      `matchesQuery` on the same fields.
- [ ] "Full" toggle returns body matches not present in surface results.
- [ ] Body-match results carry an indicator distinguishable from title matches.
- [ ] "Full" toggle persists across session via `filterPreferences`.
- [ ] "Full" interacts with facets as intersection (not union).

### Non-functional

- [ ] Default board/list load is no slower than today (faster expected).
- [ ] "Full" query at 1k tickets returns within ~200 ms (cached) on dev hardware.
- [ ] No new dependencies added to `package.json`.
- [ ] No platform-specific code paths introduced.
- [ ] No spawned subprocesses (`child_process.exec`, `spawn`) in search path.

### Edge cases

- [ ] Empty query with "Full" on behaves identically to empty query with Full off.
- [ ] Special characters in query (`[`, `]`, regex metachars) do not crash;
      they are treated as literals.
- [ ] Projected stub tickets (`content: ''`) never match in body even with
      Full on.
- [ ] Cross-project "Full" search capped at `limitTotal`.

## Out of scope (explicit non-goals)

- MiniSearch / FlexSearch / Lunr (Alt 5) — see MDT-210 upgrade triggers.
- SQLite FTS5 (Family C) — see MDT-210 upgrade triggers.
- Spawning grep / ripgrep (Alt 4) — rejected in MDT-210.
- OS-native search (Alt 6) — rejected in MDT-210.
- LinearRAG / vector / semantic Q&A (Family F+) — separate future CR.
- Rust regex via napi-rs — only when corpus crosses ~500 MB.
- Document content search (MDT-179 TD-1) — orthogonal; tracked separately.

## Verification

- **Unit:** `TicketService.matchesFilters` with `query` against
  title/code/description and (with `full`) content.
- **Integration:** `/api/projects/:id/crs` and `/api/search` with
  `?full=true`.
- **E2E (Playwright):** toggle "Full", confirm body match appears with the
  badge.
- **Smoke:** board load latency before/after Change 1 (Network tab).

## Related

- **MDT-210** — research ticket; full alternatives analysis and rationale.
- **MDT-179** — scoped global search; deferred this decision (now resolved here).