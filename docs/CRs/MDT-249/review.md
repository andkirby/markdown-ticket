# Review — MDT-249 (verify-complete)

Independent read-only semantic completion review. Contract:
`~/.agents/skills/mdt/agents/verify-complete.md`. Executed 2026-09-30 by the
`review` teammate (glm-5.3), independent of the implementing agent.

## Verdict

**pass**

## Evidence review

- plan digest: `20499114a655ec5e6b48f3e193a10cc8e4c325f4ca918f0d3babd8b2768e219b`
- evidence digest: `617c094163cb4f4e2c055acaa29b8846646a1e862dc36ccfcdd76cab0c62707e`
- scope: full diff `fd89958..a0c0b725` (15 mutation paths, all changed-as-planned)

## Summary

| Dimension | Status |
| --- | --- |
| requirements | pass (9/9) |
| build | pass |
| tests | pass (units 30/30 re-run; E2E list spec 12/12 re-run) |
| lint | skipped (verified separately at implement; CR NFRs require validate:ts + build only) |
| typecheck | pass |
| acceptance | pass |
| architecture | pass |
| invariants | pass |

## Requirements matrix

| ID | Status | Evidence | Notes |
| --- | --- | --- | --- |
| AC-1 | pass | `ProjectView.tsx` SortableTableHead + static Attributes TableHead; `view.spec.ts` labels assert + "attributes header click does not sort" | Key/Title/Status/Created/Updated are button-in-th headers with glyph; Attributes has no button (sort-attributes testid count 0, row order unchanged) |
| AC-2 | pass | `handleHeaderSort` (inactive→attr.defaultDirection; active→flip) | E2E: Title→asc, Key→desc defaults + active-header flip |
| AC-3 | pass | `ProjectRouteHandler.tsx` per-scope state, single change thread | Sync by construction; E2E BR-2.1/2.2 |
| AC-4 | pass | registry labels; `view.spec.ts` `toEqual(['Key','Title','Status','Attributes','Created','Updated'])` | Labels from same registry the dropdown reads |
| AC-5 | pass | Created before Updated, fixed RelativeTimestamp cells (span + title, no button) | E2E: adjacency, relative-text regex, title date-time, button count 0 |
| AC-6 | pass | `CR_STATUS_SORT_ORDER` exact CR order; unknown pinned last both directions | E2E asc/desc/unknown; unit 30/30 |
| AC-7 | pass | registry: board 5 unchanged, list adds Status after Title | list-only option verified desktop + hamburger |
| AC-8 | pass | `sortPreferencesByScope` + scoped read-modify-write | board write never clobbers list slice; reload persistence |
| AC-9 | pass | `readScopedRecord` flat-shape → defaults, no throw | E2E Edge-1 green |
| NFR | pass | run `20260930T190628`: validate:ts 0, build 0 | data-testids survive |
| TESTS | pass | new `config/sorting.test.ts` (162 ln), `utils/sorting.test.ts` (+58), `view.spec.ts` (+240, 9 scenarios) | re-run by reviewer |

## Exceptions (non-blocking)

1. No eslint group in the gate run JSON; eslint was verified separately (exit 0). CR NFRs require only validate:ts + build.
2. "411 units" in the dispatch was a full-suite figure; the ticket-scoped run is 30 tests (green).
3. Reviewer revalidated evidence digests via shasum-256 (mdt-verify not on its PATH); both match.
4. Created cell renders null if `dateCreated` absent — unreachable in practice (required CR field).

---

# Delta Review — UAT sticky headers (commit 66bccf18)

Independent delta review executed 2026-09-30 by the `review` teammate (glm-5.3).

## Verdict

**pass**

## Basis

- BR-8 (CR §5 UAT AC): sticky verified — `list-view.css` `.ticket-table .mdt-table__scroll { flex:1; min-height:0 }` (scrollport chain) + `.ticket-table .mdt-table__head { position:sticky; top:0; z-index:10; background:oklch(var(--background)); inset hairline }`; wrapper `ProjectView.tsx:258` becomes `ticket-table hidden md:flex md:h-full md:flex-col`.
- Shared `ui/table.css` byte-untouched; no DOM/aria delta; mobile cards / board / documents absent from diff.
- Re-run by reviewer: E2E view.spec 13/13, validate:ts:all 6/6, eslint spot 0, ticket-scoped units 30/30.
- Runtime E2E asserts scrollport overflow >0, sticky/top:0/opaque bg, header y-stability ±2px across full scroll, aria-sort persists, mid-scroll clickability.

## Exceptions

1. Canonical spec-trace store NOT yet synced for BR-8/TASK-7/TEST-list-view-sticky-headers — spec-trace binary OOM-killed system-wide (exit 137). Staged idempotent remediation: `scripts/_sync_mdt249_sticky_trace.sh` (ends with validate ×5 + render all). MUST run once memory frees; markdown artifacts carry the truth meanwhile.
2. `bun test frontend/src/utils frontend/src/config` shows 2 failures in routing.test.ts — files byte-identical to baseline fd89958, pre-existing/environmental, not a regression.
3. validate:ts is a no-op on a clean tree; validate:ts:all substituted (6/6).
