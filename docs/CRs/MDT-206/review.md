# Review: MDT-206

## Code vs Specs

| Spec Area | Result |
|-----------|--------|
| Header view switcher | Implemented as an icon-only peer group in `ViewModeSwitcher`; `App.tsx` persists `flat` / `swimlanes` board layout mode. |
| Swimlane rows per epic + No epic | Implemented in `SwimlaneBoard` with one lane per explicit `level: epic`, including childless Proposed epics, plus fallback lane. |
| Epics not rendered as cards | Implemented for swimlane and flat board card rendering. |
| Progress math | Implemented in pure helper; terminal statuses are `Implemented`, `Rejected`, and `Partially Implemented`. |
| Status-only same-epic drag | Implemented through lane-column `canDrop` plus drop-handler guard. |
| Cross-epic drag rejected | Implemented; E2E verifies ticket stays in original lane. |
| Epic lifecycle controls | Implemented for Activate, Close, and Closed; blocked Close is disabled with child names in `title`. |
| Semantic CSS classes | Implemented in `view-mode-switcher.css` and `swimlane-board.css`; imported through `src/index.css`. |

## Verification

```bash
bun test --isolate src/components/SwimlaneBoard/helpers.test.ts
bun test --isolate src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run --cwd server jest tests/integration/api.metadata.test.ts --runInBand
bunx eslint src/App.tsx src/components/ProjectView.tsx src/components/Board.tsx src/components/ViewModeSwitcher/ViewModeSwitcher.tsx src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx src/components/ViewModeSwitcher/types.ts src/components/ViewModeSwitcher/index.tsx src/config/boardLayoutMode.ts src/components/ViewModeSwitcher/view-mode-switcher.css src/components/SwimlaneBoard/swimlane-board.css src/index.css --no-warn-ignored
bun run validate:ts
bun run build
spec-trace validate MDT-206 --stage all --format json
git diff --check
```

All commands passed.

Live DOM verification against `http://127.0.0.1:3075/prj/MDT` confirmed the view switcher has empty text content and four icon-only buttons with semantic names: Board, Swimlanes, List, Docs.

Earlier scoped lint passed for the backend and swimlane-owned files:

```bash
bunx eslint src/components/Board.tsx src/components/SwimlaneBoard/index.tsx src/components/SwimlaneBoard/helpers.ts src/components/SwimlaneBoard/helpers.test.ts src/utils/ticketLevels.ts tests/e2e/board/swimlane-board.spec.ts tests/e2e/utils/selectors.ts server/tests/integration/api.metadata.test.ts server/tests/api/setup.ts server/tests/mocks/shared/models/Ticket.ts server/tests/mocks/shared/services/ProjectService.ts server/routes/documents.ts --no-warn-ignored
```

Full `bun run lint:frontend` is still blocked by pre-existing unrelated errors in `src/utils/sorting.ts` and `src/utils/sorting.test.ts`.

## Residual Risk

- Durable `docs/design/surfaces/swimlane-board.spec.md` predates this slice and contains stale source-file names plus broader view-switcher language. It was intentionally not updated without durable-doc approval; `ux-design.md` records the ticket-local implementation contract.
- Manual visual browser review was not run beyond Playwright screenshots/video artifacts.
