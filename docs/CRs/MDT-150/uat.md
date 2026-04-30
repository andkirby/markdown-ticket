# UAT Refinement Brief — MDT-150

## Objective

Simplify the architecture after UAT discovered that (a) the implementation was fabricated, (b) the original `sourcePath` threading approach was overengineered, and (c) a preprocessor bug causes double-wrap corruption on ticket-key filenames.

## Approved Changes

1. **Resolution model simplified**: Bare filenames resolve inside the current ticket folder. Only context needed is the ticket key from the current route (`useParams()`). No `sourcePath` prop threading through TicketViewer → MarkdownContent → useHtmlParser → SmartLink.
2. **Preprocessor exclusion guard**: `convertDocumentReferences` must skip `.md` filenames starting with a ticket key pattern (`^[A-Z]+-\d+.*\.md$`). Prevents `MDT-150-smartlink-doc-urls.md` from being double-wrapped into corrupted markdown.
3. **C5 relaxed**: Preprocessor needs one defensive change. Doesn't alter what ticket refs or document refs *do* — only prevents a collision.
4. **Fewer files change**: `linkNormalization.ts`, `linkBuilder.ts`, `linkProcessor.ts` are now **unchanged**. Only SmartLink and preprocessor are modified (plus App.tsx/DocumentsLayout for Task 3).
5. **No `..` to backend**: SmartLink resolves all relative paths on the frontend. Backend only receives clean paths.

## Changed Requirement IDs

| ID | Change | Identity |
|----|--------|----------|
| BR-1 | Simplified: bare filename = subdoc, `..` = path math → documents. No `ticketsPath` boundary math. | refine_in_place |
| BR-2 | Expanded: covers ticket-key filenames (`MDT-151.md`, `MDT-150-smartlink-doc-urls.md`) | refine_in_place |
| C5 | Relaxed: allows preprocessor exclusion guard | refine_in_place |

## Affected Downstream Trace

| Stage | Changes |
|-------|---------|
| requirements | BR-1, BR-2, C5 text updated |
| bdd | Scenarios updated for simplified resolution model |
| architecture | Obligations rewritten, module boundaries updated, 3 modules now "Unchanged" |
| tests | Test plans still valid (same coverage IDs). Test file content needs update for new model. |
| tasks | Rebuilt from 4 old tasks to 4 new tasks with different scope |

## Execution Slices

### Slice 1: Fix preprocessor corruption (Task 1)
- **Objective**: Stop `MDT-150-smartlink-doc-urls.md` from producing corrupted markdown
- **Direct artifacts/files**: `src/utils/markdownPreprocessor.ts`
- **Direct GREEN targets**: `TEST-preprocessor-regression`
- **Impacted canonical task**: `TASK-preprocessor-guard`
- **Why**: The double-wrap corruption is a live bug that makes ticket-key filenames render as gibberish links. Must fix before SmartLink changes will be testable.

### Slice 2: SmartLink resolution (Task 2)
- **Objective**: Make `.md` references in ticket context resolve correctly
- **Direct artifacts/files**: `src/components/SmartLink/index.tsx`
- **Direct GREEN targets**: `ticket_subdoc_reference`, `project_doc_reference`, `sibling_ticket_reference`, `anchor_fragment_preserved`, `TEST-link-normalization-resolution`
- **Impacted canonical task**: `TASK-smartlink-resolve`
- **Why**: Core feature. Uses `useParams()` to get ticket key, resolves bare filenames as subdocs, `..` paths as documents, ticket-key filenames as ticket views.

### Slice 3: Documents path routing (Task 3)
- **Objective**: Migrate documents view to path-style routing
- **Direct artifacts/files**: `src/App.tsx`, `src/components/DocumentsView/DocumentsLayout.tsx`
- **Direct GREEN targets**: `documents_path_style_route`, `TEST-e2e-documents-path-route`
- **Impacted canonical task**: `TASK-docs-path-route`
- **Why**: Clean shareable URLs. Not strictly required for SmartLink to work (could use query params) but BR-4 mandates it.

### Slice 4: Regression lock (Task 4)
- **Objective**: Verify no regressions after all changes
- **Direct artifacts/files**: None (test verification only)
- **Direct GREEN targets**: `TEST-link-processor-regression`, `TEST-link-builder-regression`
- **Impacted canonical task**: `TASK-regression-lock`
- **Why**: C1-C5 must hold. Run after all other changes.

## Validation

- [x] `spec-trace validate MDT-150 --stage all` passes clean
- [x] All 5 trace projections re-rendered
- [x] Human-owned docs updated (requirements.md, bdd.md, architecture.md, tasks.md)
- [ ] Unit tests need content update to match new resolution model (2 were RED, will need adjustment)
- [ ] E2E test files don't exist yet (created in Task 2 and Task 3)

## Watchlist

- **C5 tension**: Preprocessor exclusion guard technically touches `convertDocumentReferences`. Verify that ticket ref wrapping (`convertTicketReferences`) still works identically.
- **Documents view outside ticket context**: If `.md` refs appear in documents view (not ticket context), `useParams()` won't have a ticket key. Currently out of scope.
- **Test file updates**: `linkNormalization.mdt150.test.ts` tests `LinkNormalizer` directly, but the new model may not need `LinkNormalizer` changes at all. These tests may need to move to SmartLink-level tests.

## Open Decisions

- ~~Should `linkNormalization.ts` tests be rewritten to test SmartLink's new resolution logic instead of `LinkNormalizer`? The resolution is moving into SmartLink directly.~~ **RESOLVED**: Resolution moved to preprocessor, not SmartLink. Tests should test preprocessor's new `resolveDocumentRef()`.

### UAT Session 2 (2026-04-30)

**Decision**: Preprocessor resolves, SmartLink renders. `useParams`-only approach failed because SmartLink can't resolve `../MDT-150-smartlink-doc-urls.md` without knowing the source file location.

**Changed**: Architecture reverted to sourcePath threading, but resolution lives in preprocessor (not SmartLink). Task 1 = preprocessor resolution logic. Task 2 = sourcePath plumbing. SmartLink stays unchanged.
