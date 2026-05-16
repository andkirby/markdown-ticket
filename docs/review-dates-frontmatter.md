# Frontmatter Date Advocate Analysis

## Position

MDT should **keep** `dateCreated` and `lastModified` in YAML frontmatter. Frontmatter is the right place for these fields — they're metadata that travels with the file, works offline, and is human-readable. The problem is not the location; the problem is that **the current implementation has multiple mutation paths that silently fail to update `lastModified`**, causing drift.

---

## 1. How Dates Flow Today

### 1.1 Creation (✅ Works)

**File**: `shared/services/CRService.ts:17-20`

```ts
static createTicket(data: TicketData, ticketCode: string, ticketType: string, filePath: string) {
    const now = new Date()
    return {
      // ...
      dateCreated: now,
      lastModified: now,
      // ...
    }
}
```

**File**: `shared/services/TicketService.ts:693-700` (`formatCRAsMarkdown`)

```ts
sections.push(`dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}`)
// ... but NO lastModified is written!
```

**Bug #1**: `CRService.createTicket()` sets `lastModified: now` on the in-memory object, but `formatCRAsMarkdown()` never serializes `lastModified` to the YAML frontmatter. So **newly created tickets never get a `lastModified` line in their frontmatter**. The fallback at `MarkdownService.ts:30-33` covers this with `stats.mtime`, but it means the frontmatter is incomplete from day one.

### 1.2 Reading (✅ Works with fallback)

**File**: `shared/services/MarkdownService.ts:27-33`

```ts
const stats = fs.statSync(filePath)
if (!ticket.dateCreated) {
  ticket.dateCreated = stats.birthtime || stats.ctime
}
if (!ticket.lastModified) {
  ticket.lastModified = stats.mtime
}
```

Same fallback in `extractTicketMetadata()` at line ~384. This is good defensive coding — if frontmatter is missing dates, fall back to filesystem stats. But this means **the system silently hides the problem** instead of surfacing it.

### 1.3 Status Updates via Shared Service (❌ Does NOT update `lastModified`)

**File**: `shared/services/TicketService.ts:347-354`

```ts
const updatedContent = this.updateYAMLField(content, 'status', status)
// lastModified will be automatically set from file modification time
await fs.outputFile(cr.filePath, updatedContent, 'utf-8')
```

The comment `// lastModified will be automatically set from file modification time` is **incorrect**. `fs.outputFile()` updates the filesystem `mtime`, but it does NOT update the YAML `lastModified:` field. The next time the file is read, the fallback kicks in with `stats.mtime`, so it *appears* to work — but only through the fallback, not through frontmatter.

**This is the central lie in the codebase.** The comment reveals the developer's intent (rely on filesystem mtime), but it defeats the purpose of having `lastModified` in frontmatter at all.

### 1.4 Attribute Updates via Shared Service (❌ Does NOT update `lastModified`)

**File**: `shared/services/TicketService.ts:410-420`

```ts
for (const [field, value] of Object.entries(attributes)) {
  if (value !== undefined && value !== null) {
    const stringValue = Array.isArray(value) ? value.join(',') : String(value)
    updatedContent = this.updateYAMLField(updatedContent, field, stringValue)
  }
}
await fs.outputFile(cr.filePath, updatedContent, 'utf-8')
```

Same problem. `updateCRAttrs()` updates the requested fields but never touches `lastModified`.

### 1.5 MCP `update_cr_status` (❌ Delegates to shared service)

**File**: `mcp-server/src/services/crService.ts:52`

```ts
async updateCRStatus(project: Project, key: string, status: CRStatus): Promise<boolean> {
    return this.ticketService.updateCRStatus(project, key, status)
}
```

Delegates to the shared `TicketService.updateCRStatus()` which has Bug #3 above. The MCP handler's response text says "Updated YAML frontmatter and lastModified timestamp" (`crHandlers.ts:342`) — **this is a lie**. No `lastModified` is updated.

### 1.6 MCP `update_cr_attrs` (❌ Delegates to shared service)

**File**: `mcp-server/src/services/crService.ts:45-46`

```ts
async updateCRAttrs(project: Project, key: string, attributes: Partial<TicketData>): Promise<boolean> {
    return this.ticketService.updateCRAttrs(project, key, attributes)
}
```

Same issue — delegates to `updateCRAttrs()` which doesn't touch `lastModified`.

### 1.7 MCP `manage_cr_sections` (✅ Does update `lastModified`)

**File**: `mcp-server/src/services/SectionManagement/SectionEditor.ts:200-204`

```ts
// Step 6: Update YAML lastModified timestamp
const now = new Date().toISOString()
const updatedYaml = yamlBody.replace(
  /lastModified:.*$/m,
  `lastModified: ${now}`,
)
```

This is the **only mutation path that correctly updates `lastModified` in frontmatter**. It's also the most fragile — it uses regex replacement and will silently fail if `lastModified:` doesn't already exist in the frontmatter (which, per Bug #1, it doesn't for newly created tickets!).

### 1.8 Frontend Optimistic Updates (⚠️ Local only)

**File**: `src/hooks/useTicketOperations.ts:147`

```ts
setTickets((prevTickets: Ticket[]) =>
  prevTickets.map((ticket: Ticket) =>
    ticket.code === ticketCode
      ? { ...ticket, ...updates, lastModified: new Date() }
      : ticket,
  ),
)
```

The frontend sets `lastModified: new Date()` in local React state for optimistic updates, but this **never reaches the backend**. The API PATCH request sends only the user's intended updates (status, priority, etc.), not the `lastModified`. So the frontend shows a fresh date, but the file on disk retains the old one.

### 1.9 SSE Event Handling (⚠️ Trusts frontmatter)

**File**: `server/services/fileWatcher/index.ts:159`

```ts
lastModified: frontmatter.lastModified || new Date().toISOString(),
```

When a file changes, the SSE broadcast reads frontmatter's `lastModified` and sends it to the frontend. If frontmatter is stale, the frontend gets stale data.

**File**: `src/hooks/useProjectManager.ts:83`

```ts
{ ...ticket, ...ticketData, lastModified: ticketData.lastModified || new Date() }
```

The frontend applies SSE data directly. If `ticketData.lastModified` is the stale frontmatter value, the optimistic update's `new Date()` gets overwritten with the stale value.

### 1.10 Sorting (✅ Works, depends on data quality)

**File**: `src/utils/sorting.ts:26-28`

```ts
case 'lastModified':
  aValue = a.lastModified || a.dateCreated
  bValue = b.lastModified || b.dateCreated
```

Sorting by "Update Date" uses `lastModified` with fallback to `dateCreated`. When `lastModified` is stale, tickets appear in wrong order.

---

## 2. Why Dates Drift — Complete Map

| # | Mutation Path | Updates `lastModified` in Frontmatter? | Updates `mtime` on Disk? | Source |
|---|---|---|---|---|
| 1 | `TicketService.createCR()` → `formatCRAsMarkdown()` | ❌ Never written | ✅ Yes | `TicketService.ts:699` |
| 2 | `TicketService.updateCRStatus()` | ❌ No | ✅ Yes | `TicketService.ts:350-354` |
| 3 | `TicketService.updateCRAttrs()` | ❌ No | ✅ Yes | `TicketService.ts:415-420` |
| 4 | MCP `update_cr_status` → shared service | ❌ No | ✅ Yes | `crService.ts:52` |
| 5 | MCP `update_cr_attrs` → shared service | ❌ No | ✅ Yes | `crService.ts:45-46` |
| 6 | MCP `manage_cr_sections` → SectionEditor | ✅ Yes (regex) | ✅ Yes | `SectionEditor.ts:200-204` |
| 7 | Frontend PATCH → server controller | ❌ No | ✅ Yes | `useTicketOperations.ts:97-110` |
| 8 | LLM / manual edits to .md files | ❌ No | ✅ Yes | N/A |
| 9 | Git operations (checkout, rebase, merge) | ❌ No | ⚠️ Varies | N/A |
| 10 | `sync-dates.ts` script | ✅ Yes (writes) | ✅ Yes | `scripts/sync-dates.ts` |

**Result**: 8 out of 10 mutation paths do NOT update `lastModified` in frontmatter. The system works only because of the `stats.mtime` fallback during reads, which masks the real problem.

---

## 3. Concrete Fixes

### Fix 1: Write `lastModified` on ticket creation (Bug #1)

**File**: `shared/services/TicketService.ts:699` — add after `dateCreated`:

```ts
sections.push(`dateCreated: ${ticket.dateCreated?.toISOString() || new Date().toISOString()}`)
sections.push(`lastModified: ${ticket.lastModified?.toISOString() || new Date().toISOString()}`)
```

This ensures every new ticket starts with both dates in frontmatter.

### Fix 2: Update `lastModified` in `updateCRStatus()` (Bug #3)

**File**: `shared/services/TicketService.ts:350-354` — change:

```ts
const updatedContent = this.updateYAMLField(content, 'status', status)
// DELETE the misleading comment: "lastModified will be automatically set from file modification time"
const withTimestamp = this.updateYAMLField(updatedContent, 'lastModified', new Date().toISOString())
await fs.outputFile(cr.filePath, withTimestamp, 'utf-8')
```

### Fix 3: Update `lastModified` in `updateCRAttrs()` (Bug #4)

**File**: `shared/services/TicketService.ts:418-420` — add before write:

```ts
// Always update lastModified when any attribute changes
updatedContent = this.updateYAMLField(updatedContent, 'lastModified', new Date().toISOString())
await fs.outputFile(cr.filePath, updatedContent, 'utf-8')
```

### Fix 4: Fix the MCP handler's misleading response

**File**: `mcp-server/src/tools/handlers/crHandlers.ts:342` — this line says "Updated YAML frontmatter and lastModified timestamp" but `lastModified` is never actually updated. After Fix 2 above, this becomes truthful.

### Fix 5: Fix `SectionEditor.ts` regex for missing `lastModified`

**File**: `mcp-server/src/services/SectionManagement/SectionEditor.ts:200-204` — the regex `/lastModified:.*$/m` silently fails if `lastModified:` doesn't exist in frontmatter. Change to use `updateYAMLField` pattern (insert if missing) or the shared service's method.

### Fix 6: Make `updateYAMLField` always-upsert

**File**: `shared/services/TicketService.ts:764-790` — this method already handles the "field doesn't exist" case by inserting before the closing `---`. It's already upsert-safe. ✅

### Fix 7 (Optional): File watcher auto-update

The backend's chokidar watcher already detects file changes and parses frontmatter. It could be enhanced to **write back** an updated `lastModified` when it detects that `stats.mtime` is newer than frontmatter's `lastModified`. However, this has risks:

- **Recursive writes**: Updating `lastModified` triggers another `change` event → infinite loop
- **Git noise**: Auto-updating files that were changed by git operations (checkout, rebase) creates dirty working trees
- **Performance**: Writing back on every change adds I/O overhead

**Recommendation**: Don't auto-update from the watcher. Instead, ensure all explicit mutation paths (Fixes 1-3) update `lastModified`. For external mutations (LLM edits, git), the `sync-dates.ts` script or a `pre-commit` hook is the right tool.

---

## 4. Addressing the "1000 Updated Files" Concern

The user's concern about `sync-dates.ts` producing 1000 file changes is valid. Here's how to address it:

### 4.1 Differential Sync (Already Implemented ✅)

The `sync-dates.ts` script already compares git dates against frontmatter dates and only updates files where there's a difference. After Fix 1-3 are applied, **new mutations will keep dates current**, so the drift that causes mass updates will stop accumulating.

### 4.2 One-Time Bulk Sync

Run `sync-dates.ts --write` once to bring all existing files up to date. This is a one-time cost. After that, Fixes 1-3 prevent drift, so future syncs show 0 changes.

### 4.3 Git Commit Strategy

The bulk sync can be a single commit: `git commit -m "chore: sync frontmatter dates with git history"`. It's a one-time metadata correction, not an ongoing pattern.

### 4.4 `dateCreated` Should Be Immutable

`dateCreated` should **never change after initial creation**. `sync-dates.ts` correctly derives it from the first git commit (`--diff-filter=A`). Once set, it should be left alone. The `updateCRAttrs()` validation (`TICKET_UPDATE_ALLOWED_ATTRS`) should explicitly exclude `dateCreated` and `lastModified` from manual updates — they should be system-managed only.

---

## 5. The "Single Source of Truth" Problem

The current system has **two competing sources of truth**:

1. **Frontmatter** (`lastModified: 2026-01-15T...`) — human-readable, version-controlled
2. **Filesystem stats** (`stats.mtime`) — always accurate, not version-controlled

The codebase uses a "frontmatter-first, mtime-fallback" strategy. This is correct in principle, but broken in practice because most mutation paths never update frontmatter.

**The fix is not to switch to mtime-only.** The fix is to make frontmatter the authoritative source by ensuring all writes update it. Here's why frontmatter is better:

| Property | Frontmatter | Filesystem `mtime` |
|---|---|---|
| Version-controlled | ✅ Yes | ❌ No |
| Survives `git checkout` | ✅ Yes | ❌ No (reverts to old mtime) |
| Human-readable | ✅ Yes | ❌ No |
| Works offline / no filesystem | ✅ Yes (in file content) | ❌ No |
| Accurate for LLM-edited files | ⚠️ Only if updated | ✅ Always |
| Survives file copy | ✅ Yes | ❌ No (copy gets new mtime) |

Frontmatter wins on 5 of 6 criteria. The one weakness (accuracy for LLM edits) is fixable by updating it on every write.

---

## 6. Proposed Architecture

```text
┌──────────────────────────────────────────────────────┐
│                   Mutation Paths                      │
├──────────┬──────────┬──────────┬──────────┬───────────┤
│ Frontend │ MCP      │ MCP      │ MCP      │ LLM/Git   │
│ PATCH    │ status   │ attrs    │ sections │ (external) │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬─────┘
     │          │          │          │           │
     ▼          ▼          ▼          ▼           │
┌────────────────────────────────────┐              │
│  shared/services/TicketService     │              │
│  - updateCRStatus()  [+Fix 2]      │              │
│  - updateCRAttrs()   [+Fix 3]      │              │
│  - createCR()        [+Fix 1]      │              │
└────────────┬───────────────────────┘              │
             │ writes .md file                      │
             ▼                                      │
┌────────────────────────────────────┐              │
│  .md file with YAML frontmatter    │              │
│  dateCreated: ... (immutable)      │◄─────────────┘
│  lastModified: ... (updated)       │   sync-dates.ts
└────────────┬───────────────────────┘   (one-time)
             │ reads
             ▼
┌────────────────────────────────────┐
│  MarkdownService.parseMarkdownFile │
│  frontmatter date → use it         │
│  no frontmatter date → mtime fallback │
└────────────────────────────────────┘
```

### Key Principles

1. **Every write updates `lastModified`** — Fixes 1-3 ensure this for all programmatic paths
2. **`dateCreated` is set once, never changed** — Protected by `TICKET_UPDATE_ALLOWED_ATTRS`
3. **`mtime` fallback remains as safety net** — No regression if frontmatter is missing
4. **`sync-dates.ts` for external mutations** — One-time bulk sync + occasional maintenance
5. **No auto-update from file watcher** — Avoids recursive writes and git noise

---

## 7. Summary of Required Changes

| Priority | File | Change | Effort |
|---|---|---|---|
| P0 | `shared/services/TicketService.ts:699` | Add `lastModified` to `formatCRAsMarkdown()` | 1 line |
| P0 | `shared/services/TicketService.ts:350-354` | Update `lastModified` in `updateCRStatus()` | 2 lines |
| P0 | `shared/services/TicketService.ts:418-420` | Update `lastModified` in `updateCRAttrs()` | 2 lines |
| P1 | `shared/services/TicketService.ts:351` | Delete misleading comment | 1 line |
| P1 | `mcp-server/src/services/SectionManagement/SectionEditor.ts:200-204` | Fix regex to handle missing `lastModified` | ~5 lines |
| P2 | Consider `dateCreated`/`lastModified` in `TICKET_UPDATE_ALLOWED_ATTRS` exclusion | Prevent manual date tampering | ~3 lines |

**Total: ~14 lines of code** to fix the core problem. After these changes, all programmatic mutation paths correctly maintain frontmatter dates. The `sync-dates.ts` script handles the one-time backfill and any future external mutations (LLM edits, git operations).

---

## 8. Risks of Removing Frontmatter Dates (Counter-Position)

For completeness, here's why removing frontmatter dates in favor of mtime-only would be worse:

1. **Git checkout breaks dates**: Switching branches resets `mtime` to the commit timestamp, losing all modification history since the last commit
2. **No date in `git diff`**: Frontmatter dates appear in diffs; mtime is invisible to code review
3. **Sorting breaks on branch switch**: If the UI sorts by "recently modified" using mtime, every branch checkout reorders the board based on commit timestamps, not actual modification times
4. **API responses become inconsistent**: The server currently returns frontmatter dates; switching to mtime-only would require changing every API endpoint, frontend component, and MCP tool
5. **Subdocuments lose date tracking**: `getSubDocument()` returns `dateCreated`/`lastModified` from frontmatter; these would all become null

Frontmatter dates are the right design. They just need to be properly maintained.
