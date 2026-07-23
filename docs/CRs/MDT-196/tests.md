# Tests — MDT-196 Board Filter Bar

Related CR: `docs/CRs/MDT-196-board-filter-bar.md`
BDD: `docs/CRs/MDT-196/bdd.md`
Architecture: `docs/CRs/MDT-196/architecture.md`

## Verification strategy

Three layers, mapped to the BDD scenarios:

| Layer | Runner | What it proves | Scenarios |
|-------|--------|----------------|-----------|
| Predicate unit | `bun test --isolate ./src` (bun:test) | AND/OR/empty/query semantics are correct | S1–S10 |
| Component unit | `bun test --isolate ./src` (@testing-library/react) | Chrome renders/states/affordances | S11–S20, S23–S25 |
| E2E | `bun run test:e2e` (Playwright) | Real user flow across reload + viewports | S21 (persistence), key desktop + mobile flows |

## Unit: predicate (`src/utils/ticketFilters.test.ts`)

Pure-function tests for `applyTicketFilters(tickets, filters)`. No React.

| Test | BDD | Asserts |
|------|-----|---------|
| empty filter returns all tickets | S1 | `applyTicketFilters(tickets, {})` length === tickets.length |
| single status value narrows | S2 | only `In Progress` tickets remain |
| multiple status values OR-combine | S3 | `In Progress` + `Approved` tickets; `Proposed` excluded |
| status + priority AND-combine | S4 | only `In Progress` AND `High`; `In Progress` + `Medium` excluded |
| query AND-combines with facet | S5 | query "login" + status `In Progress` intersect |
| multi-term query is AND | S6 | "fix login" matches only ticket with both terms |
| assignee `__none__` matches unassigned | S7 | tickets with no assignee returned; assigned excluded |
| priority + type combined | S8 | `Critical` AND `Bug Fix` intersect |
| no match returns empty | S9 | 0 tickets, no throw |
| stale derived value dropped on reconcile | S10 | `reconcile` action removes "bob" when no ticket has it |
| case-insensitive query | — | "LOGIN" matches "Login" |
| query matches code and description too | — | not just title |
| `inWorktree` true/false exact (v1.1 contract) | — | predicate handles boolean facet when present |

## Unit: reducer (`src/hooks/useBoardFilters.test.ts`)

Tests the reducer transitions via the hook (using @testing-library `renderHook`).

| Test | BDD | Asserts |
|------|-----|---------|
| toggle adds a value to a facet | S15 | status becomes `["In Progress"]` |
| toggle removes a value already present | S13 | toggling "In Progress" again empties status |
| setQuery updates query | S6 | filters.query === "login" |
| clearFacet empties one facet | — | status `[]`, priority untouched |
| clearAll empties everything | S14 | all facets `[]`, query `""` |
| reconcile drops stale derived values | S10 | assignee "bob" removed when not in available set |

## Unit: persistence (`src/config/filterPreferences.test.ts`)

| Test | BDD | Asserts |
|------|-----|---------|
| round-trips a populated filter | S21 | set then get returns same shape |
| empty default when nothing stored | S1 | `{}` returned |
| invalid JSON resets to empty | S22 | no throw, returns `{}` |
| wrong shape resets to empty | S22 | `{ status: 123 }` → `{}` |

## Unit: component chrome

### `BoardFilterBar/DesktopFilterBar.test.tsx`

| Test | BDD | Asserts |
|------|-----|---------|
| empty state: bare trigger labels, no chips, no clear-all | S11 | "Status" not "Status: 1"; no `[data-testid*=chip]` |
| active state: count badges + chips + clear-all | S12 | "Status: 2"; chips render; clear-all button present |
| facet trigger label shows count | S12 | "Priority: 1" after one priority selected |
| clicking clear-all dispatches clearAll | S14 | onClearAll called |
| result-count shows "Showing N of M" | S12 | text matches filtered/total |
| result-count is aria-live polite | S25 | `aria-live="polite"` on count element |

### `BoardFilterBar/ActiveFilterChips.test.tsx`

| Test | BDD | Asserts |
|------|-----|---------|
| renders one chip per active value | S12 | chip count === active value count |
| chip remove has aria-label | S24 | `Remove filter: {facet} {value}` |
| clicking chip remove calls onRemove with facet+value | S13 | correct facet/value passed |

### `BoardFilterBar/FacetDropdown.test.tsx`

| Test | BDD | Asserts |
|------|-----|---------|
| opens on trigger click | S15 | menu content visible |
| lists enum values for static facets | S16 | all `CRPriorities` present even if no ticket has them |
| checked state reflects current selection | S15 | selected values checked |
| toggle dispatches toggle action | S15 | onToggle(facet, value) called |

### `BoardFilterBar/MobileChipStrip.test.tsx`

| Test | BDD | Asserts |
|------|-----|---------|
| renders chips when filters active | S18 | chips present |
| absent when no filters | S19 | component returns null |
| chip remove updates shared state | S20 | onRemove called |
| horizontally scrollable | S18 | overflow-x container |

## E2E: `tests/e2e/board/board-filter.spec.ts`

Playwright, matching the existing `tests/e2e/board/*.spec.ts` convention.

| Test | BDD | Viewport | Asserts |
|------|-----|----------|---------|
| desktop: apply status filter narrows board | S2, S4 | desktop | only matching ticket cards visible |
| desktop: chip remove updates board | S13 | desktop | one chip gone, board re-widens |
| desktop: clear-all resets | S14 | desktop | all tickets visible, no chips |
| desktop: result-count accurate | S12 | desktop | "Showing N of M" matches DOM |
| mobile: hamburger → popover apply | S17, S18 | mobile (<640) | popover opens, selecting narrows, chip strip shows |
| mobile: chip strip remove | S20 | mobile | tap chip ✕ removes it |
| persistence: reload restores filters | S21 | desktop | reload keeps filter active |

Uses `buildScenario(e2eContext.projectFactory, ...)` from `tests/e2e/setup/`
and `waitForBoardReady(page)` from `tests/e2e/utils/helpers.js`, matching the
existing board E2E pattern.

## Regression

These existing tests must stay green (touched files are in their import graph):

- `tests/e2e/board/rendering.spec.ts` — board renders tickets
- `tests/e2e/board/view.spec.ts` — board view switching
- `src/components/HamburgerMenu.test.tsx` — menu still renders after prop additions
- `src/components/SortControls` tests — sort unaffected (sibling in header)

## Non-functional verification

| Requirement | How verified |
|-------------|--------------|
| No perceivable lag on 500 tickets | Predicate unit test with a 500-ticket fixture; assert <50ms (bun:test timing). Documented as a benchmark, not a hard gate. |
| No new runtime dependencies | `git diff package.json` shows no additions; FacetDropdown uses existing `@radix-ui/react-dropdown-menu`, Popover uses existing `@radix-ui/react-popover`. |
| No backend changes | `git diff server/ shared/` shows only the additive `TicketFilters` interface fields in domain-contracts (re-exported by shared). |

## Test data fixtures

Predicate tests use a small hand-built ticket array (5-8 tickets covering every
facet value combination), defined inline in the test file. No shared fixture
file needed — predicate tests are self-contained.

E2E uses `buildScenario` which creates real tickets via the project factory.
