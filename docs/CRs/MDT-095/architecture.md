# Architecture: MDT-095

**Source**: [MDT-095](../MDT-095.md)
**Generated**: 2026-02-19

## Overview

This feature adds Git worktree detection to enable isolated ticket development. When a ticket exists in a worktree whose branch name matches the ticket code, all file operations route to that worktree instead of the main project path. The design uses a centralized WorktreeService for path resolution, ensuring consistent behavior across web API, MCP tools, and file watching.

## Constraint Carryover

| Constraint ID | Enforcement |
|---------------|-------------|
| C1 | Runtime Prerequisites - Git CLI availability |
| C2 | Module Boundaries - FileWatcherService worktree extensions |
| C3 | Module Boundaries - WorktreeService scales to 10+ worktrees |
| C4 | Error Philosophy - Silent degradation on detection failure |
| C5 | Extension Rule - Backward compatible, disabled by config |
| C6 | Error Philosophy - Shell escaping for git commands |
| C7 | Module Boundaries - WorktreeService cache TTL 30s |

## Pattern

**Service Layer with Path Resolution Strategy** — Centralizes worktree detection and path resolution in a single service that all consumers (API, MCP, file watcher) delegate to. The strategy pattern allows "worktree wins if valid, else main path" fallback without duplicating logic.

## Key Dependencies

| Capability | Decision | Scope | Rationale |
|------------|----------|-------|-----------|
| E2E Testing | Jest (existing MCP test framework) | Dev | Project uses Jest-based MCP E2E tests; no Playwright dependency needed |
| Component Testing | React Testing Library (Jest) | Dev | Existing test infrastructure for UI components |
| Git Execution | Node `child_process.execFile` | Runtime | Built-in, prevents command injection vs shell strings |

## Runtime Prerequisites

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `git` CLI | CLI tool | No (soft) | Worktree detection returns empty map; system operates in single-path mode |
| `.mdt-config.toml` with `worktree.enabled` | config | No | Defaults to enabled |

## Structure

```
shared/
  ├── services/
  │   ├── WorktreeService.ts      # detect(), resolvePath(), invalidateCache()
  │   └── ProjectService.ts       # (modified) integrate WorktreeService
  └── models/
      └── WorktreeTypes.ts        # WorktreeMapping, WorktreeConfig interfaces

server/
  ├── fileWatcherService.ts       # (modified) addWatcher() for worktree paths
  ├── services/
  │   └── TicketService.ts        # (modified) use WorktreeService for path resolution
  └── routes/
      └── tickets.ts              # (modified) add inWorktree, worktreePath to responses

mcp-server/
  └── src/
      └── tools/
          └── handlers/
              └── crHandlers.ts   # (modified) use WorktreeService for path resolution

src/
  ├── components/
  │   ├── TicketCard.tsx          # (modified) uses TicketAttributeTags for badge
  │   ├── TicketAttributeTags.tsx # (already implemented) 🪾 Worktree badge
  │   └── __tests__/
  │       ├── TicketCard.worktree.test.tsx    # (exists) component tests
  │       └── TicketRow.worktree.test.tsx     # (exists) badge tests
  └── types/
      └── ticket.ts               # (already implemented) inWorktree?, worktreePath?
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `shared/services/WorktreeService.ts` | Git worktree detection, ticket code extraction from branch names, path resolution, cache management | File operations, UI rendering, MCP tool formatting |
| `shared/services/ProjectService.ts` | Project discovery, CR list aggregation (calls WorktreeService for path resolution) | Direct git command execution |
| `server/fileWatcherService.ts` | chokidar watchers for main and worktree paths, SSE broadcasting | Ticket content parsing, path resolution logic |
| `server/services/TicketService.ts` | CR CRUD operations using resolved paths | Git operations, worktree detection |
| `src/components/TicketAttributeTags.tsx` | Visual worktree badge display (🪾 Worktree) | Path resolution, API calls |

## Error Philosophy

Worktree detection failures never block core ticket operations. If `git worktree list` fails or returns unexpected output, the system logs a warning and treats the worktree map as empty, falling back to main project paths. Git command arguments use shell escaping via Node's `child_process.execFile` (not shell strings) to prevent injection. Cache refresh on TTL expiry is silent — stale data is used until fresh data is available, never blocking operations.

## Extension Rule

To add support for worktree path patterns beyond branch names (e.g., folder-based detection): Add a new detection strategy class implementing `WorktreeDetectionStrategy`, inject into `WorktreeService` constructor, and update configuration schema to allow `worktree.detectionMode = 'branch' | 'folder'`. The resolution pipeline remains unchanged.

---
*Generated by /mdt:architecture*
