# MDT Prompt Commands (v2)

Structured workflows for AI agents managing Change Request tickets via MCP mdt-all system.

## Available Workflows

| Command | Purpose |
|---------|---------|
| `/mdt-ticket-creation` | Create CR with structured questioning |
| `/mdt-architecture` | Surface decisions, add Architecture Design section |
| `/mdt-clarification` | Fill specification gaps |
| `/mdt-tasks` | Break CR into constrained, verifiable tasks |
| `/mdt-implement` | Execute tasks with constraint verification |
| `/mdt-tech-debt` | Detect debt patterns post-implementation |
| `/mdt-reflection` | Capture learnings, update CR |

## Workflow Sequence

```
/mdt-ticket-creation     → Create CR
        ↓
/mdt-architecture        → Add Pattern, Structure, Extension Rule
        ↓
/mdt-clarification       → Fill gaps (if needed)
        ↓
/mdt-tasks               → Generate constrained task list
        ↓
/mdt-implement           → Execute with verification
        ↓
/mdt-tech-debt           → Check for debt (on-demand)
        ↓
/mdt-reflection          → Document learnings
```

## Key Concepts (v2)

### Constraint-Based Tasks

Every task includes explicit limits:

```markdown
### Task 1.1: Extract validators

**Limits**:
- Target file: max 100 lines
- Source reduction: ~80 lines

**Exclude** (stays in source):
- Command-specific validation
- Output formatting
```

Tasks without limits led to bloated extractions (745-line files from 958-line source).

### Extraction Order

Phase 1 extracts **shared utilities first**, Phase 2 extracts **consumers**.

This prevents duplication — consumers import from already-extracted utilities.

### STOP Conditions

Tasks and orchestrator include explicit STOP triggers:

- If target file would exceed limit → STOP, request subdivision
- If unsure what to exclude → STOP, ask for clarification
- If constraint violated → cannot mark task complete

### Constraint Verification

After each task, orchestrator verifies:

```bash
wc -l {target file}  # must be under limit
npm test             # must pass
```

Both must pass before task is marked complete.

## Command Reference

### `/mdt-tasks`

Generates `docs/CRs/{CR-KEY}/tasks.md` with:

- **Global Constraints** header (max file size from CR)
- **Size budgets** per task (calculated from CR acceptance criteria)
- **Exclusions** per task (what NOT to move)
- **STOP condition** (escalation trigger)
- **Post-implementation verification** tasks

**Requires**: CR with Architecture Design for refactoring

### `/mdt-implement`

Executes tasks with constraint verification.

**Modes:**
```bash
/mdt-implement {CR-KEY}            # Interactive — ask after each task
/mdt-implement {CR-KEY} --all      # Run all, pause at phase boundaries
/mdt-implement {CR-KEY} --continue # Resume from last incomplete
/mdt-implement {CR-KEY} --task 1.3 # Run specific task only
```

**Verification after each task:**
1. Tests pass
2. Build passes
3. Target file under size limit
4. File at correct structure path

**Constraint violation handling:**
- `[subdivide]` — Break task into smaller extractions
- `[adjust]` — Update CR if larger file justified
- `[stop]` — Halt and investigate

## Installation

```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

## File Structure

```
prompts/
├── README.md                # This file
├── CLAUDE.md                # Development guidance
├── mdt-ticket-creation.md   # CR creation
├── mdt-architecture.md      # Architecture design (upstream)
├── mdt-clarification.md     # Gap filling
├── mdt-tasks.md             # Task breakdown with constraints (v2)
├── mdt-implement.md         # Orchestrator with verification (v2)
├── mdt-tech-debt.md         # Debt detection (downstream)
└── mdt-reflection.md        # Learning capture
```

## Design Principles

- **Constraints are explicit**: Size limits, exclusions, STOP conditions in every task
- **Verification is structural**: Not just "tests pass" but "file under limit"
- **Order matters**: Shared utilities before consumers
- **Violations block progress**: Cannot mark complete if constraints violated
- **Sub-agents get context**: Limits passed to executing agent, not just task description
