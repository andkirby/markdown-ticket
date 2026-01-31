# MDT Technical Debt Detection Workflow (v2)

On-demand detection of technical debt patterns in implemented code.

**Core Principle**: Identify structural problems introduced during implementation. Every debt item must have concrete file locations, evidence, and fix direction.

## User Input

```text
$ARGUMENTS
```

## Session Context

Use `{TICKETS_PATH}` in all file path templates below (if it's not defined read ticketsPath key from .mdt-config.toml).

## Output Location

`{TICKETS_PATH}/{CR-KEY}/debt.md`

## Execution Steps

### Step 1: Extract Project Context

Detect or extract from CLAUDE.md / project config:

```yaml
project:
  source_dir: {src/, lib/, app/, ...}
  test_command: {npm test, pytest, cargo test, go test, make test, ...}
  build_command: {npm run build, cargo build, go build, make, ...}
  file_extension: {.ts, .py, .rs, .go, .java, ...}
```

If CLAUDE.md exists, read it. Otherwise detect from project files.

### Step 2: Load CR Context

1. Call MCP tool `mdt-all:get_cr`  with `mode="full"` — abort if CR doesn't exist
2. Extract:
   - **Affected/new artifacts** — files to analyze
   - **Architecture Design** — check for violations
   - **Acceptance Criteria** — extract scope/boundary constraints to verify
3. **Load requirements if exists**: Check `{TICKETS_PATH}/{CR-KEY}/requirements.md`
   - If found: check for unsatisfied requirements (debt indicator)
4. **Load tasks if exists**: Check `{TICKETS_PATH}/{CR-KEY}/tasks.md`
   - If found: check Requirement Coverage table for gaps
5. If codebase available, scan actual files

### Step 3: Detect Debt Patterns

Analyze against these patterns:

| Pattern | Signal | Severity |
|---------|--------|----------|
| **Duplication** | Same logic in 2+ locations | High |
| **Shotgun Surgery** | Adding X requires editing N files | High |
| **Missing Abstraction** | Concept in code without type/interface | Medium |
| **Hidden Coupling** | Module imports internals of another | Medium |
| **Responsibility Diffusion** | Single concern across 3+ files | High |
| **Unsatisfied Requirements** | Requirements with no implementing code | High |

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
4. Check **Scope boundaries** from Acceptance Criteria

Flag violations as High severity.

### Step 5: Generate Debt Report

Create `{TICKETS_PATH}/{CR-KEY}/debt.md`:

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

## Summary

{2-3 sentence overview of findings}

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
| Total files | {N} | {N} | — | — |
| Debt items | — | {N} | 0 | ❌ |

---
*Generated: {timestamp}*
```

### Step 6: Save Report

1. Create directory if needed: `{TICKETS_PATH}/{CR-KEY}/`
2. Write to: `{TICKETS_PATH}/{CR-KEY}/debt.md`
3. Optionally update CR Section 8 with summary and link to debt.md

### Step 7: Report Completion

```markdown
## Tech Debt Analysis Complete

**CR**: {CR-KEY}
**Report**: `{TICKETS_PATH}/{CR-KEY}/debt.md`

### Findings
| Severity | Count |
|----------|-------|
| High | {N} |
| Medium | {N} |
| Low | {N} |

### Critical Issues
{List high severity items}

### Next Steps
- Review `{TICKETS_PATH}/{CR-KEY}/debt.md`
- For complex fixes: create follow-up CR, run `/mdt:architecture`
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
4. **Scope boundary violations are debt** — exceeding defined boundaries = High severity
5. **Save to file** — `{TICKETS_PATH}/{CR-KEY}/debt.md`, not just console output
6. **Use project context** — correct paths, extensions, commands for project

## Integration

**Before**: Implementation complete
**After**: 
- Simple fixes: address inline
- Complex fixes: create Technical Debt CR → `/mdt:architecture` → `/mdt:tasks`

Context: $ARGUMENTS
