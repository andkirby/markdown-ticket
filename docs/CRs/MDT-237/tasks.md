# Tasks: MDT-237 — Inline-code .md references as clickable links

Canonical task records live in spec-trace (`tasks.trace.md`). Operator view below.

### Task 1: Implement documentExistenceCache module

**Structure**: `frontend/src/utils/documentExistenceCache.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-unit-cache` → `frontend/src/utils/documentExistenceCache.test.ts`

**Scope**: per-project deduped `GET /api/documents` (authFetch), sync `getCachedDocumentIndex` (null while loading), `subscribeDocumentIndex`, `__testSeed`/`__testReset` test hooks.
**Boundary**: no link logic, no React, no per-call fetches.
**Creates**: `frontend/src/utils/documentExistenceCache.ts`
**Modifies**: None
**Must Not Touch**: `markdownPreprocessor.ts`, `SmartLink/index.tsx`
**Anti-duplication**: reuse `authFetch` from its existing module — do NOT re-implement fetch auth.
**Re-plan Trigger**: `/api/documents` shape differs from DocumentsLayout's consumption.

### Task 2: Add inline-code .md conversion branch to protectInlineCode

**Structure**: `frontend/src/utils/markdownPreprocessor.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-unit-conversion`, `TEST-unit-preservation` → `frontend/src/utils/markdownPreprocessor.mdt237.test.ts`
- `fenced_code_path_stays_plain`, `genuine_inline_code_stays_plain` (unit-level)

**Scope**: optional context param on `protectInlineCode`; whole-span qualification via `isRelativeMarkdownHref` (anchor allowed); qualifying spans → `resolveDocumentRef` → markdown link stored in `state.linkPlaceholders` (restored last — nested-link guard).
**Boundary**: `protectCodeBlocks`, `convertTicketReferences`, `convertDocumentReferences` semantics unchanged; missing ctx byte-identical.
**Modifies**: `frontend/src/utils/markdownPreprocessor.ts`
**Must Not Touch**: `frontend/src/routes.ts`, `linkProcessor.ts`, `linkNormalization.ts`
**Anti-duplication**: import `resolveDocumentRef`-family from the same file — no copied resolution logic.
**Re-plan Trigger**: any MDT-150 regression test fails semantically (not superficially).

### Task 3: Render known-missing DOCUMENT links as broken in SmartLink

**Skills**: mdt-frontend

**Structure**: `frontend/src/components/SmartLink/index.tsx`

**Makes GREEN (Behavior)**:
- `broken_reference_visibly_flagged` → `tests/e2e/ticket/inline-code-doc-links.spec.ts` (BR-2.1)

**Scope**: DOCUMENT branch consults `getCachedDocumentIndex`; known-missing → existing broken span + `title="Document not found"`; unknown → normal link; triggers one index load per project.
**Boundary**: TICKET/CROSS_PROJECT links untouched (D7); no changes to classifyLink/normalization.
**Modifies**: `frontend/src/components/SmartLink/index.tsx`
**Must Not Touch**: `useMarkdownProcessor.ts`, DOMPurify config
**Anti-duplication**: reuse the existing broken-span rendering (L92-98 pattern) — no new CSS classes.
**Re-plan Trigger**: broken styling regresses other link types.

### Task 4: Verify E2E scenarios and full regression suite

**Structure**: `tests/e2e/ticket/inline-code-doc-links.spec.ts` (already written — RED)

**Makes GREEN (Behavior)**:
- `convert_inline_code_doc_reference`, `client_side_navigation_no_reload` (BR-1.1, BR-1.2)
- `TEST-e2e-bdd`, `TEST-regression-suite`

**Scope**: run scoped Playwright spec, `bun run fe:test`, `bun run lint:frontend`, `bun run validate:ts`; fix only MDT-237-surface defects.
**Boundary**: no unrelated refactors, no test weakening.
**Re-plan Trigger**: E2E infra failure unrelated to the feature.

### Task 5: UAT round 2 — plain-text ticket-key path tokens (done 2026-09-05)

**Structure**: `frontend/src/utils/markdownPreprocessor.ts` (Step 1.5 capture + `restoreTicketFilenameRef`)

**Makes GREEN (Automated Tests)**:
- `TEST-unit-plaintext-token` → `frontend/src/utils/markdownPreprocessor.mdt237.test.ts`

**Scope**: whole-token capture in the Step 1.5 regex; restore-time routing to the documents view on positive index knowledge outside the tickets area; byte-identical legacy fallback otherwise (BR-2.6, D12). Completed in-session; no remaining execution work on this ticket.

### Task 6: UAT round 3 — tickets-area routing + coverage-bounded flagging (done 2026-09-12)

**Structure**: `frontend/src/utils/markdownPreprocessor.ts` (`classifyTicketsAreaPath` + `resolveDocumentRef` branches), `frontend/src/components/SmartLink/index.tsx` (coversPrefix guard), `frontend/src/components/DocumentsView/MarkdownViewer.tsx` (ticketsPath wiring)

**Makes GREEN (Automated Tests)**:
- `TEST-unit-tickets-routing` → `frontend/src/utils/markdownPreprocessor.mdt237.test.ts`
- `TEST-unit-cover-bounded-flag` → `frontend/src/components/SmartLink/index.test.tsx`
- `TEST-unit-cache` (coversPrefix cases) → `frontend/src/utils/documentExistenceCache.test.ts`
- `TEST-unit-docsview-ticketspath` → `frontend/src/components/DocumentsView/MarkdownViewer.test.tsx`

**Scope**: tickets-area targets route to the ticket in every source mode (D13); SmartLink broken flagging requires index coverage of the target directory (D14); happy-dom test setup gains a real origin (about:blank silently disabled the existence check in component tests). Completed in-session.

## Execution order

1 → 2 → 3 → 4 (Tasks 1 and 2 are independent; 3 depends on 1; 4 last). Tasks 5–6 are UAT rounds, executed after 4.
