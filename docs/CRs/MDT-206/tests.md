# Tests: MDT-206

## TDD Evidence

| Test | RED Before Implementation | GREEN After Implementation |
|------|---------------------------|----------------------------|
| `frontend/src/components/SwimlaneBoard/helpers.test.ts` | Failed: missing `./helpers` module; later failed for childless Proposed epic lane omission; later failed for missing `filterLanesByVisibility` export; round 7 failed for missing `matchesTicketSearch` / `filterLanesBySearch` exports; round 8 failed for lane-removal semantics; round 9 failed for epic-only lane-removal semantics (2 RED) | `24 pass / 0 fail` |
| `frontend/src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx` | Failed against old Board/List toggle; missing icon-only peer buttons; later failed for "Swimlanes" label (renamed to "Epics") | `4 pass / 0 fail` |
| `frontend/src/components/TicketCard.test.tsx` | Failed: `showBadges={false}` still rendered `.badge` rows | `2 pass / 0 fail` |
| `frontend/src/components/SwimlaneBoard/SwimlaneBoard.test.tsx` | Failed: epic key was a bare `<span>` (no TicketCode glyph); epic-dot present; chevron on title row; lifecycle pinned to bottom; later failed for non-toggleable label, missing role=button, default-expanded assumption, missing persistence, and key-after-title; round 7 failed for missing toolbar search field; round 8 failed for lane-removal semantics; round 9 failed for epic-only semantics + aria-label (3 RED). The round-9 toggle-pattern test (aria-pressed group, action buttons) landed together with the conversion — characterization, no separate RED run | `41 pass / 0 fail` |
| `frontend/src/__tests__/routes.test.ts` | Failed: missing `ROUTE_PROJECT_EPICS` export + `buildProjectPath('epics')` | `24 pass / 0 fail` |
| `frontend/src/components/SettingsModal.test.tsx` | Failed: Default View select had no "epics" option | `7 pass / 0 fail` |
| `tests/e2e/board/swimlane-board.spec.ts` | `3 failed`: missing `board-mode-epics-toggle`; later failed for childless Proposed epic lane omission and visible default swimlane badges; later failed for `/epics` deep-link + flat-toggle race; round 6 added the column-collapse case; round 7 added the toolbar-search case; round 9 rewrote it to epic-only matching | `11 passed` |
| `server/tests/integration/api.metadata.test.ts` | Failed: metadata list response omitted `level` for explicit epics | `14 passed` |

## Verification Commands

```bash
bun test --isolate frontend/src/components/SwimlaneBoard/helpers.test.ts
bun test --isolate frontend/src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
bun test --isolate frontend/src/components/ViewModeSwitcher/ViewModeSwitcher.test.tsx
bun test --isolate frontend/src/components/TicketCard.test.tsx
bun test --isolate frontend/src/__tests__/routes.test.ts
bun test --isolate frontend/src/components/SettingsModal.test.tsx
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run --cwd server jest tests/integration/api.metadata.test.ts --runInBand
```

## Coverage Notes

- Helper tests cover lane construction, No epic fallback, every explicit epic lane including childless Proposed epics, epic-card exclusion, terminal progress math, and lane-key resolution.
- ViewModeSwitcher tests cover the icon-only Board / Swimlanes / List / Docs peer group, accessible names, active state, and mode callbacks.
- TicketCard tests cover default badge visibility for existing callers and explicit badge suppression for compact swimlane cards.
- E2E tests cover mode switching, persistence, lane rendering, childless epic lanes, epic-card exclusion in flat/swimlane modes, same-epic drag, cross-epic rejection, progress, blocked close tooltips, collapse/expand controls, swimlane badge toggling, and epic ticket opening.
- Component + E2E tests cover swimlane **column collapse**: a status column collapses from its header chevron into a 44px click-to-expand rail, that column's lane-body cells become drop-zone-free strips, the collapse persists to the shared `mdt-settings-collapsed-columns` key (same as the flat Board), it restores from localStorage, syncs via the collapsed-columns-change event, and is independent from lane collapse.
- Helper + component + E2E tests cover the swimlane **toolbar search** (BR-6.1): epic-title substring (case-insensitive), epic full zero-padded key, bare number, and simplified key (`ABC-12` → `ABC-012`), and **epic-only lane-list filtering** (an epic key/title match keeps the whole lane with all its tickets; a query matching only child tickets — or only No-epic tickets — removes those lanes entirely; round 9 removed child-ticket matching), presentation-only filtering (epic progress unchanged), and the clear button restoring the full board.
- API metadata tests cover `level` preservation so flat Board filtering and swimlane lane construction receive explicit epic metadata.
- Constraint coverage is canonical in `tests.trace.md`.
