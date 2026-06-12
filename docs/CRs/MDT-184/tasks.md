# Tasks: MDT-184

**Source**: canonical architecture/tests state + `tasks.trace.md`

## Scope Boundaries

- `src/routes.ts`: **Only** file that contains the `/prj` literal and route pattern strings
- `src/utils/linkBuilder.ts`: Re-exports builders from routes.ts, preserves public API
- All other files: import and use builders, no inline path construction

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Route pattern constants | `src/routes.ts` | N/A — single owner |
| Path builder functions | `src/routes.ts` (defs), `linkBuilder.ts` (re-exports) | N/A |
| Link classification | `linkProcessor.ts` | Already stable, no change needed |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C-1 | Task 1, Task 7, Task 8 |
| C-2 | Task 2, Task 3 |
| C-3 | Task 2, Task 4, Task 5, Task 6, Task 7 |

## Tasks

### Task 1: Create routes.ts with pattern constants and builder functions

**Structure**: `src/routes.ts`

**Makes GREEN**: `TEST-routes-patterns` → `src/__tests__/routes.test.ts`

**Scope**: Create the single source of truth for route patterns
**Boundary**: This file only defines constants and pure functions — no imports from app code

**Creates**:
- `src/routes.ts`

**Modifies**: (none)

**Must Not Touch**: Any existing file

**Anti-duplication**: This is the canonical source — all other files import from here

**Duplication Guard**:
- New file, no pre-existing owner
- `/prj` literal appears ONLY in this file

**Verify**:
```bash
bun test src/__tests__/routes.test.ts
```

**Done when**:
- [ ] All pattern constants defined (`ROUTE_PROJECT`, `ROUTE_TICKET`, etc.)
- [ ] All builder functions exported (`buildProjectPath`, `buildTicketPath`, `buildTicketSubDocPath`, `buildDocumentPath`, `buildDirectTicketPath`, `buildDirectTicketSubDocPath`)
- [ ] Tests GREEN

---

### Task 2: Refactor linkBuilder.ts to delegate to routes.ts

**Structure**: `src/utils/linkBuilder.ts`

**Makes GREEN**: `TEST-existing-tests-pass` → `src/utils/linkBuilder.mdt150.test.ts`

**Scope**: Replace hardcoded `/prj/` in linkBuilder with imports from routes.ts
**Boundary**: Public API (`buildTicketLink`, `buildDocumentLink`) must remain identical

**Modifies**:
- `src/utils/linkBuilder.ts`
- `src/utils/linkProcessor.ts` (verify no breakage — already uses buildTicketLink)

**Must Not Touch**: `src/routes.ts` (Task 1 owns), test files

**Anti-duplication**: Import pattern constants from `routes.ts` — do NOT copy

**Duplication Guard**:
- `linkBuilder.ts` is the existing builder — refactor in place
- Verify `linkProcessor.ts` still works (it imports from linkBuilder)

**Verify**:
```bash
bun test src/utils/linkBuilder.mdt150.test.ts
```

**Done when**:
- [ ] `linkBuilder.ts` imports from `routes.ts`
- [ ] `/prj/` literal no longer appears in `linkBuilder.ts`
- [ ] Existing tests pass unchanged

---

### Task 3: Refactor linkNormalization.ts to remove DEFAULT_WEB_BASE and delegate to linkBuilder

**Structure**: `src/utils/linkNormalization.ts`

**Makes GREEN**: `TEST-existing-tests-pass`

**Scope**: Remove `DEFAULT_WEB_BASE`, `buildTicketWebRoute`, `buildDocumentWebRoute` static methods; delegate to `linkBuilder.ts`
**Boundary**: Normalization logic (path resolution, security checks) stays unchanged

**Modifies**:
- `src/utils/linkNormalization.ts`

**Must Not Touch**: `src/routes.ts`, `linkBuilder.ts`, test files

**Anti-duplication**: Import `buildTicketLink`, `buildDocumentLink` from `linkBuilder.ts`

**Duplication Guard**:
- `linkNormalization.ts` has its own `DEFAULT_WEB_BASE` — must be removed
- Builder methods must delegate, not reimplement

**Verify**:
```bash
bun test src/utils/linkNormalization.mdt150.test.ts
```

**Done when**:
- [ ] `DEFAULT_WEB_BASE` removed
- [ ] `buildTicketWebRoute`/`buildDocumentWebRoute` removed or delegate to linkBuilder
- [ ] Existing tests pass unchanged

---

### Task 4: Migrate markdownPreprocessor.ts to use builders

**Structure**: `src/utils/markdownPreprocessor.ts`

**Makes GREEN**: `TEST-existing-tests-pass`

**Scope**: Replace all inline `/prj/` template literals with builder calls
**Boundary**: Preprocessor logic unchanged; only URL construction changes

**Modifies**:
- `src/utils/markdownPreprocessor.ts`

**Must Not Touch**: `src/routes.ts`, `linkBuilder.ts`, test files

**Anti-duplication**: Import `buildTicketLink`, `buildTicketSubDocPath`, `buildDocumentLink` from `linkBuilder.ts`

**Duplication Guard**:
- `convertTicketReferences()` and `resolveDocumentRef()` both construct `/prj/` URLs — migrate both to builders

**Verify**:
```bash
bun test src/utils/markdownPreprocessor.test.ts src/utils/markdownPreprocessor.mdt150.test.ts src/utils/markdownPreprocessor.mdt155.test.ts
```

**Done when**:
- [ ] No `/prj/` template literals remain
- [ ] Existing tests pass unchanged

---

### Task 5: Migrate subdocPathValidation.ts to use builders and derive regex from patterns

**Structure**: `src/utils/subdocPathValidation.ts`

**Makes GREEN**: `TEST-existing-tests-pass`

**Scope**: Replace inline path construction and regex with route-pattern-derived logic
**Boundary**: `extractSubDocPath` and `hashToPathUrl` logic unchanged

**Modifies**:
- `src/utils/subdocPathValidation.ts`

**Must Not Touch**: `src/routes.ts`, test files

**Anti-duplication**: Import builders from `linkBuilder.ts`, derive regex from `routes.ts` pattern constants

**Duplication Guard**:
- `hashToPathUrl()` constructs `/prj/...` paths — must use builders
- `extractSubDocPath()` has hardcoded regex — derive from pattern constants

**Verify**:
```bash
bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx
```

**Done when**:
- [ ] No `/prj/` template literals remain
- [ ] Existing tests pass unchanged

---

### Task 6: Migrate App.tsx route definitions and navigate() calls

**Structure**: `src/App.tsx`

**Makes GREEN**: `TEST-routes-patterns`, `TEST-existing-tests-pass`

**Scope**: Route `path` props use pattern constants; `navigate()` calls use builders
**Boundary**: Component logic, hooks, state unchanged

**Modifies**:
- `src/App.tsx`

**Must Not Touch**: `src/routes.ts`, `linkBuilder.ts`, test files

**Anti-duplication**: Import pattern constants and builders from `routes.ts`/`linkBuilder.ts`

**Duplication Guard**:
- `App.tsx` has 6 `<Route path=...>` + multiple `navigate()` calls with inline `/prj/` — all migrate

**Verify**:
```bash
bun test src/__tests__/routes.test.ts
```

**Done when**:
- [ ] All `<Route path={...}>` use imported pattern constants
- [ ] All `navigate()` calls use builder functions
- [ ] Existing tests pass

---

### Task 7: Migrate component navigate() calls

**Structure**: Multiple component files

**Makes GREEN**: `TEST-existing-tests-pass`, `TEST-no-hardcoded-paths`

**Scope**: Replace inline `/prj/` navigate() calls with builder imports
**Boundary**: Component behavior unchanged

**Modifies**:
- `src/components/DirectTicketAccess.tsx`
- `src/components/TicketViewer/useTicketDocumentNavigation.ts`
- `src/components/ProjectSelector/index.tsx`
- `src/components/RedirectToCurrentProject.tsx`

**Must Not Touch**: `src/routes.ts`, `linkBuilder.ts`, test files

**Anti-duplication**: Import `buildTicketLink`, `buildTicketSubDocPath`, `buildProjectPath`, `buildDirectTicketPath`, `buildDirectTicketSubDocPath` from `linkBuilder.ts`

**Duplication Guard**:
- Each file independently constructs the same paths — consolidate through builders

**Verify**:
```bash
bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx
bun test src/__tests__/no-hardcoded-routes.test.ts
```

**Done when**:
- [ ] No `/prj/` template literals remain in any of the 4 files
- [ ] All `navigate()` calls use builder functions
- [ ] Existing tests pass
- [ ] Hardcoded-path constraint test passes

---

### Task 8: Final verification — full test suite + hardcoded path scan

**Makes GREEN**: `TEST-no-hardcoded-paths`

**Scope**: Run complete test suite and verify constraint compliance
**Boundary**: No code changes — verification only

**Must Not Touch**: All source files

**Verify**:
```bash
bun test src/__tests__/routes.test.ts
bun test src/__tests__/no-hardcoded-routes.test.ts
bun test src/utils/linkBuilder.mdt150.test.ts
bun test src/utils/linkProcessor.mdt150.test.ts
bun test src/utils/markdownPreprocessor.test.ts
bun test src/utils/markdownPreprocessor.mdt150.test.ts
bun test src/utils/markdownPreprocessor.mdt155.test.ts
bun test src/utils/linkNormalization.mdt150.test.ts
bun test src/components/TicketViewer/useTicketDocumentNavigation.test.tsx
bun test src/components/TicketViewer/subdocumentPath.test.ts
```

**Done when**:
- [ ] All tests pass
- [ ] Hardcoded-path scan finds zero violations

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] Smoke test passes (app loads, ticket navigation works)
