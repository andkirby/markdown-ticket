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
- [ ] Files matching `{type}.md` display as single `[type]` tab when no dot-variants exist
- [ ] Files matching `{type}.{semantic}.md` are grouped under `[type >]` namespace tab
- [ ] Namespace tab shows sub-tabs for each semantic part, sorted alphanumerically
- [ ] When no `{type}.md` exists, only semantic sub-tabs are shown (NO `[main]` tab)
- [ ] `a.b.c.md` displays as `[a >] [b.c]` (multiple dots preserved in sub-key)
- [ ] Selecting namespace tab shows first sub-document
- [ ] URL routing includes namespace path (e.g., `/ticket/{id}/architecture/approve-it`)
- [ ] SSE updates reflect namespace changes in real-time
- [ ] Folder-based and dot-notation documents coexist in same ticket

### Non-Functional
- [ ] Namespace parsing completes in < 10ms per ticket
- [ ] Tab rendering uses existing shadcn patterns
- [ ] No layout shift when switching between namespace levels

### Edge Cases
- [ ] Handle `a.b.c.d.md` (multiple dots) → namespace `a`, sub-key `b.c.d`
- [ ] Handle conflicting folder + dot notation (e.g., `architecture/` folder AND `architecture.x.md`)
- [ ] Handle special characters in semantic part (e.g., `tests.e2e-smoke.md`)
- [ ] Handle folder + dot coexistence: `bdd.one.md` shows `[one]`, `bdd/two.md` shows `[/two]` (gray `/` prefix)

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
