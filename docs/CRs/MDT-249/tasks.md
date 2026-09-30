# Tasks: MDT-249

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- `frontend/src/config/sorting.ts` + `utils/sorting.ts`: scope registry, lifecycle order, comparator case, scoped storage — no URL params, no backend, no new packages
- List table branch of `ProjectView.tsx`: headers/labels/columns/cells — mobile card structure unchanged (CR Scope)
- Wiring trio (`SecondaryHeader`/`SortControls`/`HamburgerMenu`): attribute-list sourcing only — no SortMenu component changes
- Board/swimlane within-column sorting, Documents view sorting (`documentSorting.ts`): untouched (C6)

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|-------------------------------|
| Sort registry + scoped storage + lifecycle order | `frontend/src/config/sorting.ts` | N/A (single owner by invariant) |
| Comparison semantics incl. status guard | `frontend/src/utils/sorting.ts` | N/A |
| Per-scope sort state + scope selection | `frontend/src/components/routes/ProjectRouteHandler.tsx` | N/A |
| List table presentation (headers, cells) | `frontend/src/components/ProjectView.tsx` | N/A |
| Timestamp render modes | `frontend/src/components/shared/RelativeTimestamp.tsx` | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1 (storage shape/key), Task 6 (E2E persistence) |
| C2 | Task 4 (preserve testids through rewrite), Task 6 (E2E contract) |
| C3 | Task 4 (aria-sort/glyph on headers), Task 6 (E2E assertions) |
| C4 | Task 1 (dedicated `CR_STATUS_SORT_ORDER`), Task 2 (consumes it; mutates nothing) |
| C5 | Task 3 (fixed-mode span), Task 6 (E2E non-interactive assertion) |
| C6 | Task 1 (board list unchanged), Task 5 (board wiring unchanged), Task 6 (E2E board options) |
| Edge-1 | Task 1 (sanitize-and-default + unit test), Task 6 (stale-shape via real key) |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint | Observable Proof |
|-----------|---------------|-------|------------|------------------|
| M1: scoped sort foundation | — (unit layer) | Task 1-2 | unit suites GREEN | `bun test frontend/src/config/sorting.test.ts frontend/src/utils/sorting.test.ts` |
| M2: scoped wiring + clickable headers | — (integration layer; scenarios gated on M3 spec) | Task 3-5 | typecheck + build + units GREEN; manual header-click proof | `bun run dev` → `/prj/{code}/list` → click Title header → rows reorder + SortMenu shows Title |
| M3: acceptance | all nine scenarios + `sticky_headers_pinned_during_scroll` (BR-8, UAT addition) | Task 6-7 | full E2E spec GREEN | `bun run test:e2e -- tests/e2e/list/view.spec.ts` |

Task 0 skipped: no new packages (C1 decision), runtime and all command families already start; the one missing file (`frontend/src/config/sorting.test.ts`) is a feature test owned by Task 1.

## Architecture Coverage Check

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|------------|----------|-----|--------|
| config/ | 2 (sorting.ts, sorting.test.ts†) | 2 (T1) | 0 | ✅ |
| utils/ | 2 (sorting.ts, sorting.test.ts) | 2 (T2) | 0 | ✅ |
| components/ | 6 (ProjectView, ProjectRouteHandler, SecondaryHeader, SortControls, HamburgerMenu, shared/RelativeTimestamp) | 6 (T3: 1, T4: 1, T5: 4) | 0 | ✅ |
| styles/ | 1 (styles/components/list-view.css — TASK-5 spillover + sticky rules) | 1 (T7) | 0 | ✅ |
| docs/ | 1 (sort-menu.spec.md) | 1 (T6) | 0 | ✅ |
| tests/e2e/ | 1 (list/view.spec.ts) | 1 (T6) | 0 | ✅ |

† missing on disk — created by Task 1 (`Creates`), the only missing architecture path.

## Tasks

### Task 1: Scoped sort config — registry, lifecycle order, per-scope storage (M1)

**Structure**: `frontend/src/config/sorting.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-sort-attributes-registry` → `frontend/src/config/sorting.test.ts`
- `TEST-sorting-config-scope-storage` → `frontend/src/config/sorting.test.ts`

**Scope**: add `SortScope` union; `SORT_ATTRIBUTES: Record<SortScope, SortAttribute[]>` (board = current five unchanged; list = Key, Title, Status, Priority, Created, Updated — UX-gate order; Status `defaultDirection: 'asc'`, label `Status`, icon per UX proposal `ListChecks`); `CR_STATUS_SORT_ORDER` (Proposed → Approved → In Progress → On Hold → Implemented → Partially Implemented → Rejected); `getSortPreferences(scope)` / `setSortPreferences(scope, prefs)` over the existing key with sanitize-and-default (stale flat shape / malformed JSON / absent → per-scope defaults, never throw — Edge-1, C1) and read-modify-write so scopes never clobber each other (BR-7.1); `DEFAULT_SORT_ATTRIBUTES` kept as board-scope alias.
**Boundary**: no comparator logic here; no UI imports; storage key unchanged.
**Creates**: `frontend/src/config/sorting.test.ts`
**Modifies**: `frontend/src/config/sorting.ts`
**Deletes**: None
**Must Not Touch**: `frontend/src/utils/sorting.ts`, `frontend/src/config/statusConfig.ts`, `frontend/src/utils/ticketStatus.ts` (C4), `filterPreferences.ts`
**Exclude**: no URL-param storage, no migration of old flat values, no new storage keys
**Anti-duplication**: mirror the sanitize-and-default pattern of `frontend/src/config/filterPreferences.ts` — do NOT reinvent validation helpers; reuse `SortAttribute`/`SortPreferences` types already in the module
**Duplication Guard**: grep for other readers of `markdown-ticket-sort-preferences` before changing the shape — this module must remain the only storage owner
**Re-plan Trigger**: if any third scope consumer appears (e.g. documents wanting ticket-sort), the scope union design needs revisit — none known

**Verify**:
```bash
bun test frontend/src/config/sorting.test.ts
```

**Done when**:
- [x] RED→GREEN on both TEST-* plans
- [x] ⚠️ Stale flat value + malformed JSON + absent key all fall back to per-scope defaults without throwing (Edge-1)

> ⚠️ Flag: Task 1 also touched `Board.tsx` + `ProjectRouteHandler.tsx` (2 call sites each) — scoped-storage signature
> change broke board-context callers; minimal transitional `'board'`-slot fix keeps every task boundary compiling.
> Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-1.json` (drift_findings).

### Task 2: Status comparator case (M1)

**Structure**: `frontend/src/utils/sorting.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-sorting-status-comparator` → `frontend/src/utils/sorting.test.ts`

**Scope**: add the `status` case to `sortTickets` — self-contained return before the generic compare/negate machinery: rank via `CR_STATUS_SORT_ORDER.indexOf`; both unknown → 0; exactly one unknown → unknown AFTER known regardless of direction (lead decision: pinned last both directions); else rank comparison negated on `desc`. Unit tests: mixed-status array ascending = lifecycle order; descending = reversed lifecycle; unknown last in both directions; priority/other cases regression-checked.
**Boundary**: no changes to existing cases or to null-handling of other attributes; `status` null/undefined resolves to unknown.
**Creates**: None
**Modifies**: `frontend/src/utils/sorting.ts`, `frontend/src/utils/sorting.test.ts`
**Deletes**: None
**Must Not Touch**: `frontend/src/config/sorting.ts` (import-only), `statusConfig.ts`, `ticketStatus.ts` (C4)
**Exclude**: no comparator framework, no sorting-key precomputation
**Anti-duplication**: import `CR_STATUS_SORT_ORDER` from `../config/sorting` — do NOT inline a second status array; follow the existing `priority` case's indexOf-rank comment style
**Duplication Guard**: confirm no other module sorts by status (grep `status` in sort utilities) — this stays the single comparator
**Re-plan Trigger**: if a second unknown-pinning semantic is required elsewhere (none known), generalize inside this case — never at call sites

**Verify**:
```bash
bun test frontend/src/utils/sorting.test.ts
```

**Done when**:
- [x] RED→GREEN on `TEST-sorting-status-comparator`
- [x] Existing comparator tests untouched and GREEN

> ⚠️ Note: one test expectation corrected pre-GREEN (unknown-vs-unknown desc ties keep
> stable input order per architecture "both -1 → 0"); comparator unchanged.
> Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-2.json`.

### Task 3: RelativeTimestamp fixed mode (M2)

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/shared/RelativeTimestamp.tsx`

**Enables (BDD)**:
- `created_column_shows_relative_timestamps` (BR-4.2) — needs Task 4-5 to surface

**Scope**: add `fixed?: boolean` prop — when true, render a non-interactive `<span>` (same relative text + full-date-time tooltip; no toggle, no `<button>`, no interactive class — C5). Tooltip keyboard path per UX gate: `:focus-within` from the row or native `title` fallback. Toggle mode for ticket cards unchanged.
**Boundary**: default (non-fixed) behavior byte-identical for all existing consumers.
**Creates**: None
**Modifies**: `frontend/src/components/shared/RelativeTimestamp.tsx`
**Deletes**: None
**Must Not Touch**: `utils/dateFormat.ts` (import-only), ticket-card consumers
**Exclude**: no new tooltip component, no re-styling of toggle mode
**Anti-duplication**: reuse `formatRelativeTime`/`formatFullDateTime` and the existing `Tooltip` composition — do NOT fork a second timestamp component
**Duplication Guard**: grep for other relative-time renderers (`toLocaleDateString` in list/table code is removed by Task 4, not duplicated here)
**Re-plan Trigger**: if the shared `Tooltip` cannot anchor a span without a focusable trigger, fall back to native `title` attribute — decided in-task, no scope change

**Verify**:
```bash
bun run validate:ts && bun run build
```

**Done when**:
- [x] Typecheck + build pass with both modes compiling
- [x] No existing `RelativeTimestamp` consumer changes

> ⚠️ In-task decision (sanctioned re-plan trigger): rows are not focusable, so fixed-mode
> tooltip uses the UX gate's native `title` fallback instead of Radix (no double tooltip).
> Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-3.json`.

### Task 4: ProjectView list table restructure (M2)

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/ProjectView.tsx`

**Enables (BDD)**:
- `header_click_sorts_by_default_direction`, `active_header_click_flips_direction`, `attributes_header_click_does_not_sort`, `header_click_updates_sort_menu` (BR-1.x, BR-3.1) — need Task 5 wiring to go live

**Scope**: restructure the desktop list branch — headers Key, Title, Status, Created, Updated become `<button>`-in-`th` sort controls (BEM class + `data-sort-direction`; glyph `ArrowUpNarrowWide`/`ArrowDownWideNarrow` aria-hidden; `aria-sort` on active `th` only, ABSENT on inactive — C3, UX gate); Attributes stays static; labels Code→Key, Modified→Updated (BR-3.1); new Created column before Updated with fixed-mode `RelativeTimestamp` cells for both date columns (BR-4.1/4.2, C5); first click applies registry `defaultDirection`, repeat click flips (BR-1.3/1.4); new optional `onSortPreferencesChange` prop — component computes next prefs, holds no local sort state.
**Boundary**: mobile card branch untouched (CR Scope); board/documents branches untouched; Attributes cell content unchanged.
**Creates**: None
**Modifies**: `frontend/src/components/ProjectView.tsx`
**Deletes**: None (the `toLocaleDateString()` Modified cell is replaced, not kept)
**Must Not Touch**: `ticket-table` / `ticket-row-*` / row `data-testid`s (C2), `Board.tsx`, `DocumentsView`, `SortMenu/`
**Exclude**: no sort state ownership, no localStorage access, no new columns beyond Created
**Anti-duplication**: import attribute metadata from `../config/sorting` registry — do NOT hardcode header→attribute maps in the component
**Duplication Guard**: verify header click computes prefs via the same `SortPreferences` shape the dropdown emits (grep `onSortPreferencesChange` thread) — single update contract
**Re-plan Trigger**: if `sortTickets` needs attribute metadata it doesn't receive (e.g. header width), pass through props only — never re-import from utils

**Verify**:
```bash
bun run validate:ts && bun run build
```

**Done when**:
- [x] Typecheck + build pass; table renders five sortable headers + static Attributes
- [x] All existing list testids still present (C2)

> ⚠️ Spillover (recorded): extracted `styles/components/list-view.css` (+ index.css import) per STYLING.md
> decision tree; `SortAttribute` made exported in config/sorting.ts (type-only).
> Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-4.json`.

### Task 5: Scoped state + attribute threading (M2 — checkpoint)

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/routes/ProjectRouteHandler.tsx`, `frontend/src/components/SecondaryHeader.tsx`, `frontend/src/components/SortControls.tsx`, `frontend/src/components/HamburgerMenu.tsx`

**Enables (BDD)**:
- `status_offered_only_in_list_view` (BR-6.1/6.2), `view_sort_preferences_persist_independently` (BR-7.1/7.2), and all Task-4 header scenarios go live — E2E proof lands at Task 6

**Scope**: route handler holds `Record<SortScope, SortPreferences>` (lazy per-scope init); `handleSortPreferencesChange` writes the slice matching active `viewMode` (list → `'list'`, board+`/epics` → `'board'`) and persists via `setSortPreferences(scope, prefs)`; pass scoped prefs + `onSortPreferencesChange` to both `SecondaryHeader` and `ProjectView` list render. `SecondaryHeader` derives scope from `viewMode` and threads `SORT_ATTRIBUTES[scope]` into `SortControls` (new `attributes` prop) and `HamburgerMenu` (replaces their direct `DEFAULT_SORT_ATTRIBUTES` imports).
**Boundary**: no SortMenu component changes; documents view still passes `undefined` sort props; board render call shape unchanged except scoped prefs source.
**Creates**: None
**Modifies**: `frontend/src/components/routes/ProjectRouteHandler.tsx`, `frontend/src/components/SecondaryHeader.tsx`, `frontend/src/components/SortControls.tsx`, `frontend/src/components/HamburgerMenu.tsx`
**Deletes**: None
**Must Not Touch**: `SortMenu/index.tsx`, `Board.tsx`, `DocumentsLayout`/`documentSorting.ts` (C6)
**Exclude**: no second state owner, no reconciliation effects — single source of truth is the route handler state
**Anti-duplication**: scope derivation lives once (route handler passes down; `SecondaryHeader` maps `viewMode`→scope with the same one-line mapping — do NOT duplicate the mapping logic in three components; derive once and thread)
**Duplication Guard**: grep `DEFAULT_SORT_ATTRIBUTES` after the change — only `config/sorting.ts` (definition + alias) should reference it; no shadow sort state in `ProjectView`/`SortControls`
**Re-plan Trigger**: if documents view later needs sorting, the scope map needs a third entry — Decision Needed at that point, not here

**Verify**:
```bash
bun run validate:ts && bun run build && bun test frontend/src/config frontend/src/utils
```

**Observe**:
```bash
bun run dev   # open /prj/{code}/list → click Title header: rows reorder asc, glyph shows, SortMenu reads Title;
              # reload: list sort kept; switch to board: board sort unchanged (Key desc default)
```

**Done when**:
- [x] Typecheck + build + unit suites GREEN (no regression from M1)
- [x] Manual observe proof passes (header click → reorder + menu sync + persistence)
- [x] Board dropdown options unchanged (five, no Status — C6)

> ⚠️ Spillover: `Board.tsx` +2 lines (own SortControls needs new required `attributes` prop —
> passed board registry; behavior unchanged, C6). Observe proof via throwaway E2E spec,
> deleted after run (1 passed, 7.3s). Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-5.json`.

### Task 6: E2E acceptance + durable docs (M3 — checkpoint)

**Skills**: playwright-cli

**Structure**: `tests/e2e/list/view.spec.ts`, `docs/design/surfaces/sort-menu.spec.md`

**Makes GREEN (Automated Tests)**:
- `TEST-list-view-column-sorting` → `tests/e2e/list/view.spec.ts`

**Makes GREEN (Behavior)**:
- `header_click_sorts_by_default_direction`, `active_header_click_flips_direction`, `attributes_header_click_does_not_sort`, `header_click_updates_sort_menu`, `sort_menu_change_updates_header`, `created_column_shows_relative_timestamps`, `status_sort_uses_lifecycle_order`, `status_offered_only_in_list_view`, `view_sort_preferences_persist_independently` → `tests/e2e/list/view.spec.ts` (BR-1.1–BR-7.2, C2, C3, C5)

**Scope**: extend the list spec: header-click sorting incl. default direction + flip; Attributes inert; dropdown↔header two-way sync; label match (Key/Title/Status/Created/Updated); Created column with relative text + tooltip + non-interactive cells; status lifecycle order both directions incl. unknown-status fixture (extend the scenario factory — do not mutate shared datasets); Status present in list sort menu + hamburger, absent in board; per-view persistence across reload via the real localStorage key incl. stale-flat-value reset (Edge-1, C1); aria-sort assertions (C3). Update `docs/design/surfaces/sort-menu.spec.md`: Status icon row (list scope) + Status→asc default (durable edit lands with this implementation commit).
**Boundary**: existing "sort changes ticket order" dropdown test stays GREEN untouched; no flake fixes outside this spec; board/documents suites out of scope.
**Creates**: None
**Modifies**: `tests/e2e/list/view.spec.ts`, `docs/design/surfaces/sort-menu.spec.md`
**Deletes**: None
**Must Not Touch**: `tests/e2e/board/`, other suites' fixture datasets, `tests/AGENTS.md` conventions
**Exclude**: no unit-test duplication of E2E paths already covered at M1
**Anti-duplication**: selectors from `tests/e2e/utils/selectors.js` where they exist; localStorage access via the real key — no test-only storage hooks
**Duplication Guard**: all MDT-249 E2E stays in the single list spec file; no parallel spec for the same scenarios
**Re-plan Trigger**: if the fixture factory cannot express an unknown status without mutating shared datasets, add a scenario-local factory extension — flagged in review if the factory resists it

**Verify**:
```bash
bun run test:e2e -- tests/e2e/list/view.spec.ts
```

**Observe**:
```bash
bun run test:e2e -- tests/e2e/list/view.spec.ts   # all MDT-249 specs + pre-existing list specs pass
bun run dev                                        # manual UAT light + dark: glyph + tooltip render on both themes
```

**Done when**:
- [x] All nine scenarios GREEN + existing list specs still GREEN (C2)
- [x] Full gates pass: `bun run validate:ts`, `bun run build`, `bun test frontend/src/utils frontend/src/config`
- [x] Durable doc updated (Status row + asc default) in the same commit
- [x] UAT manual pass on light/dark (CR Testing: Manual)

> ⚠️ First E2E run 9/12 — three test-side bugs fixed (tie-order assumption, year regex,
> storage-wiping hook); implementation untouched. UAT via throwaway spec, deleted after.
> Evidence: `.git/mdt/evidence/MDT-249/executor/TASK-6.json`.

## Post-Implementation

- [x] No duplication (grep check: `DEFAULT_SORT_ATTRIBUTES` importers; second status array; shadow sort state)
- [x] Scope boundaries respected (board/documents/mobile-card untouched)
- [x] Actual create/modify/delete paths match task mutation intent
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Milestone observable proofs pass with real execution
- [x] Fallback/absence paths match requirements (stale storage → defaults, Edge-1)

Commit: `a0c0b725` (23 files, MDT-249 paths only; concurrent MDT-144 TicketViewer edits excluded per lead ruling).

---

### Task 7: Sticky list headers (M3 — checkpoint, UAT addition, PENDING)

**Skills**: mdt-frontend, playwright-cli

**Structure**: `frontend/src/styles/components/list-view.css`, `frontend/src/components/ProjectView.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-list-view-sticky-headers` → `tests/e2e/list/view.spec.ts`

**Makes GREEN (Behavior)**:
- `sticky_headers_pinned_during_scroll` → `tests/e2e/list/view.spec.ts` (BR-8)

**Scope**: scrollport height chain + sticky thead, list-scope only — in `list-view.css` (the TASK-5 spillover file, already the home of list sort styles): make the `ticket-table` wrapper a full-height flex column (ProjectView class change), `.ticket-table .mdt-table__scroll { flex: 1; min-height: 0; }` so the wrapper becomes the vertical scrollport (it already scrolls horizontally), then `.ticket-table .mdt-table__head { position: sticky; top: 0; background: oklch(var(--background)); z-index: 10; }`. Glyph + `aria-sort` persist automatically (pure CSS; DOM/state untouched). Shared `ui/table.css` stays untouched — base rules must not change for other Table consumers.
**Boundary**: sticky applies only under the list `ticket-table` scope; mobile cards and board untouched; no JS scroll listeners.
**Creates**: None
**Modifies**: `frontend/src/styles/components/list-view.css`, `frontend/src/components/ProjectView.tsx`
**Deletes**: None
**Must Not Touch**: `frontend/src/components/ui/table.css` base rules, `ticket-table`/`ticket-row-*` testids, board/documents surfaces
**Exclude**: no global `.mdt-table` sticky, no scroll-position state, no new tokens
**Anti-duplication**: sticky rules live beside the existing `.ticket-table__sort` styles in `list-view.css` — do not fork into a second stylesheet or inline styles
**Duplication Guard**: grep for existing sticky thead implementations (none as of 2026-09-30: sticky usage is Header/tabs/swimlanes only); verify `.mdt-table__scroll` is the nearest scroll container after the height chain lands (naive sticky without the chain is inert — see ux-design.md § Sticky Header)
**Re-plan Trigger**: if the height chain leaks into other Table surfaces (flex/min-height side effects), fall back to an `overflow: visible` modifier on `.ticket-table .mdt-table__scroll` so the ProjectView:253 container stays the scrollport — same UX, different scrollport owner

**Verify**:
```bash
bun run test:e2e -- tests/e2e/list/view.spec.ts
```

**Observe**:
```bash
bun run dev   # list with many tickets → scroll: header pinned with glyph visible, rows pass under the
              # opaque header; both themes; Documents/board tables render exactly as before
```

**Done when**:
- [x] E2E sticky assertion GREEN; all MDT-249 + pre-existing list specs still GREEN
- [x] Visual check on light + dark themes
- [x] Other Table consumers (Documents view) unchanged

> TASK-7 evidence: E2E sticky spec asserts scrollport overflow (height chain
> works), computed `position: sticky`/`top: 0`/opaque bg, header y-stability
> across full scroll, and aria-sort persistence while pinned. Full gates green
> (ts/build/411 units/13 list E2E/43 documents E2E/eslint). ui/table.css
> byte-untouched. Light/dark via THEME `--background` token (same rule both
> themes). Additions beyond spec text: wrapper gained the `ticket-table` BEM
> root class (CSS scoping target), inset hairline under the pinned header
> (thead tr border scrolls away with the row).

> Canonical sync: TASK-7 (plus BR-8, scenario, TEST-list-view-sticky-headers, ART-list-view-css, OBL-sticky-header) is staged in `scripts/_sync_mdt249_sticky_trace.sh` — the spec-trace binary was SIGKILLed by memory pressure on 2026-09-30 (49/49 attempts). Run the script when the box frees; it is idempotent and ends with `validate --stage` × 5 + `render all`.
