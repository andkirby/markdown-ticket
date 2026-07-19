---
code: MDT-138
status: Implemented
dateCreated: 2026-03-12T22:06:27.335Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-093
---

# Add dot-notation namespace system for sub-document tabs

## 1. Description

### Requirements Scope
`full` — detailed requirements for new feature

### Problem
- Current sub-document system (MDT-093) uses folder-based hierarchy, requiring directories for grouped documents
- Users cannot logically group related documents using simple filename conventions
- Dot-notation filenames (e.g., `architecture.approve-it.md`) are treated as flat files rather than namespaced groups

### User Value
- Users can organize related documents using dot-notation without creating directories
- Users see grouped documents as nested tabs (namespace > sub-document)
- Users can mix folder-based and dot-notation approaches as needed

### Affected Areas
- Frontend: Tab rendering component (namespace expansion logic)
- Backend: File discovery service (dot-notation parsing)
- Shared: Document type definitions
- Configuration: Sub-document ordering

### Scope
- **In scope**: Dot-notation namespace discovery, UI grouping, backward compatibility with folder system
- **Out of scope**: Migrating existing documents, changing MDT-093 folder behavior

## 2. Desired Outcome

### Success Conditions
- When `architecture.md` and `architecture.approve-it.md` exist, UI shows `[architecture >] [main] [approve-it]`
- When `tests.one.md` and `tests.two.md` exist (no `tests.md`), UI shows `[tests >] [one] [two]` (no `[main]` tab)
- When only `architecture.md` exists, UI shows normal `[architecture]` tab
- When `a.b.c.md` exists, UI shows `[a >] [b.c]` (first segment = namespace, rest preserved)
- Folder-based and dot-notation systems coexist without conflicts

### Namespace Rules
- `filename.md` → root document
- `filename.semantic.md` → namespaced under `filename` with sub-key `semantic`
- `filename.semantic.variant.md` → namespaced under `filename` with sub-key `semantic.variant` (multiple dots preserved)
- Sorting within namespace: alphanumerical

### Affected Document Types
- requirements
- bdd
- architecture
- tests
- tasks

### Constraints
- Must integrate with MDT-093 folder-based sub-document system
- Must not break existing document discovery
- Must use same shadcn Tabs component as MDT-093
- Backend must return namespace structure in API response
- Ordering must respect `.mdt-config.toml` settings
- NO `[main]` tab when no root document exists

### Non-Goals
- Not changing how folder-based documents work
- Not requiring migration of existing documents
- Not adding dot-notation support to other file types

## 3. Decisions

### Resolved Decisions
- **Parsing**: `a.b.c.md` → namespace `a`, sub-key `b.c` (first segment = namespace, rest preserved)
- **Display**: NO `[main]` tab when no root document exists
- **Sorting**: Alphanumerical within each namespace
- **API approach**: Dot-notation files appear as virtual folders in subdocuments array (backward compatible)
- **Backend**: Use existing sub-document system, no new service needed
- **Frontend**: `src/components/TicketDetail/SubDocumentTabs.tsx`
- **Types**: `shared/types/Document.ts`
- **Tests**: `server/src/__tests__/services/DocumentService.test.ts`

### Known Constraints
- Must use existing shadcn Tabs from MDT-093
- Backend file discovery must parse dot notation
- API response must be backward compatible (virtual folders)

### Decisions Deferred
- Specific parsing implementation (determined by `/mdt:architecture`)
- Task breakdown (determined by `/mdt:tasks`)

## 3.5. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Virtual Folders** | Dot-notation as virtual folders in API | **ACCEPTED** - Backward compatible, no schema changes |
| New API fields | Add `namespace` and `subKey` fields | Breaking change, more complex response |
| Client-side parsing | Parse dot-notation entirely on frontend | Inefficient, duplicates logic, harder to test |

## 3.6. Affected Artifacts

### Modified Artifacts
| File | Change |
|------|--------|
| `src/components/TicketDetail/SubDocumentTabs.tsx` | Add namespace grouping logic, display nested tabs |
| `shared/types/Document.ts` | Add types for namespace-aware subdocument structure |
| `server/src/services/DocumentService.ts` | Add dot-notation parsing to sub-document discovery |

### New Artifacts
| File | Purpose |
|------|---------|
| `server/src/__tests__/services/DocumentService.test.ts` | Unit tests for namespace parsing (if not exists) |

### Integration Points
| Component | Interface |
|-----------|-----------|
| Frontend tabs | Consumes `subdocuments` array from `/api/projects/:id/crs/:key` |
| Backend API | Returns virtual folders in existing `subdocuments` array |

## 4. Acceptance Criteria

### Functional
- [x] Files matching `{type}.md` display as single `[type]` tab when no dot-variants exist
- [x] Files matching `{type}.{semantic}.md` are grouped under `[type >]` namespace tab
- [x] Namespace tab shows sub-tabs for each semantic part, sorted alphanumerically
- [x] When no `{type}.md` exists, only semantic sub-tabs are shown (NO `[main]` tab)
- [x] `a.b.c.md` displays as `[a >] [b.c]` (multiple dots preserved in sub-key)
- [x] Selecting namespace tab shows first sub-document
- [x] URL routing includes namespace path (e.g., `/ticket/{id}/architecture/approve-it`)
- [x] SSE updates reflect namespace changes in real-time
- [x] Folder-based and dot-notation documents coexist in same ticket

### Non-Functional
- [x] Namespace parsing completes in < 10ms per ticket
- [x] Tab rendering uses existing shadcn patterns
- [x] No layout shift when switching between namespace levels

### Edge Cases
- [x] Handle `a.b.c.d.md` (multiple dots) → namespace `a`, sub-key `b.c.d`
- [x] Handle conflicting folder + dot notation (e.g., `architecture/` folder AND `architecture.x.md`)
- [x] Handle special characters in semantic part (e.g., `tests.e2e-smoke.md`)
- [x] Handle folder + dot coexistence: `bdd.one.md` shows `[one]`, `bdd/two.md` shows `[/two]` (gray `/` prefix)

## 5. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-138/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-138/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-138/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-138/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-138/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-138/architecture.md)

### How to Verify Success
- Manual: Create test documents with dot notation, verify tab grouping
- Automated: Unit tests for namespace parsing logic in `server/src/__tests__/services/DocumentService.test.ts`
- Integration: API returns correct namespace structure as virtual folders
- E2E: Tab navigation works for dot-notation documents

### Example Test Cases

```text
Given: docs/CRs/MDT-100/architecture.md
  AND: docs/CRs/MDT-100/architecture.approve-it.md
  AND: docs/CRs/MDT-100/architecture.update.v2.md
When: User views MDT-100
Then: UI shows [architecture >] [main] [approve-it] [update.v2]

Given: docs/CRs/MDT-100/tests.one.md
  AND: docs/CRs/MDT-100/tests.two.md
  AND: NO tests.md exists
When: User views MDT-100
Then: UI shows [tests >] [one] [two] (no [main])

Given: docs/CRs/MDT-100/a.b.c.md
When: User views MDT-100
Then: UI shows [a >] [b.c]

Given: docs/CRs/MDT-100/bdd.scenario-1.md
When: User views MDT-100
Then: UI shows [bdd >] [scenario-1]
```

## 8. Clarifications

### Session 2026-03-12
- Q: Which backend file should contain the dot-notation namespace parsing logic? → A: Use existing sub-document system, no new service needed
- Q: Which frontend component/hook handles namespace tab rendering? → A: `src/components/TicketDetail/SubDocumentTabs.tsx`
- Q: How should the API represent dot-notation documents? → A: Virtual folders (backward compatible)
- Q: Which shared types file should contain namespace-related types? → A: `shared/types/Document.ts`
- Q: Where should backend namespace parsing unit tests live? → A: `server/src/__tests__/services/DocumentService.test.ts`

### UAT Session 2026-07-18

**Trigger**: Opening `http://localhost:3075/prj/MDT/ticket/MDT-138/architecture.md` falls back to the `[Main]` tab instead of opening `architecture`. Address bar keeps the deep-link URL, but no nested tab row renders and `/subdocuments/architecture` is never requested. Follow-up repro after the first fix revealed a second, masked bug at `http://localhost:3075/prj/MDT/ticket/MDT-138/bdd.trace.md` (dot-notation child of a physical folder).

**Root causes**: two independent bugs.

1. **Bug 1 (MDT-184 regression)**: `src/utils/subdocPathValidation.ts::extractSubDocPath`
   searched for the literal substring `'/ticket/'` inside the regex source
   produced by `routePatternToRegex`, but that source escapes `/` as `\/`, so
   `indexOf` returned `-1`. The `:ticketKey` substitution then landed in the
   projectCode slot, producing a pattern that matched
   `/prj/MDT-138/ticket/...` instead of `/prj/MDT/ticket/MDT-138/...`. As a
   result `extractSubDocPath` returned `null` for every project-prefixed
   subdoc URL, and `useTicketDocumentNavigation` fell back to
   `ROOT_DOCUMENT_PATH`. Direct `/ticket/{key}/{subdoc}` URLs still worked
   because their pattern's first `[^/]+` slot is the ticket key.
2. **Bug 2 (valid-path lookup asymmetry)**:
   `src/components/TicketViewer/useTicketDocumentNavigation.ts::collectPaths`
   decided the path separator for a child based on the **folder's** storage
   type (virtual → dot, physical → slash) and only emitted both forms for
   virtual folders. Dot-notation children of physical folders (e.g.
   `bdd.trace.md` grouped under physical `bdd/`) were emitted as `bdd/trace`
   but never as `bdd.trace`, while the URL is derived from the child's
   filePath (`bdd.trace`). The `validPaths.has('bdd.trace')` lookup returned
   false → Main fallback. This bug was entirely masked by Bug 1 until Bug 1
   was fixed.

**Implemented fixes** (`refine_in_place` — no new requirement IDs):
- `extractSubDocPath` now substitutes the literal `:ticketKey` token in the
  un-escaped `ROUTE_DIRECT_TICKET_SUBDOC` / `ROUTE_TICKET_SUBDOC` constants
  (after regex-escaping `crId`) before converting to regex via
  `routePatternToRegex`. No more string surgery on the escaped regex source.
- `collectPaths` now generates **both** dot and slash path forms for every
  non-root subdoc, regardless of folder storage type. Canonical separator
  mirrors how the folder itself was reached; the alternate form is always
  registered.

**Deferred (Slice 3)**: unit tests for `extractSubDocPath` covering
project-prefixed, direct, dot-notation, slash-notation, and multi-segment
paths; E2E strengthening of `root_document_url_routing`,
`dot_notation_url_routing`, and `folder_subfile_url_routing` to assert
`data-state="active"` instead of `toBeVisible()`. Existing E2E suite still
passes against the fixes, so this is hardening, not a functional gap.

**Changed requirement IDs**: none new. Re-verified (still valid):
`BR-6`, `BR-9`, `BR-10`, `BR-11`.

**Updated workflow documents**:
- `uat.md` — written (current-round brief, covers both bugs)
- `tasks.md` — TASK-4 added (Restore deep-link routing for `/prj/...` subdoc URLs)
- `requirements.md`, `bdd.md`, `architecture.md`, `tests.md` — no change
  (intent unchanged; only test-binding obligations sharpened, recorded under
  TASK-4)

**Trace sync**:
- `spec-trace task upsert MDT-138 TASK-4` (owns `ART-navigation-hook`,
  `ART-subdoc-tabs`; makes green `root_document_url_routing`,
  `dot_notation_url_routing`, `folder_subfile_url_routing`).
- `spec-trace render tasks MDT-138` rendered.
- `spec-trace validate MDT-138 --stage tasks` still reports one pre-existing
  gap (`MISSING_TASK_CLOSURE` for `physical_child_with_dot_in_filename`)
  unrelated to this UAT round — verified pre-existing via `git stash`.

**Verification (this commit)**:
- `bun test src/__tests__/routes.test.ts` — 22/22 pass
- `bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx` — 10/10 pass
- `bunx playwright test tests/e2e/ticket/namespace.spec.ts` — 19/19 pass
- `bunx playwright test tests/e2e/ticket/subdoc-navigation.spec.ts tests/e2e/ticket/subdoc-preload.spec.ts` — 21 pass, 1 pre-existing skip
- Manual smoke (live): all seven URL forms in `uat.md` verification table resolve to expected active tab

**Strict drift/lock**: not used (narrow approved refinement).

**Implementation handoff**: Slice 3 (test hardening) remains; mark TASK-4
done when it lands.
