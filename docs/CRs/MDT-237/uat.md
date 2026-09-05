# UAT Refinement Brief — MDT-237 (2026-09-05)

## Objective
Fix the linkification defect found in live GPDE UAT: a plain-text path token
ending in a ticket-key-shaped basename (`docs/uat/GPDE-003.md`) rendered as a
plain `docs/uat/` prefix plus a bare ticket link — split rendering AND a wrong
target (ticket view instead of the referenced document), even with the
document index loaded.

## Approved Changes
1. **Whole-token capture (BR-2.6, D12)** — the Step 1.5 ticket-filename
   protection regex now captures the WHOLE path token (leading path segments
   included) instead of only the ticket-key basename, so the basename is never
   split from its prefix. The separator scan runs on the path part only —
   anchors containing `/` (`#foo/bar`) never split the basename.
2. **Index-loaded routing at restore** — `restoreTicketFilenameRef` renders
   the whole token as ONE document link (documents route, anchor + percent-
   decoding carried) whenever the document index is loaded and ALL hold:
   a path prefix exists, document links are enabled, an existence oracle is
   provided, and the path is outside the tickets area. Existing targets
   navigate; known-missing targets (e.g. a forward reference to a not-yet-
   written UAT report) render as one flagged-broken link (BR-2.1) that
   becomes navigable automatically once the file is created (SSE → index
   update → re-preprocess).
3. **Byte-identical legacy fallback** — every other case (no oracle, index
   unknown/null, disabled flags, `..`-prefixed tokens, tickets-area paths,
   bare/suffixed ticket filenames) reconstructs today's rendering exactly:
   prefix plain text + basename → ticket route.

## Changed Requirement IDs
- Added: BR-2.6 (behavior, refined same session: known-missing routes whole + flagged), OBL-7 (architecture obligation), D12 (decision)
- Added: TEST-unit-plaintext-token (tests), TASK-uat2-plaintext-token (tasks)
- Unchanged: BR-1.1…BR-2.5, BR-3.x, BR-4.1, C1–C9, Edge-1

## Affected Downstream Trace
- requirements / architecture / tests / tasks re-validated (all stages clean) and re-rendered
- BDD stage untouched (BR-2.6 routes to tests, matching BR-2.4/BR-2.5)

## Execution Slices
Implemented in this session; no remaining execution work:
- `frontend/src/utils/markdownPreprocessor.ts` — Step 1.5 regex, `restoreTicketFilenameRef`, Step 2.5 wiring
- `frontend/src/utils/markdownPreprocessor.mdt237.test.ts` — 13 new BR-2.6 cases (routing incl. known-missing, anchor incl. anchor-with-slash, encoding, and legacy-fallback regressions)

## Validation
- Unit: mdt237 suite 42/42; full frontend suite 1061 pass / 0 fail
- Lint + validate:ts clean on touched files (domain-contracts lint errors are pre-existing baseline, untouched)
- E2E: 12 passed — inline-code-doc-links (6 MDT-237 scenarios) + smartlink-doc-refs + smartlink-anchor + markdown-rendering regressions
- Post-review parity check: old-vs-new preprocessor byte-identical on anchor-bearing tokens (regression found and fixed in-session)

## Watchlist
- Documents-view mode (sourcePath outside a ticket) restores ticket-key .md
  tokens verbatim (no ticketKey ⇒ no ticket link) — pre-existing behavior,
  unchanged by this round; extend D12 routing there only if a real use case appears.
- The architecture decisions table stops at D9 for round-1 items D10/D11
  (they live only in uat.md history); D12 was appended directly after D9.
