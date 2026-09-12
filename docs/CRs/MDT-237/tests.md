# Tests: MDT-237 — Inline-code .md references

Canonical test plans live in spec-trace (`tests.trace.md`). Narrative only.

## Written test assets

| File | Kind | Covers |
|------|------|--------|
| `frontend/src/utils/markdownPreprocessor.mdt237.test.ts` | unit (bun test) | BR-1.1, BR-2.2, BR-2.4, BR-2.5, BR-2.6, BR-2.7, BR-3.1, BR-3.2, BR-4.1, C1, C2, C4, C8, C9, Edge-1 |
| `frontend/src/utils/documentExistenceCache.test.ts` | unit (bun test) | BR-2.1, BR-2.8, C5 |
| `frontend/src/components/SmartLink/index.test.tsx` | unit (bun test, happy-dom) | BR-2.1, BR-2.8 |
| `frontend/src/components/DocumentsView/MarkdownViewer.test.tsx` | unit (bun test, happy-dom) | BR-2.7 (ticketsPath wiring) |
| `tests/e2e/ticket/inline-code-doc-links.spec.ts` | Playwright E2E | BR-1.1, BR-1.2, BR-2.1, BR-3.1, BR-3.2, BR-2.4 (BDD scenarios) |

## UAT 2026-09-12 additions (BR-2.7/BR-2.8)

- Preprocessor: 8 tickets-area routing cases — documents-view explicit link
  into `.tickets/` (the live GPDE-012 case), anchor carry, subdoc paths,
  bare ticket-key basenames, ticket-context other-ticket subdocs, and
  non-ticket regression guards (sibling/bare files keep documents routing).
- SmartLink component suite (new file): coverage-bounded flagging —
  tickets-area and unconfigured-prefix targets render normal links;
  covered-and-missing still flags (BR-2.1 preserved); unknown index stays
  no-signal; existing covered target links normally.
- Cache: direct `coversPrefix` semantics (covered dir true, tickets area /
  unconfigured false, empty index false).
- Wiring: MarkdownViewer forwards the configured ticketsPath to
  MarkdownContent (2 cases: configured value + config-failure fallback);
  its fetch mock upgraded from queue-based fixtures to URL-aware routing —
  the viewer's second API call (project config) would otherwise consume
  content fixtures.
- Harness: `test-setup.ts` registers happy-dom with a real origin
  (`http://localhost:3075/`) — under `about:blank`, `new URL(href,
  window.location.origin)` throws inside the existence check, which had
  silently forced "not broken" for every component test of this path.

## RED evidence (pre-implementation)

`bun test ./frontend/src/utils/markdownPreprocessor.mdt237.test.ts ./frontend/src/utils/documentExistenceCache.test.ts`
→ 6 pass / 5 fail / 1 error (module not found). Failing cases are exactly the
unimplemented conversion behaviors; passing cases are preservation invariants
already true today.

## Commands

- Unit: `bun test ./frontend/src/utils/markdownPreprocessor.mdt237.test.ts ./frontend/src/utils/documentExistenceCache.test.ts`
- Full frontend: `bun run fe:test`
- Lint: `bun run lint:frontend`
- E2E (scoped): `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/inline-code-doc-links.spec.ts --project=chromium` (or `bun run test:e2e` for full server-managed run)

**Next**: `mdt:tasks MDT-237`
