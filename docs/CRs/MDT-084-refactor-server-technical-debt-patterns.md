---
code: MDT-084
status: Proposed
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

## 4. Artifact Specifications

### New Artifacts
| Artifact | Type | Purpose |
----------|------|---------|
| `server/middleware/validation.ts` | Middleware | Centralized parameter validation |
| `server/middleware/errorHandler.ts` | Decorator | Consistent error handling pattern |
| `server/controllers/CRController.ts` | Controller | Extracted CR operations from ProjectController |
| `server/services/SSEService.ts` | Service | SSE management extracted from fileWatcherService |

### Modified Artifacts
| Artifact | Change Type | Modification |
----------|-------------|--------------|
| `server/controllers/ProjectController.ts` | Reduction | Extract CR operations, remove validation code |
| `server/fileWatcherService.ts` | Split | Extract SSE logic, reduce to <300 lines |
| `server/routes/devtools.ts` | Split | Separate logging, session, rate-limiting concerns |

### Integration Points
| From | To | Interface |
------|----|-----------| 
| Controllers | Validation middleware | `validateParams()` |
| Controllers | Error decorator | `@handleErrors` |
| fileWatcherService | SSEService | Event emission interface |

### Key Patterns
- Validation middleware: Applied to all controller methods requiring projectId
- Error decorator: Wraps all controller methods for consistent error responses
- Service extraction: File watching and SSE as separate services

## 5. Acceptance Criteria

### Functional
- [ ] `server/middleware/validation.ts` exports `validateProjectId` function
- [ ] `server/middleware/errorHandler.ts` exports `handleErrors` decorator
- [ ] `server/controllers/CRController.ts` implements all CR CRUD operations
- [ ] `server/services/SSEService.ts` manages SSE connections separately

### Non-Functional
- [ ] ProjectController.ts < 300 lines (current: 521)
- [ ] fileWatcherService.ts < 300 lines (current: 439)
- [ ] Zero parameter validation duplication in controllers
- [ ] Zero error handling pattern duplication

### Testing
- Unit: Validation middleware with invalid/valid parameters
- Integration: Error decorator propagates correct HTTP status codes
- Manual: All existing API endpoints return identical responses

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