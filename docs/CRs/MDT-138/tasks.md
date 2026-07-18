# Tasks: MDT-138

**Source**: [MDT-138](../MDT-138-add-dot-notation-namespace-system-for-sub-document.md)
**Trace**: [tasks.trace.md](./tasks.trace.md)

## Scope Boundaries

- **Backend (TicketService)**: Namespace parsing logic, virtual folder creation
- **Frontend (TicketDocumentTabs)**: Namespace tab rendering, [main] tab visibility, URL routing
- **Shared (SubDocument type)**: Type extension with `isVirtual` field

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|-------------------------------|
| Dot-notation parsing | `server/services/TicketService.ts` | N/A |
| Virtual folder creation | `server/services/TicketService.ts` | N/A |
| Namespace tab rendering | `src/components/TicketViewer/TicketDocumentTabs.tsx` | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C-1 | TASK-2 |
| C-2 | TASK-3 |
| C-3 | TASK-3 |
| C-4 | TASK-2 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M1: Backend parsing | BR-2, BR-4 | TASK-1, TASK-2 | Unit + integration tests GREEN |
| M2: Frontend rendering | BR-1, BR-3, BR-5, BR-6, BR-7, BR-8 | TASK-3 | All E2E scenarios GREEN |

## Tasks

### Task 1: Extend SubDocument type with isVirtual field

**Skills**: TypeScript

**Milestone**: M1 — Backend parsing (BR-2, BR-4)

**Structure**: `shared/models/SubDocument.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-namespace-parser-unit` → `server/tests/unit/namespace-parser.test.ts`: namespace grouping tests

**Scope**: Add `isVirtual?: boolean` field to SubDocument interface

**Boundary**: Type definition only, no runtime logic changes

**Creates**:
- Type extension in `shared/models/SubDocument.ts`

**Modifies**:
- `shared/models/SubDocument.ts`

**Must Not Touch**:
- Frontend components
- Backend services
- Test files (tests already define the extended type)

**Exclude**: Changes to parsing logic (belongs to TASK-2)

**Anti-duplication**: Import `SubDocument` from `@mdt/shared/models/SubDocument.js` — do NOT redefine

**Duplication Guard**:
- Check `shared/models/SubDocument.ts` for existing type definition
- Extend in place, do not create new type file

**Verify**:

```bash
bun run --cwd server jest tests/unit/namespace-parser.test.ts
```

**Done when**:
- [x] `isVirtual?: boolean` field added to SubDocument interface
- [x] Unit tests GREEN (were already GREEN with local type)
- [x] No duplicated type definitions

---

### Task 2: Implement namespace parsing in TicketService

**Skills**: TypeScript

**Milestone**: M1 — Backend parsing (BR-2, BR-4)

**Structure**: `server/services/TicketService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-namespace-parser-unit` → `server/tests/unit/namespace-parser.test.ts`: all parsing tests
- `TEST-namespace-api-integration` → `server/tests/api/ticket-namespace.test.ts`: all API tests

**Scope**: Implement `parseNamespace` and `groupNamespacedFiles` functions, integrate into `discoverSubDocuments`

**Boundary**: Backend service layer only

**Creates**:
- `parseNamespace(filename: string)` function in `server/services/TicketService.ts`
- `groupNamespacedFiles(files, existingFolders)` function in `server/services/TicketService.ts`

**Modifies**:
- `server/services/TicketService.ts` — add namespace parsing logic to `discoverSubDocuments`

**Must Not Touch**:
- Frontend components
- Shared type definitions
- API routes/controllers

**Exclude**: Changes to frontend rendering logic

**Anti-duplication**: Move parsing functions from test file to service — import from service in tests

**Duplication Guard**:
- Check `server/services/TicketService.ts` for existing subdocument discovery logic
- Extend `discoverSubDocuments` method in place
- Remove inline implementations from test file after migration

**Verify**:

```bash
# Unit tests
bun run --cwd server jest tests/unit/namespace-parser.test.ts

# Integration tests
bun run --cwd server jest tests/api/ticket-namespace.test.ts
```

**Done when**:
- [x] `parseNamespace` function implemented in TicketService
- [x] `groupNamespacedFiles` function implemented in TicketService
- [x] `discoverSubDocuments` updated to use namespace parsing
- [x] Unit tests GREEN
- [x] Integration tests GREEN
- [x] No duplicated parsing logic

---

### Task 3: Update TicketDocumentTabs for namespace grouping

**Skills**: frontend-react-component

**Milestone**: M2 — Frontend rendering (BR-1, BR-3, BR-5, BR-6, BR-7, BR-8)

**Structure**: `src/components/TicketViewer/TicketDocumentTabs.tsx`, `src/components/TicketViewer/useTicketDocumentNavigation.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-namespace-tabs` → `tests/e2e/ticket/namespace.spec.ts`: all E2E tests

**Makes GREEN (Behavior)**:
- `single_tab_display` → `tests/e2e/ticket/namespace.spec.ts` (BR-1)
- `no_main_tab_without_root` → `tests/e2e/ticket/namespace.spec.ts` (BR-3)
- `multi_dot_preservation` → `tests/e2e/ticket/namespace.spec.ts` (BR-4)
- `namespace_grouping_with_sorting` → `tests/e2e/ticket/namespace.spec.ts` (BR-2)
- `namespace_selection_shows_first` → `tests/e2e/ticket/namespace.spec.ts` (BR-5)
- `url_routing_namespace_path` → `tests/e2e/ticket/namespace.spec.ts` (BR-6)
- `root_document_url_routing` → `tests/e2e/ticket/namespace.spec.ts` (BR-9)
- `dot_notation_url_routing` → `tests/e2e/ticket/namespace.spec.ts` (BR-10)
- `folder_subfile_url_routing` → `tests/e2e/ticket/namespace.spec.ts` (BR-11)
- `sse_adds_subdocument` → `tests/e2e/ticket/namespace.spec.ts` (BR-7)
- `sse_removes_subdocument` → `tests/e2e/ticket/namespace.spec.ts` (BR-7)
- `folder_dot_coexistence` → `tests/e2e/ticket/namespace.spec.ts` (BR-8, Edge-4)
- `special_characters_preserved` → `tests/e2e/ticket/namespace.spec.ts` (Edge-3)

**Scope**:
1. Update tab rendering to handle virtual folders with namespace grouping
2. **Fix URL navigation gap** - `selectPath` in `useTicketDocumentNavigation.ts` must update browser URL when selecting subdocuments (lines 149-153 comment is stale - URL should include namespace path)

**Boundary**: Frontend components only, consumes API response

**Gap Analysis**:
Current code at `useTicketDocumentNavigation.ts:149-153` keeps URL at ticket level:

```typescript
// URL is kept at the ticket level (/prj/CODE/ticket/KEY) to avoid
// React Router route switching...
```

**Required fix**: In `selectPath` callback, add URL navigation with actual file path:

```typescript
// path is like "requirements.scope" or "bdd/legacy"
const urlPath = path + '.md'  // or use apiPathToUrlPath if it handles this
navigate(`/prj/${projectCode}/ticket/${ticketCode}/${urlPath}`, { replace: true })
```

**URL format examples**:
- `bdd.one.md` file → URL: `/prj/{code}/ticket/{ticket}/bdd.one.md`
- `bdd/legacy.md` file → URL: `/prj/{code}/ticket/{ticket}/bdd/legacy.md`

**Modifies**:
- `src/components/TicketViewer/TicketDocumentTabs.tsx` — add namespace grouping logic

**Must Not Touch**:
- Backend services
- API routes/controllers
- Shared types

**Exclude**: Changes to backend parsing logic

**Anti-duplication**: Import `SubDocument` from `@mdt/shared/models/SubDocument.js` — do NOT redefine

**Duplication Guard**:
- Check existing `TicketDocumentTabs.tsx` for current tab rendering logic
- Extend `buildTabRows` function in place
- Verify no duplicate namespace logic (backend owns parsing)

**Verify**:

```bash
# E2E tests
bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium
```

**Done when**:
- [x] Namespace tabs render with expansion indicator (▶)
- [x] [main] tab hidden when no root document exists
- [x] Sub-tabs sorted alphanumerically
- [x] Multi-dot sub-keys preserved (e.g., `b.c` for `a.b.c.md`)
- [x] URL updates with namespace path format
- [x] SSE updates reflected in tab structure
- [x] Folder + dot notation coexistence works
- [x] All E2E tests GREEN

---

### Task 4: Restore deep-link routing for `/prj/...` sub-document URLs (UAT 2026-07-18)

**Skills**: frontend-react-component

**Milestone**: UAT M3 — Restore deep-link routing (BR-9, BR-10, BR-11)

**Source**: [uat.md](./uat.md) — UAT Refinement Brief 2026-07-18

**Structure**: `src/utils/subdocPathValidation.ts`, `src/components/TicketViewer/useTicketDocumentNavigation.ts`

**Status**:
- Slice 1 (Bug 1 fix — `extractSubDocPath`): **DONE**
- Slice 2 (Bug 2 fix — `collectPaths`): **DONE**
- Slice 3 (test hardening): **DEFERRED** — should land before MDT-138 closes

**Makes GREEN (Automated Tests)** — pending Slice 3:
- New unit tests in `src/__tests__/subdocPathValidation.test.ts` covering:
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/architecture.md', 'MDT-138')` → `'architecture.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/requirements.trace.md', 'MDT-138')` → `'requirements.trace.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/bdd/another.trace.md', 'MDT-138')` → `'bdd/another.trace.md'`
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138/bdd.trace.md', 'MDT-138')` → `'bdd.trace.md'` (Bug 2 direct case)
  - `extractSubDocPath('/ticket/MDT-138/architecture.md', 'MDT-138')` → `'architecture.md'` (direct — keep passing)
  - `extractSubDocPath('/prj/MDT/ticket/MDT-138', 'MDT-138')` → `null` (no subdoc)

**Makes GREEN (Behavior)** — pending Slice 3 strengthening:
- `root_document_url_routing` (BR-9) — assert `data-state="active"`
- `dot_notation_url_routing` (BR-10) — assert `data-state="active"`
- `folder_subfile_url_routing` (BR-11) — assert `data-state="active"`

**Scope**:
1. **Bug 1 (DONE)**: Fix `extractSubDocPath` so the `:ticketKey` substitution
   lands in the correct slot of the project-prefixed regex. The previous logic
   searched the escaped regex source for `'/ticket/'` and got `-1` because
   `routePatternToRegex` escapes `/` as `\/`. New logic substitutes the
   literal `:ticketKey` token in the un-escaped route pattern constants before
   regex conversion.
2. **Bug 2 (DONE)**: Fix `collectPaths` to generate both dot and slash path
   forms for every non-root subdoc, regardless of folder storage type. The URL
   is derived from the child's filePath (`bdd.trace.md` → `bdd.trace`), not
   the folder's storage type, so the valid-path lookup must accept either form.
3. **Slice 3 (DEFERRED)**: Strengthen the three E2E tests listed above to
   assert `data-state="active"` after `page.goto` to a `/prj/...` deep link,
   not merely `toBeVisible()`. Add unit coverage for `extractSubDocPath`.

**Root cause reference**: Bug 1 introduced by MDT-184 (commit `b400447e`).
Bug 2 was masked by Bug 1 and pre-existed in `collectPaths`. See `uat.md`
"Root Cause" section for both.

**Boundary**: Frontend utility + navigation hook + E2E assertions only.

**Modifies (Slices 1 and 2 — committed)**:
- `src/utils/subdocPathValidation.ts` — fixed `extractSubDocPath`
- `src/components/TicketViewer/useTicketDocumentNavigation.ts` — rewrote `collectPaths`

**Modifies (Slice 3 — deferred)**:
- `src/__tests__/subdocPathValidation.test.ts` — new (or extend if exists)
- `tests/e2e/ticket/namespace.spec.ts` — strengthen 3 tests with `data-state="active"` assertions

**Must Not Touch**:
- `src/routes.ts` (`routePatternToRegex` escaping is correct; Bug 1 was in the caller)
- Backend services
- Shared types

**Anti-duplication**: Bug 1 fix operates on the un-escaped `ROUTE_TICKET_SUBDOC`
pattern constant (`'/prj/:projectCode/ticket/:ticketKey/*'`) and substitutes
the literal `:ticketKey` token before escaping, rather than pattern-matching
against the escaped source. Bug 2 fix mirrors the same principle at the
path-lookup layer: register both separator forms rather than guessing one
from the folder's storage type.

**Verify (Slices 1 and 2 — performed)**:

```bash
# Unit (existing)
bun test src/__tests__/routes.test.ts                              # 22/22 pass
bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx  # 10/10 pass

# E2E (existing suite — no regression)
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium          # 19/19 pass
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/subdoc-navigation.spec.ts tests/e2e/ticket/subdoc-preload.spec.ts --project=chromium  # 21 pass, 1 pre-existing skip

# TypeScript
bunx tsc --noEmit -p tsconfig.json   # no new errors in changed files

# Manual smoke (live)
# All seven URL forms in uat.md verification table resolve to expected active tab
```

**Verify (Slice 3 — pending)**:

```bash
# New unit tests
bun test src/__tests__/subdocPathValidation.test.ts

# Strengthened E2E
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/ticket/namespace.spec.ts --project=chromium

# Trace
spec-trace validate MDT-138 --stage tests
```

**Done when**:
- [x] `extractSubDocPath` returns the sub-document path for `/prj/{code}/ticket/{key}/{subdoc}.md`
- [x] Direct `/ticket/{key}/{subdoc}.md` paths still extract correctly
- [x] `collectPaths` emits both dot and slash forms for every non-root subdoc
- [x] Manual smoke: `/prj/MDT/ticket/MDT-138/architecture.md` opens `architecture` tab + nested row
- [x] Manual smoke: `/prj/MDT/ticket/MDT-138/bdd.trace.md` opens `bdd` tab + `trace` nested tab
- [ ] New unit tests GREEN (Slice 3)
- [ ] Strengthened E2E tests GREEN — assert `data-state="active"` on targeted tab (Slice 3)

---

## Post-Implementation

- [ ] No duplication (grep check for `parseNamespace`, `groupNamespacedFiles`)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All integration tests GREEN
- [ ] All E2E scenarios GREEN
- [ ] Smoke test passes (create test documents with dot notation, verify tab grouping)
