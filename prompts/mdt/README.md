# MDT Workflow Plugin

Markdown Ticket (MDT) workflow commands for Claude Code.

## Commands

All commands are invoked with the `/mdt:` prefix:

| Command                  | Purpose                                  |
|--------------------------|------------------------------------------|
| `/mdt:ticket-creation`   | Create new CR (WHAT or WHAT+HOW)         |
| `/mdt:requirements`      | Generate EARS requirements               |
| `/mdt:architecture`      | Design architecture with constraints     |
| `/mdt:tests`             | Generate module tests (unit/integration) |
| `/mdt:tasks`             | Break down into implementation tasks     |
| `/mdt:implement`         | Execute implementation (procedural)      |
| `/mdt:implement-agentic` | Execute with agent-based verification    |
| `/mdt:bdd`               | Generate BDD acceptance tests (E2E)      |
| `/mdt:tech-debt`         | Detect technical debt violations         |
| `/mdt:domain-lens`       | Apply DDD constraints                    |
| `/mdt:domain-audit`      | Analyze DDD violations                   |
| `/mdt:assess`            | Evaluate code fitness                    |
| `/mdt:clarification`     | Fill specification gaps                  |
| `/mdt:reflection`        | Capture learnings                        |

## Agents

Internal agents used by workflows (not user-facing):

| Agent        | Purpose                                  |
|--------------|------------------------------------------|
| `mdt:verify` | Run tests, parse results, check scope boundaries |
| `mdt:code`   | Write code to make tests GREEN           |
| `mdt:fix`    | Diagnose and fix implementation failures |

## Workflow Example

```bash
# 1. Create a CR
/mdt:ticket-creation MDT-042

# 2. Generate requirements
/mdt:requirements MDT-042

# 3. Design architecture
/mdt:architecture MDT-042

# 4. Generate tests
/mdt:tests MDT-042

# 5. Break down tasks
/mdt:tasks MDT-042

# 6. Implement with verification
/mdt:implement-agentic MDT-042
```

## Agentic Implementation

The `/mdt:implement-agentic` command uses a state machine with specialized agents:

1. **Pre-Verify** - Capture baseline test state
2. **Implement** - Write code to satisfy tests
3. **Post-Verify** - Verify tests GREEN, check scope boundaries
4. **Fix** - Remediate failures (max 2 attempts)

Checkpoint-based resume:

```bash
/mdt:implement-agentic MDT-042 --continue
```

## Project Configuration

The plugin reads from `.mdt-config.toml`:

```toml
[code]
name = "MDT"

[tickets]
path = "docs/CRs"
```

## Session Context

Auto-injected variables:

| Variable       | Source                             |
|----------------|------------------------------------|
| `PROJECT_CODE` | `.mdt-config.toml` → `code`        |
| `TICKETS_PATH` | `.mdt-config.toml` → `ticketsPath` |

## See Also

- [CLAUDE.md](../CLAUDE.md) - Prompt development guidance
- [README.md](../README.md) - Complete framework documentation and installation
