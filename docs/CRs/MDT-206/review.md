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
| Swimlane card badges | Implemented as a swimlane-local Show badges toggle; badges are hidden by default without changing flat Board card defaults. |
| Epic ticket opening | Implemented as a bottom-right icon button on epic lanes; it opens the existing ticket viewer route. |
| Semantic CSS classes | Implemented in `view-mode-switcher.css` and `swimlane-board.css`; imported through `frontend/src/index.css`. |

## Verification

```bash
bun test --isolate frontend/src/components/TicketCard.test.tsx frontend/src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx frontend/src/components/SwimlaneBoard/helpers.test.ts
bun run validate:ts
bunx eslint frontend/src/components/TicketCard.tsx frontend/src/components/TicketCard.test.tsx frontend/src/components/SwimlaneBoard/index.tsx tests/e2e/board/swimlane-board.spec.ts tests/e2e/utils/selectors.ts frontend/src/components/ViewModeSwitcher/ViewModeSwitcher.tsx --no-warn-ignored
bun run build
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
spec-trace render all MDT-206
spec-trace validate MDT-206 --stage all --format json
git diff --check
```

All commands passed.

Live DOM verification against `http://127.0.0.1:3075/prj/MDT` confirmed the view switcher has empty text content and four icon-only buttons with semantic names: Board, Swimlanes, List, Docs.

Earlier scoped lint passed for the backend and swimlane-owned files:

```bash
bunx eslint frontend/src/components/Board.tsx frontend/src/components/SwimlaneBoard/index.tsx frontend/src/components/SwimlaneBoard/helpers.ts frontend/src/components/SwimlaneBoard/helpers.test.ts frontend/src/utils/ticketLevels.ts tests/e2e/board/swimlane-board.spec.ts tests/e2e/utils/selectors.ts server/tests/integration/api.metadata.test.ts server/tests/api/setup.ts server/tests/mocks/shared/models/Ticket.ts server/tests/mocks/shared/services/ProjectService.ts server/routes/documents.ts --no-warn-ignored
```

Earlier backend metadata regression coverage also passed:

```bash
bun run --cwd server jest tests/integration/api.metadata.test.ts --runInBand
```

Full `bun run lint:frontend` is still blocked by pre-existing unrelated errors in `frontend/src/utils/sorting.ts` and `frontend/src/utils/sorting.test.ts`.

## Residual Risk

- Manual visual browser review was not run beyond Playwright screenshots/video artifacts.
