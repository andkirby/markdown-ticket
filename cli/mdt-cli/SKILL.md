---
name: mdt-cli
description: Use the `mdt-cli` CLI for quick ticket and project lookups from the terminal. This skill should be used when the user wants to inspect tickets, list projects, create tickets, or update attributes without MCP tools. Prefer `mdt-cli` over MCP read operations for single-entity lookups.
---

# mdt-cli CLI

Terminal tool for Markdown Ticket management. Binary: `mdt-cli`.

## Key Resolution

All ticket commands accept flexible key forms:

| Input | Resolves to |
|-------|-------------|
| `12` | `{PROJECT}-012` (from detected project) |
| `ABC-12` | `ABC-012` (normalized, cross-project) |

Bare numbers and full keys can be used directly: `mdt-cli 12` views the ticket.

## View

```bash
mdt-cli <key>                 # Bare shortcut
mdt-cli ticket get <key>      # Canonical form
```

Prints ticket title, labeled metadata (status, type, priority, phase, assignee, dates), and path. If the ticket has a CR directory with subdocuments, lists them below the path.

## List

```bash
mdt-cli list                  # Shortcut
mdt-cli ls                    # Shortcut
mdt-cli ticket list           # Canonical form
```

Shows up to 10 tickets sorted newest-first. Each ticket shows key + title on one line, then an indented metadata row.

Options:
- `--all` — show every ticket
- `--limit N` — override default count
- `--files` — file paths only
- `--info` — ticket info without paths
- `--json` — parseable output for LLM consumption

Filters — positional `key=value` args with AND across fields, comma-separated fuzzy match within a field:
```bash
mdt-cli list status=impl priority=high,critical
```
Filterable fields: `status`, `priority`, `type`, `assignee`, `epic`.

## Create

```bash
mdt-cli create <type>[/<priority>] '<title>' [slug]
mdt-cli ticket create --project <code> feature 'Add dark mode'
mdt-cli ticket create --stdin feature 'Add dark mode' <<'EOF'
## Problem
Users need a dark theme option.
EOF
```

Creates a ticket with default metadata and prints the key and path.

- **`--project <code>`** — create in a different project instead of cwd-detected one.
- Type and priority tokens are order-independent.
- Unquoted dashed token after title becomes the filename slug.
- Without an explicit title, title is derived from the slug.
- `--stdin` or piped input: generates frontmatter and H1, appends stdin as body, skips template.

**Type tokens**: `bug`, `feature`, `architecture`, `tech-debt`, `documentation`, `research`
**Priority tokens**: `critical`/`p1`, `high`/`p2`, `medium`/`p3`, `low`/`p4`

## Rename

```bash
mdt-cli rename <key> '<title>' [slug]
mdt-cli ticket rename 143 'Better CLI title'
mdt-cli ticket rename 143 'Better CLI title' custom-slug
```

Updates the H1 heading (authoritative title source) and renames the file to `{KEY}-{slug}.md`. Slug is derived from the new title unless provided explicitly.

## Delete

```bash
mdt-cli delete <key> [--force]
mdt-cli ticket delete 143 --force
```

Deletes the ticket file. On TTY without `--force`, prompts `Delete <key> (<title>)? [y/N]`. Non-TTY stdin (piped) is implicit `--force`. Removes empty CR directories after file deletion. Prints `Deleted <key> <path>` on success.

## Attr

```bash
mdt-cli attr <key> status=Implemented priority=High
mdt-cli attr <key> related+=MDT-100 related-=MDT-050
```

Updates ticket attributes. Normalizes aliases (e.g. `in-progress` → `In Progress`). Prints old→new confirmation per field.

Keys: `status`, `priority`, `phase`, `assignee`, `related`, `depends`, `blocks`, `impl-date`, `impl-notes`.

Relations (`related`, `depends`, `blocks`) support `=` (replace), `+=` (add), `-=` (remove). All others use `=` only.

## Project

```bash
mdt-cli project                # Current project info
mdt-cli project get <code>     # Project lookup (case-insensitive)
mdt-cli project ls             # List all projects
mdt-cli project init [code] [name] [-t <path>]  # Initialize project in cwd
```

Bare `mdt-cli project <code>` resolves as `project get <code>`. Lowercase `ls` and `list` are reserved as list aliases.

- **`-t, --tickets-path <path>`** — set a custom tickets directory (relative to project root).

## Top-level Aliases

`create`, `delete`, `rename`, `attr` all work without the `ticket` prefix:
```bash
mdt-cli create feature 'New thing'
mdt-cli delete 143 --force
mdt-cli attr 143 status=Implemented
```

## Output

- Paths are relative to project root by default. Set `cli.ticket.absolutePath=true` in `~/.config/mdt/cli.toml` for absolute paths.
- Colors render on TTY; suppressed when piped or `NO_COLOR=1`.
- `--guide` flag at any scope prints a generated command manual from the commander tree.
