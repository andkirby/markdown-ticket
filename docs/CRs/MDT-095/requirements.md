# Requirements: MDT-095

**Source**: [MDT-095](../MDT-095.md)
**Generated**: 2026-02-19
**Last Updated**: 2026-02-19 (clarified UI component references)

## Overview

This feature enables the system to detect and work with Git worktrees, allowing developers to work on tickets in isolated environments without file system conflicts. When a ticket exists in a Git worktree whose branch name matches the ticket code, all file operations route to that worktree. The UI and MCP tools reflect the correct worktree paths.

## Behavioral Requirements

### BR-1: Worktree Detection

**Goal**: Detect Git worktrees associated with tickets by extracting ticket codes from branch names.

1. WHEN the system loads a project, the system shall execute `git worktree list --porcelain` from the main repository path.
2. WHEN parsing worktree output, the system shall extract the ticket code from each branch name using the pattern `PROJECT_CODE-\d+` (e.g., `MDT-095` from `refs/heads/feature/MDT-095`).
3. WHEN worktree detection completes, the system shall cache the mapping of ticket codes to worktree paths with a 30-second TTL.
4. IF `git worktree list` command fails or returns no worktrees, THEN the system shall proceed with an empty worktree mapping.

### BR-2: Path Resolution

**Goal**: Route file operations to the correct path based on worktree existence.

1. WHEN a file operation targets ticket ABC-XXX, the system shall check the worktree cache for a matching worktree path.
2. WHEN a matching worktree exists AND the ticket file exists at `docs/CRs/ABC-XXX.md` within the worktree, the system shall return the worktree path.
3. IF no matching worktree exists OR the ticket file does not exist in the worktree, THEN the system shall return the main project path.
4. WHEN worktree support is disabled via configuration, the system shall always return the main project path.

### BR-3: Configuration Support

**Goal**: Allow enabling or disabling worktree support at global and project levels.

1. WHEN `.mdt-config.toml` contains `worktree.enabled = false`, the system shall disable worktree detection for that project.
2. WHEN worktree configuration is absent, the system shall default to `worktree.enabled = true`.
3. WHILE worktree support is disabled at any configuration level, the system shall operate without worktree awareness.

### BR-4: File Watching

**Goal**: Monitor file changes in both main project and worktree directories.

1. WHEN the system initializes file watching, the system shall create a chokidar watcher for each detected worktree path.
2. WHEN a file changes in a worktree directory, the system shall broadcast the change to connected clients.
3. WHEN a worktree is added after initial load, the system shall add a new watcher for that worktree path.
4. WHEN a worktree is removed, the system shall remove the corresponding watcher without affecting other watchers.
5. IF file watching for a worktree fails, THEN the system shall log the error and continue monitoring other paths.

### BR-5: MCP Tool Path Resolution

**Goal**: Ensure all MCP tools return correct paths from worktrees.

1. WHEN `get_cr` is called for ticket ABC-XXX, the tool shall return the file content from the worktree path if the ticket exists there.
2. WHEN `create_cr` is called with a matching worktree branch, the tool shall create the ticket file in the worktree path.
3. WHEN `update_cr_status` or `update_cr_attrs` is called, the tool shall update the ticket file in the resolved worktree or main path.
4. WHEN `manage_cr_sections` is called, the tool shall read or write sections in the ticket file at the resolved path.
5. WHEN `delete_cr` is called, the tool shall delete the ticket from the resolved worktree or main path.
6. WHEN `list_crs` returns ticket data, the response shall include an `inWorktree: boolean` flag for each ticket.
7. WHEN any MCP tool resolves a path, the response shall include the absolute file path used.

### BR-6: API Response Enhancement

**Goal**: Provide worktree status in API responses.

1. WHEN `GET /api/projects/:id/crs/:key` is called, the response shall include `inWorktree: boolean` and `worktreePath?: string` fields.
2. WHEN listing tickets via API, each ticket shall include worktree status information.

### BR-7: UI Worktree Badge

**Goal**: Indicate when a ticket is being worked on in a worktree.

1. WHEN a ticket has `inWorktree: true`, the system shall display a worktree badge in `TicketAttributeTags.tsx` (used by both `TicketCard.tsx` and list views).
2. WHEN a ticket has `inWorktree: false` or `inWorktree: undefined`, the system shall NOT display a worktree badge.
3. WHEN a ticket exists in both worktree and main project, the system shall display a warning badge to indicate the conflict.
4. WHEN a worktree is deleted while the UI is viewing that ticket, the system shall gracefully update to show the main project version.

**Note**: UI badge implementation is verified via component tests (`src/components/__tests__/TicketCard.worktree.test.tsx` and `TicketRow.worktree.test.tsx`). BDD scenarios focus on API/MCP responses.

### BR-8: Edge Case Handling

**Goal**: Handle edge cases gracefully without breaking core functionality.

1. WHEN a worktree is deleted, the system shall fall back to the main project path on the next cache refresh.
2. WHEN a worktree path does not follow the expected pattern, the system shall ignore that worktree and continue functioning.
3. WHEN `.mdt-config.toml` path filtering excludes the worktree parent directory, the system shall respect the exclusion.
4. WHEN multiple worktrees reference the same ticket code, the system shall use the first matching worktree and log a warning.

## Constraints

| Concern | Requirement |
|---------|-------------|
| C1: Performance | Worktree detection via `git worktree list` shall complete within 100ms on project load |
| C2: Performance | File watching performance degradation shall be less than 5% when monitoring worktrees |
| C3: Scalability | System shall handle at least 10 concurrent worktrees without issues |
| C4: Reliability | Failure in worktree detection or watching shall never block core ticket operations |
| C5: Backward Compatibility | Existing single-worktree workflows shall continue to function without changes |
| C6: Security | Git command execution shall use properly escaped arguments to prevent command injection |
| C7: Cache Freshness | Worktree cache TTL shall be 30 seconds; stale data shall not persist beyond TTL |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Runtime Prereqs), tests.md (performance tests) |
| C2 | architecture.md (Module Boundaries - File Watcher), tests.md (performance tests) |
| C3 | architecture.md (Module Boundaries - WorktreeService), tests.md (scalability tests) |
| C4 | architecture.md (Error Philosophy), tests.md (negative tests) |
| C5 | architecture.md (Migration Strategy), tests.md (regression tests) |
| C6 | architecture.md (Security), tests.md (security tests) |
| C7 | architecture.md (Module Boundaries - WorktreeService), tests.md (cache tests) |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `worktree.enabled` | Enable/disable worktree support per project | `true` | System behaves as if enabled |

## Testing Approach

This feature uses a layered testing strategy:

| Test Layer | Framework | Purpose |
|------------|-----------|---------|
| Component Tests | React Testing Library (Jest) | UI badge rendering (`TicketCard.worktree.test.tsx`, `TicketRow.worktree.test.tsx`) |
| E2E Tests | Jest (MCP test framework) | API responses and MCP tool path resolution (`mcp-server/tests/e2e/`) |
| Integration Tests | Jest | File watching, worktree service logic |
| Unit Tests | Jest | WorktreeService caching, path resolution algorithms |

**Note**: Playwright is NOT used for this feature. All user-visible behavior is tested through API/MCP E2E tests and component tests.

---
*Generated by /mdt:requirements*
