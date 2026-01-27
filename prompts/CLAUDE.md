# CLAUDE.md - CR Workflow Prompt Development

This file provides guidance to Claude Code when working on the CR workflow prompt files in this directory.

## Working Context

You are in the **prompts/** directory of the markdown-ticket project. This is an AI-powered Kanban board where **tickets
are markdown files** stored in `docs/CRs/` with YAML frontmatter, version-controlled via Git.

**Parent project architecture:** React+Vite frontend, Express backend, shared TypeScript services, and an MCP (Model
Context Protocol) server for AI integration. The backend watches CR directories for changes and broadcasts via SSE.

**This directory** contains AI workflow prompts that guide CR creation and management. When working here, focus on:

- Developing and refining workflow prompts
- Testing workflow logic and question flows
- Ensuring artifact-focused documentation standards
- Maintaining consistency across workflows

**See [README.md](README.md) for:**

- Complete workflow chain documentation
- Command reference and usage
- Installation instructions
- Part-aware CR patterns
- TDD/BDD workflow details

## Quick Reference

### MDT Plugin Architecture

All workflow commands are organized as a Claude Code plugin in the `mdt/` directory:

- `mdt/.claude-plugin/plugin.json` - Plugin metadata for `claude plugin install`
- `mdt/commands/` - User-facing workflow commands
- `mdt/agents/` - Internal agent prompts (not user-facing)

| File                                  | Purpose                              | Output                                    |
|---------------------------------------|--------------------------------------|-------------------------------------------|
| `mdt/commands/ticket-creation.md`     | CR creation (WHAT or WHAT+HOW)       | CR in MDT system                          |
| `mdt/commands/requirements.md`        | EARS requirements                    | `{CR-KEY}/requirements.md`                |
| `mdt/commands/bdd.md`                 | BDD acceptance tests (E2E)           | `{CR-KEY}/bdd.md` + E2E test files        |
| `mdt/commands/assess.md`              | Code fitness evaluation              | Decision: integrate/refactor/split        |
| `mdt/commands/domain-lens.md`         | DDD constraints                      | `{CR-KEY}/domain.md`                      |
| `mdt/commands/domain-audit.md`        | DDD violations analysis               | `{CR-KEY}/domain-audit.md`                |
| `mdt/commands/architecture.md`        | Architecture design                  | CR section or `{CR-KEY}/architecture.md`  |
| `mdt/commands/tests.md`               | Module tests (unit/integration)      | `{CR-KEY}/[part-*/]tests.md` + test files |
| `mdt/commands/clarification.md`       | Fill specification gaps              | Updated CR sections                       |
| `mdt/commands/tasks.md`               | Task breakdown                       | `{CR-KEY}/[part-*/]tasks.md`              |
| `mdt/commands/implement.md`           | Execute with verification            | Code changes                              |
| `mdt/commands/implement-agentic.md`   | Execute with agent-based verification| Code changes + checkpoint state           |
| `mdt/commands/tech-debt.md`           | Debt detection                       | `{CR-KEY}/debt.md`                        |
| `mdt/commands/reflection.md`          | Capture learnings                    | Updated CR                                |

### Agentic Implementation

The `/mdt:implement-agentic` command uses a state machine with specialized subagents:

| Agent        | Role                                  |
|--------------|---------------------------------------|
| `mdt:verify` | Run tests, parse results, check sizes |
| `mdt:code`   | Write minimal code for task specs     |
| `mdt:fix`    | Apply minimal fixes for failures      |
| `mdt:test`   | Execute tests and return JSON         |

**Features**:
- Checkpoint-based state persisted to `.checkpoint.json`
- Resumable execution: `/mdt:implement-agentic {CR-KEY} --continue`
- Part-aware: `--part {X.Y}` for multi-part CRs
- Prep mode: `--prep` for refactoring workflows
- JSON-based agent communication with structured verdicts

### Session Context

All workflows have access to these variables (auto-injected via `~/.claude/hooks/mdt-project-vars.sh`):

| Variable       | Source                             | Example                  |
|----------------|------------------------------------|--------------------------|
| `PROJECT_CODE` | `.mdt-config.toml` → `code`        | `MDT`, `API`, `WEB`      |
| `TICKETS_PATH` | `.mdt-config.toml` → `ticketsPath` | `docs/CRs`, `.mdt/specs` |

## Prompt Development Workflow

### When Modifying Workflow Prompts

1. **Understand the workflow purpose** - What problem does it solve?
2. **Identify the section to modify** - Which part needs work?
3. **Verify MCP tool calls** - Ensure parameters are valid
4. **Check artifact focus** - Does it enforce concrete specifications?
5. **Update examples** - Are examples clear and realistic?
6. **Validate markdown** - Does output follow MDT standards?

### Testing Workflow Changes

1. Create a test CR using `mcp__mdt-all__create_cr`
2. Run the modified workflow against the test CR
3. Verify: MCP tool calls, section updates, artifact-focused content, markdown compliance
4. Check Section 8 records clarifications (if applicable)
5. Clean up test CRs when done

## Plugin Installation

The MDT workflows can be installed as a Claude Code plugin:

```bash
# Install from this directory
claude plugin install /path/to/prompts/mdt

# Or add to Claude Code settings
claude --plugin-dir /path/to/prompts/mdt
```

See `mdt/README.md` for complete plugin documentation.

### Project Context Detection

Workflows are **project-agnostic** and auto-detect settings from:

**Sources checked in order:**

1. `CLAUDE.md` - Project settings section
2. `package.json` - Node.js
3. `Cargo.toml` - Rust
4. `go.mod` - Go
5. `pyproject.toml` or `setup.py` - Python
6. `Makefile` - Make-based

**Extracted values:**

```yaml
project:
  source_dir: { src/, lib/, app/, pkg/, ... }
  test_command: { npm test, pytest, cargo test, go test, make test, ... }
  build_command: { npm run build, cargo build, go build, make, ... }
  file_extension: { .ts, .py, .rs, .go, .java, .kt, ... }
```

**Fallbacks:**

- `source_dir`: Ask user or use `.`
- `test_command`: Skip with warning
- `build_command`: Skip with warning
- `file_extension`: Infer from existing files

## Key Design Principles

### 1. Artifact-Focused Documentation

**Core principle**: Specify concrete artifacts, not behaviors

**Valid** (concrete):

- File paths: `src/components/UserProfile.tsx`
- Components: `AuthenticationService`
- Endpoints: `/api/v2/users/profile`
- Methods: `validateCredentials()`

**Invalid** (behavioral):

- "Component that handles X"
- "Service for Y"
- "Function that does Z"

### 2. Structured Interactions

Use `AskUserQuestion` tool for all user interactions:

- Single-select with recommendations
- Multi-select for artifact selection
- Short-answer with constraints (≤5 words)

Never use free-form text prompts.

### 3. Atomic Section Updates

Use `mcp__mdt-all__manage_cr_sections` for surgical updates:

- List sections first
- Update specific sections only
- 84-94% more efficient than full rewrites

### 4. Debt Prevention

| Workflow     | Prevention Mechanism                               |
|--------------|----------------------------------------------------|
| Architecture | Defines size limits, shared patterns, structure    |
| Tasks        | Inherits limits, Part 1 (shared first), exclusions |
| Implement    | Verifies size (OK/FLAG/STOP), no duplication       |
| Tech-Debt    | Catches violations, produces diagnostic for fix CR |

### 5. Three-Zone Size Enforcement

| Zone | Condition       | Action                        |
|------|-----------------|-------------------------------|
| OK   | ≤ Default       | Proceed                       |
| FLAG | Default to 1.5x | Complete with warning         |
| STOP | > 1.5x          | Cannot complete, must resolve |

**Defaults by module role:**

- Orchestration: 100 lines (max 150)
- Feature: 200 lines (max 300)
- Complex logic: 300 lines (max 450)
- Utility: 75 lines (max 110)

## MCP Tool Reference

### Core Tools

**Get CR:**

```json
{
  "project": "MDT",
  "key": "MDT-001",
  "mode": "full"
} // full/attributes/metadata
```

**Manage Sections:**

```json
{
  "project": "MDT",
  "key": "MDT-001",
  "operation": "list"
} // list/get/replace/append/prepend
```

**Create CR:**

```json
{
  "project": "MDT",
  "type": "Feature Enhancement",
  "data": {
    "title": "...",
    "content": "..."
  }
}
```

**Update Status:**

```json
{
  "project": "MDT",
  "key": "MDT-001",
  "status": "Implemented"
}
```

## Markdown Standards

### Headers

- One H1 (`#`) - document title only
- Main: `## 1. Description`, `## 2. Decision`
- Sub: `### Problem`, `### Affected Artifacts`
- Never bold as headers

### Structure

- No YAML frontmatter (MCP auto-generates)
- No duplicate headers
- Lists as plain markdown (NOT in code blocks)
- Tables for comparisons and specifications
- Code blocks ONLY in Section 7 (Deployment)

### Quality Checklist

Before committing prompt changes:

- [ ] Workflow logic is clear and unambiguous
- [ ] MCP tool calls have correct parameters
- [ ] Examples use realistic artifact references
- [ ] User interactions use `AskUserQuestion`
- [ ] 95%+ technical statements have artifact references
- [ ] Zero behavioral descriptions in sections 1-6
- [ ] Proper markdown headers (##/### not bold)
- [ ] One H1 only, no duplicate headers

## Troubleshooting

**MCP tool failures:**

1. Prompt user to verify MCP server connection
2. Check tool parameters (project, key, operation)

**Section update failures:**

1. List sections with `operation="list"` first
2. Use exact section name (case-sensitive)
3. Verify `updateMode` (replace/append/prepend)

**Workflow hangs:**

1. Check for missing approval gates
2. Verify loop exit conditions are reachable

**Agentic implementation failures:**

1. Check checkpoint state in `{TICKETS_PATH}/{CR-KEY}/.checkpoint.json`
2. Resume with `--continue` flag to skip completed steps
3. Verify agent JSON responses match expected schema
4. Check test command and smoke test derivation

## Git Commit Convention

For commits in this folder, always start with:

- `feat(prompts): ...` for new features
- `fix(prompts): ...` for bug fixes
