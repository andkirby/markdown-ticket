# Spec-Driven Development (SDD) Framework for MDT

AI-driven workflow management for spec-driven development using Markdown Tickets (MDT).

## Installation

```bash
# Local MCP server (requires built mcp-server)
./install-plugin.sh --local

# Docker MCP server
./install-plugin.sh --docker

# Recommended: user scope (available to all projects)
./install-plugin.sh --local --scope user

# Update existing installation
./install-plugin.sh --update    # Interactive
./install-plugin.sh -uy         # Fully automated

# All options
./install-plugin.sh --help
```

**Options:**

| Option            | Description                                    |
|-------------------|------------------------------------------------|
| `--local`         | Use local Node.js MCP server                   |
| `--docker`        | Use Docker MCP server via HTTP                 |
| `--update`, `-u`  | Update mode: detect current installation and update it |
| `-y`              | Auto-confirm all prompts                       |
| `--scope user`    | Install in user scope (available to all projects) |
| `--scope local`   | Install in local scope (available only to this project) |
| `--help`, `-h`    | Show help message                              |

Short flags can be combined (e.g., `-uy` = `--update -y`).

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
