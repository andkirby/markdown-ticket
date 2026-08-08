# BDD: MDT-206

## Overview

The BDD scenarios cover the swimlane board as a user-visible board layout selected from the app header. They are grouped around mode switching, lane composition, status-only drag/drop, epic lifecycle actions, and lane visibility controls.

## Acceptance Strategy

- Browser E2E exists and is required: Playwright under `tests/e2e/board/`.
- Scenarios stay architecture-agnostic; constraints such as synchronized scrolling, terminal progress math, semantic CSS, and legacy epic badge compatibility are closed through `mdt:tests`.
- The scenario budget is 8 total, under the workflow limit of 12.

## Test-Facing Contract Notes

- New selectors must be registered in `tests/e2e/utils/selectors.ts`; tests must not guess class names.
- Navigate directly to the isolated project route in each Playwright test.
- Cross-epic drag coverage must assert no valid drop highlight and no persisted status or `phaseEpic` mutation.
- Epic close guard coverage may use an injected failing update path or backend response, but it must assert the user-visible blocker names.

## Execution Notes

Planned E2E file:

```bash
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
```

---
Use `bdd.trace.md` for canonical scenario records and coverage links.
