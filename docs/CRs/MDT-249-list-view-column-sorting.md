---
code: MDT-249
status: In Progress
dateCreated: 2026-09-22T21:56:18.903Z
type: Feature Enhancement
priority: Medium
---

# Add clickable column sorting to list view

## 1. Description

### Requirements Scope
`full` — clickable column headers, per-view sort persistence, Status sort attribute, Created column

### Problem
- List view table headers in `frontend/src/components/ProjectView.tsx` are static text — the only way to sort is the header SortMenu, and nothing signals that columns are sortable (MDT-134 delivered the table without clickable sorting)
- Sort state is one localStorage key (`markdown-ticket-sort-preferences` in `frontend/src/config/sorting.ts`) shared by board and list — a list sort silently reorders board columns and vice versa
- Status is not sortable: `sortTickets` in `frontend/src/utils/sorting.ts` has no `status` case and `DEFAULT_SORT_ATTRIBUTES` has no Status entry
- The Modified column renders `toLocaleDateString()` (`ProjectView.tsx`) instead of the relative timestamps used by ticket cards, and there is no Created column

### Affected Artifacts
- `frontend/src/config/sorting.ts` — sort preference storage + attribute registry
- `frontend/src/utils/sorting.ts` — comparator
- `frontend/src/components/ProjectView.tsx` — list table branch
- `frontend/src/components/routes/ProjectRouteHandler.tsx` — sort state owner
- `frontend/src/components/SecondaryHeader.tsx` + `frontend/src/components/SortControls.tsx` — dropdown wiring
- `frontend/src/components/HamburgerMenu.tsx` — mobile sort list
- `frontend/src/components/shared/RelativeTimestamp.tsx` — timestamp cell component
- `docs/design/surfaces/sort-menu.spec.md` — SortMenu icon map
- `tests/e2e/list/view.spec.ts` — list E2E spec

### Scope
- **Changes**: view-scoped sort preferences (list vs board+swimlane); clickable Key/Title/Status/Created/Updated headers with direction glyph + `aria-sort`; dropdown↔header two-way sync; Status attribute in the list-scope dropdown (lifecycle order); Created column; RelativeTimestamp cells; label alignment (Code→Key, Modified→Updated)
- **Unchanged**: board/swimlane within-column sorting behavior; Attributes column (not sortable — mixed data); mobile card layout structure; Documents view sorting (`documentSorting.ts`); Priority (dropdown-only, no column)

## 2. Decision

### Chosen Approach
View-scoped sort preferences in localStorage with clickable table headers that drive the existing controlled SortMenu.

### Rationale
- SortMenu is already fully controlled (`value`/`direction` props in `SortMenu/index.tsx`) — header clicks routed through the same `onSortPreferencesChange` update the dropdown for free; no new sync mechanism
- Per-scope storage mirrors the sanitize-and-default pattern of `filterPreferences.ts`; board and list semantics genuinely differ (within-column order vs whole-table order), so one shared value cannot serve both
- Status lifecycle order becomes a dedicated array because existing orders encode different things: `STATUS_CONFIG.order` (`frontend/src/config/statusConfig.ts`) puts On Hold 6th and drives workflow suggestions; `VALID_STATUSES` (`frontend/src/utils/ticketStatus.ts`) shares that order and guards the invalid-status badge — neither may be repurposed
- RelativeTimestamp already renders relative time + full-date-time tooltip (both required behaviors); only a fixed-mode prop is needed — its click-to-toggle behavior is wrong for table cells and would nest a button inside the clickable TableRow

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **View-scoped localStorage + controlled-SortMenu sync** | One `Record<SortScope, SortPreferences>` under the existing key | **ACCEPTED** — matches filterPreferences precedent; dropdown sync is free via controlled props |
| Sort state in URL params | Shareable/bookmarkable sort | Sort is a transient per-browser preference like filters (MDT-196 precedent); URL adds routing coupling with no sharing need |
| Third-party table sorting (TanStack Table) | Headless per-column sort model | New dependency for one table; shadcn Table is presentational and headers can host buttons directly |
| Keep a single shared sort for all views | No storage change | Board and list sort semantics differ; a list-only Status entry would pollute the board dropdown where within-column status sort is meaningless |
| Reuse `STATUS_CONFIG.order` for status sort | No new order array | Encodes a different sequence (On Hold 6th); mutating it changes workflow-suggestion behavior — blast radius for a presentation concern |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `SortScope` type in `frontend/src/config/sorting.ts` | Type | `'board' \| 'list'` scope enum (type-safe enum pattern, docs/PRE_IMPLEMENT.md) |
| `SORT_ATTRIBUTES` per-scope registry in `frontend/src/config/sorting.ts` | Data | Per-scope dropdown/header attribute lists; list scope adds Status |
| `CR_STATUS_SORT_ORDER` in `frontend/src/config/sorting.ts` | Data | Lifecycle order: Proposed, Approved, In Progress, On Hold, Implemented, Partially Implemented, Rejected |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `frontend/src/config/sorting.ts` | API changed | `getSortPreferences(scope)` / `setSortPreferences(scope, prefs)`; storage value becomes `Record<SortScope, SortPreferences>`; stale flat shape falls back to per-scope defaults (no migration) |
| `frontend/src/utils/sorting.ts` | Case added | `status` case in `sortTickets` — `CR_STATUS_SORT_ORDER` indexOf lookup; unknown values sort last |
| `frontend/src/components/routes/ProjectRouteHandler.tsx` | State changed | Hold per-scope preferences; read/write the scope matching the active viewMode; keep the existing `onSortPreferencesChange` thread |
| `frontend/src/components/ProjectView.tsx` | UI changed | List table: clickable header buttons (Key, Title, Status, Created, Updated) with `aria-sort` + direction glyph; Attributes stays static; Code→Key and Modified→Updated label alignment; Created column added; first click applies the attribute's `defaultDirection`, repeat click flips |
| `frontend/src/components/shared/RelativeTimestamp.tsx` | Prop added | Fixed-mode prop rendering a non-interactive timestamp + tooltip for table cells (toggle mode stays for ticket cards) |
| `frontend/src/components/SortControls.tsx`, `SecondaryHeader.tsx`, `HamburgerMenu.tsx` | Wiring changed | Attribute list sourced from the view-scoped registry instead of `DEFAULT_SORT_ATTRIBUTES` |
| `docs/design/surfaces/sort-menu.spec.md` | Doc changed | Status row added to the icon map (list scope) |
| `tests/e2e/list/view.spec.ts` | Tests changed | Header-click sorting, dropdown sync, Created column, status order coverage |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| ProjectView list headers | ProjectRouteHandler | `sortPreferences` + `onSortPreferencesChange` props (existing thread) |
| SortControls / HamburgerMenu | config/sorting registry | Per-scope `SortAttribute[]` |
| sortTickets | CR_STATUS_SORT_ORDER | indexOf lookup on attribute name `status` |
| RelativeTimestamp (fixed mode) | utils/dateFormat | `formatRelativeTime` + `formatFullDateTime` (unchanged) |

### Key Patterns
- Type-safe enum pattern (docs/PRE_IMPLEMENT.md): `SortScope` union + per-scope records
- Sanitize-and-default localStorage reads: `filterPreferences.ts` pattern — stale shapes reset, never throw
- BEM + `data-*` state attributes for sortable headers (e.g. `data-sort-direction`); semantic classes per mdt-frontend rules

## 5. Acceptance Criteria

### Functional
- [ ] List headers Key, Title, Status, Created, Updated are clickable and show sort direction; Attributes is not clickable
- [ ] First click on a header sorts by that attribute's `defaultDirection`; clicking the active header again flips direction
- [ ] A header click updates the SortMenu selection and direction; a dropdown change updates the header glyph — both stay in sync
- [ ] Column labels match dropdown labels exactly: Key, Title, Status, Created, Updated
- [ ] Created column renders beside Updated; both cells show relative time (e.g. "an hour ago") via RelativeTimestamp, with the full date-time on hover
- [ ] Status sorts in lifecycle order: Proposed → Approved → In Progress → On Hold → Implemented → Partially Implemented → Rejected; unknown values sort last
- [ ] Status appears in the SortMenu and hamburger sort list only in list view; board/swimlane dropdown options are unchanged
- [ ] List and board sort preferences persist independently across reloads
- [ ] A stale flat `markdown-ticket-sort-preferences` value falls back to per-scope defaults without throwing

### Non-Functional
- [ ] `bun run validate:ts` and `bun run build` pass
- [ ] Existing E2E list contracts keep their `data-testid`s (`ticket-table`, `ticket-row-*`, `sort-menu`, `sort-controls`)

### Testing
- Unit: `utils/sorting.test.ts` — status case: mixed-status array → lifecycle order; unknown status → last
- Unit: config/sorting preferences — per-scope read/write, stale-shape fallback
- Component: SortControls/HamburgerMenu receive the list-scope attribute list including Status
- E2E: `tests/e2e/list/view.spec.ts` — click Title header → rows reorder + SortMenu shows Title; verify per-view persistence across reload
- Manual: UAT on light/dark themes for glyph + tooltip rendering

## 6. Verification

### By CR Type
- Feature: clickable headers exist and sort; `sortTickets` status-order unit test passes; E2E header-click spec passes
- Per-view persistence demonstrated by: set list sort to Updated → switch to board → board sort unchanged → reload → both preserved

## 7. Deployment

### Simple Changes
- Frontend-only change; ships with the normal build (`bun run build`)
- No server, config, or data migration steps; stale localStorage shape falls back to defaults