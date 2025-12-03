# Markdown Ticket - Claude Code Prompt Commands

Structured workflows for AI agents creating and managing Change Request (CR) tickets using MCP mdt-all ticket system.

These commands provide a simple workflow of Spec-Driven Development (SDD).

Please [create a ticket](https://github.com/andkirby/markdown-ticket/issues/new) if you would like to integrate some other SDD tools.

## Overview

This directory contains interactive prompt workflows that guide AI agents through structured ticket creation, architecture design, task breakdown, implementation, clarification, technical debt detection, and reflection processes. Each workflow enforces artifact-focused documentation and integrates with the MCP mdt-all tools.

## Available Workflows

### `/mdt-ticket-creation`
- **Purpose**: Interactive workflow for creating new CR tickets with structured questioning
- **Process**: 10-question interactive specification gathering
- **Output**: Complete CR document with artifact specifications, alternatives analysis, and acceptance criteria
- **Integration**: Uses MCP `mdt-all`, `create_cr` and related tools

### `/mdt-architecture`
- **Purpose**: Surface implicit architectural decisions before implementation
- **Process**: Analyzes CR for decision points, asks max 5 architecture questions
- **Output**: Adds `## Architecture Design` section with Pattern, Structure, and Extension Rule
- **When to use**: When CR involves multiple similar things (adapters, handlers), introduces abstractions, or user flags "needs architecture"
- **Integration**: Uses MCP `mdt-all` tools: `get_cr` and `manage_cr_sections`

### `/mdt-tasks`
- **Purpose**: Break down CR into independently commitable tasks
- **Process**: Analyzes CR artifacts and architecture, generates phased task list
- **Output**: `docs/CRs/{CR-KEY}/tasks.md` with detailed tasks, verification criteria, and test requirements
- **When to use**: Multi-file refactoring, work spanning multiple sessions, when you want checkpoint reviews
- **Integration**: Uses MCP `mdt-all` tools: `get_cr`

### `/mdt-implement`
- **Purpose**: Interactive orchestrator for executing tasks
- **Process**: Runs tasks sequentially, selects appropriate sub-agent, tracks progress, verifies after each task
- **Output**: Completed implementation with progress tracked in `tasks.md`
- **Modes**: Interactive (ask after each), `--all` (step-by-step), `--fast` (skip per-task tests), `--continue` (resume)
- **Integration**: Coordinates sub-agents, updates `tasks.md`

### `/mdt-clarification`
- **Purpose**: Interactive clarification workflow for improving existing CRs
- **Process**: Scans CR for ambiguities, asks targeted questions via taxonomy
- **Output**: Records clarifications in Section 8 and updates relevant CR sections
- **Integration**: Uses MCP `mdt-all` tools: `get_cr` and `manage_cr_sections`

### `/mdt-tech-debt`
- **Purpose**: Detect technical debt patterns in implemented code
- **Process**: Scans for duplication, shotgun surgery, missing abstractions, coupling issues
- **Output**: Inline `// TECH-DEBT:` comment suggestions + CR documentation in Section 8
- **When to use**: After implementation when code "feels wrong", or after noticing copy-paste patterns
- **Integration**: Uses MCP `mdt-all` tools: `get_cr` and `manage_cr_sections`

### `/mdt-reflection`
- **Purpose**: Post-implementation learning capture and CR documentation updates
- **Process**: Extracts artifact-level insights from implementation discussions
- **Output**: Updates CR with actual vs. planned specifications and creates session records
- **Integration**: Uses MCP `mdt-all` and `manage_cr_sections` for surgical updates

## Workflow Sequence

```
User Request
    ↓
/mdt-ticket-creation     → Create CR with problem/scope
    ↓
[User flags "needs architecture"]
    ↓
/mdt-architecture        → Surface decisions, add Architecture Design section
    ↓
/mdt-clarification       → Fill artifact specification gaps (if needed)
    ↓
[Complex CR with multiple phases]
    ↓
/mdt-tasks               → Break down into commitable tasks
    ↓
/mdt-implement           → Execute tasks with sub-agent orchestration
    ↓
/mdt-tech-debt           → Detect debt patterns (on-demand, when sensing issues)
    ↓
/mdt-reflection          → Capture actual vs. planned specifications
```

## Workflow Categories

### Upstream (Before Implementation)

| Workflow | Purpose |
|----------|---------|
| `/mdt-architecture` | Prevent bad structure |
| `/mdt-tasks` | Enable phased, reviewable work |

### Execution

| Workflow | Purpose |
|----------|---------|
| `/mdt-implement` | Run tasks with orchestration |

### Downstream (After Implementation)

| Workflow | Purpose |
|----------|---------|
| `/mdt-tech-debt` | Detect accumulated debt |
| `/mdt-reflection` | Document learnings |

## Implementation Orchestrator Details

The `/mdt-implement` command orchestrates task execution:

**Modes:**
```bash
/mdt-implement SUML-009              # Interactive — ask after each task
/mdt-implement SUML-009 --all        # Step-by-step all — pause at phase boundaries
/mdt-implement SUML-009 --fast       # Skip per-task tests (faster, riskier)
/mdt-implement SUML-009 --continue   # Resume from last incomplete task
/mdt-implement SUML-009 --phase 2    # Run specific phase only
/mdt-implement SUML-009 --task 1.3   # Run specific task only
```

**Interactive commands:**
- `continue` / `c` — Run next task
- `skip` / `s` — Skip next task
- `phase` / `p` — Run remaining tasks in current phase
- `all` / `a` — Run all remaining tasks (pause at phase boundaries)
- `stop` / `q` — Stop and save progress
- `review` / `r` — Show git diff

**Sub-agent selection:**
- Refactoring tasks → Fast model (Haiku) for mechanical changes
- Feature tasks → Capable model (Sonnet/Opus) for reasoning
- Test tasks → Fast model with test patterns
- User can override with `agent:sonnet` or `agent:opus`

## Task Breakdown Details

Task lists are stored at: `docs/CRs/{CR-KEY}/tasks.md`

**Task granularity:**
- Each task is independently commitable (tests pass after)
- Target: 15-45 minutes per task
- Includes verification criteria and test requirements
- Grouped into phases with review gates

**When to use `/mdt-tasks`:**
- Multi-file refactoring
- Work spanning multiple sessions
- When you want checkpoint reviews
- Complex features with natural phases

**When NOT to use:**
- Single-file bug fixes
- < 1 hour of work
- Exploratory spikes

## Installation

Copy prompt commands to your Claude Code commands folder:

```bash
cp prompts/mdt-*.md ~/.claude/commands/
```

## Usage

1. **Create new ticket**: Provide context and run `/mdt-ticket-creation`
2. **Add architecture design**: Run `/mdt-architecture` on CRs needing structural decisions
3. **Break down work**: Run `/mdt-tasks` for complex, multi-phase CRs
4. **Execute tasks**: Run `/mdt-implement {CR-KEY}` or `/mdt-implement {CR-KEY} --all`
5. **Clarify existing**: Run `/mdt-clarification` on ambiguous CRs
6. **Check for debt**: Run `/mdt-tech-debt` after implementation when sensing issues
7. **Document learnings**: After implementation, run `/mdt-reflection` to capture insights

## Design Principles

- **Artifact-focused**: Every technical statement references concrete files/components/methods
- **Structured interactions**: Use `AskUserQuestion` with max 4 options and concise descriptions
- **Atomic updates**: Individual section updates via `manage_cr_sections` (84-94% more efficient)
- **Quality enforcement**: 95%+ artifact reference requirement, zero behavioral descriptions
- **Testable architecture**: Every architecture design includes an Extension Rule that can be verified after implementation
- **Actionable debt**: Every debt item includes location, impact, and fix direction
- **Commitable tasks**: Every task leaves code in working state with passing tests
- **Orchestrated execution**: Human stays in control with pause, skip, and review options

## File Structure

```
prompts/
├── README.md                # This file
├── mdt-ticket-creation.md   # CR creation workflow template
├── mdt-architecture.md      # Architecture design workflow (upstream)
├── mdt-tasks.md             # Task breakdown workflow
├── mdt-implement.md         # Implementation orchestrator
├── mdt-clarification.md     # Interactive clarification workflow
├── mdt-tech-debt.md         # Technical debt detection (downstream)
├── mdt-reflection.md        # Post-implementation learning capture
└── CLAUDE.md                # Development guidance for working with prompts
```

## Development

When modifying workflows:
1. Follow artifact-focused documentation standards
2. Test with MCP tools before committing changes
3. Verify markdown compliance (##/### headers, tables for specs, no bold headers)
4. Ensure all prompts integrate with `mcp__mdt-all_*` tools

See `CLAUDE.md` for detailed development guidelines and testing procedures.
