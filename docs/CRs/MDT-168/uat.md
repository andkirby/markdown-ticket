# UAT Refinement Brief

Ticket: `MDT-168`
Round: 2026-07-26

## Objective

Close a same-session freshness defect found during UAT of the configuration
management surface (MDT-168) and its interaction with the project selector rail
(MDT-129).

**Reported bug**: Settings can save `ui.projectSelector.visibleCount` /
`ui.projectSelector.compactInactive` through `PATCH /api/config`, and the value
is persisted correctly to `user.toml`. But the project selector rail reads
backend preferences **once on mount** (`useSelectorData` → `/api/config/selector`)
and is not refreshed after the successful write. The rail and Settings drift
within the same browser session until a full page reload.

**Root cause (verified in code)**:

- `src/hooks/useBackendConfig.ts` `applyOne` commits the effective value into
  its own descriptor list on success but never notifies any other consumer.
- `src/components/ProjectSelector/useSelectorData.ts`:
  - initial load (line ~90) fetches `{preferences, selectorState}` from
    `/api/config/selector` once;
  - the existing `mdt:selector-prefs-updated` (`SELECTOR_PREFS_SYNC_EVENT`)
    handler (`handlePrefsSync`) only re-reads **localStorage** overrides — it
    does **not** re-fetch backend prefs (`visibleCount`, `compactInactive`).
- `server/tests/routes/config-side-effects.test.ts` explicitly asserts that a
  `ui.projectSelector.visibleCount` write triggers **no** server-side effect
  (`cacheCleared === false`), and `architecture.md` labeled the row
  `ui.projectSelector.* (user)` as "user preference application (no global
  effect)". That wording is correct for the **server** side but was read as
  "no effect at all", which is how the consumer-refresh step got dropped.

Convert the bug into an explicit approved delta:

> Successful writes to `ui.projectSelector.*` must refresh live selector
> consumers in the same browser session, and the freshness behavior must be
> documented and tested.

This is a **refine_in_place** of `BR-3.2` (its "fire the required runtime side
effect" clause is narrowed: user-scope selector prefs need no server/global
effect) plus an **additive_change** — a new behavior `BR-7.1` owns the
same-browser consumer-refresh contract so it can carry its own scenario,
architecture obligation, and tests.

## Approved Changes

1. **`BR-3.2` refined in place** (same ID): make explicit that
   `ui.projectSelector.*` writes require **no server/global side effect** (no
   discovery cache invalidation, no document watcher reconfiguration, no
   registry reload). The server-side `ConfigSideEffectRegistry` behavior is
   unchanged.
2. **`BR-7.1` added** (new behavior, route `bdd`): a successful `applyConfig`
   for `ui.projectSelector.visibleCount` or `ui.projectSelector.compactInactive`
   must notify live project selector consumers in the same browser session via
   the **existing narrow named window event** (`mdt:selector-prefs-updated` /
   `SELECTOR_PREFS_SYNC_EVENT`) already consumed by `useSelectorData`. On the
   signal, `useSelectorData` re-fetches backend prefs from
   `/api/config/selector` and layers browser-only localStorage overrides
   (`accentEnabled`, `autocolor`, `accentStyle`) on top — the same merge order
   used at initial load. The signal fires **only** after a successful
   `ui.projectSelector.*` save, is **not** a generic event bus, and is **not**
   broadcast on unrelated config writes. Browser-only preferences never flow
   through this refresh path (BR-6.1).
3. **Architecture wording fixed**: the `ui.projectSelector.* (user)` row in the
   Side-Effect Ownership table now reads "no server/global effect; same-browser
   consumer refresh (see below)" and a dedicated subsection + invariant 9 make
   the split explicit. "No global effect" describes the server side only.
4. **Tests added**: two unit tests (writer emits the signal; consumer re-fetches
   on the signal) and one E2E extension (rail updates without a full page
   reload).
5. **Task added**: `TASK-10` is the single focused implementation slice.

## Changed Requirement IDs

| ID       | Change type        | Summary                                                                                                |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `BR-3.2` | `refine_in_place`  | Same ID; "fire the required runtime side effect" narrowed — user-scope selector prefs need no server/global effect; their effect is the BR-7.1 same-browser refresh. |
| `BR-7.1` | `additive_change`  | New behavior: successful `ui.projectSelector.*` save → narrow named window event → `useSelectorData` re-fetches backend prefs + layers localStorage overrides. |

No upstream IDs were deleted or remapped.

## Affected Downstream Trace

- **BDD**: new scenario `selector_pref_change_refreshes_live_consumers`
  (covers `BR-7.1`); added to the journey map as a new journey
  "Same-browser consumer refresh".
- **Architecture**:
  - new obligation `OBL-selector-consumer-refresh` (derived-from `BR-7.1`;
    artifacts `ART-fe-use-backend-config`, `ART-fe-selector-data`);
  - newly registered artifact `ART-fe-selector-data`
    (`src/components/ProjectSelector/useSelectorData.ts`);
  - Side-Effect Ownership row for `ui.projectSelector.*` reworded; new
    subsection "Same-Browser Consumer Refresh for `ui.projectSelector.*`";
    invariant 9 added.
- **Tests**:
  - `TEST-use-backend-config-refresh-signal` (unit,
    `src/hooks/useBackendConfig.test.tsx`);
  - `TEST-selector-data-refresh-on-signal` (unit,
    `src/components/ProjectSelector/useSelectorData.test.tsx`);
  - `TEST-e2e-config-refresh` (e2e) extended — `BR-7.1` added to its covers.
- **Tasks**: new `TASK-10` (owns `ART-fe-use-backend-config`,
  `ART-fe-selector-data`; makes-green `selector_pref_change_refreshes_live_consumers`,
  `TEST-use-backend-config-refresh-signal`, `TEST-selector-data-refresh-on-signal`,
  `TEST-e2e-config-refresh`); new milestone `M5`.

## Execution Slices

### Slice 1 — Wire the same-browser selector consumer refresh (`TASK-10`)

- **Objective**: after a successful `applyConfig` for
  `ui.projectSelector.visibleCount` or `ui.projectSelector.compactInactive`,
  notify live selector consumers so they re-fetch backend prefs without a full
  page reload.
- **Direct artifacts/files**:
  - `src/hooks/useBackendConfig.ts` — in `applyOne`, on `outcome.ok` and the
    selector is one of the two `ui.projectSelector.*` selectors, dispatch the
    existing `SELECTOR_PREFS_SYNC_EVENT` window event (import the constant from
    `useSelectorData.ts`; do not declare a second event name).
  - `src/components/ProjectSelector/useSelectorData.ts` — change
    `handlePrefsSync` so that on the event it re-fetches backend prefs from
    `/api/config/selector` (currently it only re-reads localStorage), then
    layers `loadLocalPreferences()` overrides on top, preserving the
    `{...validatedPreferences, ...localOverrides}` merge order used at initial
    load.
  - `src/hooks/useBackendConfig.test.tsx` — extend: assert the signal is
    emitted on a successful `ui.projectSelector.*` save and **not** emitted on
    a non-`ui.projectSelector.*` save (e.g. `links.enableTicketLinks`).
  - `src/components/ProjectSelector/useSelectorData.test.tsx` — extend or add:
    assert that on `mdt:selector-prefs-updated`, `/api/config/selector` is
    re-fetched and localStorage overrides are layered on top.
  - `tests/e2e/config/configuration-refresh.spec.ts` — extend: change
    `ui.projectSelector.visibleCount` in Settings, save, and assert the rail
    updates without a full page reload.
- **Direct GREEN targets**: `selector_pref_change_refreshes_live_consumers`,
  `TEST-use-backend-config-refresh-signal`, `TEST-selector-data-refresh-on-signal`,
  `TEST-e2e-config-refresh`.
- **Impacted canonical task IDs**: `TASK-10`.
- **Why the slice exists**: the two halves of the bug (writer doesn't notify;
  consumer doesn't re-fetch backend prefs) share one narrow contract — the
  existing `mdt:selector-prefs-updated` event. Wiring both ends against that
  one event resolves the drift without a new transport, without a server change,
  and without touching MDT-129 ordering/rendering.

Implementation notes for the slice:

- Reuse the existing `SELECTOR_PREFS_SYNC_EVENT` / `SELECTOR_STATE_SYNC_EVENT`
  constants already exported from `useSelectorData.ts`. Do not invent a new
  event name and do not add a generic event bus.
- The signal must fire **only** for `ui.projectSelector.visibleCount` and
  `ui.projectSelector.compactInactive`. Guard the dispatch on the selector
  string (or on the selector being on the user scope AND under the
  `ui.projectSelector.` prefix), not on every successful apply.
- In `handlePrefsSync`, mirror the initial-load merge exactly:
  `validatePreferences(data.preferences)` first, then spread
  `loadLocalPreferences()` on top — never replace localStorage accent/autocolor/
  accentStyle with backend values (BR-6.1).
- Network failure during the re-fetch should fall back silently to the existing
  preferences (the rail remains functional), matching the initial-load
  fallback behavior already in `useSelectorData`.
- No server changes are required. `ConfigSideEffectRegistry` and the
  `config-side-effects.test.ts` assertion that a `ui.projectSelector.*` write
  triggers no server-side effect both still hold — that is the correct
  server-side behavior; the refresh is a browser-only concern.

## Validation

- Canonical store revalidated green across all stages:
  `spec-trace validate MDT-168 --stage all` — passed (requirements, bdd,
  architecture, tests, tasks).
- Rendered projections refreshed for every affected stage:
  `requirements.trace.md`, `bdd.trace.md`, `architecture.trace.md`,
  `tests.trace.md`, `tasks.trace.md`.
- Human-owned docs updated to mirror the store: `requirements.md`, `bdd.md`,
  `architecture.md`, `tests.md`, `tasks.md`.

## Watchlist

- **Don't widen the signal.** Only `ui.projectSelector.visibleCount` and
  `ui.projectSelector.compactInactive` trigger it. Broadcasting on every config
  write would re-introduce a hidden coupling and violate the "no event bus"
  guidance.
- **Preserve the merge order on refresh.** `loadLocalPreferences()` must layer
  on top of the re-fetched backend prefs, not the other way around — otherwise
  browser-only accent/autocolor/accentStyle could be silently overwritten
  (BR-6.1 regression).
- **Don't add a server side effect for `ui.projectSelector.*`.** The existing
  `config-side-effects.test.ts` assertion that `cacheCleared === false` for a
  `ui.projectSelector.visibleCount` write must stay green; that is correct
  server behavior.
- **Don't rewrite MDT-129.** This slice touches only the refresh-signal
  emission (writer) and the backend-pref re-fetch (consumer). Ordering,
  rendering, keyboard nav, and persistence of selector state are out of scope.
- **Stale-closure risk in `useBackendConfig.applyOne`.** The dispatch must
  reflect the just-saved selector; since `applyOne` already receives the
  selector argument, no new state dependency is needed.

## Open Decisions

None unresolved. The narrow contract (existing named window event, no bus,
browser-only prefs stay browser-only, no server change) was approved as the
implementation path.
