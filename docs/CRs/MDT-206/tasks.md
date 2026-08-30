# Tasks: MDT-206

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md`.

## Scope Boundaries

- Board layout mode: `frontend/src/App.tsx` owns persistence and switching; `Board.tsx` receives the selected layout.
- Swimlane runtime: `frontend/src/components/SwimlaneBoard/` owns lane model, lane UI, guarded drops, lifecycle controls, and semantic CSS.
- Testing: `frontend/src/components/SwimlaneBoard/helpers.test.ts`, `frontend/src/components/TicketCard.test.tsx`, and `tests/e2e/board/swimlane-board.spec.ts` own MDT-206 regression coverage.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------:|---------:|----:|--------|
| runtime | 5 | 5 | 0 | pass |
| test | 3 | 3 | 0 | pass |
| doc | 1 | 1 | 0 | pass |

## Tasks

### Task 1: Build swimlane lane model helpers

**Skills**: frontend-react-component

**Makes GREEN (Automated Tests)**:
- `TEST-swimlane-helpers` -> `frontend/src/components/SwimlaneBoard/helpers.test.ts`

**Scope**: pure helpers for epic detection, lane grouping, No epic fallback, and progress math.
**Boundary**: no React rendering, no backend writes.

**Creates**:
- `frontend/src/components/SwimlaneBoard/helpers.ts`
- `frontend/src/components/SwimlaneBoard/helpers.test.ts`

**Modifies**:
- none

**Must Not Touch**:
- `shared/services/TicketService.ts`
- `server/services/TicketService.ts`

**Duplication Guard**:
- Use domain enum constants from `@mdt/domain-contracts`; do not copy status strings outside the helper's terminal status set.

**Verify**:
```bash
bun test --isolate frontend/src/components/SwimlaneBoard/helpers.test.ts
```

**Status**: done.

### Task 2: Integrate board layout mode and SwimlaneBoard runtime

**Skills**: frontend-react-component, mdt-ux-designer

**Makes GREEN (Automated Tests and Behavior)**:
- `TEST-swimlane-board-e2e`
- `board_mode_switches_to_swimlanes`
- `board_mode_persists_after_reload`
- `swimlanes_show_epic_rows_and_no_epic`
- `lane_headers_show_progress_and_lifecycle`
- `same_epic_drag_updates_status_only`
- `cross_epic_drag_is_rejected`
- `blocked_epic_close_surfaces_children`
- `lane_visibility_controls_do_not_mutate_tickets`
- `swimlane_badges_toggle_and_epic_open`
- `TEST-ticket-card-badge-visibility`

**Scope**: board layout persistence, header switcher integration, swimlane component rendering, lane controls, guarded drops, lifecycle actions, compact card-badge presentation, epic open action, and semantic CSS.
**Boundary**: no backend rule changes and no main view-mode route refactor.

**Creates**:
- `frontend/src/components/SwimlaneBoard/index.tsx`
- `frontend/src/components/SwimlaneBoard/swimlane-board.css`

**Modifies**:
- `frontend/src/components/Board.tsx`
- `frontend/src/components/TicketCard.tsx`
- `frontend/src/components/ViewModeSwitcher/`
- `frontend/src/index.css`

**Must Not Touch**:
- `frontend/src/components/Column/index.tsx`

**Duplication Guard**:
- Reuse `TicketCard`, `useDropZone`, `sortTickets`, status config, and design tokens; do not copy the Alpine implementation from `design3.html`.

**Verify**:
```bash
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
```

**Status**: done.

### Task 3: Wire stable E2E selectors and acceptance coverage

**Skills**: playwright-cli

**Makes GREEN (Automated Tests)**:
- `TEST-swimlane-board-e2e` -> `tests/e2e/board/swimlane-board.spec.ts`
- `TEST-ticket-card-badge-visibility` -> `frontend/src/components/TicketCard.test.tsx`

**Scope**: selector registry and E2E test file.
**Boundary**: tests must use selector registry, not guessed runtime class names.

**Creates**:
- `tests/e2e/board/swimlane-board.spec.ts`
- `frontend/src/components/TicketCard.test.tsx`

**Modifies**:
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- unrelated E2E suites

**Duplication Guard**:
- Add one `swimlaneSelectors` registry and import it from tests.

**Verify**:
```bash
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun test --isolate frontend/src/components/TicketCard.test.tsx
```

**Status**: done.

### Task 4: Maintain ticket-local workflow artifacts

**Skills**: mdt-pipeline-e2e, mdt:spec-trace-cli

**Makes GREEN (Automated Tests)**:
- `TEST-swimlane-helpers`
- `TEST-swimlane-board-e2e`

**Scope**: ticket-local pipeline, architecture, UX, tests, and task artifacts.
**Boundary**: do not update durable design docs without approval.

**Creates**:
- `docs/CRs/MDT-206/*.md`
- `docs/CRs/MDT-206/.pipeline-state.json`

**Modifies**:
- none

**Must Not Touch**:
- `docs/design/surfaces/swimlane-board.spec.md`
- `docs/design/surfaces/swimlane-board.mockups.md`

**Duplication Guard**:
- Treat Spec Trace generated `*.trace.md` files as projections and human `*.md` artifacts as concise workflow notes.

**Verify**:
```bash
spec-trace validate MDT-206 --stage all --format json
```

**Status**: done.

## Post-Implementation

- [x] No duplicated runtime owner introduced.
- [x] Unit helper tests GREEN.
- [x] Ticket card badge visibility tests GREEN.
- [x] Swimlane E2E GREEN.
- [x] Spec Trace requirements, BDD, architecture, tests, and tasks validate.
