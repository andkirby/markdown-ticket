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
## 3. Open Questions
| Area | Question | Constraints |
|------|----------|-------------|
| Implementation | How to efficiently detect and cache worktree mappings? | Must support dynamic worktree creation/deletion |
| File Watching | How to extend chokidar to monitor worktree paths? | Must prevent performance degradation |
| UI/UX | What visual indicators distinguish worktree tickets? | Must be clear but not distracting |
| MCP Integration | How should worktree-aware tools expose path information? | Must maintain backward compatibility |
| Configuration | Where to store worktree configuration settings? | Must support both global and project-level config |

### Known Constraints
- Must use existing Git worktree metadata (`git worktree list`)
- Must integrate with existing ProjectService and file watcher
- Must support both global config (~/.config/markdown-ticket/config.toml) and project-level config (.mdt-config.toml)
- Assume at most one worktree per ticket code (edge case not in scope)

### Decisions Deferred
- Implementation approach for worktree detection (service vs. middleware)
- Caching strategy for worktree mappings
- Specific UI components for worktree indication
- MCP tool API modifications
- Configuration schema for worktree settings
## 4. Acceptance Criteria
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