# MDT Technical Debt Detection Workflow (v2)

On-demand detection of technical debt patterns in implemented code.

**Core Principle**: Identify structural problems introduced during implementation. Every debt item must have concrete file locations, evidence, and fix direction.

## User Input

```text
$ARGUMENTS
```

## Output Location

`docs/CRs/{CR-KEY}/debt.md`

## Execution Steps

### Step 1: Extract Project Context

Detect or extract from CLAUDE.md / project config:

```yaml
project:
  source_dir: {src/, lib/, app/, ...}
  test_command: {npm test, pytest, cargo test, go test, make test, ...}
  build_command: {npm run build, cargo build, go build, make, ...}
  file_extension: {.ts, .py, .rs, .go, .java, ...}
  max_file_lines: {from CR acceptance criteria or default 300}
```

If CLAUDE.md exists, read it. Otherwise detect from project files.

### Step 2: Load CR Context

1. Call MCP tool `mdt-all:get_cr`  with `mode="full"` — abort if CR doesn't exist
2. Extract:
   - **Affected/new artifacts** — files to analyze
   - **Architecture Design** — check for violations
   - **Acceptance Criteria** — extract size constraints to verify
3. If codebase available, scan actual files

### Step 3: Detect Debt Patterns

Analyze against these patterns:

| Pattern | Signal | Severity |
|---------|--------|----------|
| **Duplication** | Same logic in 2+ locations | High |
| **Shotgun Surgery** | Adding X requires editing N files | High |
| **Size Violation** | File exceeds limit from acceptance criteria | High |
| **Missing Abstraction** | Concept in code without type/interface | Medium |
| **Hidden Coupling** | Module imports internals of another | Medium |
| **Responsibility Diffusion** | Single concern across 3+ files | High |

For each item capture:
- Pattern name
- Location (file paths, line ranges if available)
- Evidence (what you observed)
- Impact (what breaks when extending)
- Suggested fix (direction, not implementation)

### Step 4: Check Architecture Violations

If CR has Architecture Design:

1. Extract **Extension Rule**
2. Verify: Does implementation follow the rule?
3. Check **Structure**: Do files match the specified paths?
4. Check **Size limits** from Acceptance Criteria

Flag violations as High severity.

### Step 5: Check Size Compliance

Run (or instruct to run):
```bash
# Find files exceeding limit (adjust path and extension for project)
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {MAX_FROM_CR}'
```

Compare against CR acceptance criteria. Any violation = High severity debt item.

### Step 6: Generate Debt Report

Create `docs/CRs/{CR-KEY}/debt.md`:

```markdown
# {CR-KEY} Technical Debt Analysis

**CR**: {CR-KEY}
**Date**: {YYYY-MM-DD}
**Files Analyzed**: {N}
**Debt Items Found**: {N} ({high} High, {medium} Medium, {low} Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `{source_dir}` |
| File extension | `{ext}` |
| Max file size | {N} lines |

## Summary

{2-3 sentence overview of findings}

## Size Compliance

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `{path}` | {N} | <{max} | ✅/❌ |
| ... | ... | ... | ... |

## High Severity

### 1. {Pattern}: {Brief description}

- **Location**: `{file}` (lines {X}-{Y}), `{file2}` (lines {A}-{B})
- **Evidence**: {What you observed}
- **Impact**: {What breaks when extending}
- **Suggested Fix**: {Direction, not implementation}

### 2. {Pattern}: {Brief description}
...

## Medium Severity

### {N}. {Pattern}: {Brief description}
...

## Low Severity

### {N}. {Pattern}: {Brief description}
...

## Suggested Inline Comments

**File**: `{path}`
**Line**: {N}
```{language}
// TECH-DEBT: {Pattern} - {Brief description}
// Impact: {What breaks}
// Suggested: {Fix direction}
// See: {CR-KEY}/debt.md
```

*Note: Adjust comment syntax for project language (// for C-style, # for Python/Ruby/Shell, -- for SQL/Lua)*

## Recommended Actions

### Immediate (High Severity)
1. [ ] {Action for debt item 1}
2. [ ] {Action for debt item 2}

### Deferred (Medium/Low)
1. [ ] {Action}

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| {source file} lines | {N} | {N} | <{N} | ✅/❌ |
| Total files | {N} | {N} | — | — |
| Debt items | — | {N} | 0 | ❌ |

---
*Generated: {timestamp}*
```

### Step 7: Save Report

1. Create directory if needed: `docs/CRs/{CR-KEY}/`
2. Write to: `docs/CRs/{CR-KEY}/debt.md`
3. Optionally update CR Section 8 with summary and link to debt.md

### Step 8: Report Completion

```markdown
## Tech Debt Analysis Complete

**CR**: {CR-KEY}
**Report**: `docs/CRs/{CR-KEY}/debt.md`

### Findings
| Severity | Count |
|----------|-------|
| High | {N} |
| Medium | {N} |
| Low | {N} |

### Size Compliance
```bash
find {source_dir} -name "*{ext}" -exec wc -l {} \; | awk '$1 > {MAX}'
```
{output or "All files within limits"}

### Critical Issues
{List high severity items}

### Next Steps
- Review `docs/CRs/{CR-KEY}/debt.md`
- For complex fixes: create follow-up CR, run `/mdt-architecture`
- For simple fixes: address inline
```

## Debt Pattern Reference

### Duplication (High)
**Signal**: Same/similar code in 2+ places
**Example**: Validation logic repeated in 3 command handlers
**Fix Direction**: Extract to shared utility

### Shotgun Surgery (High)
**Signal**: Adding one feature requires N file edits
**Example**: New provider requires editing config, factory, types, handler
**Fix Direction**: Single extension point (adapter/factory pattern)

### Size Violation (High)
**Signal**: File exceeds limit from CR acceptance criteria
**Example**: Target was <300 lines, file is 745 lines
**Fix Direction**: Further extraction, subdivide responsibilities

### Missing Abstraction (Medium)
**Signal**: Concept exists without type/interface name
**Example**: `{user_id, email, role}` passed as separate params everywhere
**Fix Direction**: Create type/interface for the concept

### Hidden Coupling (Medium)
**Signal**: Module imports internal details of another
**Example**: Importing private/internal helpers from another module
**Fix Direction**: Expose public API, hide internals

## Comment Syntax by Language

| Language | Single-line | Block |
|----------|-------------|-------|
| TypeScript/JavaScript/Java/C/C++/Go/Rust | `//` | `/* */` |
| Python/Ruby/Shell/YAML | `#` | N/A |
| SQL/Lua/Haskell | `--` | `/* */` or `{- -}` |
| HTML/XML | N/A | `<!-- -->` |

## Behavioral Rules

1. **Concrete locations required** — every item needs file path(s)
2. **Evidence required** — what specifically indicates the debt
3. **Fix direction, not solution** — suggest approach, don't design
4. **Size compliance is debt** — exceeding CR limits = High severity
5. **Save to file** — `docs/CRs/{CR-KEY}/debt.md`, not just console output
6. **Use project context** — correct paths, extensions, commands for project

## Integration

**Before**: Implementation complete
**After**: 
- Simple fixes: address inline
- Complex fixes: create Technical Debt CR → `/mdt-architecture` → `/mdt-tasks`

Context: $ARGUMENTS
