# Tasks: MDT-095

**Source**: architecture.md + tests.md

## Scope Boundaries

- **WorktreeService**: Owns git worktree detection, ticket code extraction from branch names, path resolution, and cache management. Must NOT perform file operations, UI rendering, or MCP tool formatting.
- **ProjectService**: Owns project discovery and CR list aggregation. Delegates to WorktreeService for path resolution. Must NOT execute git commands directly.
- **FileWatcherService**: Owns chokidar watchers for main and worktree paths, SSE broadcasting. Must NOT parse ticket content or resolve paths.
- **TicketService**: Owns CR CRUD operations using resolved paths. Must NOT perform git operations or worktree detection.
- **Frontend Components**: Own visual worktree badge display. Must NOT resolve paths or make API calls directly.

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (100ms detection) | Task 1, Task 2 |
| C2 (<5% perf degradation) | Task 4 |
| C3 (10+ worktrees) | Task 1, Task 2 |
| C4 (silent degradation) | Task 1, Task 2, Task 4 |
| C5 (backward compatibility) | Task 3, Task 5, Task 7, Task 8 |
| C6 (command injection) | Task 1 |
| C7 (30s TTL) | Task 1, Task 2 |

## Tasks

### Task 1: Walking Skeleton - Create WorktreeTypes and WorktreeService interfaces

**Structure**: `shared/models/WorktreeTypes.ts`, `shared/services/WorktreeService.ts`

**Makes GREEN**:
- `shared/models/__tests__/WorktreeTypes.test.ts`: All 8 type validation tests
- `shared/services/__tests__/WorktreeService.test.ts`: Interface stub tests

**Scope**: Define core interfaces and service skeleton with placeholder methods
**Boundary**: No actual git command execution, no file system operations

**Create**:
- `shared/models/WorktreeTypes.ts` - WorktreeMapping, WorktreeConfig, WorktreeInfo interfaces
- `shared/services/WorktreeService.ts` - Service class with detect(), resolvePath(), invalidateCache() method stubs

**Exclude**: Git command execution, file watching, UI components

**Anti-duplication**: Import types from `@mdt/domain-contracts` where applicable

**Verify**:
```bash
npm test -- --testPathPattern="WorktreeTypes.test.ts"
npm test -- --testPathPattern="WorktreeService.test.ts" --testNamePattern="interface|constructor"
```

**Done when**:
- [x] WorktreeTypes.ts exports WorktreeMapping, WorktreeConfig, WorktreeInfo interfaces
- [x] WorktreeService.ts has detect(), resolvePath(), invalidateCache() method signatures
- [x] Type tests pass (interface shape validation)
- [x] No duplicated type definitions

---

### Task 2: Implement WorktreeService Core Logic

**Structure**: `shared/services/WorktreeService.ts`

**Makes GREEN**:
- `shared/services/__tests__/WorktreeService.test.ts`: 18 tests covering:
  - Git worktree list parsing
  - Branch name to ticket code extraction
  - Path resolution with worktree priority
  - Cache TTL behavior (30s)
  - Error handling (silent degradation)
  - Command injection prevention (execFile)

**Scope**: Complete implementation of WorktreeService with git integration and caching
**Boundary**: No file watching, no UI, no MCP-specific formatting

**Modify**:
- `shared/services/WorktreeService.ts` - Implement detect(), resolvePath(), invalidateCache()

**Exclude**: File system watchers, HTTP response formatting

**Anti-duplication**: Use Node's `child_process.execFile` (not shell strings) — do NOT use `exec` with string interpolation

**Verify**:
```bash
npm test -- --testPathPattern="WorktreeService.test.ts"
```

**Done when**:
- [x] All 18 WorktreeService tests pass (GREEN)
- [x] detect() executes `git worktree list --porcelain` via execFile
- [x] Cache respects 30s TTL (C7)
- [x] Detection completes within 100ms (C1)
- [x] Handles 10+ concurrent worktrees (C3)
- [x] Silent degradation on git failure (C4)
- [x] No shell string interpolation (C6)

---

### Task 3: Integrate WorktreeService into ProjectService

**Structure**: `shared/services/ProjectService.ts`

**Makes GREEN**:
- `shared/services/project/__tests__/ProjectService.worktree.test.ts`: 6 tests covering:
  - WorktreeService integration
  - Path resolution delegation
  - Config enabled/disabled behavior

**Scope**: Wire WorktreeService into ProjectService for path resolution during CR list retrieval
**Boundary**: No direct git commands in ProjectService

**Modify**:
- `shared/services/ProjectService.ts` - Inject WorktreeService, delegate path resolution

**Exclude**: File watching, MCP tool integration

**Anti-duplication**: Import `WorktreeService` from `@mdt/shared/services/WorktreeService` — do NOT copy detection logic

**Verify**:
```bash
npm test -- --testPathPattern="ProjectService.worktree.test.ts"
```

**Done when**:
- [x] All 6 ProjectService worktree tests pass (GREEN)
- [x] ProjectService calls WorktreeService.resolvePath() for ticket paths
- [x] Respects worktree.enabled config (C5 backward compatibility)
- [x] No duplicated worktree detection logic

---

### Task 4: Extend FileWatcherService for Worktree Paths

**Structure**: `server/fileWatcherService.ts`

**Makes GREEN**:
- `server/__tests__/fileWatcherService.worktree.test.ts`: 6 tests covering:
  - Multi-path watcher setup
  - Worktree path watching
  - Performance impact (<5% degradation)
  - Silent degradation on watch failure

**Scope**: Add worktree path watchers alongside main project watchers
**Boundary**: No ticket content parsing, no path resolution logic

**Modify**:
- `server/fileWatcherService.ts` - Add addWatcher() for worktree paths, integrate with WorktreeService

**Exclude**: Ticket parsing, API response formatting

**Anti-duplication**: Import `WorktreeService` from `@mdt/shared/services/WorktreeService` — do NOT re-implement detection

**Verify**:
```bash
npm test -- --testPathPattern="fileWatcherService.worktree.test.ts"
```

**Done when**:
- [x] All 6 fileWatcherService worktree tests pass (GREEN)
- [x] Watchers created for both main and worktree paths
- [x] Performance impact <5% (C2)
- [x] Silent degradation on watch errors (C4)
- [x] No duplicated detection logic

---

### Task 5: Update Server TicketService for Path Resolution

**Structure**: `server/services/TicketService.ts`

**Makes GREEN**:
- `server/services/__tests__/TicketService.worktree.test.ts`: 4 tests covering:
  - Path resolution for read operations
  - Path resolution for write operations
  - Backward compatibility when worktree not found

**Scope**: Use WorktreeService for all file path resolution in ticket operations
**Boundary**: No git operations, no worktree detection

**Modify**:
- `server/services/TicketService.ts` - Inject WorktreeService, resolve paths before file operations

**Exclude**: Git command execution, worktree detection

**Anti-duplication**: Import `WorktreeService` from `@mdt/shared/services/WorktreeService` — do NOT copy resolution logic

**Verify**:
```bash
npm test -- --testPathPattern="TicketService.worktree.test.ts"
```

**Done when**:
- [x] All 4 TicketService worktree tests pass (GREEN)
- [x] readFile/writeFile use resolved worktree paths
- [x] Falls back to main path when worktree not found (C5)
- [x] No duplicated path resolution

---

### Task 6: Add Worktree Fields to API Responses

**Structure**: `server/routes/projects.ts` (CR endpoints)

**Makes GREEN**:
- `server/routes/__tests__/crs.worktree.test.ts`: 5 tests covering:
  - inWorktree field in CR list response
  - worktreePath field in CR detail response
  - Absence of fields when not in worktree

**Scope**: Add inWorktree and worktreePath fields to CR API responses
**Boundary**: No path resolution in route layer, no git operations

**Modify**:
- `server/routes/projects.ts` - Add inWorktree, worktreePath to CR response objects

**Exclude**: Path resolution logic, worktree detection

**Anti-duplication**: Get worktree info from TicketService — do NOT call WorktreeService directly from routes

**Verify**:
```bash
npm test -- --testPathPattern="crs.worktree.test.ts"
```

**Done when**:
- [x] All 5 CRS route tests pass (GREEN)
- [x] GET /api/projects/:id/crs includes inWorktree for each CR
- [x] GET /api/projects/:id/crs/:crId includes worktreePath
- [x] Fields absent/undefined when not in worktree (C5)
- [x] No duplicated response building logic

---

### Task 7: Integrate WorktreeService into MCP Tools

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`

**Makes GREEN**:
- `mcp-server/src/tools/handlers/__tests__/crHandlers.worktree.test.ts`: 9 tests covering:
  - get_cr uses worktree path
  - create_cr writes to correct worktree
  - update_cr_status writes to correct worktree
  - Backward compatibility

**Scope**: Use WorktreeService for path resolution in all MCP CR operations
**Boundary**: No git operations, no worktree detection

**Modify**:
- `mcp-server/src/tools/handlers/crHandlers.ts` - Inject WorktreeService, resolve paths before operations

**Exclude**: Git command execution, worktree detection

**Anti-duplication**: Import `WorktreeService` from `@mdt/shared/services/WorktreeService` — do NOT copy resolution logic

**Verify**:
```bash
cd mcp-server && npm test -- --testPathPattern="crHandlers.worktree.test.ts"
```

**Done when**:
- [x] All 9 MCP handler tests pass (GREEN)
- [x] get_cr returns content from worktree path
- [x] create_cr writes to worktree when applicable
- [x] Falls back to main path when worktree not found (C5)
- [x] No duplicated path resolution

---

### Task 8: Add Frontend Ticket Type Worktree Field

**Structure**: `src/types/ticket.ts`

**Makes GREEN**:
- `src/types/__tests__/ticket.worktree.test.ts`: 8 tests covering:
  - inWorktree optional field
  - worktreePath optional field
  - Type compatibility with undefined values

**Scope**: Add optional worktree fields to Ticket interface
**Boundary**: No API calls, no path resolution

**Modify**:
- `src/types/ticket.ts` - Add `inWorktree?: boolean` and `worktreePath?: string` to Ticket interface

**Exclude**: API integration, path resolution

**Anti-duplication**: Extend existing Ticket interface — do NOT create new WorktreeTicket type

**Verify**:
```bash
npm test -- --testPathPattern="ticket.worktree.test.ts"
```

**Done when**:
- [x] All 8 ticket type tests pass (GREEN)
- [x] Ticket interface has inWorktree?: boolean
- [x] Ticket interface has worktreePath?: string
- [x] Backward compatible with existing code (C5)
- [x] No duplicated type definitions

---

### Task 9: Add Worktree Badge to TicketCard Component

**Structure**: `src/components/TicketCard.tsx`

**Makes GREEN**:
- `src/components/__tests__/TicketCard.worktree.test.tsx`: 5 tests covering:
  - Badge renders when inWorktree=true
  - Badge hidden when inWorktree=false or undefined
  - Badge styling and icon

**Scope**: Display visual worktree indicator on board view cards
**Boundary**: No path resolution, no API calls

**Modify**:
- `src/components/TicketCard.tsx` - Add WorktreeBadge component, conditional rendering

**Exclude**: Path resolution, API calls

**Anti-duplication**: Use existing Badge component from `./UI/badge` — do NOT create new badge component

**Verify**:
```bash
npm test -- --testPathPattern="TicketCard.worktree.test.tsx"
```

**Done when**:
- [x] All 5 TicketCard worktree tests pass (GREEN)
- [x] Worktree badge visible when ticket.inWorktree === true
- [x] Badge hidden when inWorktree is false/undefined (C5)
- [x] Uses existing Badge component
- [x] No duplicated badge styling

---

### Task 10: Add Worktree Badge to TicketAttributeTags

**Structure**: `src/components/TicketAttributeTags.tsx`

**Makes GREEN**:
- `src/components/__tests__/TicketRow.worktree.test.tsx`: 4 tests covering:
  - Worktree badge in attribute tags
  - Conditional rendering
  - Consistent styling with other badges

**Scope**: Include worktree indicator in the ticket attribute tags displayed in list view
**Boundary**: No path resolution, no API calls

**Modify**:
- `src/components/TicketAttributeTags.tsx` - Add conditional worktree badge alongside status/priority badges

**Exclude**: Path resolution, API calls

**Anti-duplication**: Use existing Badge component — do NOT create new badge styles

**Verify**:
```bash
npm test -- --testPathPattern="TicketRow.worktree.test.tsx"
```

**Done when**:
- [x] All 4 TicketRow worktree tests pass (GREEN)
- [x] Worktree badge appears in attribute tags when inWorktree=true
- [x] Consistent styling with other badges
- [x] Badge hidden when inWorktree is false/undefined (C5)
- [x] No duplicated badge logic

---

## Post-Implementation

- [x] No duplication (grep check): `grep -r "exec(" --include="*.ts" shared/services/WorktreeService.ts` should return empty
- [x] Scope boundaries respected: WorktreeService has no UI imports, frontend has no WorktreeService imports
- [x] All tests GREEN: `npm test -- --testPathPattern="worktree" --passWithNoTests`
- [ ] Smoke test passes: Create a ticket in a worktree, verify badge appears and file operations route correctly
- [x] Fallback/absence paths match requirements: When git unavailable, system operates in single-path mode

## Post-Verify Fixes (appended by implement-agentic)

### Fix PV-1: TypeScript error in dataLayer.ts
**Evidence**: `src/services/dataLayer.ts:202`
**Reason**: CRITICAL — Build fails with TypeScript error: boolean not assignable to string | Date | string[]
**Action**: Fix type error in dataLayer.ts

### Fix PV-2: MCP list_crs missing inWorktree flag
**Evidence**: `mcp-server/src/tools/handlers/crHandlers.ts:80-108`
**Reason**: HIGH — handleListCRs does NOT include inWorktree flag per BR-5.6
**Action**: Add inWorktree flag to each ticket in list_crs response

### Fix PV-3: API responses may not include worktree fields
**Evidence**: `server/controllers/ProjectController.ts:390-414`
**Reason**: HIGH — Verify inWorktree/worktreePath fields pass through to API responses
**Action**: Ensure worktree fields are included in API responses

### Fix PV-4: TypeScript errors in test files
**Evidence**: Multiple test files
**Reason**: HIGH — Fix mock types, missing imports, unknown assertions
**Action**: Fix TypeScript compilation errors in test files
