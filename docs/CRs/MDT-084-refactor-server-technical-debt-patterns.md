---
code: MDT-084
status: Implemented
dateCreated: 2025-12-04T00:55:07.220Z
type: Technical Debt
priority: High
---

# Refactor server/ technical debt patterns

## 1. Description

### Problem
- `server/controllers/ProjectController.ts` exceeds 300-line limit at 521 lines, violating SRP
- Error handling pattern repeated 50+ times across controllers with identical try-catch structure
- Parameter validation (`if (!projectId)`) duplicated 9+ times in ProjectController
- `server/fileWatcherService.ts` mixes file watching, SSE, and project management at 439 lines

### Affected Artifacts
- `server/controllers/ProjectController.ts` (521 lines - needs CR operation extraction)
- `server/fileWatcherService.ts` (439 lines - needs SSE separation)
- `server/routes/devtools.ts` (350 lines - needs concern separation)
- All controllers with duplicated error handling patterns

### Scope
- **Changes**: Extract large files, create shared middleware, centralize error handling
- **Unchanged**: External API contracts, database schema, frontend integration

## 2. Decision

### Chosen Approach
Exploratory - Need to evaluate refactoring strategies for server/ technical debt

### Rationale
- Current code duplication creates maintenance burden across 15+ files
- Large files violate single responsibility principle making them hard to test
- Missing centralized error handling leads to inconsistent API responses
- Parameter validation duplication increases bug risk

## 3. Alternatives Considered
| Approach | Key Difference | Why Rejected |
----------|---------------|--------------|
| **Chosen Approach** | Extract and centralize patterns | **ACCEPTED** - Addresses root duplication causes |
| Inline fixes | Add decorators to existing files | Doesn't reduce file size or complexity |
| Partial refactor | Fix only error handling | Leaves other violations unaddressed |
| Rewrite services | Complete rewrite of server layer | Too high risk, breaks existing functionality |

### Pattern
**Extract-then-Refactor** — Centralize shared patterns before extracting features to avoid duplicating extraction efforts.

### Shared Patterns

| Pattern | Occurrences | Extract To | First Implementation |
|---------|-------------|------------|----------------------|
| Error handling (try-catch + res.status(500)) | 18+ times across all controllers | `server/middleware/errorHandler.ts` | `@handleErrors` decorator |
| Parameter validation (if (!projectId)) | 9+ times in ProjectController/TicketController | `server/middleware/validation.ts` | `validateProjectId()` middleware |
| Async method wrapper | 23 controller methods | `server/middleware/asyncHandler.ts` | `asyncHandler()` wrapper |
| Response formatting (res.json/res.status) | Universal across controllers | `server/utils/response.ts` | `sendResponse()` utility |

> These must be extracted BEFORE features that use them to avoid duplicating the same patterns.

### Structure
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

### Size Guidance

**Applied to this CR**:
| Module | Role | Limit | Hard Max | Current Lines |
|--------|------|-------|----------|---------------|
| `server/controllers/BaseController.ts` | Orchestration | 150 | 225 | 0 (new) |
| `server/controllers/ProjectController.ts` | Feature | 300 | 450 | 521 → <300 |
| `server/controllers/CRController.ts` | Feature | 200 | 300 | 0 (new) |
| `server/middleware/errorHandler.ts` | Complex logic | 150 | 225 | 72 → 150 |
| `server/middleware/validation.ts` | Complex logic | 150 | 225 | 71 → 150 |
| `server/middleware/asyncHandler.ts` | Utility | 75 | 110 | 0 (new) |
| `server/services/SSEService.ts` | Feature | 200 | 300 | 0 (new) |
| `server/services/FileWatcherService.ts` | Feature | 300 | 450 | 439 → <300 |
| `server/utils/response.ts` | Utility | 75 | 110 | 0 (new) |
| `server/routes/devtools/index.ts` | Orchestration | 100 | 150 | 0 (new) |
| `server/routes/devtools/logging.ts` | Feature | 150 | 225 | 0 (new) |
| `server/routes/devtools/session.ts` | Feature | 100 | 150 | 0 (new) |
| `server/routes/devtools/rateLimit.ts` | Feature | 100 | 150 | 0 (new) |

### Extension Rule
To add a new controller: extend `BaseController` (limit 300 lines) and apply `@handleErrors` decorator + `validateProjectId` middleware for parameter validation. All async methods must use `asyncHandler` wrapper.
## 4. Artifact Specifications
### New Artifacts
| Artifact | Type | Purpose | Size Limit |
|----------|------|---------|------------|
| `server/controllers/BaseController.ts` | Controller | Abstract base with common patterns (error handling, async wrapper) | 150 lines |
| `server/controllers/CRController.ts` | Controller | Extracted CR operations from ProjectController | 200 lines |
| `server/middleware/asyncHandler.ts` | Middleware | Async wrapper utility for all controller methods | 75 lines |
| `server/services/SSEService.ts` | Service | SSE management extracted from fileWatcherService | 200 lines |
| `server/utils/response.ts` | Utility | Standardized response formatting utilities | 75 lines |
| `server/routes/devtools/` | Route | Split large devtools.ts into modular endpoints | Total 450 lines |

### Modified Artifacts
| Artifact | Change Type | Size Target | Current Size |
|----------|-------------|-------------|--------------|
| `server/controllers/ProjectController.ts` | Reduction + extend BaseController | <300 lines | 521 lines |
| `server/middleware/errorHandler.ts` | Enhanced with @handleErrors decorator | 150 lines | 72 lines |
| `server/middleware/validation.ts` | Enhanced with parameter validators | 150 lines | 71 lines |
| `server/services/FileWatcherService.ts` | Extract SSE logic | <300 lines | 439 lines |
| `server/routes/devtools.ts` | Split into modular files | Removed/replaced | 350 lines |

### Integration Points
| From | To | Interface |
|------|----|-----------|
| Controllers | BaseController | Extend class, inherit error handling |
| Controllers | Validation middleware | `validateProjectId(req, res, next)` |
| Controllers | Error decorator | `@handleErrors` method wrapper |
| Controllers | Response utility | `sendResponse(res, data, status)` |
| fileWatcherService | SSEService | Event emission interface |
| devtools routes | Modular routes | `app.use('/devtools', devtoolsRoutes)` |

### Key Patterns
- **BaseController inheritance**: All controllers extend BaseController for shared patterns
- **Error decorator**: `@handleErrors` wraps all async methods eliminating try-catch
- **Validation middleware**: `validateProjectId` handles parameter validation
- **Response utility**: `sendResponse()` standardizes all API responses
- **Service extraction**: File watching and SSE as separate focused services
## 5. Acceptance Criteria
### Functional
- [ ] `server/controllers/BaseController.ts` exports abstract base class with common patterns
- [ ] `server/middleware/asyncHandler.ts` exports `asyncHandler` wrapper function
- [ ] `server/controllers/CRController.ts` implements all CR CRUD operations (extend BaseController)
- [ ] `server/services/SSEService.ts` manages SSE connections separately from FileWatcherService
- [ ] `server/utils/response.ts` exports `sendResponse` utility for standardized responses
- [ ] `server/routes/devtools/` modular structure implemented with separate files

### Non-Functional
- [ ] ProjectController.ts < 300 lines (current: 521)
- [ ] FileWatcherService.ts < 300 lines (current: 439)
- [ ] Zero parameter validation duplication in controllers
- [ ] Zero error handling pattern duplication (use @handleErrors decorator)
- [ ] No file exceeds Hard Max limits without explicit justification
- [ ] Shared patterns extracted BEFORE consumers that use them
- [ ] All controllers extend BaseController or apply @handleErrors decorator

### Testing
- [ ] Unit: BaseController with error decorator and async wrapper
- [ ] Unit: Validation middleware with invalid/valid parameters
- [ ] Integration: Error decorator propagates correct HTTP status codes
- [ ] Integration: CRController endpoints return identical responses to ProjectController CR operations
- [ ] Manual: All existing API endpoints return identical responses
- [ ] E2E: Full request flow through middleware patterns
## 6. Verification
### By CR Type
- **Refactoring**: Tests pass, file sizes reduced (ProjectController: 521→<300, fileWatcherService: 439→<300)
- **Duplication elimination**: Count of validation patterns reduced from 9+ to 1
- **Error consistency**: All endpoints return consistent error format

### Metrics
- ProjectController.ts lines: 521 → <300
- fileWatcherService.ts lines: 439 → <300
- Validation pattern occurrences: 9+ → 1 (centralized)
- Error handling patterns: 50+ → 1 (decorator)

### Validation Status: ✅ APPROVED

**Validated on**: 2025-12-04
**Validation Method**: Codebase analysis, file size verification, pattern detection

### Validation Results

| Aspect | Status | Details |
|--------|--------|---------|
| **File Sizes** | ✅ Confirmed | ProjectController: 521 lines, fileWatcherService: 439 lines, devtools.ts: 350 lines (all match CR claims) |
| **Duplication Patterns** | ✅ Confirmed | - Error handling: 24+ identical try-catch blocks<br>- Parameter validation: 9+ `if (!projectId)` patterns<br>- Response formatting: 74+ identical `res.status().json()` patterns<br>- Async methods: 23 controller methods with manual handling |
| **Structure Alignment** | ✅ Confirmed | Proposed structure aligns with existing `server/middleware/` and `server/utils/` directories |
| **Size Limits** | ✅ Appropriate | - Orchestration: 150 lines (BaseController)<br>- Feature: 200-300 lines (controllers)<br>- Utility: 75-110 lines (helpers)<br>- All Hard Max limits at 1.5x defaults |
| **Extension Rule** | ✅ Testable | Clear criteria: inherit BaseController, apply decorators, use middleware, respect line limits |

### Architecture Quality Score: 9/10

**Strengths**:
- Accurate pattern identification and duplication quantification
- "Extract-then-Refactor" approach prevents re-extraction efforts
- Size limits balance maintainability without over-restriction
- Structure fits existing codebase conventions
- Extension rule is enforceable and measurable

**Implementation Notes**:
- `asyncHandler` middleware must be created (currently missing)
- `BaseController` is a new addition (doesn't exist yet)
- `CRController` will be extracted from ProjectController CR operations

### Validation Complete
The architecture design successfully addresses the root causes of technical debt and provides a clear, implementable path forward. Ready for implementation.
## 7. Deployment

### Simple Changes
- Deploy new middleware files alongside existing code
- Gradual migration: Keep old patterns working during rollout
- Feature flag: Enable new validation/error handling per endpoint

### Complex Changes

| Phase | Artifacts Deployed | Rollback |
-------|-------------------|----------|
| 1 | middleware/validation.ts, middleware/errorHandler.ts | Revert middleware files |
| 2 | CRController.ts with CR routes | Disable new routes, revert to ProjectController |
| 3 | SSEService.ts, refactored fileWatcherService.ts | Revert fileWatcherService.ts |

```bash
# Phase 1 deployment
npm run build:shared
cd server && npm test

# Phase 2 deployment (after Phase 1 verified)
cd server && npm run test:integration

# Phase 3 deployment (after Phase 2 verified)
cd server && npm run test:e2e
```
