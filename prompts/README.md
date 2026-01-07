# Spec-Driven Development (SDD) Framework for MDT

AI-driven workflow management for spec-driven development.

## What It Does

- Creates and manages Change Requests via MCP
- Guides: Requirements → BDD → Architecture → Tests → Tasks → Implementation
- Prevents technical debt through explicit constraints

## Quick Start

0. Install [MDT project](../README.md)
1. Install commands for Claude Code: `bash prompts/install-claude.sh` 
2. Create a first ticket: `/mdt:ticket-creation`
3. Learn workflows: [WORKFLOWS.md](./WORKFLOWS.md)
4. See all commands: [QUICKREF.md](./QUICKREF.md)

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
