# Tasks: MDT-155

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md`

## Scope Boundaries

- TicketViewer: source-path selection only; no navigation or SmartLink rendering changes.
- markdownPreprocessor: document-reference token matching only; no resolution algorithm changes.
- MDT-152 quick-search files: excluded.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Active subdocument source path | `src/components/TicketViewer/index.tsx` | N/A |
| Bare `.md` reference matching | `src/utils/markdownPreprocessor.ts` | N/A |
| Absolute subdoc route classification | `src/utils/linkProcessor.ts` | N/A, regression only |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 3 |
| C2 | Task 4 |
| C3 | Task 4 |
| C4 | Task 4 |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------:|---------:|----:|--------|
| src/components/TicketViewer/ | 2 | 2 | 0 | OK |
| src/utils/ | 3 | 3 | 0 | OK |

## Tasks

### Task 1: Add focused MDT-155 regression tests

**Skills**: mdt-frontend

**Structure**: `src/components/TicketViewer/TicketViewer.test.tsx`, `src/utils/markdownPreprocessor.mdt155.test.ts`, `src/utils/linkProcessor.mdt150.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-viewer-sourcepath` -> `src/components/TicketViewer/TicketViewer.test.tsx`
- `TEST-markdown-reference-regex` -> `src/utils/markdownPreprocessor.mdt155.test.ts`
- `TEST-link-processor-subdoc-anchor` -> `src/utils/linkProcessor.mdt150.test.ts`
- `TEST-relative-md-anchor-classification` -> `src/utils/linkProcessor.mdt150.test.ts`

**Scope**: Add/adjust tests for MDT-155 behavior.
**Boundary**: Runtime code changes are not part of this task.

**Creates**:
- `src/utils/markdownPreprocessor.mdt155.test.ts`

**Modifies**:
- `src/components/TicketViewer/TicketViewer.test.tsx`

**Must Not Touch**:
- `src/hooks/useQuickSearch.test.ts`
- `tests/e2e/quick-search/modal.spec.ts`

**Create/Move**:
- Add component assertion for `MarkdownContent.sourcePath`.
- Add preprocessor regex hardening tests.

**Exclude**: No runtime implementation.

**Anti-duplication**: Reuse existing test setup and mocks.

**Duplication Guard**:
- Check existing MDT-150 tests before adding coverage.
- Do not add a second link classification test file for behavior already covered.

**Verify**:
```bash
bun test ./src/components/TicketViewer/TicketViewer.test.tsx ./src/utils/markdownPreprocessor.mdt155.test.ts ./src/utils/linkProcessor.mdt150.test.ts
```

**Done when**:
- [x] New tests exist and fail before implementation where applicable.
- [x] Existing linkProcessor regression remains present.

### Task 2: Use selected SubDocument.filePath for TicketViewer sourcePath

**Skills**: mdt-frontend

**Structure**: `src/components/TicketViewer/index.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-viewer-sourcepath` -> `src/components/TicketViewer/TicketViewer.test.tsx`

**Makes GREEN (Behavior)**:
- `subdocument_sourcepath_uses_file_path` (BR-1.1)

**Scope**: Resolve active subdocument metadata and pass its `filePath` into `MarkdownContent`.
**Boundary**: Do not change tab selection, path URL format, or content loading.

**Creates**:
- None.

**Modifies**:
- `src/components/TicketViewer/index.tsx`

**Must Not Touch**:
- `src/components/TicketViewer/useTicketDocumentNavigation.ts`
- `src/components/TicketViewer/useTicketDocumentContent.ts`

**Create/Move**:
- Add a local helper if needed to find active subdocuments recursively.

**Exclude**: No SmartLink or markdown resolver changes.

**Anti-duplication**: Reuse `filePathToApiPath`; do not duplicate path normalization.

**Duplication Guard**:
- Check existing subdocument helper functions before adding a new one.
- Verify only TicketViewer owns the MarkdownContent source-path decision.

**Verify**:
```bash
bun test ./src/components/TicketViewer/TicketViewer.test.tsx
```

**Done when**:
- [x] `TEST-ticket-viewer-sourcepath` is GREEN.
- [x] Source path for root ticket remains `{ticketCode}.md`.

### Task 3: Tighten markdownPreprocessor document reference matching

**Structure**: `src/utils/markdownPreprocessor.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-markdown-reference-regex` -> `src/utils/markdownPreprocessor.mdt155.test.ts`

**Makes GREEN (Behavior)**:
- `standalone_markdown_refs_are_tight` (BR-1.2)

**Scope**: Replace broad `\S+\.md` matching with a boundary-aware relative markdown reference regex.
**Boundary**: Do not alter `resolveDocumentRef` semantics.

**Creates**:
- None.

**Modifies**:
- `src/utils/markdownPreprocessor.ts`

**Must Not Touch**:
- `src/utils/linkProcessor.ts`
- `src/utils/linkNormalization.ts`

**Create/Move**:
- Introduce a named regex constant if it improves clarity.

**Exclude**: No URL normalization or SmartLink rendering changes.

**Anti-duplication**: Keep reference parsing inside `convertDocumentReferences`.

**Duplication Guard**:
- Check ticket filename placeholder handling before modifying patterns.
- Verify no second document-reference converter is introduced.

**Verify**:
```bash
bun test ./src/utils/markdownPreprocessor.mdt155.test.ts ./src/utils/markdownPreprocessor.mdt150.test.ts
```

**Done when**:
- [x] `TEST-markdown-reference-regex` is GREEN.
- [x] Existing MDT-150 preprocessor tests remain GREEN.

### Task 4: Verify link preservation, full regression, and MDT-152 exclusion

**Structure**: `src/utils/linkProcessor.mdt150.test.ts`, `src/components/TicketViewer/index.tsx`, `src/utils/markdownPreprocessor.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-link-processor-subdoc-anchor` -> `src/utils/linkProcessor.mdt150.test.ts`
- `TEST-relative-md-anchor-classification` -> `src/utils/linkProcessor.mdt150.test.ts`
- `TEST-existing-frontend-suite` -> `bun run fe:test`
- `TEST-no-mdt152-diff` -> manual diff check

**Makes GREEN (Behavior)**:
- `absolute_subdoc_routes_are_documents` (BR-1.3)
- `relative_markdown_anchor_links_are_documents` (BR-1.4)

**Scope**: Run regression verification and confirm excluded quick-search files are unchanged.
**Boundary**: Do not modify MDT-152 test files.

**Creates**:
- None.

**Modifies**:
- None expected.

**Must Not Touch**:
- `src/hooks/useQuickSearch.test.ts`
- `tests/e2e/quick-search/modal.spec.ts`

**Create/Move**:
- None.

**Exclude**: No implementation changes unless a regression fails.

**Anti-duplication**: Use existing MDT-150 linkProcessor tests.

**Duplication Guard**:
- Verify route classification is covered by the existing regression test.
- Do not add redundant E2E coverage for this internal classifier.

**Verify**:
```bash
bun test ./src/utils/linkProcessor.mdt150.test.ts
bun run fe:test
git diff --name-only -- src/hooks/useQuickSearch.test.ts tests/e2e/quick-search/modal.spec.ts
```

**Done when**:
- [x] LinkProcessor regression test is GREEN.
- [x] Existing frontend suite is GREEN.
- [x] MDT-152 files do not appear in the diff.

## Post-Implementation

- [x] No duplication.
- [x] Scope boundaries respected.
- [x] All listed Bun tests GREEN.
- [x] Existing frontend suite GREEN.
- [x] MDT-152 excluded files unchanged.

> Tasks trace projection: [tasks.trace.md](./tasks.trace.md)
