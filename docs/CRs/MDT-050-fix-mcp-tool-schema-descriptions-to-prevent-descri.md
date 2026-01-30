---
code: MDT-050
title: Consolidate to single Ticket interface and remove description/rationale from YAML
status: Implemented
dateCreated: 2025-10-01T12:36:08.910Z
type: Bug Fix
priority: Critical
description: LLMs misuse description field causing YAML overflow. Consolidate CR/CRData interfaces to Ticket, remove description/rationale from YAML frontmatter, move all content to markdown body.
---

# Consolidate to single Ticket interface and remove description/rationale from YAML

## 1. Description

### Problem Statement
The MCP tool schema and TypeScript interfaces have critical issues:
1. **LLMs misuse `description` field**: MCP tool descriptions cause LLMs to put full markdown content into `description` field instead of `content` field, causing YAML frontmatter overflow (3000+ lines, see SEB-010)
2. **Interface duplication**: Two interfaces (`CR` and `CRData`) with 70% overlap cause maintenance burden and confusion
3. **Naming inconsistency**: Documentation uses "code" but some TypeScript uses "key"
4. **YAML pollution**: `description` and `rationale` in YAML frontmatter should be in markdown body

### Current State

**TypeScript Interface Duplication:**
- `shared/models/Types.ts` has TWO interfaces: `CR` (64 lines) and `CRData` (100 lines)
- `shared/models/Ticket.ts` already exists as a better model using `code` field
- Software architect analysis found 27 attribute discrepancies between interfaces and docs

**YAML Overflow Bug:**
```yaml
---
code: SEB-010
description: "..." # ❌ Multi-line content breaks YAML
0: {
1: \n
# ... 3000+ character-by-character attributes
```

**MCP Tool Schema (mcp-server/src/tools/index.ts lines 133-165):**
```typescript
description: {
  type: 'string',
  description: 'Problem statement or description'  // ❌ Too vague!
},
content: {
  type: 'string',
  description: 'Full markdown content (overrides template if provided)'  // Not emphasized
}
```

### Desired State

**1. Single Ticket Interface** (use existing `shared/models/Ticket.ts`):
```typescript
export interface Ticket {
  // Core fields
  code: string // ✅ Use "code" not "key" (matches docs)
  title: string
  status: string
  type: string
  priority: string
  dateCreated: Date | null
  lastModified: Date | null
  content: string // ✅ ALL description/rationale goes here
  filePath: string

  // Optional metadata (YAML only - no description/rationale here!)
  phaseEpic?: string
  assignee?: string
  implementationDate?: Date | null
  implementationNotes?: string

  // Relationships
  relatedTickets: string[]
  dependsOn: string[]
  blocks: string[]
}
```

**2. YAML Frontmatter** (minimal metadata only):
```yaml
---
code: MDT-050
title: Example Ticket
status: Proposed
type: Bug Fix
priority: Critical
# ✅ NO description field
# ✅ NO rationale field
---

## 1. Description
[Full multi-paragraph description goes here in markdown]

## 2. Rationale
[Full rationale goes here in markdown]
```

**3. MCP Tool Schema** (explicit LLM guidance):
```typescript
// ❌ REMOVE description/rationale parameters entirely from MCP tools
content: {
  type: 'string',
  description: 'FULL markdown document with ## Description, ## Rationale, ## Solution Analysis, ## Implementation sections. USE THIS for ALL detailed content. If omitted, template is generated.'
}
```

### Rationale
- **MCP tool descriptions are LLM instructions**: They directly guide parameter selection
- **Single interface = single source of truth**: Eliminates 70% duplication, reduces maintenance
- **Use existing Ticket model**: Already in codebase, uses correct `code` field
- **YAML for metadata only**: Description/rationale are content, not metadata
- **Prevent LLM confusion**: Removing `description` parameter entirely prevents misuse

### Impact Areas
1. TypeScript interfaces: Deprecate `CR` and `CRData`, use `Ticket`
2. MCP server: Remove `description`/`rationale` from tool schemas
3. Backend services: Update to not render `description`/`rationale` from YAML
4. Documentation: Update attribute tables
5. Existing tickets: Migration needed (mark as technical debt)

## 2. Solution Analysis

### Root Causes
1. **MCP tool schema misleads LLMs**: "Problem statement or description" naturally means "put the full description here"
2. **Interface duplication**: `CR` vs `CRData` vs `Ticket` creates confusion and maintenance overhead
3. **YAML design flaw**: Metadata fields (`description`/`rationale`) used for content cause parsing issues

### Approaches Considered

**Option A: Keep description/rationale in YAML, improve validation**
- ✅ Minimal code changes
- ❌ LLMs will still be confused by field names
- ❌ YAML parsing remains fragile
- ❌ Doesn't solve architectural issues

**Option B: Remove description/rationale from YAML entirely** (CHOSEN)
- ✅ Eliminates LLM confusion (no field = can't misuse it)
- ✅ Clean YAML frontmatter (metadata only)
- ✅ All content in markdown body (where it belongs)
- ✅ Fixes root cause, not symptoms
- ⚠️ Requires migration of existing tickets (technical debt)

**Option C: Consolidate to single Ticket interface** (CHOSEN)
- ✅ Single source of truth
- ✅ Reduces maintenance by 70%
- ✅ Use existing `Ticket` model (already has correct `code` field)
- ✅ Aligns code with documentation
- ⚠️ Requires updating imports across codebase

### Chosen Approach
**Combination of Option B + Option C:**

**Phase 1 (Immediate - prevent new issues):**
1. Remove `description`/`rationale` parameters from MCP tool schemas
2. Update MCP `content` parameter description to be explicit
3. Update backend to NOT render `description`/`rationale` from YAML (ignore if present)
4. Update documentation to reflect new structure

**Phase 2 (Technical Debt - migrate existing):**
1. Script to migrate existing tickets (move YAML fields to markdown)
2. Clean up old `description`/`rationale` from YAML frontmatter

**Phase 3 (Consolidation):**
1. Deprecate `CR` and `CRData` interfaces in `Types.ts`
2. Update all imports to use `Ticket` from `Ticket.ts`
3. Remove deprecated interfaces after migration

## 3. Implementation Specification

### PHASE 1: Immediate Fixes (Prevent New Issues)

#### R1: Remove description/rationale from MCP Tool Schema
**File:** `mcp-server/src/tools/index.ts` lines 133-165

**REMOVE these parameters entirely:**
```typescript
// ❌ DELETE - no more description parameter
description: {
  type: 'string',
  description: '...'
},

// ❌ DELETE - no more rationale parameter
rationale: {
  type: 'string',
  description: '...'
},
```

**UPDATE content parameter with explicit guidance:**
```typescript
content: {
  type: 'string',
  description: 'FULL markdown document with ## Description, ## Rationale, ## Solution Analysis, ## Implementation, ## Acceptance Criteria sections. USE THIS FIELD for ALL detailed content including problem statements, rationale, and specifications. If omitted, a complete template with all sections will be generated. THIS IS THE ONLY PLACE FOR CONTENT.'
}
```

#### R2: Update update_cr_attrs Tool Schema
**File:** `mcp-server/src/tools/index.ts` lines 210-227

**REMOVE description/rationale from attributes:**
```typescript
attributes: {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Ticket title/summary' },
    priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'], description: 'Ticket priority' },
    phaseEpic: { type: 'string', description: 'Phase or epic this ticket belongs to' },
    // ❌ DELETE description: { ... },
    // ❌ DELETE rationale: { ... },
    relatedTickets: { type: 'string', description: 'Comma-separated list of related ticket codes' },
    dependsOn: { type: 'string', description: 'Comma-separated list of ticket keys this depends on' },
    blocks: { type: 'string', description: 'Comma-separated list of ticket keys this blocks' },
    assignee: { type: 'string', description: 'Person responsible for implementation' }
  }
}
```

#### R3: Backend Ignores description/rationale in YAML
**File:** `mcp-server/src/services/crService.ts` line 450

**Do NOT write description/rationale to YAML:**
```typescript
private formatCRAsMarkdown(cr: CR, data: CRData): string {
  sections.push('---');
  sections.push(`code: ${cr.key}`);
  sections.push(`title: ${cr.title}`);
  sections.push(`status: ${cr.status}`);
  sections.push(`dateCreated: ${cr.dateCreated.toISOString()}`);
  sections.push(`type: ${cr.type}`);
  sections.push(`priority: ${cr.priority}`);

  if (cr.phaseEpic) sections.push(`phaseEpic: ${cr.phaseEpic}`);
  // ❌ DO NOT WRITE: if (cr.description) sections.push(`description: ${cr.description}`);
  // ❌ DO NOT WRITE: if (cr.rationale) sections.push(`rationale: ${cr.rationale}`);
  if (cr.relatedTickets && cr.relatedTickets.length > 0) sections.push(`relatedTickets: ${arrayToString(cr.relatedTickets)}`);
  // ... rest
  sections.push('---');
}
```

#### R4: Update Documentation - Remove description/rationale
**File:** `docs/create_ticket.md` lines 27-44

**Remove rows from attribute table:**
```markdown
| Attribute | Required | Description | Example |
|-----------|----------|-------------|---------|
| `code` | Yes | Ticket identifier | "MDT-001", "CR-A007" |
| `title` | Yes | Brief descriptive title | "Push-based file watching" |
| `status` | Yes | Current status | Proposed, Approved, In Progress, Implemented, Rejected, On Hold |
| `type` | Yes | Ticket category | Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation |
| `priority` | Yes | Priority level | P1 (Critical), P2 (High), P3 (Medium), P4 (Low) |
| `phaseEpic` | No | Project phase/epic | "Phase A (Foundation)", "Phase B (Enhancement)" |
❌ REMOVE | `description` | No | Problem statement or description | Brief problem overview |
❌ REMOVE | `rationale` | No | Rationale for this CR | Why this change is needed |
| `relatedTickets` | No | Related ticket codes | "CR-A001,CR-A002" |
| `dependsOn` | No | Dependencies | "MDT-001,MDT-005" |
```

**Add note explaining structure:**
```markdown
## YAML Frontmatter vs Markdown Content

**YAML Frontmatter** contains only **metadata**:
- `code`, `title`, `status`, `type`, `priority`
- Optional: `phaseEpic`, `assignee`, `relatedTickets`, `dependsOn`, `blocks`

**Markdown Content** contains all **descriptive text**:
- `## 1. Description` - Problem statement, current state, desired state, impact areas
- `## 2. Rationale` - Why this change is needed
- `## 3. Solution Analysis` - Approaches, trade-offs, chosen solution
- `## 4. Implementation` - Technical specifications
- `## 5. Acceptance Criteria` - Testable completion criteria
```

#### R5: Update manual_ticket_creation.md
**File:** `docs/manual_ticket_creation.md` lines 45-60

**Remove from optional attributes:**
```markdown
#### Optional Attributes (include only if they have values):
- `phaseEpic`: Project phase/epic (e.g., "Phase A (Foundation)")
❌ REMOVE - `description`: Problem statement or description
❌ REMOVE - `rationale`: Rationale for this CR
- `relatedTickets`: Comma-separated list of related ticket codes
```

### PHASE 2: Technical Debt (Existing Ticket Migration)

#### R6: Create Migration Script
**File:** `scripts/migrate-yaml-to-content.ts`

**Purpose:** Move `description` and `rationale` from YAML to markdown content

**Process:**
1. For each `.md` file in all project `docs/CRs/` directories:
   - Parse YAML frontmatter
   - Extract `description` and `rationale` if present
   - Remove from YAML
   - Prepend to markdown content under appropriate sections
   - Write back to file

**Note:** Mark as **technical debt** - not blocking for Phase 1

### PHASE 3: Interface Consolidation

#### R7: Deprecate CR and CRData Interfaces
**File:** `shared/models/Types.ts`

**Add deprecation notices:**
```typescript
/**
 * @deprecated Use Ticket interface from shared/models/Ticket.ts instead
 * This interface will be removed in future version.
 */
export interface CR { ... }

/**
 * @deprecated Use Ticket interface from shared/models/Ticket.ts instead
 * This interface will be removed in future version.
 */
export interface CRData { ... }
```

#### R8: Update Ticket Interface with JSDoc
**File:** `shared/models/Ticket.ts`

**Add comprehensive JSDoc:**
```typescript
/**
 * Ticket (formerly CR/Change Request)
 *
 * Permanent documentation artifact serving as both implementation
 * specification and Architectural Decision Record (ADR).
 *
 * YAML Frontmatter: Contains metadata only (code, title, status, etc.)
 * Markdown Content: Contains all descriptive text (description, rationale, etc.)
 */
export interface Ticket {
  /** Unique ticket identifier (e.g., "MDT-001") */
  code: string

  /** Brief descriptive title */
  title: string

  /** Current lifecycle status */
  status: string

  /** Ticket category/type */
  type: string

  /** Priority level (Critical/High/Medium/Low) */
  priority: string

  /** Creation timestamp */
  dateCreated: Date | null

  /** Last modification timestamp (auto-updated) */
  lastModified: Date | null

  /**
   * Full markdown content including:
   * - ## Description section
   * - ## Rationale section
   * - ## Solution Analysis
   * - ## Implementation Specification
   * - ## Acceptance Criteria
   */
  content: string

  /** Absolute file path (system-managed) */
  filePath: string

  // ... rest with JSDoc
}
```

#### R9: Update All Imports (Gradual Migration)
**Files:** All TypeScript files importing `CR` or `CRData`

**Process:**
1. Search for `import.*CR[,\s}]` and `import.*CRData`
2. Replace with `import { Ticket } from 'shared/models/Ticket'`
3. Update type annotations from `CR` to `Ticket`
4. Update type annotations from `CRData` to `Ticket` or `Partial<Ticket>`

## 4. Acceptance Criteria

### PHASE 1 Criteria (Immediate)

#### AC1: MCP Tool Schema
- ✅ `description` parameter completely removed from `create_cr` tool
- ✅ `rationale` parameter completely removed from `create_cr` tool
- ✅ `content` parameter description uses explicit LLM guidance ("FULL", "USE THIS", "ALL detailed content")
- ✅ `description` and `rationale` removed from `update_cr_attrs` tool

#### AC2: Backend Does Not Write description/rationale
- ✅ `formatCRAsMarkdown()` does not write `description` to YAML frontmatter
- ✅ `formatCRAsMarkdown()` does not write `rationale` to YAML frontmatter
- ✅ Existing tickets with `description`/`rationale` in YAML still parse correctly (ignored)

#### AC3: Documentation Updated
- ✅ `docs/create_ticket.md` removes `description` and `rationale` rows from attribute table
- ✅ `docs/manual_ticket_creation.md` removes `description` and `rationale` from optional attributes
- ✅ Both docs explain YAML vs Markdown content distinction
- ✅ Examples show correct YAML frontmatter structure (no description/rationale)

#### AC4: LLM Behavior Fixed
- ✅ LLMs cannot misuse `description` field (it doesn't exist in tool schema)
- ✅ LLMs put ALL content in `content` parameter
- ✅ No more YAML overflow errors on new tickets

#### AC5: Backward Compatibility
- ✅ Existing tickets with `description`/`rationale` in YAML still readable
- ✅ Frontend/backend ignore `description`/`rationale` from YAML if present
- ✅ No breaking changes for existing files

### PHASE 2 Criteria (Migration - Technical Debt)

#### AC6: Migration Script Works
- ✅ Script identifies all tickets with `description` and/or `rationale` in YAML
- ✅ Script moves content to markdown body under appropriate sections
- ✅ Script removes `description` and `rationale` from YAML frontmatter
- ✅ Migrated tickets remain valid and functional

### PHASE 3 Criteria (Consolidation)

#### AC7: Interface Consolidation
- ✅ `CR` and `CRData` interfaces marked as `@deprecated`
- ✅ `Ticket` interface has comprehensive JSDoc
- ✅ All imports updated to use `Ticket`
- ✅ No TypeScript compilation errors after migration

## 5. Testing

### Test 1: Create Ticket with Content Parameter
```typescript
await create_cr({
  project: 'TEST',
  type: 'Feature Enhancement',
  data: {
    title: 'Test Feature',
    content: `## 1. Description

### Problem Statement
This is where the full problem statement goes. Multiple paragraphs are fine here.

### Current State
Detailed current state description...

### Desired State
Detailed desired state...

## 2. Rationale
Full rationale goes here with multiple paragraphs explaining why this is needed.`
  }
})
// Expected: Success
// YAML has: code, title, status, type, priority (NO description/rationale)
// Content has: full markdown with Description and Rationale sections
```

### Test 2: Create Ticket Without Content (Template Generation)
```typescript
await create_cr({
  project: 'TEST',
  type: 'Bug Fix',
  data: {
    title: 'Test Bug'
    // No content parameter
  }
})
// Expected: Success
// YAML has: code, title, status, type, priority
// Content has: Generated template with ## Description, ## Rationale, etc.
```

### Test 3: LLM Cannot Use description Parameter
```typescript
await create_cr({
  project: 'TEST',
  type: 'Feature Enhancement',
  data: {
    title: 'Test Feature',
    description: 'This should not be accepted' // ❌ Parameter doesn't exist
  }
})
// Expected: TypeScript compilation error or MCP tool rejects parameter
```

### Test 4: Backend Ignores description in Existing Files
```yaml
---
code: OLD-001
title: Old Ticket
description: This exists in old YAML
---
```
```typescript
const ticket = await getCR('TEST', 'OLD-001')
// Expected: Ticket loads successfully
// description field ignored by backend (not rendered anywhere)
```

### Test 5: Migration Script
```bash
npm run migrate:yaml-to-content
```
**Expected:**
- Scans all `.md` files
- Finds tickets with `description` and/or `rationale` in YAML
- Moves content to markdown body
- Removes from YAML
- Reports: "Migrated 45 tickets"

## 6. References

### Related Issues
- **SEB-010**: Real-world example of YAML overflow (3800+ line file with character-by-character attributes)
- **Software Architect Analysis**: Found 27 attribute discrepancies between interfaces and documentation
- Affects all projects using markdown-ticket MCP server

### Key Architectural Decisions
1. **Use "code" not "key"**: Matches documentation, more descriptive than "key"
2. **Single Ticket interface**: Consolidate `CR` and `CRData` → `Ticket` (eliminate 70% duplication)
3. **YAML = Metadata only**: No descriptive content in YAML frontmatter
4. **Remove parameters entirely**: Better than validation - LLMs can't misuse fields that don't exist

### MCP Best Practices Learned
- **Tool descriptions are LLM instructions**: They directly control parameter selection behavior
- **Remove ambiguity**: "Problem statement" naturally means "full problem statement"
- **Prevent misuse by design**: No parameter > validation > warning message
- **Use explicit directive language**: "USE THIS", "THIS IS WHERE X GOES", "ALL content"
- **Cross-reference**: Point to correct alternative when rejecting usage

### Files Modified (Phase 1)

**MCP Server:**
1. `mcp-server/src/tools/index.ts` - Remove description/rationale parameters (lines 133-165, 210-227)
2. `mcp-server/src/services/crService.ts` - Don't write description/rationale to YAML (line 450)

**Documentation:**
3. `docs/create_ticket.md` - Remove description/rationale from attribute table (lines 27-44)
4. `docs/manual_ticket_creation.md` - Remove description/rationale from optional attributes (lines 45-60)

**Interfaces (Phase 3):**
5. `shared/models/Types.ts` - Add @deprecated to CR and CRData
6. `shared/models/Ticket.ts` - Add comprehensive JSDoc
7. All TypeScript files - Update imports from CR/CRData to Ticket

### Technical Debt Created

**DEBT-001: Migrate Existing Tickets**
- **Script:** `scripts/migrate-yaml-to-content.ts`
- **Scope:** Move description/rationale from YAML to markdown body in all existing tickets
- **Priority:** Medium (not blocking for Phase 1)
- **Estimate:** ~100 lines of script, affects ~45 tickets across projects

**DEBT-002: Complete Interface Migration**
- **Scope:** Update all 14 files importing CR/CRData to use Ticket
- **Priority:** Low (gradual migration OK)
- **Estimate:** ~2 hours of find-replace and testing
