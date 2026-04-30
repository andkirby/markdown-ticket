# Tasks: MDT-150

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking
**Architecture decision**: Preprocessor resolves all links, SmartLink renders.

## Scope Boundaries

- **Preprocessor**: Resolves ALL `.md` refs to absolute URLs using `sourcePath`. This is the core change.
- **SmartLink**: Unchanged. Pure renderer.
- **linkProcessor, linkNormalization, linkBuilder**: Unchanged.
- **Backend**: Unchanged. MDT-151.

## Ownership Guardrails

| Critical Behavior | Owner Module | Overlap Risk |
|-------------------|--------------|-------------|
| Link resolution | `src/utils/markdownPreprocessor.ts` | None |
| sourcePath plumbing | `TicketViewer` → `MarkdownContent` → `useMarkdownProcessor` | None |
| Document routing | `App.tsx` + `DocumentsLayout.tsx` | None |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 4 |
| C2 | Task 4 |
| C3 | Task 1, Task 2 |
| C4 | Task 4 |
| C5 | Task 1 (preprocessor extended, not changed in behavior) |

## Milestones

**Execution order**: Task 1 → Task 2 → Task 3 → Task 4 (strict sequential)

| Milestone | Tasks | Checkpoint |
|-----------|-------|------------|
| M1: Preprocessor resolution | Task 1 | All `.md` refs resolve to absolute URLs |
| M2: sourcePath plumbing | Task 2 | Preprocessor receives sourcePath, real links resolve correctly |
| M3: Path-style routing | Task 3 | Documents view uses path-style routes |
| M4: Regression lock | Task 4 | All constraint tests GREEN |

## Real Href Examples (from actual ticket files)

These are the real broken links that must be fixed:

| Source file | Raw href | Current behavior | Expected after fix |
|---|---|---|---|
| `docs/CRs/MDT-150/requirements.md` line 3 | `../MDT-150-smartlink-doc-urls.md` | relative path → broken | `/prj/MDT/ticket/MDT-150` |
| Any subdoc in `docs/CRs/MDT-150/` | `architecture.md` | bare filename → broken | `/prj/MDT/ticket/MDT-150/architecture.md` |
| Any subdoc in `docs/CRs/MDT-150/` | `../../README.md` | relative path → broken | `/prj/MDT/documents?file=docs/README.md` |
| Any subdoc in `docs/CRs/MDT-150/` | `MDT-151.md` | ticket key + .md → broken | `/prj/MDT/ticket/MDT-151` |

## Tasks

### Task 1: Preprocessor — resolve .md refs to absolute URLs (M1)

**Structure**: `src/utils/markdownPreprocessor.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-preprocessor-regression` → `src/utils/markdownPreprocessor.mdt150.test.ts`
- `TEST-link-normalization-resolution` → `src/utils/linkNormalization.mdt150.test.ts`

**Makes GREEN (Behavior)**:
- `ticket_subdoc_reference` → bare `architecture.md` resolves as subdoc
- `project_doc_reference` → `../../README.md` resolves as documents
- `sibling_ticket_reference` → `MDT-151.md` resolves as ticket
- `anchor_fragment_preserved` → `architecture.md#top` preserves anchor
- `ticket_key_filename_resolves` → `MDT-150-smartlink-doc-urls.md` resolves as ticket

**Scope**: Add `resolveDocumentRef(href, sourcePath, ticketKey, projectCode)` to the preprocessor. Called during `convertDocumentReferences`. Uses sourcePath to resolve relative paths, detect ticket-key patterns, and produce absolute URLs.

**Resolution logic** (in this order):
1. If href matches ticket key pattern (`^[A-Z]+-\d+$` or `^[A-Z]+-\d+\.md$` or `^[A-Z]+-\d+-.*\.md$`) → ticket URL
2. If href is bare filename (no `/`, no `..`) → ticket subdoc URL (`/prj/{code}/ticket/{key}/{filename}`)
3. If href contains `..` → resolve against sourcePath → if resolved path is inside ticket folder → ticket subdoc; if outside → documents URL
4. Preserve any `#anchor` on all types

**Boundary**: No changes to `convertTicketReferences`, `protectExistingLinks`, or code block protection.

**Creates**: (nothing new)

**Modifies**:
- `src/utils/markdownPreprocessor.ts` — add `resolveDocumentRef()`, update `convertDocumentReferences` to use it

**Must Not Touch**:
- `src/utils/linkProcessor.ts`
- `src/utils/linkNormalization.ts`
- `src/utils/linkBuilder.ts`
- `src/components/SmartLink/index.tsx`
- `server/`

**Exclude**: No changes to ticket ref wrapping. No changes to code block protection.

**Anti-duplication**: Reuse ticket key regex from `convertTicketReferences`. Do NOT copy.

**Duplication Guard**:
- Extract ticket key regex to a shared constant if both functions need it
- Verify no overlap with existing `convertTicketReferences` logic

**Verify**:

```bash
bun test src/utils/markdownPreprocessor.mdt150.test.ts
bun -e "
const { preprocessMarkdown } = require('./src/utils/markdownPreprocessor.ts')
// sourcePath: 'MDT-150/requirements.md' (subdoc of ticket MDT-150)
const result = preprocessMarkdown('[MDT-150](../MDT-150-smartlink-doc-urls.md)', 'MDT', { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true }, 'MDT-150/requirements.md')
console.log('Result:', result)
console.log('Has ticket URL:', result.includes('/prj/MDT/ticket/MDT-150'))
"
```

**Done when**:
- [ ] `../MDT-150-smartlink-doc-urls.md` resolves to `/prj/MDT/ticket/MDT-150`
- [ ] `architecture.md` resolves to `/prj/MDT/ticket/MDT-150/architecture.md`
- [ ] `../../README.md` resolves to `/prj/MDT/documents?file=docs/README.md`
- [ ] `MDT-151.md` resolves to `/prj/MDT/ticket/MDT-151`
- [ ] `architecture.md#top` preserves `#top`
- [ ] Existing preprocessor tests GREEN
- [ ] Existing ticket ref wrapping unchanged

---

### Task 2: sourcePath plumbing — TicketViewer → MarkdownContent → preprocessor (M2)

**Structure**: `src/components/TicketViewer/index.tsx`, `src/components/MarkdownContent/index.tsx`, `src/components/MarkdownContent/useMarkdownProcessor.ts`

**Makes GREEN (Behavior)**:
- `ticket_subdoc_reference`, `project_doc_reference`, `sibling_ticket_reference` — these only work once the preprocessor actually receives sourcePath

**Scope**: Thread `sourcePath` from TicketViewer through to `preprocessMarkdown()`.

**Plumbing chain**:

```text
TicketViewer/index.tsx:
  - currentSubdoc.filePath = e.g. "MDT-150/requirements.md"
  - for root doc: construct "MDT-150.md" from ticketKey
  - Pass as sourcePath prop to MarkdownContent

MarkdownContent/index.tsx:
  - Accept optional sourcePath prop
  - Pass to useMarkdownProcessor

MarkdownContent/useMarkdownProcessor.ts:
  - Accept optional sourcePath param
  - Pass to preprocessMarkdown(markdown, currentProject, linkConfig, sourcePath)
```

**Boundary**: Only prop threading. No logic changes in any component.

**Creates**: (nothing)

**Modifies**:
- `src/components/TicketViewer/index.tsx` — add `sourcePath` prop to `<MarkdownContent>`
- `src/components/MarkdownContent/index.tsx` — accept `sourcePath` prop, pass down
- `src/components/MarkdownContent/useMarkdownProcessor.ts` — accept `sourcePath` param, pass to `preprocessMarkdown`

**Must Not Touch**:
- `src/components/SmartLink/index.tsx`
- `src/utils/markdownPreprocessor.ts` (Task 1 handles this)
- `src/utils/linkProcessor.ts`
- `server/`

**Exclude**: No logic in the plumbing. Just passing the value through.

**Anti-duplication**: Use existing `subdocument.filePath` from TicketViewer. Do NOT derive sourcePath from route params.

**Duplication Guard**: N/A — pure prop threading.

**Verify**:

```bash
# Manual: open http://localhost:5173/prj/MDT/ticket/MDT-150
# Click the "Source: MDT-150" link in requirements.md
# Should navigate to /prj/MDT/ticket/MDT-150 (not broken documents URL)
bun run test:e2e --grep="@MDT-150"
```

**Done when**:
- [ ] `preprocessMarkdown` receives `sourcePath` when rendering subdocs
- [ ] `preprocessMarkdown` receives `sourcePath` when rendering root doc
- [ ] Real broken link `[MDT-150](../MDT-150-smartlink-doc-urls.md)` produces correct ticket URL
- [ ] No console errors from missing/undefined sourcePath

---

### Task 3: Documents — path-style routing with useParams (M3)

**Structure**: `src/App.tsx`, `src/components/DocumentsView/DocumentsLayout.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-documents-path-route` → `tests/e2e/documents/path-style-routing.spec.ts`

**Makes GREEN (Behavior)**:
- `documents_path_style_route` (BR-4)

**Scope**: Migrate documents view from query-param (`?file=`) to path-style routing (`/prj/:code/documents/:path`).

**Boundary**: Route structure change only. Document fetching unchanged.

**Creates**:
- `tests/e2e/documents/path-style-routing.spec.ts`

**Modifies**:
- `src/App.tsx` — wildcard route `/prj/:projectCode/documents/*`
- `src/components/DocumentsView/DocumentsLayout.tsx` — `useParams` instead of `useSearchParams`

**Must Not Touch**:
- `src/utils/markdownPreprocessor.ts`
- `src/components/TicketViewer/`
- `src/components/SmartLink/`
- `server/`

**Exclude**: No backend API changes.

**Anti-duplication**: Reuse route constants from existing app routing.

**Duplication Guard**: Verify no conflict with existing `/prj/:projectCode/documents` route.

**Verify**:

```bash
bun run test:e2e --grep="@MDT-150"
```

**Done when**:
- [ ] Direct URL `/prj/MDT/documents/docs/README.md` works
- [ ] Old `?file=` query param still works (redirect or graceful)

---

### Task 4: Constraint regression lock (M4)

**Structure**: `src/utils/linkProcessor.ts`, `src/components/SmartLink/index.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-link-processor-regression` → `src/utils/linkProcessor.mdt150.test.ts`: C1, C2
- `TEST-link-builder-regression` → `src/utils/linkBuilder.mdt150.test.ts`: C3, C4

**Scope**: Run all constraint tests. Verify nothing broke. Fix regressions.

**Boundary**: Test-only unless regression found.

**Creates**: (nothing)

**Modifies**: (only if regression found)

**Must Not Touch**:
- `src/utils/markdownPreprocessor.ts`
- `src/components/TicketViewer/`
- `src/App.tsx`
- `server/`

**Exclude**: No feature code changes. Fix regressions only.

**Verify**:

```bash
bun test src/utils/linkProcessor.mdt150.test.ts src/utils/linkBuilder.mdt150.test.ts src/utils/markdownPreprocessor.mdt150.test.ts
```

**Done when**:
- [ ] All constraint unit tests GREEN
- [ ] SmartLink unchanged — no resolution logic added
- [ ] linkProcessor classification unchanged

---

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] SmartLink has NO resolution logic (pure renderer)
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Real broken link `[MDT-150](../MDT-150-smartlink-doc-urls.md)` works correctly
- [ ] Bare `architecture.md` resolves as subdoc
- [ ] Backwards compatibility for `?file=` query param
