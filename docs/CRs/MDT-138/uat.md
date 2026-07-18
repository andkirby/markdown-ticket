# UAT Refinement Brief

**CR**: MDT-138 — Add dot-notation namespace system for sub-document tabs
**Round**: 2026-07-18 (UAT Session 1)
**Status**: Code fixes (Slices 1 and 2) implemented and committed; test hardening (Slice 3) deferred

## Objective

Restore deep-link routing for project-prefixed ticket sub-document URLs of the
form `/prj/{projectCode}/ticket/{ticketKey}/{subdoc}.md`. Two independent bugs
combine to break these deep links: (1) a regression introduced by MDT-184
(route centralization) broke path extraction for every project-prefixed
subdoc URL; (2) the valid-path lookup only generated dot+slash variants for
virtual folders, so deep links to dot-notation children of physical folders
(e.g. `bdd.trace.md`) still fell back to Main even after the first fix.

In both cases the URL is preserved in the address bar but the Ticket Viewer
falls back to the `[Main]` tab instead of opening the targeted sub-document.

## Reproduction

### Bug 1 — project-prefixed `{type}.md` deep links

Direct navigation to `http://localhost:3075/prj/MDT/ticket/MDT-138/architecture.md`:

- **Expected**: `architecture` namespace tab active; nested row shows `[Main]`
  and `[trace]`; content of `MDT-138/architecture.md` is fetched and rendered.
- **Actual**: `[Main]` tab is active; no nested row renders; main ticket body
  is shown. The URL in the address bar is unchanged (no redirect).
- **Network**: `/api/projects/MDT/crs/MDT-138/subdocuments/architecture` is
  never requested because the navigation hook treats the path as invalid.

Direct URLs without the project prefix (`/ticket/MDT-138/architecture.md`)
work correctly, which is why this regression slipped past existing E2E tests
that route through `DirectTicketAccess`.

Affects all root-form deep links: `architecture.md`, `tests.md`,
`requirements.md`, `tasks.md`, `bdd.md`.

### Bug 2 — dot-notation child of physical folder

Direct navigation to `http://localhost:3075/prj/MDT/ticket/MDT-138/bdd.trace.md`
(reproduced only after Bug 1 was fixed):

- **Expected**: `bdd` namespace tab active; nested row shows `[Main]`,
  `[trace]`, `[/another.trace]`; `[trace]` is active; content of
  `MDT-138/bdd.trace.md` is fetched and rendered.
- **Actual**: `[Main]` tab is active; no nested row renders; main ticket body
  is shown.
- **Unit-level repro**: `collectPaths(bddSubtree)` produced `bdd/trace` but
  never `bdd.trace`, so `validPaths.has('bdd.trace')` returned false.

The `bdd` namespace in MDT-138 is a **physical** folder (because
`bdd/another.trace.md` exists on disk) that also groups dot-notation children
(`bdd.trace.md`). This mixed ancestry is what makes the bug visible here.

### Live verification (both bugs fixed)

All seven URL forms resolve correctly post-fix:

| URL | Top active | Nested active |
|-----|-----------|---------------|
| `architecture.md` | architecture | main |
| `tests.md` | tests | main |
| `requirements.md` | requirements | main |
| `tasks.md` | tasks | main |
| `bdd.md` | bdd | main |
| `bdd.trace.md` | bdd | trace |
| `bdd/another.trace.md` | bdd | another.trace |

## Root Cause

Two independent bugs. Bug 1 broke every project-prefixed deep link; Bug 2 was
masked by Bug 1 and only surfaced after Bug 1 was fixed.

### Bug 1 — `extractSubDocPath` regex slot mis-substitution (MDT-184 regression)

`src/utils/subdocPathValidation.ts::extractSubDocPath` rebuilt its regex from
`routePatternToRegex(ROUTE_TICKET_SUBDOC)` and then attempted to substitute the
literal `crId` into the `:ticketKey` slot by searching for the substring
`'/ticket/'` inside the escaped regex source:

```ts
const ticketSeg = '/ticket/'
const segIdx = projectSrc.indexOf(ticketSeg)   // → -1 (source is escaped as \/ticket\/)
```

`routePatternToRegex` escapes every `/` as `\/`, so `indexOf('/ticket/')`
returned `-1`. The fallback `substring` math then substituted `crId` into the
**projectCode** slot, producing a pattern that matched
`/prj/MDT-138/ticket/[^/]+/(.+)` instead of
`/prj/[^/]+/ticket/MDT-138/(.+)`. The project pattern therefore never matched
real URLs, `extractSubDocPath` returned `null`, and `initFromPath` fell back
to `ROOT_DOCUMENT_PATH` (`'main'`).

The direct pattern was unaffected because it replaced the **first** `[^/]+`
slot, which happened to be the ticket key for `ROUTE_DIRECT_TICKET_SUBDOC`.

Introduced in commit `b400447e` (MDT-184: eliminate last hardcoded /prj/
patterns). MDT-184's own test suite did not cover project-prefixed subdoc path
extraction, so the regression shipped unnoticed.

### Bug 2 — `collectPaths` only generated dot+slash variants for virtual folders

`src/components/TicketViewer/useTicketDocumentNavigation.ts::collectPaths`
decided the path separator for a child based on the **folder's** storage type
(virtual → dot, physical → slash) and only emitted both forms for virtual
folders (as "backward compatibility"). When a dot-notation file like
`bdd.trace.md` was grouped under a **physical** `bdd/` folder (because the
ticket also has `bdd/another.trace.md`), the child's canonical path was
emitted as `bdd/trace` but never as `bdd.trace`.

The URL, however, is derived from the **child's filePath** (`bdd.trace.md` →
apiPath `bdd.trace`) via `resolveTicketDocumentSelectionPath`, not from the
folder's storage type. So when the user (or a deep link) used the canonical
form `bdd.trace`, the `validPaths.has('bdd.trace')` lookup in `initFromPath`
returned false → fallback to Main.

This bug was entirely masked by Bug 1 until Bug 1 was fixed: every
project-prefixed URL fell back to Main before the path-extraction step could
even reach `collectPaths`.

## Approved Changes

This is a `refine_in_place` round: requirement IDs are unchanged because the
intent of BR-9, BR-10, BR-11 is still valid. We clarify the verification
obligations so the regressions are caught going forward.

| Change | Type | Affects | Bug |
|--------|------|---------|-----|
| Fix `extractSubDocPath` to substitute the literal `:ticketKey` token in the un-escaped `ROUTE_*` constant **before** converting to regex, instead of doing string surgery on the escaped regex source. | Code fix | `src/utils/subdocPathValidation.ts` | 1 |
| Fix `collectPaths` to generate **both** dot and slash path forms for every subdoc, regardless of folder storage type. The URL is derived from the child's filePath, so the valid-path lookup must accept either form. | Code fix | `src/components/TicketViewer/useTicketDocumentNavigation.ts` | 2 |
| Add unit tests for `extractSubDocPath` covering project-prefixed, direct, dot-notation, slash-notation, and multi-segment paths. | Test gap (deferred — see Validation) | `src/__tests__/subdocPathValidation.test.ts` (new) | 1, 2 |
| Strengthen E2E for `root_document_url_routing`, `dot_notation_url_routing`, `folder_subfile_url_routing` to assert the targeted tab is `data-state="active"` (not merely visible) after `page.goto` to a `/prj/...` deep link. | Test gap (deferred — see Validation) | `tests/e2e/ticket/namespace.spec.ts` | 1, 2 |

No requirements, BDD scenarios, architecture, or tasks are renamed.
Only test intent is clarified to bind the regressions.

## Changed Requirement IDs

None new. The following existing IDs are re-verified by this round (all
`refine_in_place`):

- `BR-9` — root document URL routing (`/prj/{code}/ticket/{ticket}/{type}.md`)
- `BR-10` — dot-notation URL routing (`/prj/{code}/ticket/{ticket}/{type}.{semantic}.md`)
- `BR-11` — folder subfile URL routing (`/prj/{code}/ticket/{ticket}/{type}/{subfile}.md`)
- `BR-6` — URL routing with namespace path (forward direction, already passing; reverse deep-link direction covered by BR-9/10/11)

No `additive_change`, `replacement`, or `scope_removal`.

## Affected Downstream Trace

Trace is intact; no canonical IDs change. After implementation, revalidate and
re-render the affected projections so the test intent notes pick up the new
project-prefixed deep-link obligations:

| Stage | Action |
|-------|--------|
| requirements | no change (no ID edits) |
| bdd | no change |
| architecture | no change |
| tests | upsert entries under `TEST-namespace-e2e` to include `data-state="active"` assertions for `/prj/...` deep links; upsert a unit-test-plan entry for `extractSubDocPath` project-prefixed coverage |
| tasks | upsert current execution tasks (see Execution Slices) |

No strict drift lock required — this is a single approved refinement with a
narrow fix scope.

## Execution Slices

### Slice 1 — Fix `extractSubDocPath` for escaped route patterns (Bug 1) — DONE

- **Objective**: Restore correct substitution of the `:ticketKey` slot in the
  project-prefixed regex produced by `routePatternToRegex`.
- **Direct artifacts**:
  - `src/utils/subdocPathValidation.ts` (modified `extractSubDocPath`)
- **Implementation applied**: substitute the literal `:ticketKey` token in the
  un-escaped `ROUTE_DIRECT_TICKET_SUBDOC` and `ROUTE_TICKET_SUBDOC` constants
  (after regex-escaping `crId`), then convert to regex via
  `routePatternToRegex`. No more string surgery on the escaped regex source.
- **Verification**: existing `src/__tests__/routes.test.ts` (22/22) and
  `useTicketDocumentNavigation.test.tsx` (10/10) pass; manual live check of
  `/prj/MDT/ticket/MDT-138/{architecture,tests,requirements,tasks,bdd}.md`
  resolves to the expected active tab.

### Slice 2 — Fix `collectPaths` to emit both separator forms (Bug 2) — DONE

- **Objective**: Make deep links to dot-notation children of physical folders
  round-trip through the valid-path lookup.
- **Direct artifacts**:
  - `src/components/TicketViewer/useTicketDocumentNavigation.ts` (rewrote
    `collectPaths`)
- **Implementation applied**: every subdoc now registers both forms
  (`bdd.trace` and `bdd/trace`) at every non-root level, regardless of whether
  the parent folder is virtual or physical. The canonical separator mirrors
  how the folder itself was reached (dot for virtual ancestry, slash for
  physical ancestry); the alternate form is always added.
- **Verification**: manual live check of
  `/prj/MDT/ticket/MDT-138/bdd.trace.md` now activates the `bdd` tab and
  selects `trace` in the nested row. All seven URL forms in the verification
  table above resolve correctly.
- **Why this is safe**: the URL form is derived from the child's `filePath`
  via `resolveTicketDocumentSelectionPath`, not from the folder's storage
  type. Accepting both forms in the lookup simply makes the deep-link path
  match the canonical app-generated path. `buildTicketDocumentTabRows` and
  `deriveFolderStack` already handle both forms correctly; only the lookup
  table was asymmetric.

### Slice 3 — Bind the fixes with tests — DEFERRED

- **Objective**: Lock the regressions with automated coverage at both unit and
  E2E layers, so a future refactor cannot reintroduce them silently.
- **Direct artifacts** (not yet created in this round):
  - `src/__tests__/subdocPathValidation.test.ts` (new file) — unit coverage
    for `extractSubDocPath` and (optionally) `collectPaths`.
  - `tests/e2e/ticket/namespace.spec.ts` — strengthen three existing tests to
    assert `data-state="active"` instead of `toBeVisible()`.
- **Direct GREEN targets** (when Slice 3 lands):
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/architecture.md', 'MDT-138')` → `'architecture.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/requirements.trace.md', 'MDT-138')` → `'requirements.trace.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/bdd/another.trace.md', 'MDT-138')` → `'bdd/another.trace.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/bdd.trace.md', 'MDT-138')` → `'bdd.trace.md'` (Bug 2 direct case)
  - `extractSubDocPath('/ticket/MDT-138/architecture.md', 'MDT-138')` → `'architecture.md'` (direct path — keep passing)
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138', 'MDT-138')` → `null` (no subdoc)
  - E2E: after `page.goto('/prj/.../ticket/{key}/architecture.md')`, the
    `architecture` tab has `data-state="active"` and the nested row renders.
  - E2E: after `page.goto('/prj/.../ticket/{key}/bdd.trace.md')` against a
    physical-folder ticket, `bdd` top tab + `trace` nested tab are active.
- **Why deferred**: the code fixes are verified live and the existing E2E
  suite (19/19 namespace + 21 subdoc-navigation/preload) still passes, so this
  commit ships green. The new assertions are a hardening layer to prevent
  recurrence and should land before close but do not block the fix itself.
- **Impacted canonical task IDs**: TASK-4 (will be marked done when Slice 3
  lands; see tasks stage).

## Validation

### Performed in this round (code-fix commit)

| Step | Command | Result |
|------|---------|--------|
| Route tests | `bun test src/__tests__/routes.test.ts` | 22/22 pass |
| Navigation hook tests | `bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx` | 10/10 pass |
| E2E namespace | `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium` | 19/19 pass |
| E2E subdoc nav + preload | `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/subdoc-navigation.spec.ts tests/e2e/ticket/subdoc-preload.spec.ts --project=chromium` | 21 pass, 1 pre-existing skip |
| TypeScript | `bunx tsc --noEmit -p tsconfig.json` | no new errors in changed files (pre-existing `BackendConfigSection.tsx` errors only) |
| Manual smoke (live) | Open the seven URLs in the verification table above | all resolve to expected active tab |
| Trace validation | `spec-trace validate MDT-138 --stage tasks` | pre-existing `MISSING_TASK_CLOSURE` for `physical_child_with_dot_in_filename` — not introduced by this round |

### Pending (Slice 3)

| Step | Command |
|------|---------|
| New unit tests for `extractSubDocPath` | `bun test src/__tests__/subdocPathValidation.test.ts` |
| Strengthened E2E assertions | `bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium` |
| Trace validation after test bind | `spec-trace validate MDT-138 --stage tests` |

## Watchlist

- **MDT-184 side effects**: any other caller relying on
  `routePatternToRegex(...).source` and doing string substitution on the
  result will have the same escaping hazard. Audit `routePatternToRegex`
  consumers after the fix lands. (The new `extractSubDocPath` no longer does
  this, but other callers might.)
- **Hash-based legacy redirect**: the fix must preserve the existing
  hash→path redirect behavior in `initFromPath` (covered by
  `useTicketDocumentNavigation.test.tsx`).
- **Reserved `#trace` hash**: the MDT-174 hot-fix exclusion must continue to
  hold (covered by the reserved-hash unit test).
- **DirectTicketAccess**: must keep redirecting
  `/ticket/{key}/{subdoc}` → `/prj/{project}/{key}/{subdoc}`. The direct
  pattern already works; verified still passing after the refactor.
- **`collectPaths` symmetry**: the new logic generates both forms for every
  non-root subdoc. If a future change reintroduces folder-type-dependent
  separators, Slice 3's unit tests will catch it.

## Open Decisions

Code fixes (Slices 1 and 2) are committed. Slice 3 (test hardening) is
deferred but should land before MDT-138 closes. When Slice 3 lands, mark
TASK-4 done and re-run trace validation.
