# Requirements: MDT-142

**Source**: [MDT-142](../MDT-142-fix-filewatcher-recursive-watching-worktree-exclus.md)
**Generated**: 2026-03-17

## Overview

This CR enables real-time SSE events for subdocument changes in two contexts:
1. **Main project** - subdocuments in `docs/CRs/MDT-XXX/` trigger targeted UI updates
2. **Worktree** - subdocument changes in worktrees are detected and emit SSE events with proper source attribution

The changes eliminate duplicate events when files exist in both locations.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (Watcher Configuration), tasks.md (Implement recursive pattern) |
| C2 | architecture.md (Worktree Exclusion), tasks.md (Implement exclusion logic) |
| C3 | architecture.md (Worktree Monitoring), tasks.md (Watch .git/worktrees) |
| C4 | architecture.md (Backward Compatibility), tests.md (Regression tests) |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Subdocument | Any .md file nested under `docs/CRs/MDT-XXX/` folder where parent folder matches `{PROJECT}-\d+` pattern | Files with specific naming conventions | CR Section 4.4 defines path parsing from folder structure |
| Active worktree | A worktree whose ticket code matches an entry in `.git/worktrees/*/HEAD` branch ref | Any worktree directory that exists | CR Section 4.5 ties activity to HEAD monitoring |
| SSE event source | `main` for main project watcher, `worktree` for worktree watcher | Single source for all events | CR Section 4.1 defines `source` field |
| Duplicate event | Two SSE events for the same file change from different watchers | Multiple events for different files | CR Section 3 identifies this as the problem to solve |

## Semantic Decisions

- **Ticket code extraction**: From folder name (`MDT-095/file.md`) OR filename (`MDT-095.md`, `MDT-095-slug.md`) - both are valid sources
- **Event routing**: Main ticket file changes → `ticket:updated`, subdocument changes → `ticket:subdocument:changed`
- **Source attribution**: Events include `source` field to distinguish main vs worktree origin
- **Worktree-only listing**: Ticket lists must include branch-matched active worktree tickets even when the ticket file does not exist in the main project's `docs/CRs`.

## UAT Addendum 2026-05-11

### BR-1.7: Worktree-only ticket listing

WHEN listing tickets for a project with active branch-matched worktrees, the system shall include tickets that exist only in those worktrees and mark them with worktree metadata.

**Rationale**: `MDT-161` exists only in an active worktree on branch `MDT-161`; scanning main `docs/CRs` first makes it invisible.

## Scope Summary

| Context | Subdocument Events | Source Field |
|---------|-------------------|--------------|
| Main project | ✓ | `'main'` |
| Worktree | ✓ | `'worktree'` |

---
*Rendered by /mdt:requirements via spec-trace*
