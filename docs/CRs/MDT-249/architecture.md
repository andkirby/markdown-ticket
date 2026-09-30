# Architecture: MDT-249

**Generated**: 2026-09-30 · Assess verdict: Option 1 (Integrate As-Is)

## Overview

The feature rides four existing seams without moving any boundary: `config/sorting.ts` remains the single sort-registry and storage owner (its storage value becomes a per-scope record); `ProjectRouteHandler` remains the single sort-state owner (its state becomes a per-scope record); the list table in `ProjectView` becomes a writer, not just a reader, via the same `onSortPreferencesChange` thread the dropdown uses; and `sortTickets` gains one self-contained `status` case backed by a dedicated lifecycle array. The controlled SortMenu makes header↔dropdown sync free — both surfaces read the same state and write through the same handler.

## Decisions

1. **Scope selection lives in the route handler** (assess mismatch response): `ProjectRouteHandler` holds `Record<SortScope, SortPreferences>`; `handleSortPreferencesChange(newPrefs)` writes only the scope matching the active `viewMode` (`list` → `'list'`; board and `/epics` swimlanes → `'board'`). Switching views swaps which slice is passed down; no effect fires on switch.
2. **Registry is the single attribute source**: `SORT_ATTRIBUTES: Record<SortScope, SortAttribute[]>` in `config/sorting.ts`; `DEFAULT_SORT_ATTRIBUTES` becomes an alias of the board scope (existing importers keep compiling). List-scope order is pinned (UX gate): **Key, Title, Status, Priority, Created, Updated** — Status after Title mirroring column order; existing options keep their positions. `SecondaryHeader` already receives `viewMode`; it derives the scope once and passes the attribute list down to `SortControls` and `HamburgerMenu`, which stop importing `DEFAULT_SORT_ATTRIBUTES` directly.
3. **Status rank is self-contained in the comparator** (lead decision 2026-09-30): the `status` case returns directly from the comparator, before the generic negate-for-desc machinery — known statuses compare by `CR_STATUS_SORT_ORDER` rank and flip with direction; **unknown statuses return after known ones in BOTH directions** (guard: single unknown → +1 past the other operand). `STATUS_CONFIG.order` and `VALID_STATUSES` are untouched (C4).
4. **Header click semantics live in ProjectView**: clicking an inactive header applies the registry `defaultDirection` (Status = `asc`, lead-confirmed); clicking the active header flips. ProjectView computes the next `SortPreferences` and hands it to `onSortPreferencesChange` — it holds no local sort state (single source of truth stays the route handler).
5. **Fixed-mode timestamp is a boolean prop**: `RelativeTimestamp` gains `fixed?: boolean` — renders a non-interactive `<span>` + tooltip instead of the toggle `<button>` (C5). Toggle mode for ticket cards is unchanged.
6. **Storage keeps one key, both scopes** (C1/Edge-1): `markdown-ticket-sort-preferences` holds `Record<SortScope, SortPreferences>`; `setSortPreferences(scope, prefs)` read-modify-writes the record so the other scope is never clobbered (BR-7.1). Reads sanitize: anything that is not a valid per-scope record — including the pre-change flat shape — resets to per-scope defaults; never throws.

## Module Boundaries

- `frontend/src/config/sorting.ts` — owns `SortScope`, the per-scope registry, `CR_STATUS_SORT_ORDER`, and all localStorage I/O (shape, sanitize, defaults). No other module reads the storage key.
- `frontend/src/utils/sorting.ts` — owns comparison semantics only; consumes `CR_STATUS_SORT_ORDER`, mutates nothing.
- `frontend/src/components/routes/ProjectRouteHandler.tsx` — owns per-scope sort state and scope selection; the only writer of state.
- `frontend/src/components/ProjectView.tsx` — owns list-table presentation: header buttons, `aria-sort`/glyph state, Created/Updated cells. Computes next-prefs on click; never stores.
- `frontend/src/components/SecondaryHeader.tsx` — derives scope from `viewMode`, threads the attribute list and prefs to `SortControls` (desktop) and `HamburgerMenu` (mobile).
- `frontend/src/components/shared/RelativeTimestamp.tsx` — owns timestamp rendering modes; no sorting knowledge.

## Canonical Data Flows

**Header click (list):** header `<button>` in ProjectView → `onSortPreferencesChange(next)` → `handleSortPreferencesChange` in route handler → updates `list` slice of state + `setSortPreferences('list', prefs)` → re-render: `sortedTickets` re-sorts, header glyph + `aria-sort` update, SortMenu trigger label/direction update (same state).

**Dropdown change:** SortMenu `onChange` → SortControls/HamburgerMenu `onPreferencesChange` → SecondaryHeader → same `handleSortPreferencesChange` → same re-render path; header indicators derive from the same prefs object.

**Initial load:** route handler state initialized from `getSortPreferences('board')` + `getSortPreferences('list')` (lazy `useState` initializers, one localStorage read per scope).

## Invariants

- All localStorage reads are sanitize-and-default; malformed or stale values (flat shape included) never throw — they reset both scopes to defaults (Edge-1).
- One storage key, per-scope record; writes merge by scope — board and list never overwrite each other (BR-7.1, C1).
- The controlled SortMenu stays the single source of truth for dropdown UI; headers and dropdown write the same state through the same handler — no shadow state, no reconciliation effects.
- `sortTickets` stays pure; status order comes only from `CR_STATUS_SORT_ORDER`; `STATUS_CONFIG.order` / `VALID_STATUSES` are never mutated or repurposed (C4).
- Timestamp cells inside clickable rows render no nested interactive element (C5).
- `ticket-table`, `ticket-row-*`, `sort-menu*`, `sort-controls` testids survive the header rewrite (C2); board/swimlane sorting and Documents sorting behavior are untouched (C6).
- Header cells expose `aria-sort` on the `th` (ascending/descending on the active column) and a visible direction glyph; state also mirrored via `data-sort-direction` (C3).

## Program Design

Persistence model changes (localStorage shape) + comparator semantics change — signature-only contracts:

```ts
// config/sorting.ts
type SortScope = 'board' | 'list'
const SORT_ATTRIBUTES: Record<SortScope, SortAttribute[]>        // board = current five; list = Key, Title, Status, Priority, Created, Updated (UX-gate order)
const CR_STATUS_SORT_ORDER: readonly string[]                    // Proposed→Approved→In Progress→On Hold→Implemented→Partially Implemented→Rejected
function getSortPreferences(scope: SortScope): SortPreferences   // sanitize-and-default; stale flat shape → defaults
function setSortPreferences(scope: SortScope, prefs: SortPreferences): void  // read-modify-write the record

// utils/sorting.ts — status case (self-contained, returns before generic handling)
// rank = CR_STATUS_SORT_ORDER.indexOf(status); both -1 → 0; one -1 → unknown AFTER known (both directions);
// else comparison = aRank - bRank, negated when direction === 'desc'

// ProjectView.tsx — new prop
onSortPreferencesChange?: (preferences: SortPreferences) => void

// shared/RelativeTimestamp.tsx — new prop
fixed?: boolean   // true → <span> + tooltip, no toggle, no button
```

Least-confident decisions: (a) `DEFAULT_SORT_ATTRIBUTES` retained as board-scope alias vs. migrating its three importers outright — alias is the smaller diff, migration is cleaner; either satisfies the obligations. (b) sanitize strictness — requiring both shape-level validation (has board/list keys) and value-level validation (attribute string + asc/desc) vs. shape-level only; value-level is a few lines more and matches `filterPreferences.ts`. Nothing empirical — no PoC needed.

## Rollback

Revert is safe in both directions: the new reader tolerates old flat values (reset to defaults), and the old reader tolerates new record values (spread of unknown keys collapses to defaults — the old code's `{...DEFAULT, ...parsed}` pattern ignores `board`/`list` keys). No migration exists to unwind; worst case either way is default sort, never a throw.

## Diagrams

```text
list th button ──┐                                   ┌── SortMenu (SortControls, desktop)
                 ├─▶ onSortPreferencesChange ─▶ ProjectRouteHandler ─▶ setSortPreferences('list'|'board', prefs)
SortMenu change ─┘        (same thread)              │      │ state: Record<SortScope, SortPreferences>
                                                     │      ▼
                                                     │   localStorage[markdown-ticket-sort-preferences]
                                                     ▼
                                     ProjectView list ─▶ sortTickets(tickets, attr, dir)
                                             ▲                        │
HamburgerMenu (mobile) ◀─ SecondaryHeader ◀──┘ (attribute list: SORT_ATTRIBUTES[scope]) ──▶ glyphs + aria-sort
```
