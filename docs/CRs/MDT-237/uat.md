# UAT Refinement Brief — MDT-237 (2026-09-12)

## Objective
Fix the live GPDE defect: `research/learning-coverage-matrix-brief.md` linked
`[GPDE-012](../.tickets/GPDE-012-learning-coverage-matrix.md)` and the app
flagged the EXISTING ticket GPDE-012 as "Document not found" (crossed-out
broken span) — the round-2 watchlist's "extend D12 routing to documents-view
mode when a real use case appears" case.

## Root Cause (verified live)
Documents-view mode in `resolveDocumentRef` resolved the tickets-area href to
`/prj/GPDE/documents?file=.tickets%2F…`, and SmartLink's existence check
treated "not in the index" as missing — but the document index never covers
the tickets area (GPDE lists `.tickets` in `excludeFolders`; the served tree
roots are `./`, `docs`, `gpt`, `research`). Wrong route + unknowable target =
guaranteed false broken flag.

## Approved Changes
1. **BR-2.7 / D13 — tickets-area targets mean the ticket, in every source
   mode.** `classifyTicketsAreaPath` classifies resolved paths inside the
   tickets area: `<ticketsPath>/<KEY>[-slug].md` → ticket view,
   `<ticketsPath>/<KEY>/<rest>.md|.html` → that ticket's subdoc view.
   Applied in documents-view mode (explicit links and inline-code refs) and
   as a new pre-escape branch in ticket-context mode (another ticket's
   subdoc no longer escapes to a fabricated `docs/<KEY>/…` documents path).
   A bare ticket-key-shaped .md basename in documents-view mode routes to
   the ticket, mirroring ticket-context semantics and the target plain-text
   ticket keys already link to. Non-ticket-shaped targets keep prior routing
   byte-identically.
2. **BR-2.8 / D14 — known-missing is coverage-bounded.** SmartLink flags a
   DOCUMENT target broken only when the index positively covers the target's
   directory (`coversPrefix` — its first consumer) and the file is absent.
   Targets under prefixes the index never lists (tickets area, unconfigured
   dirs) are unknown: normal links, never flagged. BR-2.1 behavior for
   covered-and-missing targets is unchanged.
3. **Test-harness repair.** `test-setup.ts` registers happy-dom with a real
   origin (`http://localhost:3075/`): under `about:blank`,
   `new URL(href, window.location.origin)` throws inside the existence
   check, which had silently forced "not broken" for every component test
   of this path (vacuous-test trap).

## Changed Requirement IDs
- Added: BR-2.7, BR-2.8 (behavior, tests route), OBL-8, D13, D14,
  TEST-unit-tickets-routing, TEST-unit-cover-bounded-flag, ART-unit-smartlink,
  TASK-uat3-tickets-area-routing
- Updated: TEST-unit-cache (+BR-2.8 covers, coversPrefix cases)
- Unchanged: BR-1.1…BR-2.6, BR-3.x, BR-4.1, C1–C9, Edge-1 (BR-2.1 semantics
  preserved — BR-2.8 bounds its evidence standard, it does not weaken it)

## Affected Downstream Trace
- requirements / architecture / tests / tasks re-validated (all stages,
  strict) and re-rendered; requirements lock baseline (re)written
- BDD stage untouched (BR-2.7/BR-2.8 route to tests, matching BR-2.4–BR-2.6)

## Execution Slices
Implemented in this session; no remaining execution work:
- `frontend/src/utils/markdownPreprocessor.ts` — `classifyTicketsAreaPath`,
  documents-view + escape-branch wiring
- `frontend/src/components/SmartLink/index.tsx` — coversPrefix guard
- `frontend/src/components/DocumentsView/MarkdownViewer.tsx` — fetches the
  project config and forwards the configured `ticketsPath` to
  MarkdownContent (live round found the routing fix inert here: the viewer
  never passed ticketsPath, so the preprocessor assumed docs/CRs and GPDE's
  `.tickets` targets never classified; unit tests had passed the value
  explicitly — mock/wiring gap caught only by live DOM verification)
- `frontend/src/utils/markdownPreprocessor.mdt237.test.ts` — 8 BR-2.7 cases
- `frontend/src/components/SmartLink/index.test.tsx` — new component suite
  (5 cases: live GPDE-012 regression, BR-2.1 preservation, existing target,
  unknown index, unconfigured prefix)
- `frontend/src/utils/documentExistenceCache.test.ts` — coversPrefix cases
- `frontend/src/components/DocumentsView/MarkdownViewer.test.tsx` — URL-aware
  fetch mock (replaces queue-based fixtures the second API call would
  consume) + 2 ticketsPath-wiring cases
- `frontend/src/test-setup.ts` — real-origin happy-dom registration

## Validation
- Unit/full: `bun run fe:test` → 1079 pass / 0 fail (1061 baseline + 18 new)
- Preprocessor suites: mdt150 + mdt155 + mdt237 + base = 74 pass / 0 fail
  (documents-view pinned cases from MDT-150 BR-5 unchanged)
- Lint + validate:ts clean on all touched files
- spec-trace: all 5 stages strict-clean; trace docs re-rendered
- Live (GPDE, running app): GPDE-012 renders `data-link-type="ticket"` →
  `/prj/GPDE/ticket/GPDE-012`, no broken flag; click navigates to the ticket
  view and opens "Research an evidence-derived learning coverage matrix"

## Watchlist
- A tickets-area path that is NOT ticket-shaped (e.g. `.tickets/README.md`)
  still routes to the documents view; with D14 it renders unflagged and the
  viewer decides openability. Revisit only if a real project has such files.
- Cross-project ticket refs from documents-view files (e.g.
  `../other-project/…`) are not classified — paths resolve inside the
  project; cross-project linkification keeps its existing shape.
- Unrelated console warning observed during live UAT: `<button>` nested in
  `<button>` (RecentDocuments item wrapping CopyPathButton) — separate
  defect, not MDT-237 scope.
