# UAT Refinement Brief

## Objective

Round 8 correction of the round-7 toolbar search: the search shall filter **the epic lane list itself** — not just hide tickets inside lanes like the header global filter does. A query narrows the board to the epics (and No-epic tickets) that match by title or ticket key (`ABC-012`, `12`, `ABC-12`).

## Approved Changes

1. **Lane-list filtering (the delta)**: `filterLanesBySearch` now removes lanes from the board instead of leaving emptied lanes:
   - an epic lane stays when its **epic key or title** matches — and then shows **all** its tickets (the user found the epic);
   - an epic lane also stays when any **child ticket** matches — narrowed to the matching tickets;
   - the **No-epic** lane stays only when one of its tickets matches — narrowed to the matching tickets;
   - everything else is removed from the board.
2. Unchanged from round 7: search field in the toolbar beside the toggles (`swimlane-search`) with a clear button; matching by title (case-insensitive substring) or ticket key (`ABC-012`, `12` bare number, `ABC-12` simplified→zero-padded); presentation-only (no ticket mutation, epic progress not recomputed).

## Changed Requirement IDs

- `BR-6.1` — **refined in place**: filters the epic lane list, not just lane tickets.
- `swimlane_search_filters_by_title_or_key` — **refined in place** to the lane-list semantics.
- `TEST-swimlane-component`, `TEST-swimlane-helpers`, `TEST-swimlane-board-e2e` — coverage extended to the new semantics.

## Affected Downstream Trace

- **requirements** — BR-6.1 refined; non-ambiguity row updated; validated + rendered.
- **bdd** — scenario refined; validated + rendered.
- **tests** — coverage notes updated (plans already cover BR-6.1).

## Execution Slices

### Slice 1: Lane-list search semantics

- **Objective**: query filters which epic lanes exist on the board.
- **Direct artifacts/files**:
  - `src/components/SwimlaneBoard/helpers.ts` (`filterLanesBySearch` rewritten: epic match keeps whole lane, child match narrows, no-match lanes removed)
  - tests: `src/components/SwimlaneBoard/helpers.test.ts`, `src/components/SwimlaneBoard/SwimlaneBoard.test.tsx`, `tests/e2e/board/swimlane-board.spec.ts`
- **Direct GREEN targets**:
  - Helper: epic title/key match keeps full lane; child-only match narrows lane; non-matching epic + No-epic lanes removed; no-match query yields empty board; orphan-only query keeps only the No-epic lane.
  - Component: epic-title match shows all tickets; no-match query renders zero lanes; round-7 cases (title, bare number, simplified key, clear, progress) still green.
  - E2E: no-match query removes lanes; epic-title match keeps the lane with all tickets; clear restores.
- **Impacted canonical task IDs**: `TASK-2` (makes-green already includes the scenario).
- **Why**: UAT feedback — round 7 behaved like the header filter (hiding cards inside lanes); the user expects the search to narrow the epics list itself.

## Validation

```bash
bun test --isolate src/components/SwimlaneBoard/helpers.test.ts
bun test --isolate src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
bunx playwright test tests/e2e/board/swimlane-board.spec.ts --project=chromium
bun run validate:ts src/components/SwimlaneBoard/helpers.ts src/components/SwimlaneBoard/SwimlaneBoard.test.tsx
spec-trace validate MDT-206 --stage all
```

All green at completion: 19/19 helpers, 29/29 swimlane component, 11/11 swimlane E2E, all trace stages valid.

## Watchlist

- Bare-number matching uses substring semantics on the key's number part (consistent with Quick Search): `12` also matches `MDT-112`.
- Epic progress is intentionally NOT recomputed on search — progress is an epic health signal, not a filtered count.
- A query matching an epic key/title shows that epic's **entire** lane including non-matching children — intentional (finding the epic means reviewing its work), recorded in BR-6.1.

## Prior rounds

- Rounds 1–7 are recorded in CR §8 (round 7 added the toolbar search with ticket-only narrowing).

## Open Decisions

None.
