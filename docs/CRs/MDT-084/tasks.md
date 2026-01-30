# Tasks: MDT-084

**Source**: [MDT-084](../../docs/CRs/MDT-084-refactor-server-technical-debt-patterns.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `server/` |
| Test command | `cd server && npm test` |
| Build command | `npm run build:shared` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration | 150 | 225 | Flag at 150+, STOP at 225+ |
| Feature | 200-300 | 300-450 | Flag at default+, STOP at hard max |
| Complex logic | 150 | 225 | Flag at 150+, STOP at 225+ |
| Utility | 75 | 110 | Flag at 75+, STOP at 110+ |

*(Inherited from Architecture Design, overridden by CR if specified)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Error handling (try-catch + res.status) | `server/middleware/errorHandler.ts` | All controllers |
| Parameter validation (if (!projectId)) | `server/middleware/validation.ts` | ProjectController, TicketController |
| Async method wrapper | `server/middleware/asyncHandler.ts` | All controller methods |
| Response formatting (res.json/res.status) | `server/utils/response.ts` | All controllers |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
server/
  ├── controllers/
  │   ├── BaseController.ts           → Abstract base with common patterns (150 lines)
  │   ├── ProjectController.ts        → Reduced to <300 lines
  │   ├── TicketController.ts         → Reduced to <200 lines
  │   ├── CRController.ts             → Extracted CR operations (200 lines)
  │   └── DocumentController.ts       → Reduced to <200 lines
  ├── middleware/
  │   ├── index.ts                    → Export all middleware (50 lines)
  │   ├── errorHandler.ts             → Enhanced with @handleErrors decorator (150 lines)
  │   ├── validation.ts               → Enhanced with parameter validators (150 lines)
  │   └── asyncHandler.ts             → NEW: Async wrapper utility (75 lines)
  ├── services/
  │   ├── SSEService.ts               → NEW: Extracted SSE management (200 lines)
  │   ├── FileWatcherService.ts       → Reduced to <300 lines
  │   └── ... (existing services unchanged)
  ├── utils/
  │   ├── response.ts                 → NEW: Standardized responses (75 lines)
  │   └── ... (existing utils unchanged)
  └── routes/
      ├── devtools/                   → NEW: Split large route file
      │   ├── index.ts                → Route orchestration (100 lines)
      │   ├── logging.ts              → Logging endpoints (150 lines)
      │   ├── session.ts              → Session management (100 lines)
      │   └── rateLimit.ts            → Rate limiting (100 lines)
      └── ... (other routes unchanged)
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

---

## Phase 1: Shared Utilities

> Extract patterns used by multiple features FIRST.

**Phase goal**: All shared utilities exist
**Phase verify**: `cd server && npm test` passes, utilities importable

### Task 1.1: Create asyncHandler utility

**Structure**: `server/middleware/asyncHandler.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: NEW (pattern identified in controllers)
**To**: `server/middleware/asyncHandler.ts`

**Move**:
- `asyncHandler()` wrapper function
- TypeScript types for async middleware
- Error handling for promise rejections

**Exclude**:
- Controller-specific error messages (go in individual controllers)
- Validation logic (Task 1.3)
- Response formatting (Task 1.4)

**Anti-duplication**:
- This IS the shared async handler — other tasks will import from here
- All controllers will wrap methods with this instead of manual try-catch

**Verify**:
```bash
wc -l server/middleware/asyncHandler.ts  # ≤ 75 (or flag ≤ 110)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] File at `server/middleware/asyncHandler.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Exports `asyncHandler` function
- [ ] Tests pass

### Task 1.2: Enhance error handler with decorator

**Structure**: `server/middleware/errorHandler.ts`

**Limits**:
- Default: 150 lines (complex logic)
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**From**: `server/middleware/errorHandler.ts` (72 lines)
**To**: `server/middleware/errorHandler.ts`

**Move**:
- Add `@handleErrors` decorator
- Enhance with consistent error response format
- Add error classification utilities
- Import from Task 1.1 for async error handling

**Exclude**:
- Parameter validation (Task 1.3)
- Response formatting (Task 1.4)
- Business logic errors (stay in services)

**Anti-duplication**:
- Import `asyncHandler` from `server/middleware/asyncHandler.ts` — exists from Task 1.1
- This IS the shared error handler — all controllers will use `@handleErrors`

**Verify**:
```bash
wc -l server/middleware/errorHandler.ts  # ≤ 150 (or flag ≤ 225)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] Size ≤ 150 lines (or flagged if ≤ 225)
- [ ] `@handleErrors` decorator implemented
- [ ] Consistent error response format
- [ ] Tests pass

### Task 1.3: Enhance validation middleware

**Structure**: `server/middleware/validation.ts`

**Limits**:
- Default: 150 lines (complex logic)
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**From**: `server/middleware/validation.ts` (71 lines)
**To**: `server/middleware/validation.ts`

**Move**:
- Add `validateProjectId()` middleware
- Add `validateCRId()` middleware
- Enhance with parameter type checking
- Consolidate all validation patterns

**Exclude**:
- Business rule validation (stay in services)
- Authentication/authorization (separate concern)
- Request body validation for complex types

**Anti-duplication**:
- This IS the shared validation middleware — controllers import from here
- If similar validation exists elsewhere, consolidate HERE

**Verify**:
```bash
wc -l server/middleware/validation.ts  # ≤ 150 (or flag ≤ 225)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] Size ≤ 150 lines (or flagged if ≤ 225)
- [ ] `validateProjectId()` and `validateCRId()` implemented
- [ ] All validation patterns consolidated
- [ ] Tests pass

### Task 1.4: Create response utility

**Structure**: `server/utils/response.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: NEW (pattern from controllers)
**To**: `server/utils/response.ts`

**Move**:
- `sendResponse()` utility function
- Success response formatter
- Error response formatter
- HTTP status code helpers

**Exclude**:
- Error message generation (Task 1.2)
- Response data transformation (stay in controllers/services)

**Anti-duplication**:
- This IS the shared response utility — all controllers import from here
- If response formatting exists elsewhere, consolidate HERE

**Verify**:
```bash
wc -l server/utils/response.ts  # ≤ 75 (or flag ≤ 110)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] File at `server/utils/response.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] `sendResponse()` utility implemented
- [ ] Tests pass

### Task 1.5: Create BaseController

**Structure**: `server/controllers/BaseController.ts`

**Limits**:
- Default: 150 lines (orchestration)
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**From**: NEW (pattern from controllers)
**To**: `server/controllers/BaseController.ts`

**Move**:
- Abstract base class with common patterns
- Import and apply decorators from Task 1.2
- Base response methods using Task 1.4
- Common controller utilities

**Exclude**:
- Business logic (goes in specific controllers)
- Route definitions (stay in routes/)
- Authentication (separate middleware)

**Anti-duplication**:
- Import `@handleErrors` from `middleware/errorHandler.ts` — exists from Task 1.2
- Import `sendResponse` from `utils/response.ts` — exists from Task 1.4
- This IS the base class — other controllers extend from here

**Verify**:
```bash
wc -l server/controllers/BaseController.ts  # ≤ 150 (or flag ≤ 225)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] File at `server/controllers/BaseController.ts`
- [ ] Size ≤ 150 lines (or flagged if ≤ 225)
- [ ] Abstract base class implemented
- [ ] Tests pass

---

## Phase 2: Feature Extraction

> Features import from Phase 1, never duplicate.

**Phase goal**: Features extracted, source reduced
**Phase verify**: Source files ≤ limits, `cd server && npm test` passes

### Task 2.1: Extract CR operations from ProjectController

**Structure**: `server/controllers/CRController.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `server/controllers/ProjectController.ts` (CR operations only)
**To**: `server/controllers/CRController.ts`

**Move**:
- All CR CRUD operations from ProjectController
- Routes: GET/POST/PUT/DELETE `/api/projects/:projectId/crs`
- Related helper methods

**Exclude**:
- Project management operations (stay in ProjectController)
- General project settings/operations
- Duplicate error handling (use Task 1.2)

**Anti-duplication**:
- Extend `BaseController` from Task 1.5 — inherit common patterns
- Apply `@handleErrors` decorator from Task 1.2 — don't duplicate error handling
- Import `sendResponse` from Task 1.4 — don't duplicate response formatting
- Use `validateProjectId` and `validateCRId` from Task 1.3 — don't duplicate validation

**Verify**:
```bash
wc -l server/controllers/CRController.ts  # ≤ 200 (or flag ≤ 300)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] File at `server/controllers/CRController.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] Extends BaseController
- [ ] All CR operations moved
- [ ] Tests pass

### Task 2.2: Refactor ProjectController

**Structure**: `server/controllers/ProjectController.ts`

**Limits**:
- Default: 300 lines (feature)
- Hard Max: 450 lines
- If > 300: ⚠️ flag
- If > 450: ⛔ STOP

**From**: `server/controllers/ProjectController.ts` (521 lines)
**To**: `server/controllers/ProjectController.ts`

**Move**:
- Keep only project management operations
- Extend BaseController from Task 1.5
- Apply shared patterns from Phase 1

**Remove**:
- All CR operations (moved to Task 2.1)
- Duplicate error handling (use Task 1.2)
- Manual parameter validation (use Task 1.3)

**Anti-duplication**:
- Extend `BaseController` from Task 1.5 — inherit common patterns
- Apply `@handleErrors` decorator from Task 1.2 — remove all try-catch blocks
- Import `sendResponse` from Task 1.4 — remove manual response formatting
- Use `validateProjectId` from Task 1.3 — remove manual validation

**Verify**:
```bash
wc -l server/controllers/ProjectController.ts  # ≤ 300 (or flag ≤ 450)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] Size ≤ 300 lines (or flagged if ≤ 450)
- [ ] Extends BaseController
- [ ] No CR operations
- [ ] Uses shared patterns
- [ ] Tests pass

### Task 2.3: Extract SSE service from FileWatcherService

**Structure**: `server/services/SSEService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `server/fileWatcherService.ts` (SSE logic only)
**To**: `server/services/SSEService.ts`

**Move**:
- SSE connection management
- Event broadcasting logic
- Client tracking
- Event emission interface

**Exclude**:
- File watching logic (stay in FileWatcherService)
- Project management (stay in FileWatcherService)
- File system operations

**Anti-duplication**:
- This IS the SSE service — FileWatcherService will import from here
- No SSE logic should remain in FileWatcherService

**Verify**:
```bash
wc -l server/services/SSEService.ts  # ≤ 200 (or flag ≤ 300)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] File at `server/services/SSEService.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] SSE logic extracted
- [ ] Tests pass

### Task 2.4: Refactor FileWatcherService

**Structure**: `server/fileWatcherService.ts`

**Limits**:
- Default: 300 lines (feature)
- Hard Max: 450 lines
- If > 300: ⚠️ flag
- If > 450: ⛔ STOP

**From**: `server/fileWatcherService.ts` (439 lines)
**To**: `server/fileWatcherService.ts`

**Move**:
- Keep only file watching and project management
- Import SSEService from Task 2.3
- Maintain file system operations

**Remove**:
- All SSE logic (moved to Task 2.3)

**Anti-duplication**:
- Import SSEService from Task 2.3 — don't duplicate SSE logic
- No file should contain both file watching AND SSE management

**Verify**:
```bash
wc -l server/fileWatcherService.ts  # ≤ 300 (or flag ≤ 450)
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] Size ≤ 300 lines (or flagged if ≤ 450)
- [ ] No SSE logic
- [ ] Imports SSEService
- [ ] Tests pass

### Task 2.5: Split devtools routes

**Structure**: `server/routes/devtools/`

**Limits**:
- Total: 450 lines across all files
- index.ts: 100 lines (orchestration)
- logging.ts: 150 lines (feature)
- session.ts: 100 lines (feature)
- rateLimit.ts: 100 lines (feature)

**From**: `server/routes/devtools.ts` (350 lines)
**To**: `server/routes/devtools/` directory

**Move**:
- index.ts: Route orchestration and exports
- logging.ts: Logging-related endpoints
- session.ts: Session management endpoints
- rateLimit.ts: Rate limiting endpoints

**Exclude**:
- Shared route utilities (stay in main routes/)
- General Express setup (stay in server.js)

**Anti-duplication**:
- No duplicated endpoints across the split files
- Shared utilities should be imported, not copied

**Verify**:
```bash
find server/routes/devtools -name "*.ts" -exec wc -l {} + | tail -1  # ≤ 450 total
cd server && npm test
npm run build:shared
```

**Done when**:
- [ ] All 4 files created
- [ ] Total size ≤ 450 lines
- [ ] Original devtools.ts removed
- [ ] Tests pass

---

## Post-Implementation

### Task 3.1: Verify no duplication

**Do**: Search for duplicated patterns
```bash
# Check for manual try-catch blocks (should be eliminated)
grep -r "try {" server/controllers/ | wc -l

# Check for manual parameter validation
grep -r "if (!projectId)" server/controllers/ | wc -l

# Check for manual response formatting
grep -r "res.status(400)" server/controllers/ | wc -l
grep -r "res.status(500)" server/controllers/ | wc -l
```

**Done when**:
- [ ] Try-catch blocks = 0 (all use @handleErrors)
- [ ] Manual projectId validation = 0 (all use middleware)
- [ ] Manual status responses minimized (use sendResponse)

### Task 3.2: Verify size compliance

**Do**: Check all files against limits
```bash
echo "=== Size Check ==="
wc -l server/controllers/BaseController.ts       # ≤ 150
wc -l server/controllers/ProjectController.ts    # ≤ 300
wc -l server/controllers/CRController.ts         # ≤ 200
wc -l server/middleware/asyncHandler.ts          # ≤ 75
wc -l server/middleware/errorHandler.ts          # ≤ 150
wc -l server/middleware/validation.ts            # ≤ 150
wc -l server/utils/response.ts                   # ≤ 75
wc -l server/services/SSEService.ts              # ≤ 200
wc -l server/fileWatcherService.ts               # ≤ 300
find server/routes/devtools -name "*.ts" -exec wc -l {} + | tail -1  # ≤ 450 total
```

**Done when**:
- [ ] All files within default limits (or flagged if within hard max)
- [ ] No files exceed hard max limits

### Task 3.3: Update project documentation

**Do**: Update CLAUDE.md with new file structure
- Add BaseController to controller descriptions
- Document new middleware patterns
- Update testing commands if needed

**Done when**:
- [ ] CLAUDE.md updated with new structure
- [ ] Development commands still work

### Task 3.4: Run full test suite

**Do**: Verify everything still works
```bash
npm run build:shared
cd server && npm test
cd server && npm run test:integration  # if exists
npm run test:e2e  # if needed
```

**Done when**:
- [ ] All tests pass
- [ ] No regressions in API responses
- [ ] Build succeeds

### Task 3.5: Run `/mdt-tech-debt MDT-084`

**Do**: Generate technical debt report to verify improvements

**Done when**:
- [ ] Technical debt report generated
- [ ] File sizes confirmed reduced
- [ ] Duplication eliminated
