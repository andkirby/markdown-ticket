---
code: MDT-206
status: Implemented
dateCreated: 2026-08-08T00:00:00.000Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-225
dependsOn: MDT-205
---

# Add epic swimlane board with progress and close guard

## 1. Description

### Requirements Scope

`requirements`

### Problem

- The board is grouped by status only. There is no way to see every epic's tickets laid out across status columns at once — i.e. to compare epic progress and scan a single status down through all epics.
- Once MDT-205 lands, epics will be first-class tickets with `level: epic` but have no visual surface on the board.
- The flat board cannot answer "which epics are stuck, which are moving" without manual filtering.

### Affected Areas

- Frontend: board view, board mode state and persistence, header controls
- Frontend: new swimlane board surface, epic progress computation
- Frontend: existing epic badge rendering (reconcile inferred vs explicit level)

### Scope

**In scope:**

- A board mode toggle ("Epics") shown when on the board view, switching between flat and swimlane layouts
- A swimlane layout: one lane per epic plus a trailing "No epic" lane, columns shared across lanes
- Per-lane epic progress (mini bar) computed live from child ticket statuses
- An epic lifecycle control on each lane header (Activate / Close / Closed) — epics do NOT appear as cards and are NOT dragged across columns
- Status-only drag-and-drop within a ticket's own epic lane; cross-epic drag is blocked
- Surfacing the epic close-guard error (from MDT-205) when Close is attempted with open children

**Out of scope:**

- Swimlanes as a peer entry in the main view switcher (this pass uses a board-mode toggle only)
- Zoom-to-one-epic filter (design3 §3)
- Epic detail modal (design3 §4)
- Epic side-rail (design3 §5)
- Rendering epics as cards on the flat board (design3 §2 — diverged)

### Constraints

- Swimlanes is triggered (for now) by an "Epics" toggle button when on Board view — not a full view-switcher refactor.
- Epics are never rendered as cards in any board mode. In swimlane mode the epic is the lane.
- Drag-and-drop is status-only within a ticket's own epic lane; cross-epic reassignment via drag is blocked (a silent spatial drag would disguise misassignment).
- Depends on MDT-205 (the `level` field and phaseEpic validation).

## 2. Desired Outcome

### Success Conditions

- When on the board view, a user can toggle an "Epics" control to switch the board into swimlane mode and back.
- In swimlane mode, a user sees every epic as a row (lane), with its tickets distributed across the shared status columns — so they can scan one status down through all epics.
- Each lane shows live epic progress, so a user can tell at a glance which epics are moving and which are stuck.
- A user can advance an epic's lifecycle (Proposed → Approved → Implemented) directly from its lane header, without opening the ticket and without dragging across columns — because epic status is a publish/close gate, not a spatial workflow.
- Dragging a ticket updates its status only; the epic axis is never changed by a drag.
- Board mode persists across navigation and reload.

### Non-Goals

- Not building the epic detail modal, side-rail, or zoom-filter (deferred).
- Not supporting cross-epic ticket reassignment via drag (that is a separate, intent-capturing action).
- Not changing the flat board's behavior when swimlanes is off.

## 3. Open Questions

| Area | Question | Constraints |
|---|---|---|
| Epic colors | Fixed rotation from tokens, or user-set per epic? | Fixed rotation for this pass; per-epic color deferred. |
| Mobile | How should swimlanes behave on narrow screens? | Design3 mock drops sticky-left and uses full-width headers below desktop. |
| Empty lanes | Hide by default, or show with an empty state? | Design3 offers a "Hide empty" toggle. |

### Decisions Deferred

- Implementation approach (determined by `mdt:architecture`)
- Specific artifacts and file placement (determined by `mdt:architecture`)
- Task breakdown (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional

- [x] When on the board view, an "Epics" toggle is visible; activating it switches to swimlane mode, deactivating returns to flat.
- [x] Board mode choice persists across navigation (board → list → board) and across page reload.
- [x] Swimlane mode renders one lane per epic (`level: epic`) plus a trailing "No epic" lane collecting tickets with no `phaseEpic`.
- [x] Each lane shows the epic's title, code (via TicketCode), a mini progress bar, and a ticket count. *(UAT round 1: the color dot was removed; the epic key is the color/glyph cue.)*
- [x] Each lane header shows the epic's lifecycle state and the available transition:
  - `Proposed` → an **Activate** action moves it to `Approved`.
  - `Approved` → a **Close** action moves it to `Implemented` (disabled with a tooltip naming the blocking children when the close guard fails).
  - `Implemented` → shows a **Closed** indicator (no primary action; reopening happens via the ticket viewer).
- [x] Epics are never rendered as cards and are never dragged across columns in any board mode.
- [x] Columns (status) share the same widths and order across all lanes, so a single status aligns vertically down through every epic.
- [x] Dragging a ticket to a lane-column in the same epic updates the ticket's status.
- [x] Dragging a ticket toward a lane-column of a different epic does not accept the drop (no highlight, no status change, no epic change).
- [x] The flat board's drag-and-drop behavior is unchanged when swimlanes is off.
- [x] Attempting to close an epic (via the lane Close action) with open children surfaces a clear error naming the blocking children (via MDT-205's guard).
- [x] A "Hide empty" control omits lanes with zero tickets after filters.
- [x] "Collapse all" / "Expand all" controls work, and individual lanes can be collapsed/expanded.
- [x] Filters, search, density, and theme all apply in swimlane mode exactly as in flat mode.

### Non-Functional

- [x] Swimlane mode uses an outer synchronized-scroll surface (both axes) **plus** independent per-column scroll within a per-lane max-height. *(UAT round 1: diverged from the original "not per-column scroll" so a long list in one status does not stretch the lane — see C1.)*
- [x] Epic progress = `(terminal children) / (total children) * 100`, computed live; terminal statuses are `Implemented`, `Rejected`, `Partially Implemented`.
- [x] Existing inferred-epic badge rendering continues to work for legacy data; explicit `level: epic` is the primary signal once present.

### Edge Cases

- A project with no epics shows only the "No epic" lane in swimlane mode.
- A ticket whose `phaseEpic` points at a non-existent ticket appears in the "No epic" lane (does not break the view).
- Collapsing a lane and then filtering should keep the lane collapsed.
- An epic with zero children shows 0% progress and an empty lane body.
- A `Proposed` epic with zero children is effectively invisible in swimlane mode (it has no lane) — its lifecycle can still be advanced via the ticket viewer or CLI.
- The Close action is disabled (not hidden) when blocked, with a tooltip listing the non-terminal children so the user knows what to resolve.
- Reopening an Implemented epic back to Approved is done via the ticket viewer (no lane-header reopen action this pass).

## 5. Verification

### How to Verify Success

- Manual: toggle swimlanes on, confirm lanes/columns/progress render; drag within an epic; attempt a cross-epic drag and confirm it is blocked.
- Automated: end-to-end tests covering toggle, lane rendering, within-epic drag, cross-epic block, progress bar, collapse/expand.
- Regression: flat board behavior unchanged when swimlanes is off; full type validation and build pass.

## 6. References

- `designs/board-zai/design3-epics.md` §8 (swimlanes), §6 (progress) — primary UX spec
- `designs/board-zai/design3.html` — swimlane mock (HTML structure, CSS classes, drag/drop guards)
- Depends on: MDT-205 (epic level field + validation)
- Requirements trace projection: [requirements.trace.md](./MDT-206/requirements.trace.md)
- Requirements notes: [requirements.md](./MDT-206/requirements.md)
- BDD trace projection: [bdd.trace.md](./MDT-206/bdd.trace.md)
- BDD notes: [bdd.md](./MDT-206/bdd.md)
- Architecture trace projection: [architecture.trace.md](./MDT-206/architecture.trace.md)
- Architecture notes: [architecture.md](./MDT-206/architecture.md)
- Tests trace projection: [tests.trace.md](./MDT-206/tests.trace.md)
- Tests notes: [tests.md](./MDT-206/tests.md)
- Tasks trace projection: [tasks.trace.md](./MDT-206/tasks.trace.md)
- Tasks notes: [tasks.md](./MDT-206/tasks.md)

## 8. Clarifications

### UAT Session 2026-08-08 (round 1)

Approved lane-label refinement round (9 changes). Execution brief: [uat.md](./MDT-206/uat.md).

**Approved changes:**
- Lifecycle action (`[Activate]`/`[Close]`/`✓ Closed`) moved directly under the progress bar (no longer pinned to the lane bottom).
- Epic lane key rendered through the shared `<TicketCode>` component (priority glyph + key) — same typography/color as the ticket-card key; clickable, opens the epic ticket viewer.
- Removed the color dot preceding the lane title.
- Lane label and lane body capped at `60vh` so long lists do not stretch the lane.
- Each lane column scrolls independently (`overflow-y: auto`); the outer board still provides synchronized two-axis scroll.
- Collapse chevron moved to the status-and-count row, aligned right.
- Lane title word-wraps instead of single-line ellipsis.
- Design specs (`swimlane-board.spec.md`, `swimlane-board.mockups.md`) aligned to the new structure and scroll model.

**Changed requirement IDs:** `C1` (refined in place — synchronized outer scroll **plus** independent per-column scroll within a lane max-height), `C5` (new — lane-label layout), `BR-2.5` (new — clickable epic key via TicketCode), `epic_lane_key_opens_ticket` (new BDD scenario).

**Updated workflow documents:** `requirements.md`, `tests.md`, `uat.md`, design surface `swimlane-board.spec.md` + `swimlane-board.mockups.md`; all `*.trace.md` projections re-rendered.

**Strict drift/lock:** not used (standard validate + render per stage).

**More implementation required:** no — all 9 changes implemented, tested (6 component + 7 E2E + 862 frontend green), and trace-validated.

### UAT Session 2026-08-08 (round 2 — collapse approach)

Extended the epic-lane collapse to match `designs/board-zai/design3.html` §8. Execution brief: [uat.md](./MDT-206/uat.md).

**Approved changes:**
- The whole lane label is now the collapse toggle (`div[role=button][tabindex=0][aria-expanded]`, Enter/Space + click), not a dedicated chevron button. (design3 used a clickable div; we add role/tabindex/keyboard for a11y.)
- A collapsed lane **reflows** from the vertical 220px sticky column to a horizontal full-width summary bar (title + key + status + count + progress + actions on one row); the lane body is hidden.
- Interactive children (epic key, lifecycle action, open-epic icon) `stopPropagation` so they do not toggle collapse.
- The collapse chevron is now an `aria-hidden` glyph (visual affordance only).

**Changed requirement IDs:** `BR-5.1` (refined in place — whole-label toggle, not a chevron button), `C6` (new — collapsed horizontal reflow), `lane_collapses_via_whole_label` (new BDD scenario).

**Updated workflow documents:** `requirements.md`, `tests.md`, `uat.md`, design surface `swimlane-board.spec.md` + `swimlane-board.mockups.md` (new §7 collapsed mockup); all `*.trace.md` projections re-rendered.

**Strict drift/lock:** not used (standard validate + render per stage).

**More implementation required:** no — collapse extension implemented, tested (10 component + 8 E2E + 866 frontend green), and trace-validated.

### UAT Session 2026-08-10 (round 3 — `/epics` route + Default View fix + switcher standardization)

Gave swimlanes a deep-linkable URL, fixed the orphaned Default View setting, and tokenized the switcher sizing. Execution brief: [uat.md](./MDT-206/uat.md).

**Approved changes:**
- Swimlanes now has a deep-linkable `/prj/:code/epics` route (mirrors `/list`); the board layout is derived from the URL at render time (`effectiveBoardLayoutMode`), avoiding the effect-vs-toggle race.
- The ViewModeSwitcher swimlanes button is labeled **"Epics"** (matches the route + domain noun).
- The previously orphaned `getDefaultView()` preference now drives the bare-project-path landing redirect; Settings → Default View offers **Board, Epics, List**. The switcher keeps it in sync (last-used view = landing view).
- New `--sz-control: 32px` token for square icon-button hit targets; ViewModeSwitcher buttons now use `var(--sz-control)` (was hardcoded 30×28px).
- ViewModeSwitcher glyphs now use `var(--sz-icon)` = 16px (was hardcoded 14px).
- Styleguide documents `--sz-control` in the density-slots section.
- Settings → Default View `<option value="epics">` added; the 33 pre-existing Tailwind utility classes in `SettingsModal.tsx` were migrated to semantic classes in `settings.css` (`.settings-icon`, `.settings-modal-body`, `.settings-theme-group`, `.settings-tooltip`, `.settings-tooltip-note`, `.settings-input--mono`, `.settings-action-row`, `.settings-action-btn:disabled`, `.settings-select--spaced` etc.) to clear the `enforce-semantic-classes` contract.

**Changed requirement IDs:** `BR-1.1` (refined — Epics navigates to `/epics`), `BR-1.3` (new — Default View drives landing), `C7` (new — tokenized control size), `epics_route_is_deep_linkable` + `default_view_drives_landing` (new BDD scenarios).

**Updated workflow documents:** `requirements.md`, `tests.md`, `uat.md`, `src/styleguide.html`; all `*.trace.md` projections re-rendered.

**Strict drift/lock:** not used (standard validate + render per stage).

**Known follow-up (out of scope):** `tests/e2e/navigation/view-mode-switcher.spec.ts` is stale — it references the old single-toggle `board-list-toggle` that no longer exists. Pre-existing breakage, flagged for a separate cleanup.

**More implementation required:** no — implemented, tested (868 frontend + 9 swimlane E2E green), and trace-validated.

### UAT Session 2026-08-10 (round 4 — collapse persistence, default-collapsed, Show closed, key-before-title)

Four collapse/visibility refinements. Execution brief: [uat.md](./MDT-206/uat.md).

**Approved changes:**
- Collapse/expand state now persists to `localStorage` (`mdt-settings-swimlane-expanded-lanes`) across reloads. The set tracks **expanded** lanes (inverted from the prior collapsed-set).
- All lanes are **collapsed by default** on first load (empty expanded set).
- New **"Show closed"** toolbar toggle (off by default): when off, epic lanes whose epic is `Implemented` are hidden so the board focuses on active work. The `__none` lane is never hidden by this filter.
- In the collapsed layout, the epic key block now sits **before the title** on a single line (was title-then-key inside the title column).

**Changed requirement IDs:** `BR-5.1` (refined — persistence + default-collapsed), `BR-5.2` (new — Show closed toggle), `collapse_state_persists` + `show_closed_hides_implemented_lanes` (new BDD scenarios).

**Updated workflow documents:** `requirements.md`, `tests.md`, `uat.md`, design surface `swimlane-board.spec.md`; all `*.trace.md` projections re-rendered.

**Strict drift/lock:** not used.

**More implementation required:** no — implemented, tested (877 frontend + 9 swimlane E2E green), and trace-validated.
