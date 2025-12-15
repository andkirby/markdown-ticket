---
code: MDT-096
status: Proposed
dateCreated: 2025-12-15T20:04:14.291Z
type: Technical Debt
priority: Medium
relatedTickets: MDT-095
blocks: MDT-095
---

# Refactor server/fileWatcherService.ts for Git Worktree Support

## 1. Description

### Problem
- Current fileWatcherService.ts only monitors single project path, cannot handle Git worktrees
- File watching logic is tightly coupled to single directory structure
- No abstraction for monitoring multiple paths simultaneously
- SSE event broadcasting doesn't account for worktree-specific path routing

### Affected Areas
- Backend: File watching service in server/services/
- SSE service: Real-time event broadcasting to frontend
- API endpoints: Routes that depend on file change notifications
- Test coverage: Integration and E2E tests for file watching scenarios

### Scope
- **In scope**: Refactor fileWatcherService to support multiple path monitoring
- **Out of scope**: Git worktree detection logic (handled by MDT-095)

## 2. Desired Outcome
### Success Conditions
- FileWatcherService can monitor multiple directory paths simultaneously
- SSE events correctly identify which path triggered the change
- Existing single-path functionality remains unchanged
- Service can be configured with dynamic list of paths to watch

### Constraints
- Must maintain backward compatibility with existing single-path usage
- Must not break existing SSE event format
- Must integrate with upcoming worktree detection from MDT-095
- Cannot degrade performance of existing file watching

### Non-Goals
- Not implementing worktree detection (deferred to MDT-095)
- Not modifying SSE event protocol
- Not changing chokidar configuration options

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Service Decomposition (split monolith into focused services)
- Components: 5 (PathWatcherService, PathWatcher, SSEBroadcaster, ClientManager, Facade)
- Key constraint: Each service ≤150 lines, total reduction from 439 to 525 lines (with tests)

**Extension Rule**: 
- Path features: Add to `PathWatcherService` (limit 150 lines)
- SSE features: Add to `SSEBroadcaster` (limit 125 lines) or `ClientManager` (limit 100 lines)
## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Should we use multiple chokidar instances or a single instance with multiple paths? | Must maintain performance and reliability |
| Configuration | How to pass dynamic path list to fileWatcherService? | Must support runtime path additions/removals |
| Events | How to distinguish which watched path triggered an event? | Must maintain existing SSE event structure |
| Testing | What test coverage needed for multi-path scenarios? | Must include integration and E2E tests |

### Known Constraints
- Must continue using chokidar as file watching library
- Must maintain existing API surface for ProjectService integration
- Must preserve current event broadcasting mechanism
- Must handle path additions/removals at runtime

### Decisions Deferred
- Multi-instance vs. single-instance chokidar approach
- Path management API design
- Event enrichment strategy for path identification
- Configuration storage approach for dynamic paths

## 4. Architecture Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `server/services/fileWatcher/index.ts` | Main interface | Public API, exports all services |
| `server/services/fileWatcher/PathWatcherService.ts` | Service | Manages multiple path watchers (150 lines) |
| `server/services/fileWatcher/PathWatcher.ts` | Wrapper | Single path chokidar wrapper (100 lines) |
| `server/services/fileWatcher/SSEBroadcaster.ts` | Service | Event formatting and broadcasting (125 lines) |
| `server/services/fileWatcher/ClientManager.ts` | Manager | SSE client lifecycle (100 lines) |
| `server/services/fileWatcher/__tests__/*.spec.ts` | Tests | Behavioral preservation tests |

### Removed Artifacts

| Artifact | Reason |
|----------|--------|
| `server/fileWatcherService.ts` | Replaced by focused service structure |

### Modified Artifacts
| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/routes/sse.ts` | Integration | Updated imports to use new service structure |
| `server/server.ts` | Integration | Updated imports and initialization for new services |

### Integration Points
| From | To | Interface |
|------|----|-----------|
| ProjectService | PathWatcherService | `initWatchPaths(paths)`, `addWatchPath(id, path)`, `removeWatchPath(id)` |
| server.ts | index.ts | `import FileWatcherService from './services/fileWatcher'` |
| PathWatcherService | SSEBroadcaster | `broadcast(event)` |
| SSEBroadcaster | ClientManager | `addClient(response)`, `removeClient(response)` |

### Key Patterns
- **Service Decomposition**: Split monolith into focused services
- **Single Responsibility**: Each service has one clear purpose
- **Event-Driven**: Services communicate through events and interfaces

### Key Patterns
- **Facade Pattern**: FileWatcherService maintains backward compatibility
- **Single Responsibility**: Each service has one clear purpose
- **Event-Driven**: Services communicate through events and interfaces

## 5. Acceptance Criteria
## 5. Verification

### How to Verify Success
- Manual verification: Start service with multiple paths and verify file changes in all paths trigger SSE events
- Automated verification: Integration tests simulate file changes across multiple paths simultaneously
- E2E verification: Full-stack tests verify UI updates when files change in different paths
- Performance verification: Measure resource usage with increasing numbers of watched paths