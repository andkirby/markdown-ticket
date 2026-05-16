# Filesystem-Only Date Strategy Analysis

**Position**: Remove `dateCreated` and `lastModified` from YAML frontmatter; derive all dates from filesystem attributes and git history at runtime.

**Author**: filesystem-advocate  
**Date**: 2026-04-03

---

## 1. Current State: How Dates Flow Today

### 1.1 Domain Contract

`domain-contracts/src/ticket/entity.ts` (lines 13-14, 42-43):

```typescript
interface Ticket {
  dateCreated: Date | null
  lastModified: Date | null
}
```

Both fields are **nullable** and part of the Zod `TicketSchema`. They are required on the `Ticket` and `TicketMetadata` types.

### 1.2 Where Frontmatter Dates Are WRITTEN

| Location | What It Writes | Line |
|----------|---------------|------|
| `shared/services/CRService.ts` | Sets `dateCreated: now, lastModified: now` on ticket creation | 19-20 |
| `shared/services/MarkdownService.ts` `generateYamlFrontmatter()` | Writes `dateCreated:` and `lastModified:` to YAML | 221-225 |
| `shared/services/TicketService.ts` `formatCRAsMarkdown()` | Writes `dateCreated:` to frontmatter during CR formatting | 699 |
| `mcp-server/src/services/SectionManagement/SectionEditor.ts` | Regex-replaces `lastModified:` after section edits | 200-204 |
| `scripts/sync-dates.ts` | Batch-updates both fields from git history | 128-133 |

### 1.3 Where Frontmatter Dates Are READ

| Location | What It Does | Line |
|----------|-------------|------|
| `shared/services/MarkdownService.ts` `parseMarkdownFile()` | Falls back to `stats.birthtime/ctime` and `stats.mtime` if frontmatter missing | 29-33 |
| `shared/services/MarkdownService.ts` `extractTicketMetadata()` | Same fallback pattern for metadata-only reads | 384-385 |
| `shared/models/Ticket.ts` `normalizeTicket()` / `normalizeTicketMetadata()` | Parses frontmatter date strings into `Date` objects | 71-72, 128-129 |
| `shared/services/TicketService.ts` `filterTickets()` | Uses `dateCreated` for date-range filtering | 655-657 |
| `shared/services/TicketService.ts` `sortTickets()` | Sorts by `lastModified` and `dateCreated` | 671-677 |
| `server/services/fileWatcher/index.ts` | Reads `frontmatter.lastModified` for SSE events | 159 |

### 1.4 Where Dates Are CONSUMED (Display/Logic)

| Consumer | Field Used | Location |
|----------|-----------|----------|
| **Sorting config** | `dateCreated`, `lastModified` | `src/config/sorting.ts:16-17` |
| **Sort logic** | Both, with `lastModified` falling back to `dateCreated` | `src/utils/sorting.ts:22-28` |
| **Ticket attributes panel** | `dateCreated`, `lastModified` | `src/components/TicketAttributes.tsx:41-45` |
| **List view (ProjectView)** | `lastModified` | `src/components/ProjectView.tsx:156` |
| **Ticket viewer header** | `dateCreated` as `createdAt`, `lastModified` as `updatedAt` | `src/components/TicketViewer/index.tsx:271-272` |
| **RelativeTimestamp** | `createdAt`, `updatedAt` | `src/components/shared/RelativeTimestamp.tsx:6-7` |
| **Documents view** | Both for sorting | `src/components/DocumentsView/DocumentsLayout.tsx:214-215` |
| **Markdown viewer** | Both for display | `src/components/DocumentsView/MarkdownViewer.tsx:108,114` |
| **SSE event payload** | `lastModified` | `src/services/sseClient.ts:27` |
| **Event bus type** | `lastModified` | `src/services/eventBus.ts:51` |
| **Optimistic updates** | Sets `lastModified: new Date()` locally | `src/hooks/useTicketOperations.ts:130,147` |
| **Project manager SSE handler** | Maps `ticketData.lastModified` from SSE | `src/hooks/useProjectManager.ts:83` |
| **OpenAPI schema** | Both declared on subdocument response | `server/openapi/schemas.ts:282-283, 402, 406-407` |
| **Tree metadata** | `lastModified` on `TreeNode` | `server/services/TreeService.ts:11` |
| **ExtractMetadataCommand** | Both from `fs.stat` | `server/commands/ExtractMetadataCommand.ts:48-49` |
| **SubdocumentService** | Both from `stat.birthtime/mtime` | `shared/services/ticket/SubdocumentService.ts:55-56` |
| **MCP test fixtures** | Both set on mock tickets | `mcp-server/src/tools/__tests__/test-fixtures.ts:24-25, 119-120` |

---

## 2. The Case for Filesystem-Only Dates

### 2.1 Eliminates the #1 Source of Date Drift

**The problem**: Every write path must remember to update `lastModified` in frontmatter. Currently:
- `CRService.createTicket()` sets both dates → ✅
- `MarkdownService.generateYamlFrontmatter()` writes both → ✅
- `SectionEditor` regex-replaces `lastModified` → ⚠️ fragile (regex on YAML)
- `TicketService.updateCRStatus()` writes the file but **does NOT update lastModified in frontmatter** (line 351 comment: "lastModified will be automatically set from file modification time") → ❌ **inconsistency**
- External editors (VS Code, vim, etc.) modify the file → ❌ frontmatter never updated

This means the codebase already acknowledges (in a comment) that `lastModified` in frontmatter is unreliable — it can go stale. The filesystem `mtime` is always correct because the OS updates it on every write.

### 2.2 Reduces Code Complexity

Removing frontmatter dates eliminates:
- **5 write sites** that produce `dateCreated`/`lastModified` in YAML
- **2 fallback chains** (`parseMarkdownFile` lines 29-33, `extractTicketMetadata` lines 384-385) that check frontmatter first then fall back to `fs.stat`
- **1 regex replacement** in `SectionEditor.ts` (lines 200-204) that is fragile
- **The `sync-dates.ts` script** entirely (its purpose becomes unnecessary)
- The need to keep frontmatter dates and filesystem dates in sync

### 2.3 The Fallback Pattern Proves the Point

The existing code already prefers filesystem dates when frontmatter is absent:

```typescript
// MarkdownService.ts:29-33
if (!ticket.dateCreated) {
  ticket.dateCreated = stats.birthtime || stats.ctime
}
if (!ticket.lastModified) {
  ticket.lastModified = stats.mtime
}
```

And:

```typescript
// MarkdownService.ts:384-385
dateCreated: parsedYaml.dateCreated || stats.birthtime || stats.ctime,
lastModified: parsedYaml.lastModified || stats.mtime,
```

This pattern is a tacit admission that **filesystem dates are the authoritative fallback**. The argument is: why not make them the primary source?

### 2.4 Simplifies MCP Tooling

The MCP `SectionEditor` currently has to regex-replace the `lastModified:` line in YAML frontmatter after every section edit (line 200-204). This is error-prone — if the frontmatter format changes or the field is missing, the regex silently fails. With filesystem-only dates, the editor just writes the file and `mtime` is automatically correct.

### 2.5 Eliminates `sync-dates.ts` Entirely

The `scripts/sync-dates.ts` script (168 lines) exists solely to reconcile frontmatter dates with git history. If dates come from the filesystem (supplemented by git at runtime for cloned repos), this script is deleted entirely.

---

## 3. Addressing the `git clone` Problem

**The strongest objection to filesystem-only dates**: after `git clone`, all file mtimes are set to the clone timestamp, and `birthtime` on Linux is unreliable (many filesystems don't support it).

### 3.1 Current `sync-dates.ts` Already Solves This

The project already has `scripts/sync-dates.ts` that derives dates from git history:

```typescript
// sync-dates.ts:31-37
const created = execSync(
  `git log --diff-filter=A --follow --format="%aI" -- "${rel}"`,
  { cwd: repoRoot, encoding: 'utf8' }
)
const modified = execSync(
  `git log -1 --format="%aI" -- "${rel}"`,
  { cwd: repoRoot, encoding: 'utf8' }
)
```

### 3.2 Proposed Approach: Runtime Git Fallback

Instead of writing git-derived dates into frontmatter, **derive them at read time**:

```text
Priority for dateCreated:
1. stat.birthtime (macOS, Windows, ext4)
2. git log --diff-filter=A --follow (if birthtime is clone time)
3. stat.ctime (last resort)

Priority for lastModified:
1. stat.mtime (always correct after any write)
2. git log -1 (only if mtime looks like clone time)
```

**Implementation**: A `resolveDates(filePath, repoRoot)` utility that:
1. Gets `fs.stat` dates
2. If the repo has git history, gets git dates
3. Uses a heuristic to detect "clone time" (e.g., if all files have the same birthtime within a narrow window, it's likely a clone)
4. Returns the best available dates

This runs at **read time** in `MarkdownService.parseMarkdownFile()` and `extractTicketMetadata()` — the same place the current fallback logic lives.

### 3.3 `bun scripts/sync-dates.ts --touch` Alternative

For users who prefer eager correction (not lazy/runtime), repurpose `sync-dates.ts` to touch files:

```bash
bun scripts/sync-dates.ts --touch
```

This would use `git log` dates and `fs.utimes()` to set the actual filesystem timestamps to match git history. One command after `git clone`, and all filesystem dates are correct forever.

This is **better than the current approach** because:
- It fixes the source of truth (filesystem) rather than writing redundant data (frontmatter)
- It's a one-time operation, not ongoing maintenance
- It works for any tool that reads the filesystem, not just MDT

---

## 4. Edge Cases

### 4.1 Untracked Files (Not Yet Committed)

- `dateCreated`: `stat.birthtime` is correct — the file was just created
- `lastModified`: `stat.mtime` is correct — it reflects the last edit
- Git fallback: naturally returns null, filesystem dates win

### 4.2 New Files Not Yet Committed

Same as untracked — filesystem dates are the only source available, and they're correct.

### 4.3 Files Edited Outside the App

- `stat.mtime` is automatically updated by the OS → ✅ always correct
- With frontmatter dates, external edits leave `lastModified` stale → ❌

### 4.4 Cross-Platform: `birthtime` on Linux

- `stat.birthtime` is `undefined` on many Linux filesystems (ext3, older kernels)
- The current code already handles this: `stats.birthtime || stats.ctime`
- `ctime` is "inode change time" — not creation time, but better than nothing
- **With git fallback**: On Linux, use `git log --diff-filter=A` for `dateCreated`. This is actually **more reliable** than `birthtime` because it reflects when the file was actually first committed, not when the OS created the inode.

### 4.5 `implementationDate`

This is a **domain date** (when the feature was implemented), not a filesystem date. It should stay in frontmatter. It is semantically different from `dateCreated` and `lastModified`.

---

## 5. What Changes If We Remove Frontmatter Dates

### 5.1 Minimal Breaking Changes

The `Ticket` interface keeps `dateCreated` and `lastModified` fields — they're just populated from filesystem/git instead of frontmatter. All consumers continue to work unchanged.

### 5.2 Changes Required

| Component | Change | Impact |
|-----------|--------|--------|
| `MarkdownService.generateYamlFrontmatter()` | Remove `dateCreated`/`lastModified` lines | 6 lines removed |
| `MarkdownService.parseMarkdownFile()` | Always use `fs.stat` (remove frontmatter check) | Simplify fallback logic |
| `MarkdownService.extractTicketMetadata()` | Same simplification | Simplify fallback logic |
| `CRService.createTicket()` | Stop setting `dateCreated`/`lastModified` on ticket object | 2 lines removed |
| `TicketService.formatCRAsMarkdown()` | Remove `dateCreated` line | 1 line removed |
| `SectionEditor.ts` | Remove regex `lastModified` update (step 6) | 6 lines removed |
| `shared/services/TicketService.ts` line 351 | Remove comment about `lastModified` | 1 line |
| `sync-dates.ts` | Repurpose to `--touch` mode or delete | 168 lines removed/replaced |
| Frontend optimistic updates | Stop setting `lastModified: new Date()` in local state | 2 lines |
| Existing `.md` files | `dateCreated`/`lastModified` remain in frontmatter but are ignored | No action needed |

### 5.3 What Does NOT Change

- **Sorting**: Works identically — dates are on the `Ticket` object either way
- **Display**: Works identically — components read `ticket.dateCreated`/`ticket.lastModified`
- **API responses**: Same shape — dates are populated at read time
- **SSE events**: `lastModified` can still be included — derived from `stat.mtime` at broadcast time
- **MCP tools**: All work unchanged — they call `MarkdownService.parseMarkdownFile()` which populates dates
- **Tests**: Most test fixtures set dates that will still pass; test mocks that inject frontmatter dates just need to accept that the source is filesystem instead
- **`implementationDate`**: Stays in frontmatter — it's a domain concept, not a filesystem concept

---

## 6. Migration Path

### Phase 1: Add Git Fallback to Read Path
- Add `resolveDates(filePath, repoRoot)` utility
- Integrate into `MarkdownService.parseMarkdownFile()` and `extractTicketMetadata()`
- **Result**: Dates are now always correct, even after `git clone`, regardless of frontmatter

### Phase 2: Stop Writing Dates to Frontmatter
- Remove date lines from `generateYamlFrontmatter()`, `formatCRAsMarkdown()`, `SectionEditor`
- **Result**: No more date drift, no more stale `lastModified`

### Phase 3: Repurpose `sync-dates.ts`
- Convert to `--touch` mode: `bun scripts/sync-dates.ts --touch`
- Uses `git log` + `fs.utimes()` to fix filesystem timestamps after clone
- **Result**: One-time fix for cloned repos; no ongoing maintenance

### Phase 4: Cleanup
- Remove `dateCreated`/`lastModified` from existing `.md` files (optional, low priority since they're ignored)
- Update tests that assert frontmatter date content
- Remove `parseYamlFrontmatter` date detection logic (lines that check `key.includes('Date')`)

---

## 7. Summary

| Aspect | Frontmatter Dates | Filesystem-Only |
|--------|------------------|-----------------|
| Accuracy after external edit | ❌ Stale | ✅ Always current |
| Accuracy after `git clone` | ✅ If `sync-dates` was run | ✅ With git fallback |
| Cross-platform (Linux birthtime) | ✅ N/A | ✅ Git fallback is more reliable than birthtime |
| Code complexity | ❌ 5 write sites + fallback chains + sync script | ✅ Single read-time resolver |
| MCP SectionEditor fragility | ❌ Regex on YAML | ✅ Just write file, mtime is correct |
| Maintenance burden | ❌ Must keep frontmatter and FS in sync | ✅ Single source of truth |
| Data duplication | ❌ Same date in frontmatter AND filesystem | ✅ One source |
| Works for non-MDT tools | ❌ Only MDT reads frontmatter dates | ✅ Any tool sees correct dates |

**Recommendation**: Adopt filesystem-only dates with a git-history runtime fallback. This is simpler, more correct, and eliminates an entire class of date-synchronization bugs. The migration is low-risk because the `Ticket` interface doesn't change — only the source of the data shifts from frontmatter parsing to `fs.stat` + `git log`.
