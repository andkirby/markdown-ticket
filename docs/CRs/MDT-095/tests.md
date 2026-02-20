# Tests: MDT-095

**Status**: RED (feature mode - awaiting implementation)

## Module -> Test Mapping

| Module | Test File | Tests | Status |
|--------|-----------|-------|--------|
| `shared/services/WorktreeService.ts` | `shared/services/__tests__/WorktreeService.test.ts` | 17 | RED |
| `shared/models/WorktreeTypes.ts` | `shared/models/__tests__/WorktreeTypes.test.ts` | 10 | RED |
| `shared/services/ProjectService.ts` | `shared/services/project/__tests__/ProjectService.worktree.test.ts` | 6 | RED |
| `server/fileWatcherService.ts` | `server/tests/fileWatcherService.worktree.test.ts` | 9 | RED |
| `server/services/TicketService.ts` | `server/services/__tests__/TicketService.worktree.test.ts` | 5 | RED |
| `server/routes/tickets.ts` | `server/routes/__tests__/crs.worktree.test.ts` | 5 | RED |
| `mcp-server/src/tools/handlers/crHandlers.ts` | `mcp-server/src/tools/handlers/__tests__/crHandlers.worktree.test.ts` | 8 | RED |
| `src/types/ticket.ts` | `src/types/__tests__/ticket.worktree.test.ts` | 8 | RED |
| `src/components/TicketCard.tsx` | `src/components/__tests__/TicketCard.worktree.test.tsx` | 5 | RED |
| `src/components/TicketRow.tsx` | `src/components/__tests__/TicketRow.worktree.test.tsx` | 4 | RED |

**Total Tests**: 77

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Cache TTL (30s) | `WorktreeService` | at TTL boundary, after TTL expiry, invalidation |
| Branch name format | `WorktreeService` | feature/*, bugfix/*, bare branch, invalid format |
| Ticket code regex | `WorktreeService` | valid PROJECT-###, invalid formats, different prefixes |
| Config enabled/disabled | `WorktreeService`, `WorktreeTypes` | enabled=true, enabled=false, absent (default=true) |
| Path existence check | `WorktreeService` | file exists in worktree, file missing in worktree |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| `git` CLI | `WorktreeService.detect()` executes real `git worktree list --porcelain` | Returns empty Map, operates in single-path mode |
| `.mdt-config.toml` with `worktree.enabled` | Config parsing tests | Defaults to `enabled: true` |

**Note**: The `git` CLI integration test requires a real Git repository. In CI, a temporary repo with worktrees is created for testing. If Git is unavailable, tests verify graceful degradation.

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 (100ms detection) | `WorktreeService.test.ts` | `should parse git worktree list output...` (timing assertion) |
| C2 (<5% perf degradation) | `fileWatcherService.worktree.test.ts` | `should not significantly impact file watching performance...` |
| C3 (10+ worktrees) | `WorktreeService.test.ts` | `should handle 10+ concurrent worktrees` |
| C4 (silent degradation) | `WorktreeService.test.ts`, `fileWatcherService.worktree.test.ts` | Multiple error handling tests |
| C5 (backward compatibility) | `ticket.worktree.test.ts`, `TicketCard.worktree.test.tsx` | Tests with undefined/missing inWorktree field |
| C6 (command injection) | `WorktreeService.test.ts` | `should use execFile (not shell strings)...` |
| C7 (30s TTL) | `WorktreeService.test.ts` | Cache TTL boundary tests |

## Test Architecture

```
Unit Tests (RED - will fail until implemented)
├── shared/
│   ├── services/__tests__/WorktreeService.test.ts    # Core service logic
│   └── models/__tests__/WorktreeTypes.test.ts        # Type validation
├── server/
│   ├── tests/fileWatcherService.worktree.test.ts     # Watcher extensions
│   ├── routes/__tests__/crs.worktree.test.ts         # API response fields (tickets.ts)
│   └── services/__tests__/TicketService.worktree.test.ts # Path resolution
├── mcp-server/src/tools/handlers/__tests__/
│   └── crHandlers.worktree.test.ts                   # MCP tool integration
└── src/
    ├── types/__tests__/ticket.worktree.test.ts       # Type definitions
    └── components/__tests__/
        ├── TicketCard.worktree.test.tsx              # Board view badge
        └── TicketRow.worktree.test.tsx               # List view badge
```

## Verify

```bash
# Run all MDT-095 tests
npm test -- --testPathPattern="worktree"

# Expected (RED state):
# - 77 tests fail (modules don't exist yet)
# - Import errors for WorktreeService, WorktreeTypes, etc.

# After implementation (GREEN state):
# - 77 tests pass
```

## Test Coverage by Behavioral Requirement

| Requirement | Test Coverage |
|-------------|---------------|
| BR-1: Worktree Detection | WorktreeService.detect() tests |
| BR-2: Path Resolution | WorktreeService.resolvePath() tests |
| BR-3: Configuration Support | WorktreeTypes tests, enabled/disabled tests |
| BR-4: File Watching | fileWatcherService.worktree.test.ts |
| BR-5: MCP Tool Path Resolution | crHandlers.worktree.test.ts |
| BR-6: API Response Enhancement | crs.worktree.test.ts |
| BR-7: UI Worktree Badge | TicketCard/TicketRow component tests |
| BR-8: Edge Case Handling | Multiple edge case tests in WorktreeService |

---
*Generated by /mdt:tests*
