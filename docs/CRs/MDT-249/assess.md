# Assessment: MDT-249

## Verdict

**Recommendation**: Option 1 — Integrate As-Is

Assessed relative to the CR's chosen approach (view-scoped localStorage + controlled-SortMenu sync), not as a re-litigation of alternatives — the Decision and Alternatives sections are authoritative.

## Feature Pressure

### Target Feature Needs
- Per-scope sort preferences (`'board' | 'list'`) replacing the single flat `markdown-ticket-sort-preferences` value, with stale-shape fallback to per-scope defaults
- Clickable Key/Title/Status/Created/Updated headers in the list table with direction glyph + `aria-sort`; Attributes stays static
- A `status` comparator in `sortTickets` backed by a dedicated lifecycle order (`CR_STATUS_SORT_ORDER`), unknown values last
- A Created column and RelativeTimestamp cells in fixed (non-interactive) mode
- Two-way sync between header clicks and the existing SortMenu (list scope adds Status to the dropdown; board scope unchanged)
- Label alignment: Code→Key, Modified→Updated

### Current System Assumptions
- `ProjectRouteHandler.tsx` is the single sort-state owner: `localSortPreferences` state + `handleSortPreferencesChange` persisting through `getSortPreferences`/`setSortPreferences` (one flat `SortPreferences`)
- SortMenu (`SortControls.tsx`) is fully controlled (`value`/`direction` props) and reads `DEFAULT_SORT_ATTRIBUTES` directly — the only attribute list today
- `ProjectView.tsx` receives `sortPreferences` (read-only) but **not** `onSortPreferencesChange` — headers have no update seam yet
- `sortTickets` has no `status` case; unknown custom attributes fall through to record-lookup (which would sort Status alphabetically — wrong order, hence the dedicated case)
- Board and `/epics` swimlanes share the `viewMode === 'board'` branch in `ProjectRouteHandler`, so one board scope serves both
- `RelativeTimestamp` is interactive (click-to-toggle, renders a `<button>`) — unusable as-is inside a clickable `TableRow`
- `filterPreferences.ts` already established the sanitize-and-default localStorage pattern this CR cites

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Healthy | Sort state already has one owner (route handler) and one storage module (`config/sorting.ts`); per-scope storage changes the value shape, not the ownership |
| Extension Fit | Healthy | Controlled SortMenu makes header→dropdown sync free via existing props; the only new seam is `onSortPreferencesChange` threaded into `ProjectView` (one prop, same thread the dropdown uses) |
| Dependency Fit | Healthy | No new packages; lucide-react already ships the glyph set; localStorage stays the store |
| Verification Fit | Concerning | `config/sorting` has **no unit test today** and the storage shape changes; E2E list contract (`ticket-table`, `ticket-row-*`, `sort-menu`, `sort-controls`) must survive a table-header rewrite — preservation gaps are real but minor and fully covered by the CR's Testing section |
| Redesign Scope | Healthy | Local only — storage shape, one comparator case, one component's table branch, one prop addition; no boundary moves |

## Mismatch Points

### Sort update seam into ProjectView
- Current system assumes: `ProjectView` is a read-only consumer of `sortPreferences`; only `SecondaryHeader`/`SortControls` (mounted in the route handler's header) can change sort
- Feature needs: table headers inside `ProjectView`'s list branch must write sort state
- Mismatch: the existing prop thread (`ProjectRouteHandler` → `ProjectView`) is one-directional
- Adjustment required: pass `onSortPreferencesChange` down the existing `sortPreferences` thread (CR already lists `ProjectRouteHandler.tsx` as state-changed — consistent, no scope growth)
- Scope: local

### Single shared storage key vs per-scope semantics
- Current system assumes: one flat `SortPreferences` `{selectedAttribute, selectedDirection}` serves board and list equally
- Feature needs: `Record<SortScope, SortPreferences>` so list sorting never reorders board columns
- Mismatch: existing stored values are flat; both scopes can't share one selected attribute (Status is list-only)
- Adjustment required: scope parameter on get/set + stale-flat fallback (filterPreferences precedent); board receives board-scope value, list receives list-scope value in the route handler's existing `viewMode` conditional
- Scope: local

### Interactive RelativeTimestamp inside clickable TableRow
- Current system assumes: timestamp component is a toggle `<button>` (ticket-card context)
- Feature needs: passive text + tooltip inside a row whose click opens the ticket
- Mismatch: a nested button inside the clickable `TableRow` breaks semantics/nesting rules
- Adjustment required: fixed-mode prop (CR already specifies) — non-interactive span, same relative time + full-date tooltip
- Scope: local

### Status ordering source
- Current system assumes: `STATUS_CONFIG.order` (On Hold 6th, drives workflow suggestions) and `VALID_STATUSES` are the status sequences
- Feature needs: a lifecycle order with On Hold 4th for presentation sorting
- Mismatch: repurposing either array changes unrelated behavior (workflow suggestions, invalid-status badge)
- Adjustment required: dedicated `CR_STATUS_SORT_ORDER` in `config/sorting.ts` (CR-specified)
- Scope: local

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: localStorage value shape change under the existing key; stale flat values reset to per-scope defaults — no migration, no server involvement
- Testing/E2E impact: new unit tests (`config/sorting` preferences, `utils/sorting` status case); `tests/e2e/list/view.spec.ts` gains header-click specs; existing `data-testid`s must be preserved through the header rewrite
- Main risk introduced: E2E selector drift in the list table if header cells lose/alter testids during the clickable-header rewrite — mitigated by the CR's Non-Functional criteria naming the exact testids to keep

## Verification Gaps

- Preservation tests needed: existing E2E "sort changes ticket order" (dropdown path) must keep passing unchanged; board dropdown option set must remain exactly the current five (no Status) — both lockable via the CR's planned E2E additions
- E2E/contract drift risks: header label changes (Code→Key, Modified→Updated) may break any test asserting header text — grep of `tests/e2e/list/view.spec.ts` shows no header-text assertions today (uses `sort-menu-option` testids), so risk is low
- Safe-to-refactor now?: yes — `sortTickets` is pure and already unit-tested; the storage module is small and gains its first test here

## Recommendation

### Option 1: Integrate As-Is
Use when: every insertion point already exists (controlled SortMenu, route-handler state ownership, sanitize-and-default storage precedent, `sortTickets` extension point) and the only seams to add are one prop thread and one comparator case — which is the case
Architecture impact: minimal; architecture stage must specify the `SortScope` storage shape, the header-button contract (`aria-sort`, `data-sort-direction`, first-click `defaultDirection`), and the fixed-mode `RelativeTimestamp` prop

### Option 2: Redesign Inline
Use when: n/a — no bounded redesign required

### Option 3: Redesign First
Use when: n/a — no systemic mismatch
Reason redesign cannot wait: n/a
Preferred path: n/a
