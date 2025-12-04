# MDT Prompt Commands (v2)

Structured workflows for AI agents managing Change Request tickets via MCP mdt-all system.

**Works with any project** — Python, TypeScript, Go, Rust, Java, etc. Project context detected from CLAUDE.md or config files.

## Available Workflows

| Command | Purpose | Output |
|---------|---------|--------|
| `/mdt:ticket-creation` | Create CR with structured questioning | CR in MDT system |
| `/mdt:architecture` | Surface decisions, define structure + size limits | Architecture Design section |
| `/mdt:clarification` | Fill specification gaps | Updated CR sections |
| `/mdt:tasks` | Break CR into constrained tasks | `docs/CRs/{CR-KEY}/tasks.md` |
| `/mdt:implement` | Execute tasks with verification | Code changes, updated tasks.md |
| `/mdt:tech-debt` | Detect debt patterns | `docs/CRs/{CR-KEY}/debt.md` |
| `/mdt:reflection` | Capture learnings | Updated CR |

## Debt Prevention Chain

```
┌─────────────────────────────────────────────────────────────┐
│ /mdt:architecture                                           │
│                                                             │
│ Defines:                                                    │
│ - Pattern (structural approach)                             │
│ - Shared Patterns (extract FIRST to prevent duplication)    │
│ - Structure (file paths)                                    │
│ - Size Guidance (default + hard max per module)             │
│ - Extension Rule                                            │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tasks                                                  │
│                                                             │
│ Inherits:                                                   │
│ - Size limits → Task Limits (flag/STOP thresholds)          │
│ - Shared patterns → Phase 1 (extract before consumers)      │
│                                                             │
│ Adds:                                                       │
│ - Exclude section (what NOT to move)                        │
│ - Anti-duplication (import, don't copy)                     │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:implement                                              │
│                                                             │
│ Verifies after each task:                                   │
│ - Size: OK (≤default) / FLAG (≤1.5x) / STOP (>1.5x)         │
│ - Structure: correct path                                   │
│ - No duplication: imports from shared, doesn't copy         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ /mdt:tech-debt                                              │
│                                                             │
│ Catches what slipped through:                               │
│ - Size violations                                           │
│ - Duplication                                               │
│ - Missing abstractions                                      │
│ - Shotgun surgery patterns                                  │
│                                                             │
│ Output: debt.md (diagnosis for fix CR)                      │
└─────────────────────────────────────────────────────────────┘
```

## Size Guidance (Three Zones)

| Zone | Condition | Action |
|------|-----------|--------|
| ✅ OK | ≤ Default | Proceed |
| ⚠️ FLAG | Default to 1.5x | Task completes with warning |
| ⛔ STOP | > 1.5x (Hard Max) | Cannot complete, must resolve |

**Defaults by module role:**

| Role | Default | Hard Max |
|------|---------|----------|
| Orchestration (index, main) | 100 | 150 |
| Feature module | 200 | 300 |
| Complex logic (parser, algorithm) | 300 | 450 |
| Utility / helper | 75 | 110 |

Override in: CR Acceptance Criteria or project CLAUDE.md

## Managing Technical Debt

### When debt.md is generated

`/mdt:tech-debt` produces `docs/CRs/{CR-KEY}/debt.md` — a **diagnostic report**, not an executable task list.

### How to fix debt

```
debt.md (diagnosis)
    ↓
Create new CR (e.g., "Fix technical debt from {CR-KEY}")
    ↓
/mdt:architecture {NEW-CR-KEY}
    ↓
/mdt:tasks {NEW-CR-KEY}
    ↓
/mdt:implement {NEW-CR-KEY}
```

**debt.md informs what goes into the fix CR:**

| Debt Finding | Fix CR Content |
|--------------|----------------|
| Size violation (745-line file) | "Break down {file} into focused modules" |
| Duplication (logic in 4 places) | "Extract shared {pattern} to utility" |
| Missing abstraction | "Create {type/interface} for {concept}" |
| Shotgun surgery | "Consolidate {concern} to single extension point" |

### Preventing debt (upstream)

| Prevention | How |
|------------|-----|
| Size violations | Architecture defines limits, tasks enforce, implement verifies |
| Duplication | Shared Patterns identified in architecture, extracted in Phase 1 |
| Missing abstractions | Architecture Design surfaces implicit decisions |
| Shotgun surgery | Extension Rule ensures single-point changes |

## Key Concepts

### Shared Patterns (Anti-Duplication)

Architecture Design identifies patterns appearing in 2+ places:

```markdown
### Shared Patterns

| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Input validation | all commands | `validators/` |
| Error handling | all handlers | `utils/error-handler` |
```

**Rule**: Phase 1 extracts these BEFORE Phase 2 extracts features.

Features then **import** from shared utilities, never duplicate.

### Task Constraints

Every task includes:

```markdown
### Task 2.1: Extract summarize command

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines

**Exclude** (stays in source):
- Shared validation (already in validators/)
- Output formatting (already in formatters/)

**Anti-duplication**:
- Import `validateUrl` from `validators/input-validators`
- Do NOT implement validation in this file
```

### STOP Conditions

Tasks and orchestrator have explicit escalation:

| Trigger | Action |
|---------|--------|
| File > Hard Max | STOP, subdivide or justify |
| Duplicating shared logic | STOP, import instead |
| Structure mismatch | STOP, clarify path |
| Tests fail (2 retries) | STOP, report failure |

## Project Context

Prompts detect project settings from CLAUDE.md or config files:

```yaml
project:
  source_dir: src/        # or lib/, app/, etc.
  test_command: npm test  # or pytest, cargo test, go test
  build_command: npm run build
  file_extension: .ts     # or .py, .rs, .go, .java
```

Tasks and verification use these values — no hardcoded assumptions.

## Command Reference

### `/mdt:architecture`

Adds Architecture Design section to CR:

- **Pattern**: Structural approach
- **Shared Patterns**: Logic to extract first (prevents duplication)
- **Structure**: File paths with responsibilities
- **Size Guidance**: Per-module limits (default + hard max)
- **Extension Rule**: "To add X, create Y"

### `/mdt:tasks`

Generates `docs/CRs/{CR-KEY}/tasks.md`:

- **Project Context**: Detected settings
- **Size Thresholds**: Flag/STOP zones
- **Shared Patterns**: From Architecture Design
- **Phase 1**: Shared utilities (extract first)
- **Phase 2+**: Features (import from Phase 1)
- **Post-Implementation**: Verification tasks

### `/mdt:implement`

Executes tasks with constraint verification:

```bash
/mdt:implement {CR-KEY}            # Interactive
/mdt:implement {CR-KEY} --all      # Run all, pause at phases
/mdt:implement {CR-KEY} --continue # Resume
/mdt:implement {CR-KEY} --task 1.3 # Specific task
```

**After each task verifies:**
1. Tests pass
2. Size: OK / FLAG / STOP
3. Structure: correct path
4. No duplication

### `/mdt:tech-debt`

Generates `docs/CRs/{CR-KEY}/debt.md`:

- **Size Compliance**: Per-file pass/fail
- **Debt Items**: By severity (High/Medium/Low)
- **Suggested Fixes**: Direction, not implementation
- **Metrics**: Before/after comparison

## Installation

### Quick Install (Global)
```bash
# Run from project root - installs to ~/.claude/commands/
bash prompts/install-claude.sh
```

### Local Install (Project-specific)
```bash
# Install to project's .claude/commands/mdt/ (no mdt- prefix)
bash prompts/install-claude.sh --project-path /path/to/project

# Verbose mode with detailed output
bash prompts/install-claude.sh --verbose
```

### Manual Install
```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

## File Structure

```
prompts/
├── README.md                # This file
├── CLAUDE.md                # Development guidance
├── mdt-ticket-creation.md   # CR creation
├── mdt-architecture.md      # Architecture design (v2)
├── mdt-clarification.md     # Gap filling
├── mdt-tasks.md             # Task breakdown (v2)
├── mdt-implement.md         # Orchestrator (v2)
├── mdt-tech-debt.md         # Debt detection (v2)
└── mdt-reflection.md        # Learning capture
```

## Output Files

| Workflow | Output Location |
|----------|-----------------|
| `/mdt:tasks` | `docs/CRs/{CR-KEY}/tasks.md` |
| `/mdt:tech-debt` | `docs/CRs/{CR-KEY}/debt.md` |

## Design Principles

1. **Constraints are explicit** — size limits, exclusions, STOP conditions
2. **Three-zone verification** — OK, FLAG (warning), STOP (blocked)
3. **Shared patterns first** — Phase 1 before Phase 2
4. **Anti-duplication enforced** — import from shared, never copy
5. **Project-agnostic** — works with any language/stack
6. **Violations block progress** — cannot mark complete if constraints violated
7. **debt.md is diagnosis** — fix via new CR, not direct execution
