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
- [ ] Clicking a relative document reference (`../other/file.md`) in rendered markdown opens the documents view with that file selected
- [ ] Clicking a bare filename reference (`file.md`) in rendered markdown opens the documents view with that file selected
- [ ] Document references with anchors (`file.md#section`) scroll to the correct heading in the document viewer
- [ ] A document link targeting a path outside configured document scopes renders as a broken link indicator

### Non-Functional
- [ ] No regression in ticket reference link rendering
- [ ] No regression in external link rendering
- [ ] Document link generation adds no perceptible delay to markdown rendering

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
