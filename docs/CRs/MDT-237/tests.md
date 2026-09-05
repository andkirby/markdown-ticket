# Tests: MDT-237 — Inline-code .md references

Canonical test plans live in spec-trace (`tests.trace.md`). Narrative only.

## Written test assets

| File | Kind | Covers |
|------|------|--------|
| `frontend/src/utils/markdownPreprocessor.mdt237.test.ts` | unit (bun test) | BR-1.1, BR-2.2, BR-2.4, BR-2.5, BR-2.6, BR-3.1, BR-3.2, BR-4.1, C1, C2, C4, C8, C9, Edge-1 |
| `frontend/src/utils/documentExistenceCache.test.ts` | unit (bun test) | BR-2.1, C5 |
| `tests/e2e/ticket/inline-code-doc-links.spec.ts` | Playwright E2E | BR-1.1, BR-1.2, BR-2.1, BR-3.1, BR-3.2, BR-2.4 (BDD scenarios) |

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
