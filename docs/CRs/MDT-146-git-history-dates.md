---
code: MDT-146
status: Proposed
dateCreated: 2026-04-04T21:59:08.266Z
type: Architecture
priority: High
---

# Git-history date source for markdown tickets

## 1. Description

### Problem
- 136 out of 134 ticket files have stale `dateCreated`/`lastModified` in YAML frontmatter — 8 out of 10 mutation paths don't update them
- Dual source of truth (frontmatter + filesystem mtime) constantly drifts, requiring manual sync scripts
- `git checkout` and `git clone` destroy filesystem timestamps, breaking board sorting
- Every new write path must remember to update frontmatter dates — fragile, already broken

### Affected Areas
- shared/services: MarkdownService, TicketService, CRService, SubdocumentService
- mcp-server: SectionEditor regex for lastModified
- server: file watcher SSE broadcasts
- src: sorting, display components, optimistic updates
- scripts: sync-dates.ts

### Scope
- **In scope**: Replace frontmatter-derived dates with git-history-derived dates; standalone `sync-git-dates` CLI tool; git hooks for automatic sync
- **Out of scope**: `implementationDate` (domain concept, stays in frontmatter); removing existing frontmatter dates from old files (ignored, not deleted)

## 2. Desired Outcome

### Success Conditions
- Ticket dates are always derived from git history (`git log --diff-filter=A` for created, `git log -1` for modified)
- Batch git log for all files completes in ~40ms, cached with chokidar invalidation
- `git clone` and `git checkout` produce correct dates without manual intervention
- Untracked/new files fall back to `stat.birthtime`/`stat.mtime`
- Developer runs `sync-git-dates` (or git hooks fire) to set filesystem timestamps — any tool benefits, not just MDT
- ~200 lines of date-synchronization code removed (sync script, frontmatter write sites, SectionEditor regex)

### Constraints
- `lastModified` semantic: "last committed change," not "last uncommitted edit" — acceptable per product decision
- Frontend SSE skip mechanism (`useSSEEvents.ts:74-76`) already handles UX for uncommitted edits — optimistic local dates persist in current session
- Must work for subdocuments (`MDT-XXX/*.md`) in addition to ticket root files
- Generic tool (`sync-git-dates`) usable by any project, not MDT-specific

### Non-Goals
- Not tracking uncommitted edit timestamps
- Not removing existing frontmatter date fields from old files (ignored at read time)
- Not replacing `implementationDate` (domain concept)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Tool distribution | Ship as standalone npm/bun package, or embedded in mdt-cli? | Must be usable by non-MDT projects |
| Hook installation | `core.hooksPath` (global) vs symlinked tracked hooks vs git `init.templateDir`? | Hooks don't travel with clones — need install step |
| Cache granularity | Invalidate entire cache on any file change, or per-file? | Chokidar already watches files — leverage existing events |
| Batch git log parsing | Parse `--name-only` output to map files→dates, or use `--name-status`? | Must handle renames (`--follow` doesn't work in batch mode) |

### Decisions Deferred
- Exact CLI interface for `sync-git-dates` (determined by architecture)
- Cache implementation details (determined by architecture)
- Whether MDT reads git dates at runtime or only filesystem timestamps post-sync (determined by architecture)

## 4. Acceptance Criteria

### Functional
- [ ] Board sorts by "Update Date" using git-history-derived dates — correct after clone, checkout, rebase
- [ ] New untracked files show `stat.mtime` as fallback
- [ ] `sync-git-dates` CLI touches filesystem timestamps from git history for all `.md` files
- [ ] Git hooks (`post-checkout`, `post-merge`) incrementally touch only changed files
- [ ] MDT stops writing `dateCreated`/`lastModified` to frontmatter — no new frontmatter date writes
- [ ] Existing frontmatter dates in old files ignored at read time (not deleted)
- [ ] `implementationDate` still read from and written to frontmatter

### Non-Functional
- [ ] Batch git log + cache population < 50ms for 150 files
- [ ] Cache hit returns dates in < 1ms
- [ ] Incremental hook sync (post-checkout) touches only changed files, < 10ms for typical branch switch

### Edge Cases
- [ ] Untracked files (never committed) — fallback to stat dates
- [ ] Renamed files — git log `--follow` in batch mode limitations handled
- [ ] Rebased/amended commits — dates auto-correct from new history
- [ ] Empty repo (no commits yet) — all files are untracked, stat fallback

## 5. Verification

### How to Verify Success
- Run `sync-git-dates` on a cloned repo → `stat -f "%Sm" docs/CRs/MDT-001.md` shows git author date
- Switch branches → board sorting unchanged (dates from git history, not mtime)
- Create new ticket → shows creation time from stat, not frontmatter
- Edit ticket via MCP → `git log -1` shows correct modified date after commit
- Delete `lastModified` from a ticket's frontmatter → board still shows correct date
