# Spec-Driven Development (SDD) Framework for MDT

AI-driven workflow management for spec-driven development.

## What It Does

- Creates and manages Change Requests via MCP
- Guides: Requirements → BDD → Architecture → Tests → Tasks → Implementation
- Prevents technical debt through explicit constraints
- **NEW**: Agentic implementation with checkpointed state and specialized subagents

## Agentic Implementation

The `/mdt:implement-agentic` command executes implementation tasks using a state machine with specialized subagents:

| Agent      | Role                                    |
|------------|-----------------------------------------|
| `@mdt:verify` | Run tests, check scope boundaries, parse results |
| `@mdt:code`   | Write minimal code for task specs       |
| `@mdt:fix`    | Apply minimal fixes for failures        |

**Features**:
- Checkpoint-based state persisted to `.checkpoint.json`
- Resumable execution: `/mdt:implement-agentic {CR-KEY} --continue`
- Part-aware: `--part {X.Y}` for multi-part CRs
- Prep mode: `--prep` for refactoring workflows
- JSON-based agent communication with structured verdicts

See [mdt/README.md](./mdt/README.md) for complete plugin documentation.

## Quick Start

1. Install [MDT project](../README.md)
2. Install commands for Claude Code: `bash prompts/install-claude.sh`
3. Create a first ticket: `/mdt:ticket-creation`
4. Learn workflows: [WORKFLOWS.md](./WORKFLOWS.md)
5. See all commands: [QUICKREF.md](./QUICKREF.md)

## Documentation

| Doc                            | Use When                              |
|--------------------------------|---------------------------------------|
| [QUICKREF.md](./QUICKREF.md)   | Need command syntax or decision table |
| [WORKFLOWS.md](./WORKFLOWS.md) | Planning which commands to run        |
| [COMMANDS.md](./COMMANDS.md)   | Understanding a specific command      |
| [CONCEPTS.md](./CONCEPTS.md)   | Understanding TDD, phases, prep, debt |

## Session Context

Variables `PROJECT_CODE` and `TICKETS_PATH` has to added from CLAUDE.md.

Example:

```markdown
- **PROJECT_CODE**: `ABC`
- **TICKETS_PATH**: `docs/CRs/`
- **`CR-KEY` (Ticket key) format**: `{PROJECT_CODE}-###`
- **Ticket docs**: Create ticket related documentation in `docs/CRs/ABC-000/` (where 000 = current ticket number)
```
