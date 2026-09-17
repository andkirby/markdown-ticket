# Tasks: MDT-246

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace
cross-checking. Architecture: `architecture.md` (this dir). Binding journey
contract: `docs/design/surfaces/epic-navigation.interactions.md`.

## Scope Boundaries

- Route layer: `routes.ts` owns the deep-link builder; `ProjectRouteHandler`
  owns parsing. Board components never read the URL.
- SwimlaneBoard: owns the focus lifecycle; pure decisions live in `helpers.ts`.
- Badge: owns the split chip rendering; `linkProcessor.classifyLink` stays the
  linkability authority (untouched).
- SmartLink: owns the `?view=` carry application (pure rule in
  `viewModeDerivation.ts`).

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|-------------------------------|
| `?epic=` deep-link construction | `frontend/src/routes.ts` (`buildEpicsFocusPath`) | N/A (single new builder) |
| `?epic=` parsing + threading | `ProjectRouteHandler` → `ProjectView` → `Board` | N/A |
| Focus lifecycle + visibility override | `SwimlaneBoard/index.tsx` + `helpers.ts` | N/A |
| Split chip zones | `Badge/ContextBadge.tsx` + `badge.css` | N/A |
| `?view=` carry | `viewModeDerivation.ts` (rule) + `SmartLink` (application) | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C-1 (24px floor, Label-in-Name) | Task 2, Task 3 |
| C-2 (token never rewritten) | Task 1 |
| C-3 (cards stay compact) | Task 3 |
| Edge-1 (storage failure) | Task 1 |

## Milestones

| Milestone | BDD Scenarios (BR) | Tasks | Checkpoint | Observable Proof |
|-----------|--------------------|-------|------------|------------------|
| M1: Focused arrival | focused_arrival_expand_scroll_highlight, focused_lane_visibility_override, unknown_epic_token_ignored (BR-1.4/1.5/1.6) | Task 1 | scenarios + unit GREEN | `bun test --isolate frontend/src/components/SwimlaneBoard/` |
| M2: Epic CTA jump | epic_detail_header_cta (BR-1.1) | Task 2 | scenario + E2E GREEN | `bun run test:e2e -- tests/e2e/board/epic-board-jump.spec.ts` |
| M3: Split-chip jump | split_chip_jump_to_epics_board (BR-1.2/1.3) | Task 3 | scenario + E2E GREEN | `bun test --isolate frontend/src/components/Badge/` + E2E |
| M4: View carry | view_context_carried_from_ticket_modal (BR-1.7) | Task 4 | scenario + unit GREEN | `bun test --isolate frontend/src/components/SmartLink/ frontend/src/components/routes/viewModeDerivation.test.ts` |

No Task 0: runtime, runners, and all command families already start (verified
by the RED pre-check run — tests execute and fail on assertions, not
infrastructure).

## Tasks

### Task 1: URL epic token, prop threading, and SwimlaneBoard focus lifecycle (M1 — checkpoint)

**Skills**: mdt-frontend

**Canonical Task**: TASK-1
**Structure**: `frontend/src/routes.ts`, `frontend/src/components/routes/ProjectRouteHandler.tsx`, `frontend/src/components/ProjectView.tsx`, `frontend/src/components/Board.tsx`, `frontend/src/components/SwimlaneBoard/index.tsx`, `frontend/src/components/SwimlaneBoard/helpers.ts`, `frontend/src/components/SwimlaneBoard/swimlane-board.css`

**Makes GREEN (Automated Tests)**:
- `TEST-focus-visibility-override` → `frontend/src/components/SwimlaneBoard/helpers.test.ts`
- `TEST-focus-lifecycle` → `frontend/src/components/SwimlaneBoard/SwimlaneBoard.test.tsx`

**Makes GREEN (Behavior)**:
- `focused_arrival_expand_scroll_highlight`, `focused_lane_visibility_override`, `unknown_epic_token_ignored` → `tests/e2e/board/epic-board-jump.spec.ts` (with Task 2/3 integration)

**Scope**: `buildEpicsFocusPath` builder; `?epic=` parsing on `/epics` only; `focusEpicKey` prop threading through ProjectView/Board; the full focus lifecycle (expand+persist, override, search clear, scroll, ~2s highlight, live region) per `epic-navigation.interactions.md`.
**Boundary**: No URL reads inside board components; no changes to lane construction (`buildSwimlaneModel`), drag-drop, or the flat Board layout.

**Creates**: `buildEpicsFocusPath` in routes.ts; focused-lane CSS + live region in swimlane-board.css.
**Modifies**: routes.ts, ProjectRouteHandler.tsx, ProjectView.tsx, Board.tsx, SwimlaneBoard/index.tsx, SwimlaneBoard/helpers.ts, swimlane-board.css.
**Deletes**: None.

**Must Not Touch**: `useViewModeRouting` redirect behavior, `viewModeDerivation.deriveViewMode`, TicketViewer, Badge components, SmartLink.

**Exclude**: no path-segment route (`/epics/MDT-###`), no hash token, no auto-collapsing of the focused lane, no rewriting `?epic=` onto other routes.

**Anti-duplication**: Import `buildEpicsFocusPath` from `routes.ts` — do NOT concatenate `?epic=` strings at call sites (Task 2/3 consume the same builder).

**Duplication Guard**: check `routes.ts` for an existing epics path builder before adding (none exists — verified); visibility override extends `filterLanesByVisibility` (single owner) instead of post-filtering in the component.

**Re-plan Trigger**: `useViewModeRouting` or any redirect strips `/epics` query params (none found — root-path redirect only fires on bare `/prj/:code`).

**Verify**:
```bash
bun test --isolate frontend/src/components/SwimlaneBoard/
bun test --isolate frontend/src/components/SwimlaneBoard/helpers.test.ts
```

**Done when**:
- [x] RED→GREEN on both TEST-* suites (RED: 6 helpers + 10 board failures recorded pre-implementation; GREEN: 62/62)
- [x] Unknown key leaves board + localStorage untouched (unit: ignores an unknown epic key)
- [x] Focus ends on user interaction without re-collapsing (unit: keeps the lane expanded when focus ends)
- [x] No duplicated filter logic (focusedKey extends filterLanesByVisibility, single owner)

### Task 2: Epics CTA on the epic detail header (M2 — checkpoint)

**Skills**: mdt-frontend

**Canonical Task**: TASK-2
**Structure**: `frontend/src/components/TicketViewer/EpicBoardAction.tsx` (new), `frontend/src/components/TicketViewer/index.tsx`, `frontend/src/components/TicketViewer/ticket-viewer.css`

**Makes GREEN (Automated Tests)**:
- `TEST-epic-cta` → `frontend/src/components/TicketViewer/EpicBoardAction.test.tsx`

**Makes GREEN (Behavior)**:
- `epic_detail_header_cta` → `tests/e2e/board/epic-board-jump.spec.ts` (integration: Task 1 lanes + this CTA)

**Scope**: the `Epics →` button (Rows3 leading, arrow-right trailing, full-sentence aria/title), rendered in the action slot when `ticket.level === 'epic'`; one `navigate()` to the deep link; shared 32px chrome class (rename `.trace-graph-action` → surface-neutral name; both buttons consume it).
**Boundary**: TicketViewer gains import + composition only — no behavior changes to modal open/close, tabs, or content loading.

**Creates**: `EpicBoardAction.tsx`, `EpicBoardAction.test.tsx`.
**Modifies**: TicketViewer/index.tsx (import + render + level gate), ticket-viewer.css (class rename + both usages).
**Deletes**: None.

**Must Not Touch**: TraceGraphShell logic, CompactTicketHeader structure (its `action` slot contract is unchanged), MDT-221 subdocument/preview code in the same files (parallel session's work is dirty in this tree — stage only MDT-246 hunks).

**Exclude**: no Zap glyph on the CTA (identity/action separation), no `onClose()` before navigate (single navigation closes the modal).

**Anti-duplication**: import `buildEpicsFocusPath` + `isEpicTicket` (`utils/ticketLevels`) — do NOT re-implement the level check or path building.

**Duplication Guard**: no second 32px chrome class in ticket-viewer.css — the Trace Graph rule is renamed and shared.

**Re-plan Trigger**: the action slot cannot host two controls without layout regression in `.compact-ticket-header__badges`.

**Verify**:
```bash
bun test --isolate frontend/src/components/TicketViewer/EpicBoardAction.test.tsx
bun run test:e2e -- tests/e2e/board/epic-board-jump.spec.ts
```

**Observe** (M2 checkpoint):
```bash
bun run test:e2e -- tests/e2e/board/epic-board-jump.spec.ts   # "Epics → CTA" journey green
```

**Done when**:
- [x] RED→GREEN on TEST-epic-cta (module did not exist → RED; 3/3 GREEN)
- [x] E2E CTA journey passes (modal closed by navigation, lane focused, highlight auto-clears)
- [x] CTA absent on non-epic tickets (E2E implicitly; unit covers render contract)

### Task 3: Split chip on the epic ContextBadge (M3 — checkpoint)

**Skills**: mdt-frontend

**Canonical Task**: TASK-3
**Structure**: `frontend/src/components/Badge/ContextBadge.tsx`, `frontend/src/components/Badge/badge.css`, `frontend/src/components/TicketViewer/CompactTicketHeader.tsx`, `frontend/src/components/TicketAttributes.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-split-chip` → `frontend/src/components/Badge/ContextBadge.test.tsx`

**Makes GREEN (Behavior)**:
- `split_chip_jump_to_epics_board` → `tests/e2e/board/epic-board-jump.spec.ts`

**Scope**: `detail` prop on ContextBadge; zone structure (`.badge__id` + `button.badge-action` siblings); styles in badge.css (`.badge--split`, seam, rest veil, hover ladder); `detail` passed by CompactTicketHeader + TicketAttributes only.
**Boundary**: classifyLink, SmartLink rendering, and the key link's MDT-193 behavior unchanged; `TicketAttributeTags` (cards) gets nothing.

**Creates**: split-chip CSS block.
**Modifies**: ContextBadge.tsx (+ `detail` prop, navigation via `buildEpicsFocusPath`), badge.css, CompactTicketHeader.tsx, TicketAttributes.tsx.
**Deletes**: None.

**Must Not Touch**: `linkProcessor.ts`, `TicketAttributeTags.tsx`, relationship badges, badge color tokens.

**Exclude**: no button-inside-link nesting; no Zap click handler (INV-1); no cross-project deep link (pre-existing limitation).

**Anti-duplication**: import `buildEpicsFocusPath`; reuse `parsedLink.ticketKey` — do NOT re-parse the value.

**Duplication Guard**: the styleguide's `.epic-demo` rules are demo-local; production CSS lands once in `badge.css` (styleguide keeps its compiled copies — it is a standalone artifact).

**Re-plan Trigger**: badge structure cannot host the 24px zone without breaking the badges row layout on narrow viewports.

**Verify**:
```bash
bun test --isolate frontend/src/components/Badge/
bun run test:e2e -- tests/e2e/board/epic-board-jump.spec.ts
```

**Done when**:
- [x] RED→GREEN on TEST-split-chip (RED: 5 failures recorded pre-implementation; GREEN)
- [x] Cards stay compact (C-3 test green)
- [x] Zones are siblings; Zap passive

### Task 4: `?view=` carry for ticket links inside ticket modals (M4 — checkpoint)

**Skills**: mdt-frontend

**Canonical Task**: TASK-4
**Structure**: `frontend/src/components/routes/viewModeDerivation.ts`, `frontend/src/components/SmartLink/index.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-carry-view-param` → `frontend/src/components/routes/viewModeDerivation.test.ts`
- `TEST-view-carry-integration` → `frontend/src/components/SmartLink/index.test.tsx`

**Makes GREEN (Behavior)**:
- `view_context_carried_from_ticket_modal` → `tests/e2e/board/epic-board-jump.spec.ts` (badge identity-link leg)

**Scope**: pure `carryViewParam(href, pathname, search)` in viewModeDerivation.ts; SmartLink applies it to TICKET and CROSS_PROJECT hrefs.
**Boundary**: document/external/anchor links untouched; hrefs with an existing query untouched; no carry outside ticket routes.

**Creates**: `carryViewParam`.
**Modifies**: viewModeDerivation.ts, SmartLink/index.tsx.
**Deletes**: None.

**Must Not Touch**: `useTicketModalRoute.handleTicketClose` (already maps the token), `deriveViewMode`, `ticketCloseTargetPath`.

**Exclude**: no carry for non-ticket link types; no URL rewrites on navigation events.

**Anti-duplication**: the rule lives in `viewModeDerivation.ts` beside its inverse (`ticketCloseTargetPath`) — do NOT inline string surgery in SmartLink.

**Duplication Guard**: single application point (SmartLink's TICKET/CROSS_PROJECT branches); ContextBadge/RelationshipBadge inherit it through SmartLink — no per-badge copies.

**Re-plan Trigger**: any other component already appends `?view=` on ticket links (none found — `handleTicketClick` is the route-level entry, unrelated to in-modal links).

**Verify**:
```bash
bun test --isolate frontend/src/components/routes/viewModeDerivation.test.ts frontend/src/components/SmartLink/index.test.tsx
```

**Done when**:
- [x] RED→GREEN on both suites (RED recorded pre-implementation; GREEN)
- [x] E2E view-carry leg passes (close returns to /epics)

## Post-Implementation

- [x] No duplication (grep `?epic=` construction sites — buildEpicsFocusPath only)
- [x] Scope boundaries respected
- [x] All unit suites GREEN (full fe:test 1126/1126)
- [x] All E2E journeys GREEN (4/4 journeys + 81/81 board+navigation regression)
- [x] Fallback paths (unknown key, storage failure) verified (unit-tested)
