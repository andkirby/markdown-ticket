---
code: MDT-150
status: Implemented
dateCreated: 2026-04-26T12:37:31.002Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-151
---

# SmartLink document URL generation with scope validation

> Requirements trace projection: [requirements.trace.md](./MDT-150/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-150/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-150/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-150/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-150/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-150/architecture.md)
> Tests trace projection: [tests.trace.md](./MDT-150/tests.trace.md)
> Tests notes: [tests.md](./MDT-150/tests.md)
> Tasks trace projection: [tasks.trace.md](./MDT-150/tasks.trace.md)
> Tasks notes: [tasks.md](./MDT-150/tasks.md)

## 1. Description

### Requirements Scope
full — feature enhancement, complete smart document linking

### Problem
- SmartLink renders document references (e.g., `core-layout.md`) as relative path-style URLs that resolve to 404 (`/prj/OFF/documents/ui-sync-families/core-layout.md`)
- The working URL format uses a query parameter (`/prj/OFF/documents?file=docs/ui-sync-contract.md`) but SmartLink never produces it
- Scope enforcement for document paths exists in `LinkNormalizer` but is dead code — `linkContext` is never passed to `SmartLink`, so out-of-scope links silently break instead of being flagged

### Affected Areas
- Frontend: Document link rendering in markdown content
- Frontend: SmartLink component and link processing pipeline
- Frontend: Markdown preprocessor (link conversion)

### Scope
- **In scope**: Document references in markdown render as navigable links
- **In scope**: Document links outside configured scopes are flagged as broken
- **Out of scope**: Ticket reference links (already working)
- **Out of scope**: File link handling (images, PDFs, etc.)
- **Out of scope**: Backend document discovery or API changes

## 2. Desired Outcome

### Success Conditions
- When a user clicks a `.md` document reference in rendered markdown, the documents view opens with the correct file selected
- Document links produce URLs matching the route format that `DocumentsLayout` expects (`?file=` query parameter)
- When a document link targets a file outside configured document scopes, the link is visibly marked as broken (not silently 404-ing)

### Constraints
- Must not alter ticket reference link behavior (`MDT-001` → `/prj/MDT/ticket/MDT-001`)
- Must not alter external link behavior
- Must preserve existing anchor (`#section`) support on document links
- Must work for both relative paths (`../other/file.md`) and bare filenames (`file.md`)

### Non-Goals
- Not changing the documents view route structure
- Not adding new backend APIs
- Not modifying file link (non-markdown) handling

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Should the preprocessor generate absolute URLs for document refs (like ticket refs), or should SmartLink normalize at render time? | Must produce `?file=` format |
| Architecture | How should `linkContext` be threaded through the rendering pipeline to enable scope validation? | SmartLink already accepts `linkContext` prop |
| Integration | Should scope validation be strict (block out-of-scope) or permissive (warn but navigate)? | Config currently allows all if no paths set |

### Known Constraints
- `LinkNormalizer.buildDocumentWebRoute()` already produces the correct `?file=` format — it exists but is unused by the preprocessor
- `SmartLink` already accepts optional `linkContext` and `originalHref` props for normalization
- `DocumentsLayout` only reads `searchParams.get('file')` — there is no path-style route for documents

### Decisions Deferred
- Implementation approach (determined by `/mdt:architecture`)
- Whether to add a catch-all documents route as fallback (determined by `/mdt:architecture`)
- How to surface broken-scope links visually (determined by `/mdt:architecture`)

## 4. Acceptance Criteria

### Functional
- [x] Clicking a relative document reference (`../other/file.md`) in rendered markdown opens the documents view with that file selected
- [x] Clicking a bare filename reference (`file.md`) in rendered markdown opens the documents view with that file selected
- [x] Document references with anchors (`file.md#section`) scroll to the correct heading in the document viewer
- [x] A document link targeting a path outside configured document scopes renders as a broken link indicator

### Non-Functional
- [x] No regression in ticket reference link rendering
- [x] No regression in external link rendering
- [x] Document link generation adds no perceptible delay to markdown rendering

### Edge Cases
- Document reference in a deeply nested ticket subdocument resolves correctly relative to its source
- Document reference with URL-encoded characters (spaces, special chars) navigates correctly
- Empty or missing document path configuration does not break document links

## 5. Verification

### How to Verify Success
- Manual: Open a ticket containing document references, click each link, verify documents view opens with correct file
- Manual: Create a link to a `.md` file outside configured document paths, verify it shows as broken
- Automated: E2E test that renders markdown with document references and verifies link href format
- Automated: E2E test that clicks a document link and confirms the documents view loads

## 6. Clarifications

### UAT Session 2026-04-29

**Trigger**: Implementation was fabricated (no code changes on disk). UAT revealed the original architecture was overengineered and a preprocessor bug.

**Approved changes**:
- Resolution model simplified: bare filenames = current ticket subdoc, ticket-key pattern = ticket view, `..` paths = path math → documents view
- Context source changed: `useParams()` instead of `sourcePath` threading through 3 components
- Preprocessor exclusion guard added: `convertDocumentReferences` skips ticket-key filenames
- C5 relaxed: allows defensive exclusion guard
- `linkNormalization.ts`, `linkBuilder.ts`, `linkProcessor.ts` now marked as **unchanged**

**Changed requirement IDs**: BR-1 (refined), BR-2 (expanded), C5 (relaxed)

**Updated docs**: requirements.md, bdd.md, architecture.md, tasks.md, uat.md

**Trace projections**: All 5 re-rendered, all stages validate clean

**uat.md written**: Yes

**More implementation required**: Yes — all 4 tasks are pending (none were actually completed)

### UAT Session 3 (2026-07-21)

**Trigger**: User reported that relative `.md` links in the documents view resolve incorrectly — `[x](relative.md)` in `/prj/ABC/documents?file=docs/architecture/aaaa.md` produces `/prj/ABC/documents/relative.md` (drops the source directory). UAT investigation confirmed two root-cause layers and one stale artifact.

**Approved changes**:
- BR-1 refined: relative `.md` resolution now explicitly applies in **both** ticket and documents views.
- BR-5 added (new requirement): `resolveDocumentRef` must accept source context anchored to either `ticketsPath` (ticket view) or the documents root (documents view). Documents-view resolutions route to `/prj/:code/documents/:path`, never to a ticket subdoc URL.
- New BDD scenario `documents_view_relative_reference` (covers BR-1, BR-5).
- Architecture addendum: `DocumentsView/MarkdownViewer.tsx` added as Modified; `resolveDocumentRef` gains an additive documents-mode branch auto-detected via sourcePath shape (`^[A-Z]+-\d+/` prefix → ticket mode, otherwise documents mode). New artifact `ART-documents-viewer`; new obligation `OBL-documents-viewer-sourcepath`; `OBL-preprocessor-resolve` refined to cover BR-5; invariant #4 added.
- Tasks rebuilt as current remaining work: historical Tasks 1–4 marked `done` in `.tasks-status.yaml` (shipped in `fe8613c9`, hardened by MDT-155). Two new pending tasks: `TASK-documents-view-resolve` and `TASK-regression-lock`.
- Tests expanded: 2 new unit tests (`TEST-preprocessor-documents-mode`), 1 new E2E (`TEST-e2e-documents-relative-link`).
- Stale `.tasks-status.yaml` corrected (was claiming all 4 original tasks pending).
- CR status flipped `Implemented → In Progress` (documents-view gap is real remaining work).

**Changed requirement IDs**: BR-1 (refine_in_place), BR-5 (additive_change, new).

**Updated docs**: requirements.md, bdd.md, architecture.md, tests.md, tasks.md, uat.md.

**Trace projections**: All 5 re-rendered; all stages validate clean (`requirements`, `bdd`, `architecture`, `tests`, `tasks`).

**uat.md written**: Yes — current-round brief, replaced prior round.

**Strict drift/lock used**: No (standard validation per stage only).

**More implementation required**: Yes — two pending tasks (~30 LOC + tests). Deferred to a separate `mdt:implement` pass per user direction.

### Implementation Session (2026-07-22)

**Slices shipped**: TASK-documents-view-resolve (M1) + TASK-regression-lock (M2).

**Code changes**:
- `src/utils/markdownPreprocessor.ts`: Added documents-mode branch to `resolveDocumentRef`. Detection rule: sourcePath NOT matching `^[A-Z]+-\d+(?:/|\.md$)` (i.e. not a ticket subdoc or main ticket doc). Resolves href against source document's directory via existing `resolveRelativePath` helper; routes to `buildDocumentPathWithAnchor`. Relaxed gates in `protectExistingLinks` and `convertDocumentReferences` from `sourcePath && ticketKey && projectCode` to `sourcePath && projectCode` so documents-mode (where ticketKey is undefined) engages the resolver.
- `src/components/DocumentsView/MarkdownViewer.tsx`: Pass `sourcePath={filePath}` to `<MarkdownContent>`.
- `src/components/MarkdownContent/index.tsx`: Expanded `sourcePath` prop docstring to document both accepted forms.

**Tests added**:
- 6 unit tests in `src/utils/markdownPreprocessor.mdt150.test.ts` (BR-5 block): bare filename, `../sibling.md`, nested `sub/deep.md`, anchor preservation, no-ticket-route guard, unwrapped bare filename.
- 1 E2E test in `tests/e2e/documents/relative-link-resolution.spec.ts`: navigates to source doc, asserts link href contains `docs/architecture/relative.md`, clicks link, verifies navigation to sibling doc.

**Proof**:
- 67/67 MDT-150 unit tests GREEN (61 original + 6 new). Zero regressions.
- 214/214 `src/utils/` broader sweep GREEN.
- New E2E test GREEN against running dev server.
- `tsc --noEmit` clean on changed files.

**Detection regex evolution**: Initial attempt used `^[A-Z]+-\d+/` which misclassified main ticket docs (`MDT-150.md`, no slash) as documents-mode and regressed 2 existing tests. Corrected to `^[A-Z]+-\d+(?:/|\.md$)` to recognize both ticket subdoc and main ticket doc forms. Caught by the existing test suite — the regression was never at large.

**Scope discipline**:
- No URL scheme migration (path-style output stays out of scope; the `?file=` format remains the builder's contract, consumed by `DocumentsLayout`).
- No changes to `linkProcessor.ts`, `linkNormalization.ts`, `linkBuilder.ts`, `SmartLink/`, `TicketViewer/`, `App.tsx`, `server/`.
- No new parameters on `preprocessMarkdown` — form detected from sourcePath shape.
- Step 1.5 ticket-filename protection left untouched (edge case: ticket-key-named `.md` files inside documents view pass through unresolved; tracked as potential follow-up, not in this fix's scope).

**uat.md proof target note**: The UAT brief originally cited `/prj/ABC/documents/docs/architecture/relative.md` as the expected URL. Actual correct output is `/prj/ABC/documents?file=docs%2Farchitecture%2Frelative.md` (query-param format, the established contract). Brief updated to match.

**Status**: CR flipped `In Progress → Implemented`. All tasks done.
