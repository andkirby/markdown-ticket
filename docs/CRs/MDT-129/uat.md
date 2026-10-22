# UAT Refinement Brief

Ticket: `MDT-129`
Round: 2026-10-22

## Objective

Close the rail-ordering staleness gap found during UAT of the project selector
rail: among favorites, the rail sorts by lifetime `count` descending (BR-6.3),
so a heavily-used-but-idle favorite permanently outranks a recently-used one.
Real data: OFF (count 101, last used 2026-08-27) ranked above GPDE (count 29,
last used 2026-10-22 — the most recently used project of all). Recency should
outrank lifetime frequency; the browser panel already sorted this way, making
the rail the outlier. Refine BR-6.3 to recency-first and unify rail + panel on
one shared comparator.

## Approved Changes

1. **BR-6.3 refined in place**: visible favorites sort by `lastUsedAt`
   descending, with `count` descending as tie-break (was count-first).
2. **C11 added (constraint)**: rail and panel ordering comparators are
   deterministic — entries equal in favorite, `lastUsedAt`, and `count`
   resolve by project key ascending.
3. **One shared comparator** backs the rail (`computeRailOrder`) and the
   browser panel (`ProjectBrowserPanel`), eliminating the drift between the
   two surfaces. The panel keeps its no-active-pinning presentation (active
   is highlighted wherever the ordering places it).
4. **Regression scenario** `rail_recency_outranks_lifetime_count` pins the
   UAT defect: a recently used favorite precedes a stale high-count favorite.
5. Deliberate, spec-backed consequence: never-used projects (equal favorite,
   `lastUsedAt`, count) now order alphabetically in the panel instead of by
   filesystem/registration scan order.

## Changed Requirement IDs

Refine-in-place + additive:

- `BR-6.3` — refined in place (same ID, sort key flipped to recency-first)
- `C11` — new constraint (deterministic key-ascending tie-break)
- Scenario `rail_ordering_prioritizes_favorites` — updated to MRU semantics
- Scenario `rail_recency_outranks_lifetime_count` — new, covers `BR-6.3`
- Test plan `TEST-ordering-deterministic-project-key` — new, covers `C11`

## Affected Downstream Trace

- Requirements: `BR-6.3`, `C11` (route tables regenerated)
- BDD: `rail_ordering_prioritizes_favorites` (updated),
  `rail_recency_outranks_lifetime_count` (new)
- Tests: `TEST-ordering-deterministic-project-key` (new, `selectorOrdering.test.ts`)
- Tasks: `TASK-14` (owns `ART-ordering-utils`; this slice, implemented)
- Architecture: no structural change — ordering utilities keep their location;
  the panel adapter (`ProjectBrowserPanel.computePanelOrder`) now delegates to
  the shared comparator

## Execution Slices

### Slice 1 — MRU comparator + rail/panel unification (`TASK-14`, complete)

- Objective: implement the refined BR-6.3 ordering and C11 determinism in one
  shared comparator used by both rail and panel.
- Direct artifacts/files:
  - `frontend/src/utils/selectorOrdering.ts` (`compareByOrderingRules`,
    `sortProjectsByOrderingRules` now exported)
  - `frontend/src/components/ProjectSelector/ProjectBrowserPanel.tsx`
    (private comparator deleted; delegates to shared comparator)
  - `frontend/src/utils/selectorOrdering.test.ts` (BR-6.3 recency tests,
    recency-outranks-count regression, count tie-break with opposing keys,
    C11 key-ascending tie)
  - `frontend/src/components/ProjectSelector/ProjectBrowserPanel.test.tsx`
    (position-dependent keyboard-nav tests pin layout via explicit `orderedState`;
    new DOM-order test for the C11 alphabetical default)
- Direct GREEN targets: `rail_ordering_prioritizes_favorites`,
  `rail_recency_outranks_lifetime_count`, `TEST-selector-ordering`,
  `TEST-ordering-deterministic-project-key`
- Impacted canonical task IDs: `TASK-14`
- Why the slice exists: the rail/panel ordering drift and the stale-count
  ranking share one root cause — two independent comparators with different
  primary keys. One shared comparator fixes both.

## Validation

- Focused: 71/71 pass (`selectorOrdering.test.ts` + `ProjectSelector/` suites).
- Full frontend `bun test`: before 1127 pass / 110 fail, after 1129 pass /
  110 fail — the 110 failures are pre-existing environment issues (missing
  `jest-environment-jsdom`); delta +2 passing, 0 new failures.
- `bun run validate:ts` passed on all changed files.
- Codex review verdict: SHIP; both minor findings (count tie-break coverage,
  component-level C11 DOM-order test) fixed in this round.
- Canonical store validated green: requirements, bdd, tests, tasks; rendered
  projections refreshed.

## Watchlist

- Rail reshuffles on project switch now that recency is primary — this is the
  intended behavior (MRU); untouched chips keep their relative order.
- `ProjectBrowserPanel.computePanelOrder` maps ordered keys back to full
  projects via a key→project map; keys are unique by project-discovery
  contract (duplicate codes rejected upstream).
- E2E ordering test asserts active-first + chip visibility only — no
  count-first assumptions existed.

## Open Decisions

None — the MRU choice was validated against real usage data (OFF vs GPDE) and
confirmed by codex opinion thread (second-opinion review of ordering design).
