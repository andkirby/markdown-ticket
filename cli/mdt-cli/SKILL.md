---
name: mdt-cli
description: Use the `mdt-cli` CLI for quick ticket and project lookups from the terminal. This skill should be used when the user wants to inspect tickets, list projects, create tickets, or update attributes without MCP tools. Prefer `mdt-cli` over MCP read operations for single-entity lookups.
---

# mdt-cli CLI

Terminal tool for Markdown Ticket management. Binary: `mdt-cli`.

## Commands

```bash
# Ticket
mdt-cli <key>                          # View ticket (bare shortcut)
mdt-cli ticket get <key>               # View ticket (canonical)
mdt-cli ticket list                    # List tickets (use --json for parsing)
mdt-cli ticket create <type>[/<pri>] <title> [slug]
mdt-cli ticket create --stdin <type> <title>   # Body from stdin
mdt-cli ticket rename <key> '<title>' [slug]   # Rename title + slug/file
mdt-cli ticket attr <key> status=Implemented

# Shortcuts (top-level)
mdt-cli rename <key> '<title>' [slug]  # Same as ticket rename
mdt-cli create ...                     # Same as ticket create
mdt-cli attr <key> ...                 # Same as ticket attr

# Project
mdt-cli project                        # Current project info
mdt-cli project get <code>             # Project lookup
mdt-cli project ls                     # List projects
mdt-cli project init [code] [name]     # Initialize project in cwd
```

## Key Resolution

| Input | Resolves to |
|-------|-------------|
| `12` | `{PROJECT}-012` (from detected project) |
| `ABC-12` | `ABC-012` (normalized) |
| `XYZ-12` | `XYZ-012` (cross-project) |

## Rename

`mdt-cli ticket rename <key> '<title>' [slug]`

- Updates the H1 heading in the markdown file (authoritative title source).
- Derives a slug from the new title unless an explicit slug is provided.
- Renames the file: `{KEY}-{slug}.md`.
- Title can be quoted (`'New Title'`) or unquoted (single word).

```bash
mdt-cli ticket rename 143 'Better CLI title'
mdt-cli ticket rename 143 'Better CLI title' custom-slug
```

## Creating Tickets with Content

```bash
# Inline content via heredoc
mdt-cli ticket create --stdin feature 'Add dark mode' <<'EOF'
## Problem
Users need a dark theme option.

## Solution
Add CSS custom properties for color schemes.
EOF
```

## LLM Usage

Prefer `--json` flag for programmatic consumption:
```bash
mdt-cli ticket list --json            # Parseable ticket list
```

## Allowed Attribute Keys

`status`, `priority`, `phase`, `assignee`, `related`, `depends`, `blocks`, `impl-date`, `impl-notes`.

Relation attrs (`related`, `depends`, `blocks`) support `=`, `+=`, `-=`. All others use `=` only.

## Type Tokens

`bug`, `feature`, `architecture`, `tech-debt`, `documentation`, `research`.

## Priority Tokens

`critical`/`p1`, `high`/`p2`, `medium`/`p3`, `low`/`p4`.
