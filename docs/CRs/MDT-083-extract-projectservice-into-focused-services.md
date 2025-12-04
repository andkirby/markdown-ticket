---
code: MDT-083
status: Proposed
dateCreated: 2025-12-04T00:51:40.415Z
type: Technical Debt
priority: High
---

# Extract ProjectService into focused services

## 1. Description

### Problem
- ProjectService.ts file exceeds 1100 lines with multiple responsibilities
- Single class handles project discovery, configuration, validation, caching, and global config
- Difficult to maintain, test, and understand the code
- Changes to one concern risk breaking other unrelated concerns

### Affected Artifacts
- `shared/services/ProjectService.ts` (1122 lines, multiple concerns)
- `shared/models/Project.ts` (imports from ProjectService)
- `shared/tools/ProjectManager.ts` (imports from ProjectService)
- `server/services/ProjectService.ts` (backend wrapper)
- `mcp-server` (uses ProjectService for project operations)

### Scope
- **Changes**: Extract ProjectService into smaller, focused services
- **Unchanged**: Public API contract with consumers

## 2. Decision

### Chosen Approach
Extract ProjectService into three focused services based on single responsibility principle.

### Rationale
- Improves code maintainability by reducing file size to <300 lines each
- Increases testability by isolating concerns
- Reduces coupling between different aspects of project management
- Follows single responsibility principle

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
----------|---------------|--------------|
| **Chosen Approach** | Extract into three focused services | **ACCEPTED** - Clear separation of concerns, manageable size |
| Keep single file | No structural change | File too large, multiple responsibilities |
| Extract into two services | Discovery+Config together | Still too large, overlapping concerns |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
----------|------|---------|
| `shared/services/ProjectDiscoveryService.ts` | Service | Project scanning and registry operations |
| `shared/services/ProjectConfigService.ts` | Service | Configuration loading and validation |
| `shared/services/ProjectCacheService.ts` | Service | Caching operations and TTL management |

### Modified Artifacts

| Artifact | Change Type | Modification |
----------|-------------|--------------|
| `shared/services/ProjectService.ts` | Complete rewrite | Becomes facade/coordinator |
| `shared/models/Project.ts` | Import changes | Update imports from new services |
| `shared/tools/ProjectManager.ts` | Import changes | Update imports from new services |

### Integration Points

| From | To | Interface |
------|----|-----------| 
| ProjectService (facade) | ProjectDiscoveryService | `scanProjects()`, `getProject()` |
| ProjectService (facade) | ProjectConfigService | `loadConfig()`, `validateConfig()` |
| ProjectService (facade) | ProjectCacheService | `get()`, `set()`, `clear()` |

### Key Patterns
- Facade Pattern: ProjectService as unified interface
- Service Layer Pattern: Each service handles specific domain
- Dependency Injection: Services injected into ProjectService

## 5. Acceptance Criteria

### Functional
- [ ] ProjectDiscoveryService exports `scanProjects()`, `getProject()`, `isProjectRegistered()`
- [ ] ProjectConfigService exports `loadConfig()`, `validateConfig()`, `migrateLegacyConfig()`
- [ ] ProjectCacheService exports `get()`, `set()`, `clear()`, `isValid()`
- [ ] ProjectService acts as facade, delegates to appropriate services
- [ ] All existing tests pass without modification
- [ ] New unit tests for each extracted service

### Non-Functional
- [ ] Each service file <300 lines
- [ ] Test coverage >90% for new services
- [ ] No breaking changes to public API
- [ ] All imports resolved correctly

### Testing
- Unit: Test ProjectDiscoveryService with mock file system
- Unit: Test ProjectConfigService with valid/invalid configs
- Unit: Test ProjectCacheService with TTL expiry
- Integration: Test ProjectService facade coordinates all services
- Manual: Verify existing functionality works unchanged

## 6. Verification

### By CR Type
- **Refactoring**: Tests pass, file sizes reduced (ProjectService: 1122→<300, new services: <300 each)
- **Code Quality**: Single responsibility per service, improved testability
- **Maintainability**: Each service focused on single concern

### Metrics
- ProjectService.ts lines: 1122 → <300
- New service files: 3 files × <300 lines each
- Test coverage: Maintain existing coverage, add >90% for new services
- Number of responsibilities per service: 1 (down from 5)

## 7. Deployment

### Simple Changes
- Build shared code with `npm run build:shared`
- Run existing tests to verify no breaking changes
- Update any documentation referencing ProjectService internals

### Complex Changes

| Phase | Artifacts Deployed | Rollback |
-------|-------------------|----------|
| 1 | New service files | Delete new files |
| 2 | Refactored ProjectService | Revert to original version |