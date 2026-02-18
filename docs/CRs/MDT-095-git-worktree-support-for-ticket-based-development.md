---
code: MDT-095
status: Proposed
dateCreated: 2025-12-15T15:47:05.294Z
type: Feature Enhancement
priority: Medium
phaseEpic: Phase 2
relatedTickets: MDT-067
---

# Git Worktree Support for Ticket-Based Development

## 1. Description

### Problem
- Developers cannot work on tickets in isolated Git worktrees without file system conflicts
- Current file watcher and ticket routing only supports main project path
- No visibility in UI when a ticket is being worked on in a worktree
- MCP tools return paths from main project even when ticket exists in worktree

### Affected Areas
- Backend: File watching service and project management
- API: Ticket routing and worktree detection endpoints
- Shared: Git utilities and project path resolution
- Frontend: Ticket view UI for worktree status indication
- MCP: Ticket file reading tools with path awareness

### Scope
- **In scope**: Detect when ticket is in a Git worktree and route operations accordingly
- **Out of scope**: Git worktree creation/management (handled by Git CLI)

## 2. Desired Outcome
### Success Conditions
- When a ticket ABC-XXX exists in a Git worktree path matching the ticket code, system routes all file operations to that worktree
- UI displays clear indication when viewing a ticket that's in a worktree
- MCP tools return correct worktree paths when reading ticket files
- File watcher monitors changes in both main path and worktree paths
- Feature can be enabled/disabled via configuration at both global and project levels

### Constraints
- Must maintain backward compatibility with existing single-worktree workflows
- Must not break existing file watching for main project path
- Must handle multiple worktrees for different tickets simultaneously
- Must respect .mdt-config.toml path filtering settings

### Non-Goals
- Not creating or managing Git worktrees (delegate to Git CLI)
- Not modifying Git repository structure
- Not changing core ticket file format
- Not handling multiple worktrees for the same ticket code (edge case)
## 3. Decisions
### Decision Summary
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Worktree matching strategy | **Branch name based** | Extract ticket code from branch name (e.g., `MDT-095` from `refs/heads/feature/MDT-095`), allowing arbitrary worktree paths |
| Conflict resolution | **Worktree wins** | If valid worktree exists with ticket file, use it; fallback to main repo if worktree path invalid or ticket file missing |
| Abandoned worktree handling | **User responsibility** | System shows warning badge when ticket exists in both locations; cleanup via `git worktree remove` is user's responsibility |
| Caching strategy | **TTL-based (30s)** | In-memory Map per ProjectService, refresh periodically |
| File watching | **Add chokidar per worktree** | Monitor each worktree path independently |
| UI badge | **"🌿 Worktree"** | In TicketCard.tsx and TicketRow.tsx |
| MCP tools | **Absolute path in response** | All tools resolve worktree paths, return absolute path |
| Configuration | **`worktree.enabled`** | In .mdt-config.toml, default: true |
| **Service integration** | **ProjectService** | `getProjectCRs()` is single point of ticket discovery; TicketService delegates to it; MCP tools use TicketService |
### Deferred to Implementation
- None - all major decisions resolved
### Worktree Detection Algorithm

```
1. Run `git worktree list --porcelain` from main repo
2. For each worktree:
   - Extract branch name from `branch refs/heads/...`
   - Apply regex pattern: (PROJECT_CODE-\d+)
   - Map: ticketCode → worktreePath
3. Cache result with 30s TTL
```

### Path Resolution Logic

```
For ticket ABC-123:
1. Check cache for worktree mapping
2. If worktree exists AND docs/CRs/ABC-123.md exists in worktree:
   → Use worktree path
3. Else:
   → Use main project path
```
## 4. Acceptance Criteria
### New Artifacts
| File | Type | Purpose |
|------|------|---------|
| `shared/services/WorktreeService.ts` | Service | Detect worktrees via `git worktree list`, extract ticket codes from branch names, provide path resolution with caching (30s TTL) |
### Modified Artifacts
| File | Changes |
|------|---------|
| `shared/services/WorktreeService.ts` | **NEW** - Detect worktrees, extract ticket codes from branches, provide path resolution |
| `shared/ProjectService.ts` | Integrate WorktreeService for path resolution, in-memory cache with 30s TTL |
| `server/src/services/ProjectService.ts` | Add chokidar watchers for worktree paths |
| `src/components/TicketCard.tsx` | Add "🌿 Worktree" badge when ticket in worktree |
| `src/components/TicketRow.tsx` | Add "🌿 Worktree" badge when ticket in worktree |

### MCP Tool Changes (Critical)

All MCP tools must resolve worktree paths before file operations:

| Tool | Change |
|------|--------|
| `get_cr` | Return file from worktree path if ticket exists there |
| `create_cr` | Create ticket file in worktree path if branch matches |
| `update_cr_status` | Update status in worktree ticket file |
| `update_cr_attrs` | Update attributes in worktree ticket file |
| `manage_cr_sections` | Read/write sections in worktree ticket file |
| `delete_cr` | Delete ticket from worktree path |
| `list_crs` | Include `inWorktree: boolean` flag per ticket |

**Path Resolution Flow for MCP:**
```
1. Receive ticket key (e.g., MDT-095)
2. Call WorktreeService.resolvePath(projectPath, ticketKey)
3. If worktree exists for ticket → return worktree path
4. Else → return main project path
5. All file operations use resolved path
```
### Configuration Schema

```toml
# .mdt-config.toml
[worktree]
enabled = true  # default: true
```

### API Changes

| Endpoint | Change |
|----------|--------|
| `GET /api/projects/:id/crs/:key` | Add `inWorktree: boolean` and `worktreePath?: string` to response |
| Ticket list responses | Include worktree status per ticket |

### Functional
- [ ] System detects Git worktrees whose names match ticket codes (e.g., worktree "ABC-123" for ticket ABC-123)
- [ ] File operations for ticket ABC-123 route to worktree path when it exists
- [ ] UI shows "in worktree" badge for tickets being worked on in worktrees
- [ ] MCP tools return correct file paths from worktree when reading tickets
- [ ] File watcher detects changes in worktree directories and updates clients

### Non-Functional
- [ ] File watching performance degradation < 5% when monitoring worktrees
- [ ] Worktree detection completes within 100ms on project load
- [ ] System handles at least 10 concurrent worktrees without issues

### Configuration Requirements
- [ ] Worktree support can be enabled/disabled via global configuration
- [ ] Worktree support can be configured per project in .mdt-config.toml
- [ ] When disabled at any level, system operates without worktree awareness
- [ ] Default behavior: worktree support enabled globally, per-project override available

### Edge Cases
- [ ] When worktree is deleted, system gracefully falls back to main project path
- [ ] When worktree path doesn't follow expected pattern, system still functions
- [ ] When .mdt-config.toml excludes worktree parent, system handles gracefully
## 5. Verification
### How to Verify Success
- Manual verification: Create worktree for a ticket and verify all operations route correctly
- Automated verification: Test path resolution across various worktree configurations

### Related Work
MDT-067 explores related file path management issues that may inform implementation approach.

### Session 2026-02-18

- Q: Worktree service location? → A: `shared/services/WorktreeService.ts`
- Q: Worktree service integration? → A: Defer to architect/implementation planning
- Q: Configuration key for worktree support? → A: `worktree.enabled` (default: true)
- Q: API endpoint approach? → A: Ticket-focused, add `inWorktree` field to ticket responses
- Q: How should MCP tools expose path? → A: Return absolute path in existing response
- Q: Frontend component for worktree badge? → A: Modify `TicketCard.tsx` and `TicketRow.tsx`
- Q: Caching mechanism? → A: In-memory Map per ProjectService with 30s TTL
- Q: UI badge style? → A: "🌿 Worktree"
- Q: File watching approach? → A: Add chokidar watchers for each worktree path
- Q: Worktree matching strategy? → A: Branch name based (extract ticket code from branch)
- Q: Conflict resolution? → A: Worktree wins if valid, fallback to main repo