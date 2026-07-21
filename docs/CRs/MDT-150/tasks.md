# Tasks: MDT-150

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking
**Architecture decision**: Preprocessor resolves all links, SmartLink renders.
**UAT 2026-07-21 rebuild**: Original Tasks 1–4 shipped in `fe8613c9` and were hardened by MDT-155 (`4d38aab7`). They are no longer *remaining* work. This file now tracks **current remaining execution closure** for the documents-view resolution gap surfaced in UAT Session 3. Completed historical tasks remain in the canonical store (`spec-trace task list MDT-150`) for audit; their implementation evidence lives in the original commit.

## Scope Boundaries

- **Preprocessor**: Add documents-view mode to `resolveDocumentRef` (additive branch, ticket-mode logic untouched).
- **MarkdownViewer**: Pass `sourcePath` to `MarkdownContent`.
- **SmartLink**: Unchanged. Pure renderer.
- **linkProcessor, linkNormalization, linkBuilder**: Unchanged.
- **Backend**: Unchanged. MDT-151.

## Ownership Guardrails

| Critical Behavior | Owner Module | Overlap Risk |
|-------------------|--------------|-------------|
| Link resolution (ticket mode) | `src/utils/markdownPreprocessor.ts` existing branches | Regression risk — guard with C5 tests |
| Link resolution (documents mode) | `src/utils/markdownPreprocessor.ts` new branch | None — additive |
| Documents-view sourcePath plumbing | `DocumentsView/MarkdownViewer.tsx` → `MarkdownContent` | None — MarkdownContent already threads sourcePath |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | TASK-regression-lock (unchanged behavior verification) |
| C2 | TASK-regression-lock |
| C3 | TASK-documents-view-resolve (new branch must handle bare + `..` in documents mode) |
| C4 | TASK-regression-lock (no security checks added) |
| C5 | TASK-regression-lock (ticket-mode branches unchanged) |

## Milestones

**Execution order**: TASK-documents-view-resolve → TASK-regression-lock (strict sequential)

| Milestone | Tasks | Checkpoint |
|-----------|-------|------------|
| M1: Documents-view resolution | TASK-documents-view-resolve | Relative `.md` in `/prj/:code/documents?file=docs/architecture/aaaa.md` resolves against source dir |
| M2: Regression lock | TASK-regression-lock | All 61 existing unit tests still GREEN; 2 new unit tests GREEN; 1 new E2E GREEN |

## Real Href Examples (current bug — must be fixed)

| Source document | Raw href | Current behavior | Expected after fix |
|---|---|---|---|
| `/prj/ABC/documents?file=docs/architecture/aaaa.md` | `relative.md` | passes through → browser resolves against URL root → `/prj/ABC/documents/relative.md` (broken) | `/prj/ABC/documents/docs/architecture/relative.md` |
| Same as above | `../sibling.md` | passes through → `/prj/ABC/documents/../sibling.md` | `/prj/ABC/documents/docs/sibling.md` |
| Same as above | `sub/deep.md` | passes through → `/prj/ABC/documents/sub/deep.md` (drops `docs/architecture`) | `/prj/ABC/documents/docs/architecture/sub/deep.md` |

## Tasks

### TASK-documents-view-resolve (M1)

**Structure**: `src/components/DocumentsView/MarkdownViewer.tsx`, `src/utils/markdownPreprocessor.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-preprocessor-documents-mode` → `src/utils/markdownPreprocessor.mdt150.test.ts` (2 new tests)
- `TEST-e2e-documents-relative-link` → `tests/e2e/documents/relative-link-resolution.spec.ts` (1 new test)

**Makes GREEN (Behavior)**:
- `documents_view_relative_reference` (BR-1, BR-5)

**Scope**: Two surgical changes.

1. **`DocumentsView/MarkdownViewer.tsx` (line ~214-219)**: Pass `sourcePath={selectedFile}` (the project-relative path already tracked by the component, sourced from `useParams`) and `ticketsPath` to `<MarkdownContent>`. No other prop changes.

2. **`markdownPreprocessor.ts → resolveDocumentRef`**: Add a branch at the top of the function that detects documents-view source context. Detection rule: `sourcePath` does NOT match `^[A-Z]+-\d+/` (i.e. not a ticket-key-prefixed subdoc path). In documents mode:
   - Resolve the href against the source document's directory using the existing `resolveRelativePath` helper.
   - Route to `buildDocumentPathWithAnchor(projectCode, resolvedPath, anchor)`.
   - Never produce a ticket subdoc URL in this mode.

**Boundary**: The new branch is purely additive. The existing ticket-mode branches (ticket-key filename, bare filename in ticket context, `..` relative inside ticket folder) remain first in order and unchanged.

**Modifies**:
- `src/components/DocumentsView/MarkdownViewer.tsx` — add `sourcePath` prop to `<MarkdownContent>`
- `src/utils/markdownPreprocessor.ts` — add documents-mode branch to `resolveDocumentRef`

**Must Not Touch**:
- `src/utils/linkProcessor.ts`
- `src/utils/linkNormalization.ts`
- `src/utils/linkBuilder.ts`
- `src/components/SmartLink/index.tsx`
- `src/components/TicketViewer/` (sourcePath plumbing already shipped there)
- `src/App.tsx`, `src/components/DocumentsView/DocumentsLayout.tsx` (path-style routing already shipped)
- `server/`

**Exclude**: No changes to ticket-mode resolution. No new mode parameter on `preprocessMarkdown` (form is detected from sourcePath shape). No drive-by URL scheme migration.

**Anti-duplication**: Reuse `resolveRelativePath` helper already in the preprocessor. Do NOT copy path math.

**Duplication Guard**: The documents-mode branch and the ticket-mode `..` branch both end in `buildDocumentPathWithAnchor` — extract a shared tail only if it produces obviously cleaner code; otherwise leave inline.

**Verify**:

```bash
# Unit tests (2 new should turn GREEN, 61 existing should stay GREEN)
bun test src/utils/markdownPreprocessor.mdt150.test.ts

# Direct execution proof — sourcePath = documents-relative
bun -e "
const { preprocessMarkdown } = require('./src/utils/markdownPreprocessor.ts')
const config = { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }
const out = preprocessMarkdown('see [x](relative.md)', 'ABC', config, 'docs/architecture/aaaa.md', 'docs/CRs')
console.log(out)  // expect: see [x](/prj/ABC/documents/docs/architecture/relative.md)
"

# E2E (after dev server up)
bun run test:e2e --grep="@MDT-150"
```

**Done when**:
- [x] `MarkdownViewer.tsx` passes `sourcePath={selectedFile}` to `<MarkdownContent>`
- [x] `[x](relative.md)` in `docs/architecture/aaaa.md` resolves to `/prj/ABC/documents?file=docs%2Farchitecture%2Frelative.md`
- [x] `[x](../sibling.md)` in same source resolves to `/prj/ABC/documents?file=docs%2Fsibling.md`
- [x] `[x](sub/deep.md)` in same source resolves to `/prj/ABC/documents?file=docs%2Farchitecture%2Fsub%2Fdeep.md`
- [x] Existing ticket-context resolution unchanged (61 unit tests GREEN)
- [x] No console errors from missing/undefined sourcePath when documents view has no file selected

---

### TASK-regression-lock (M2)

**Structure**: `src/utils/linkProcessor.ts`, `src/components/SmartLink/index.tsx` (test-only unless regression found)

**Makes GREEN (Automated Tests)**:
- `TEST-link-processor-regression` → `src/utils/linkProcessor.mdt150.test.ts`: C1, C2
- `TEST-link-builder-regression` → `src/utils/linkBuilder.mdt150.test.ts`: C3, C4
- `TEST-preprocessor-regression` → `src/utils/markdownPreprocessor.mdt150.test.ts`: C5

**Scope**: Run all constraint tests. Verify nothing broke. Fix regressions only.

**Boundary**: Test-only unless regression found.

**Must Not Touch**:
- `src/utils/markdownPreprocessor.ts` (beyond what TASK-documents-view-resolve changed)
- `src/components/TicketViewer/`
- `src/App.tsx`
- `server/`

**Verify**:

```bash
bun test src/utils/linkProcessor.mdt150.test.ts src/utils/linkBuilder.mdt150.test.ts src/utils/markdownPreprocessor.mdt150.test.ts src/utils/linkNormalization.mdt150.test.ts
```

**Done when**:
- [x] All constraint unit tests GREEN (target: 67 total — 61 existing + 6 new)
- [x] SmartLink unchanged — no resolution logic added
- [x] linkProcessor classification unchanged
- [x] Ticket-mode resolution in preprocessor unchanged

---

## Post-Implementation

- [x] No duplication (grep check)
- [x] SmartLink has NO resolution logic (pure renderer)
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Documents-view relative `.md` link in `docs/architecture/aaaa.md` resolves against source dir
- [x] Ticket-view relative `.md` resolution unchanged (regression)
- [x] Backwards compatibility for `?file=` query param preserved

## Completed Historical Tasks (reference, not remaining work)

The following tasks shipped in commit `fe8613c9` (2026-04-30) and were hardened by MDT-155 (`4d38aab7`). Listed here for audit context only:

- TASK-preprocessor-resolve (Task 1) — `resolveDocumentRef` ticket-mode branches
- TASK-sourcepath-plumb (Task 2) — `TicketViewer` → `MarkdownContent` → `useMarkdownProcessor` sourcePath threading
- TASK-docs-path-route (Task 3) — `/prj/:code/documents/*` wildcard route + `DocumentsLayout` useParams
- TASK-regression-lock (Task 4, original) — C1–C5 constraint lock

These remain in the canonical spec-trace store for traceability.
