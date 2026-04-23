---
code: MDT-142
status: Implemented
dateCreated: 2026-03-17T19:50:00.123Z
type: Architecture
priority: High
phaseEpic: Core Infrastructure
---

# Subdocument SSE Events (Main + Worktree)

## 1. Description

Enable real-time SSE events for subdocument changes in two contexts:

**Scope:**
1. **Subdocument SSE events in main project** - Changes to `docs/CRs/MDT-XXX/*.md` trigger targeted UI updates
2. **Subdocument SSE events in worktree** - Changes in worktrees emit events with proper source attribution

**Current Problems:**
1. **Shallow watch pattern** (`*.md`) misses subdocument changes in ticket folders
2. **Subdocument events are coalesced** into parent ticket - frontend cannot know which subdocument changed
3. **Worktree subdocuments not detected** - changes in worktrees don't trigger SSE events
4. **Duplicate events** when file exists in both main project and worktree

**Impact:**
- Subdocument changes may not trigger SSE events at all
- Frontend must refetch entire ticket list on any change
- UI cannot update subdocument views granularly
- Worktree users experience stale data or manual refresh requirements
# Fix Filewatcher: Recursive Watching, Worktree Exclusion, Subdocument Events
## 2. Rationale
Real-time collaboration requires accurate file change detection:
- Subdocument edits should trigger targeted UI updates, not full refreshes
- Worktree users expect seamless integration without manual configuration
- Duplicate events cause UI flicker and wasted network requests
- Current architecture conflates different file types, losing semantic information
## 3. Solution Analysis
### Selected Approach: Recursive Watch + Worktree Exclusion + Subdocument Events

**What changes:**

1. **Recursive Watch Pattern**
   - Change from `docs/CRs/*.md` to `docs/CRs/**/*.md`
   - Captures subdocuments in `MDT-XXX/subdoc.md` paths

2. **Worktree Exclusion from Main Watcher**
   - Detect active worktrees via `WorktreeService`
   - Exclude worktree ticket paths from main project watcher:
     - `docs/CRs/{ticketCode}/*.md` (folder)
     - `docs/CRs/{ticketCode}-*.md` (slug files)
   - Include these paths in worktree-specific watchers

3. **Worktree Auto-Discovery**
   - Watch `.git/worktrees/{name}/HEAD` for changes
   - On add/change/unlink → reload watchers with updated exclusion patterns
   - No manual `addWatcher()` calls required

4. **Subdocument-Aware Events**
   - Preserve subdocument path in SSE event
   - Frontend receives enough information to update specific subdocument view

### Rejected: Polling-Based Worktree Detection
- Higher latency (polling interval)
- More resource usage
- Simpler but less responsive
## 4. Implementation Specification
### 4.1 SSE Event Structure (Interface)

**FileChangeEvent:**

```
eventType: 'add' | 'change' | 'unlink'
projectId: string
timestamp: number
ticket: {
  code: string           // e.g., "MDT-095"
  status?: string
  type?: string
  priority?: string
  lastModified: string
}
subdocument?: {          // null for main ticket file
  code: string           // e.g., "architecture"
  filePath: string       // e.g., "MDT-095/architecture.md"
  lastModified: string
} | null
source: 'main' | 'worktree'
```

### 4.2 Watcher Pattern Changes

| Component | Current | New |
|-----------|---------|-----|
| Main project | `docs/CRs/*.md` | `docs/CRs/**/*.md` |
| Worktree exclusion | None | Exclude active worktree ticket paths |
| Worktree detection | Manual API call | Watch `.git/worktrees/*/HEAD` |

### 4.3 Worktree Exclusion Rules

For each active worktree with ticket code `MDT-XXX`:
- EXCLUDE from main watcher: `docs/CRs/MDT-XXX/*.md` and `docs/CRs/MDT-XXX-*.md`
- INCLUDE in worktree watcher: `{worktreePath}/docs/CRs/MDT-XXX/**/*.md`

### 4.4 Path Parsing Logic

Extract from file path:
1. **Ticket code**: From folder name (`MDT-095/file.md`) OR filename (`MDT-095.md`, `MDT-095-slug.md`)
2. **Subdocument**: Nested file path where parent folder matches `{PROJECT}-\d+` pattern

### 4.5 Worktree Monitoring

- Watch `.git/worktrees/{worktreeName}/HEAD` files
- On change: Read branch ref → extract ticket code → reload watchers
- On add: New worktree detected → add exclusion + worktree watcher
- On unlink: Worktree removed → remove exclusion + cleanup watcher

### 4.6 Frontend Event Mapping

| SSE Event | EventBus Event |
|-----------|----------------|
| `subdocument === null`, eventType = add/change | `ticket:created` / `ticket:updated` |
| `subdocument === null`, eventType = unlink | `ticket:deleted` |
| `subdocument !== null` | `ticket:subdocument:changed` |
## 5. Acceptance Criteria
### AC1: Recursive Watching
- [ ] Main project watcher uses `**/*.md` recursive pattern
- [ ] Subdocument changes in `MDT-XXX/subdoc.md` trigger SSE events
- [ ] Events include `subdocument` metadata when applicable

### AC2: Worktree Exclusion
- [ ] Active worktree ticket paths excluded from main watcher
- [ ] Worktree watcher includes worktree ticket paths
- [ ] No duplicate events for files in both locations

### AC3: Worktree Auto-Discovery
- [ ] `.git/worktrees/{name}/HEAD` monitored for changes
- [ ] New worktree → watchers reloaded within 1s
- [ ] Worktree removed → watchers cleaned up within 1s

### AC4: Subdocument Events
- [ ] SSE includes `subdocument.code` and `subdocument.filePath`
- [ ] Frontend receives `ticket:subdocument:changed` event
- [ ] Subdocument view updates without full ticket refresh

### AC5: Backward Compatibility
- [ ] Main ticket file changes emit `ticket:updated` as before
- [ ] No breaking changes to existing SSE event consumers
## 6. Test Plan
**Unit Tests:**
- Path parsing extracts ticket code and subdocument correctly
- Worktree exclusion returns correct boolean for active/inactive tickets
- Worktree HEAD monitoring triggers watcher reload

**Integration Tests:**
- Create subdocument → SSE event with subdocument info
- Add worktree → main watcher excludes, worktree watcher includes
- Modify worktree subdocument → single SSE event (no duplicate)

**E2E Tests:**
- Ticket viewer updates when subdocument edited in worktree
- Watchers auto-configured when worktree created

## 7. Clarifications

### UAT Session 2026-04-06

**Context**: File watcher fails to detect new top-level ticket file creation. Tickets created via CLI (`mdt-cli create`), API, or manual `touch` do not trigger SSE events or UI updates. File modifications on existing tickets work correctly.

**Approved Changes**:
- BR-1.5 (new, additive_change): File watcher must emit `add` SSE event for new top-level ticket files
- BR-1.6 (new, additive_change): Unit tests must exercise real filesystem, not just mocked chokidar handlers
- C1 (refine_in_place): Watch pattern may need investigation

**Changed Requirement IDs**: BR-1.5 (new), BR-1.6 (new), C1 (refined)

**Updated Workflow Documents**: requirements.md, bdd.md, tests.md, tasks.md (pending)

**uat.md Written**: Yes

**Root Cause Analysis**:
- All unit tests mock `chokidar.watch` — never test real filesystem events
- E2E tests only test `modifyTicketFile` (change events) and subdocument creation
- No test covers creating a new top-level ticket file (e.g., `MDT-150-aa.md`) and verifying SSE event
- Server runs with `bun --hot` which may kill watcher state on reload
- CLI command is `mdt-cli create` (not `mdt create`)
- `buildTwoLevelWatchPath` generates `{*.md,*/*.md}` pattern — needs real-chokidar verification

**Execution Slices**:
1. Slice 1: Root cause diagnosis via real-filesystem unit test
2. Slice 2: Fix + regression E2E test for file creation

---

## 8. References

> Requirements trace projection: [requirements.trace.md](./MDT-142/requirements.trace.md)
> Requirements notes: [requirements.md](./MDT-142/requirements.md)
> BDD trace projection: [bdd.trace.md](./MDT-142/bdd.trace.md)
> BDD notes: [bdd.md](./MDT-142/bdd.md)
> Architecture trace projection: [architecture.trace.md](./MDT-142/architecture.trace.md)
> Architecture notes: [architecture.md](./MDT-142/architecture.md)
> Test plan projection: [tests.trace.md](./MDT-142/tests.trace.md)
> Tasks trace projection: [tasks.trace.md](./MDT-142/tasks.trace.md)
> Tasks notes: [tasks.md](./MDT-142/tasks.md)
