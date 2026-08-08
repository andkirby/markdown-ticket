# Tests: MDT-206

## TDD Evidence

| Test | RED Before Implementation | GREEN After Implementation |
|------|---------------------------|----------------------------|
| `src/components/SwimlaneBoard/helpers.test.ts` | Failed: missing `./helpers` module; later failed for childless Proposed epic lane omission | `6 pass / 0 fail` |
| `src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx` | Failed against old Board/List toggle; missing icon-only peer buttons | `4 pass / 0 fail` |
| `src/components/TicketCard.test.tsx` | Failed: `showBadges={false}` still rendered `.badge` rows | `2 pass / 0 fail` |
| `tests/e2e/board/swimlane-board.spec.ts` | `3 failed`: missing `board-mode-epics-toggle`; later failed for childless Proposed epic lane omission and visible default swimlane badges | `6 passed` |
| `server/tests/integration/api.metadata.test.ts` | Failed: metadata list response omitted `level` for explicit epics | `14 passed` |

## Verification Commands

```bash
bun test --isolate src/components/SwimlaneBoard/helpers.test.ts
bun test --isolate src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx
bun test --isolate src/components/TicketCard.test.tsx
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run --cwd server jest tests/integration/api.metadata.test.ts --runInBand
```

## Coverage Notes

- Helper tests cover lane construction, No epic fallback, every explicit epic lane including childless Proposed epics, epic-card exclusion, terminal progress math, and lane-key resolution.
- ViewModeSwitcher tests cover the icon-only Board / Swimlanes / List / Docs peer group, accessible names, active state, and mode callbacks.
- TicketCard tests cover default badge visibility for existing callers and explicit badge suppression for compact swimlane cards.
- E2E tests cover mode switching, persistence, lane rendering, childless epic lanes, epic-card exclusion in flat/swimlane modes, same-epic drag, cross-epic rejection, progress, blocked close tooltips, collapse/expand controls, swimlane badge toggling, and epic ticket opening.
- API metadata tests cover `level` preservation so flat Board filtering and swimlane lane construction receive explicit epic metadata.
- Constraint coverage is canonical in `tests.trace.md`.
