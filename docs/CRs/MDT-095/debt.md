# MDT-095 Technical Debt Analysis

**CR**: MDT-095
**Date**: 2026-02-20
**Files Analyzed**: 12
**Debt Items Found**: 5 (2 High, 2 Medium, 1 Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/`, `server/`, `mcp-server/`, `src/` |
| File extension | `.ts`, `.tsx` |
| Test command | `npm test -- --testPathPattern="worktree"` |

## Summary

The MDT-095 worktree implementation is functionally correct but introduces structural debt around service instantiation patterns. Multiple modules create their own `WorktreeService` instances instead of sharing a singleton or using dependency injection, leading to potential configuration drift. Additionally, BR-4 (File Watching) remains partially implemented, and mock implementations are duplicated across test directories.

## High Severity

### 1. Shotgun Surgery: Multiple WorktreeService Instantiations

- **Location**:
  - `mcp-server/src/index.ts:80`
  - `server/fileWatcherService.ts:102`
  - `shared/services/ProjectService.ts:36,45`
  - `shared/services/TicketService.ts:45`
- **Evidence**: Four different modules create `new WorktreeService()` with different configurations:
  ```typescript
  // mcp-server/src/index.ts
  this.worktreeService = new WorktreeService()

  // server/fileWatcherService.ts
  private worktreeService: WorktreeService = new WorktreeService({ enabled: true })

  // shared/services/ProjectService.ts
  this.worktree = w || new WorktreeService()

  // shared/services/TicketService.ts
  this.worktreeService = new WorktreeService()
  ```
- **Impact**: Adding configuration options or changing constructor signature requires editing 4+ files. Cache state is not shared between instances.
- **Suggested Fix**: Create a singleton factory or use dependency injection container. Pass `WorktreeService` instance through constructor chain.

### 2. Unsatisfied Requirements: BR-4 File Watching Incomplete

- **Location**: `server/fileWatcherService.ts:50-102`
- **Evidence**:
  - `worktreeWatchers` Map declared but never populated automatically
  - `addWatcher()` method exists but not called from production code
  - `worktreeService` instantiated but not used to detect and setup worktree watchers
  - architecture.md specifies: "WHEN the system initializes file watching, the system shall create a chokidar watcher for each detected worktree path"
- **Impact**: Worktree file changes are not detected in real-time; relies on cache TTL refresh. BR-4.1 through BR-4.5 requirements not fully met.
- **Suggested Fix**: Implement `initializeWorktreeWatchers()` method called during `initMultiProjectWatcher()`. Use `worktreeService.detect()` to get worktree paths and call `addWatcher()` for each.

## Medium Severity

### 3. Duplication: Mock Implementations in Two Locations

- **Location**:
  - `mcp-server/src/__mocks__/@mdt/shared/services/WorktreeService.ts`
  - `server/tests/mocks/shared/services/WorktreeService.ts`
- **Evidence**: Both files implement mock `WorktreeService` with different interfaces:
  - MCP mock: exports `WorktreeServiceOptions` interface locally
  - Server mock: imports `WorktreeMapping` type from shared
  - MCP mock has simpler implementation, server mock has additional `isInWorktree()` method
- **Impact**: Test behavior differs between MCP and server test suites. Maintaining two mocks doubles effort.
- **Suggested Fix**: Consolidate to single mock in `shared/__mocks__/services/WorktreeService.ts`. Use Jest moduleNameMapper if needed for path resolution.

### 4. Hardcoded Configuration: fileWatcherService Ignores Project Config

- **Location**: `server/fileWatcherService.ts:102`
- **Evidence**:
  ```typescript
  private worktreeService: WorktreeService = new WorktreeService({ enabled: true })
  ```
- **Impact**: `worktree.enabled = false` in `.mdt-config.toml` has no effect on file watcher behavior. Violates BR-3.1.
- **Suggested Fix**: Read worktree config from project config during initialization. Pass config to WorktreeService constructor.

## Low Severity

### 5. Documentation Mismatch: Architecture vs Implementation Paths

- **Location**: `docs/CRs/MDT-095/architecture.md:56`
- **Evidence**: Architecture specifies `server/services/TicketService.ts` but actual location is `shared/services/TicketService.ts`:
  ```
  # architecture.md says:
  server/services/TicketService.ts

  # actual implementation:
  shared/services/TicketService.ts
  ```
- **Impact**: Developers following documentation will look in wrong location.
- **Suggested Fix**: Update architecture.md Structure section to reflect actual file locations.

## Suggested Inline Comments

**File**: `server/fileWatcherService.ts`
**Line**: 102
```typescript
// TECH-DEBT: Hardcoded enabled=true - should read from project config
// Impact: worktree.enabled=false in config has no effect on file watcher
// Suggested: Read config during initWorktreeWatchers(), pass to constructor
// See: MDT-095/debt.md#4-hardcoded-configuration
```

**File**: `shared/services/TicketService.ts`
**Line**: 45
```typescript
// TECH-DEBT: Creates new WorktreeService instance - should use shared instance
// Impact: Cache not shared with ProjectService, config duplication
// Suggested: Accept WorktreeService via constructor parameter
// See: MDT-095/debt.md#1-shotgun-surgery
```

## Recommended Actions

### Immediate (High Severity)
1. [ ] Refactor WorktreeService to singleton or DI pattern - creates shared instance across all consumers
2. [ ] Complete BR-4 implementation - auto-detect worktrees and setup watchers during initialization

### Deferred (Medium/Low)
1. [ ] Consolidate mock implementations to single location in shared/
2. [ ] Read worktree.enabled from project config in fileWatcherService
3. [ ] Update architecture.md to reflect actual file locations

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Total files | 12 | 12 | — | — |
| Debt items | 5 | 5 | 0 | ❌ |
| WorktreeService instances | 4 | 4 | 1 | ❌ |
| Mock implementations | 2 | 2 | 1 | ❌ |
| BR-4 implementation | Partial | Partial | Complete | ❌ |

---
*Generated: 2026-02-20T00:00:00Z*
