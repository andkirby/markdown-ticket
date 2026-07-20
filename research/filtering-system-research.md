# Filtering System Research

**Date**: 2026-07-20
**Related**: MDT-047 (text filter, implemented), MDT-108 (last-30-days done filter), MDT-187 (current branch)
**Status**: Research → feeds design proposal at `docs/design/explorations/filtering-system.md`

## Scope

Investigate how to introduce a real filtering system on the board. Today "filtering" means one free-text
input (`FilterControls.tsx`) that AND-matches title/code/description tokens (`Board.tsx:293-311`).
This document answers two questions:

1. **Which ticket attributes should be filterable?** Must-haves vs nice-to-haves, grounded in the data model.
2. **What data structure carries filter state?** The contract the UI, persistence, and any future MCP/server
   filtering will share.

A separate design proposal (`docs/design/explorations/filtering-system.md`) covers the visual pattern
(chip bar vs faceted popover vs text-syntax), based on best-in-class research (Linear, GitHub Projects,
Jira, Notion, Asana).

## Method

- Catalog every field on the `Ticket` entity (`domain-contracts/src/ticket/entity.ts`).
- Classify each as a filter candidate by data shape and user task.
- Reconcile against the existing `TicketFilters` contract (`domain-contracts/src/ticket/input.ts`).
- Mark must-have / nice-to-have against the real jobs users do on a Kanban board today.

The existing `TicketFilters` interface is the starting point, not a constraint. If the shape is wrong,
fix the shape — do not spray conditionals across the UI.

---

## 1. Candidate attributes

Source: `Ticket` interface in `domain-contracts/src/ticket/entity.ts`. Enums live in
`domain-contracts/src/types/schema.ts` and are re-exported as `CRStatus`, `CRType`, `CRPriority`.

| Field | Shape | Enum values | Filter candidate | Why |
|-------|-------|-------------|------------------|-----|
| `code` | string | — | search only | Already covered by free-text. Not a facet. |
| `title` | string | — | search only | Already covered. |
| `status` | enum (7) | Proposed, Approved, In Progress, Implemented, Rejected, On Hold, Partially Implemented | **MUST** | The board is already grouped by status — but the user often wants to hide columns or narrow within a status. Enumerate, multi-select. |
| `type` | enum (6) | Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation, Research | **MUST** | "Show only bugs", "hide docs". Small fixed set, classic facet. |
| `priority` | enum (4) | Low, Medium, High, Critical | **MUST** | "What's critical right now." Fixed set, high value. |
| `assignee` | string (optional) | free | **MUST** | "What's on my plate", "unassigned". Values are derived from the ticket set itself (no user directory). |
| `inWorktree` | boolean (optional) | true/false | **MUST** | MDT-095 already surfaces this as a badge. "What's checked out in a worktree" is a daily question. Cheap to filter. |
| `phaseEpic` | string (optional) | free, but it's a grouping key | **MUST** | Low-cardinality in practice (a handful of active epics). "Show this epic's tickets" is a real job. |
| `impactAreas` | string[] (optional) | free labels | **MUST** | These are the project's tags/labels. The single most useful facet after status. |
| `dateCreated` | Date | — | nice-to-have | "Created this week." Date-range filter. |
| `lastModified` | Date | — | nice-to-have | "Touched recently." Date-range. Note: already partially served by MDT-108 (last-30-days done). |
| `implementationDate` | Date (optional) | — | nice-to-have | "Shipped this quarter." Only meaningful for Implemented tickets. |
| `relatedTickets` | string[] | ticket codes | nice-to-have | Relationship filter ("is related to MDT-100"). Useful but niche; defer until the simple facets ship. |
| `dependsOn` / `blocks` | string[] | ticket codes | nice-to-have | Same as related. Defer. |
| `content` | string | — | nice-to-have (expensive) | Full-text search of body. Today's free-text only hits title/code/description. Real win for large boards, but it's a search problem, not a facet. |
| `description` / `rationale` / `implementationNotes` | string | — | fold into search | Don't make these separate facets. If we expand search, fold them into the same free-text scope. |
| `filePath` / `worktreePath` | string | — | no | Internal. Not user-facing. |
| `subdocuments` | SubDocument[] | — | no | Structural, not a facet. |

### Must-haves (ship first)

These eight attributes cover the daily jobs on a Kanban board and are cheap to compute client-side:

1. **status** — enum, multi-select
2. **type** — enum, multi-select
3. **priority** — enum, multi-select
4. **assignee** — derived list, multi-select, includes an explicit **Unassigned** pseudo-value
5. **inWorktree** — boolean toggle
6. **phaseEpic** — derived list, multi-select
7. **impactAreas** — derived label list, multi-select
8. **free-text** — what `FilterControls` does today (title/code/description). Keep it. Fold into the same filter state.

All must-haves are already fields on `Ticket`. None require schema changes, server changes, or new
indexes. The board already loads the full ticket list client-side, so every must-have filter is a
`useMemo` over the existing array — same pattern as `Board.tsx:293`.

### Nice-to-haves (defer)

Defer until the must-haves prove their worth:

- **Date ranges** (created / modified / implemented) — useful but adds a date-picker control and a
  state shape that doesn't exist yet. MDT-108 already covers the most common date job (recently done).
- **Relationship filters** (related/depends/blocks = `MDT-XXX`) — niche. Only worth it once users
  complain they can't find "everything blocked by MDT-100".
- **Full-text search of `content`** — real value on large boards but it's a search/index problem, not
  a facet. Ship separately from the facet system. Don't pretend a substring scan over every file body
  is free at 500+ tickets.

---

## 2. Filter state — the data structure

This is the contract. Every UI control, persistence layer, and any future MCP/server filter resolves to
this one shape. Get it right and the UI is obvious.

### Existing contract

`domain-contracts/src/ticket/input.ts` already defines:

```ts
export interface TicketFilters {
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  assignee?: string | string[]
  phaseEpic?: string | string[]
  dateRange?: { start?: Date; end?: Date }
}
```

Observations:

- It already accepts `string | string[]` per facet. Good — multi-select is baked in. Keep this.
- Missing must-haves: `impactAreas`, `inWorktree`, and a free-text `query`.
- `dateRange` is a single global range with no field selector. Fine for nice-to-have, but it cannot
  express "created this week" vs "modified this week" at the same time. Acceptable for v1; revisit if
  date filters move to must-have.
- No relationship filters. Correct to omit for now.

### Proposed shape

Extend the existing contract — do not replace it. New fields are additive so existing callers
(MCP `list_crs`, any server-side filter) keep working.

```ts
export interface TicketFilters {
  // --- existing (unchanged) ---
  status?: string | string[]
  type?: string | string[]
  priority?: string | string[]
  assignee?: string | string[]
  phaseEpic?: string | string[]
  dateRange?: { start?: Date; end?: Date }

  // --- new: must-haves ---
  /** Free-text AND-match over title/code/description. Replaces the standalone FilterControls query. */
  query?: string
  /** Label facet. OR within the list. */
  impactAreas?: string | string[]
  /** Boolean facet. undefined = show all; true = only worktree tickets; false = only non-worktree. */
  inWorktree?: boolean
}
```

Rules the UI must obey (these belong in the spec, recorded here so the contract is unambiguous):

- **Across facets: AND.** `status=In Progress AND priority=High` narrows.
- **Within a facet: OR.** `status=[In Progress, Approved]` widens.
- **`query` is AND-combined with every facet**, and internally it stays multi-term AND (today's behavior).
- **An empty `TicketFilters` = show everything.** No special cases. This is the data-structure fix that
  removes a class of conditional logic in the UI.
- **`assignee` uses a sentinel string for "Unassigned"** (propose `"__none__"`) rather than a separate
  boolean flag. One facet, one shape, no special-case branch.

### Where the state lives

- **Source of truth**: a `useReducer`-style filter state in the board's existing hook layer, alongside
  `localSortPreferences`. Same lifecycle.
- **Persistence**: localStorage, mirroring `markdown-ticket-sort-preferences`. Key proposal:
  `markdown-ticket-filter-preferences`. Persisted per nothing fancier than "last used" — saved *views*
  are explicitly out of scope for v1 (see "Non-goals").
- **Reset**: a single `clearAll` action returns the empty `TicketFilters` shape. One code path.

### Deriving facet value lists

For `assignee`, `phaseEpic`, `impactAreas`, the value menu is derived from the current ticket set,
not from a static enum. Compute once per ticket-list change with a `useMemo` that walks the array and
builds a sorted unique list. No server round-trip, no new endpoint. This is the same data the board
already has.

For `status` / `type` / `priority` the value menu **is** the static enum (`CRStatuses`, `CRTypes`,
`CRPriorities`) — do not derive these from tickets, or the menu shrinks when no ticket uses a value.

---

## 3. Non-goals

Calling these out so the v1 doesn't bloat:

- **Saved / shared views.** Linear/GitHub/Notion/Asana all converge on saved views, but that's a
  naming, storage, and permissions project of its own. Out of scope here.
- **Nested AND/OR groups** (Notion's 3-level tree). Powerful, but doubles the UI surface. v1 is
  flat AND across facets, OR within. Revisit only with evidence.
- **Text-syntax filter language** (`status:"In Progress" priority:high`). GitHub's hybrid pattern is
  attractive for power users but is a second control layered on top of the visual one. Ship the
  visual facets first; a syntax mode can be added later without changing `TicketFilters`.
- **AI / natural-language filters** (Linear). No.
- **Server-side filtering.** The board already has the full list client-side. Server/MCP filtering is
  a different surface (large datasets, API consumers) and should reuse `TicketFilters` when it lands,
  not drive this design.

---

## 4. Open questions for the design proposal

These are UX decisions, not data decisions, and belong in `docs/design/explorations/filtering-system.md`:

1. **Visual pattern**: chip bar (Linear), faceted popover (Notion/Asana), text-syntax (GitHub), or hybrid?
2. **Where it lives**: extend the existing board header / app-header filter slot, or a dedicated filter bar?
3. **Active-filter summary**: inline chips with `x`, count badge on a Filter button, or both?
4. **Mobile**: bottom-sheet tray (NN/G recommended) vs full-screen modal?
5. **Interaction with the existing free-text input**: do we keep it as-is and add facets beside it, or
   absorb `query` into a unified filter control?

---

## 5. Verification anchors

| Claim | Anchor |
|-------|--------|
| Current filter is free-text only over title/code/description | `src/components/Board.tsx:293-311` |
| Existing filter UI is a single text input | `src/components/FilterControls.tsx` |
| `Ticket` entity field set | `domain-contracts/src/ticket/entity.ts` |
| Enum value lists (`CRStatuses` etc.) | `domain-contracts/src/types/schema.ts` |
| Existing `TicketFilters` contract | `domain-contracts/src/ticket/input.ts` |
| `inWorktree` badge already exists (MDT-095) | `src/components/Badge/ContextBadge.tsx`, `ticket-card.spec.md` |
| Sort already persists to localStorage with this pattern | `src/config/sorting.ts`, `board-layout.spec.md:156` |
| Prior filtering ticket (text only) | `docs/CRs/MDT-047-document-and-ticket-filtering-functionality.md` |
| Prior date filter (last 30 days done) | `docs/CRs/MDT-108-add-last-30-days-filter-for-done-column-tickets.md` |
