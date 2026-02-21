# Spec-Driven Development (SDD) Framework for MDT

AI-driven workflow management for spec-driven development using Markdown Tickets (MDT).

## Installation

Choose your AI assistant:

| Assistant | Installer | Scope |
|-----------|-----------|-------|
| **Claude Code** | `install-plugin.sh` | Plugin system |
| **Others** | `install-agents-skill.sh` | `.agents/skills/` |

### Claude Code

```bash
# First time
./install-plugin.sh --local

# Update
./install-plugin.sh -uy
```

**Options:** `--local` | `--docker` | `-u` (update) | `-y` (auto-confirm)

### Universal (Cursor, Copilot, etc.)

**Supported:** Amp, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode

```bash
# Global (recommended)
./install-agents-skill.sh

# Per-project
cd /path/to/my-project
bash /path/to/install-agents-skill.sh --scope local
```

**Options:** `--copy` | `-y` | `--scope user/local`

**MCP Setup:** See [INSTALL.md](./INSTALL.md) for MCP server configuration.

## Quick Links

| Link                            | Purpose                               |
|---------------------------------|---------------------------------------|
| [mdt/README.md](./mdt/README.md)| Plugin commands and agents            |
| [QUICKREF.md](./QUICKREF.md)   | Need command syntax or decision table |
| [WORKFLOWS.md](./WORKFLOWS.md) | Planning which commands to run        |
| [COMMANDS.md](./COMMANDS.md)   | Understanding a specific command      |
| [CONCEPTS.md](./CONCEPTS.md)   | Understanding TDD, phases, prep, debt |

## Configuration

The plugin reads from `.mdt-config.toml`:

```toml
[code]
name = "MDT"

[tickets]
path = "docs/CRs"
```
