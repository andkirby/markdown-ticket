# Requirements: MDT-143

**Source**: [MDT-143](../MDT-143-cli-entrypoint-alternative-to-mcp.md)
**Generated**: 2026-03-23

## Overview

This CR introduces a standalone `mdt-cli` entrypoint for reading and mutating CR data from a terminal without requiring MCP tools or the web UI. The requirement set treats CLI ergonomics as product behavior, so the canonical `commander` command tree, retained ticket and project shortcuts, project initialization, create flows with STDIN, attribute updates, and output formatting all remain explicit downstream obligations.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (CLI config defaults), tasks.md (default config bootstrap), tests.md (missing-config coverage) |
| C2 | architecture.md (attribute mutation contract), tasks.md (attr parser validation), tests.md (unsupported attribute rejection) |
| C3 | architecture.md (output rendering source), tasks.md (color mapping adapter), tests.md (CLI/web color parity) |
| C4 | architecture.md (project detection behavior), tasks.md (shared detector extraction), tests.md (deep subdirectory detection) |
| C5 | architecture.md (input-handling safety), tasks.md (create pipeline), tests.md (literal persistence and injection regression) |
| C6 | architecture.md (TTY and color gating), tasks.md (non-TTY branch), tests.md (no ANSI output snapshots) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Key resolution precedence | Explicit project-qualified inputs win; numeric shorthand resolves only through detected project context | Numeric inputs may fall back to an arbitrary global project | Prevents accidental cross-project reads and matches the CR resolution table |
| Project auto-detection depth | Search parent directories until a config is found or the filesystem root is reached | Limit detection to a fixed shallow depth | AC-7 says commands must work from any subdirectory inside a project |
| Project command namespace | `list` and `ls` remain ticket-list commands; project inspection and discovery live under `mdt-cli project` | Keep a separate top-level `projects` command alongside `project` | One namespace avoids command sprawl and leaves room for project-specific operations |
| Canonical vs shortcut grammar | `ticket get|list|create|attr` and `project current|get|info|ls|list|init` are the supported command forms, while only `mdt-cli 12`, `mdt-cli t 12`, `mdt-cli project`, `mdt-cli project <code>`, `mdt-cli create`, and `mdt-cli attr` remain approved shortcuts | Make shortcut forms the only grammar and let help/documentation drift away from the real command tree | `commander` can own the real command tree while preserving the terminal ergonomics users asked for |
| Project command dispatch | Exact lowercase `ls` and `list` after `mdt-cli project` are reserved list aliases; other tokens such as `LS` and `LIST` remain available for project-code lookup | Treat all tokens case-insensitively, so `LS` and `ls` behave the same | Preserves an unambiguous escape hatch for project codes that collide with list aliases without requiring a bespoke parser |
| Current vs explicit project info | `mdt-cli project current` is the canonical current-project command, `mdt-cli project` remains its shortcut, and `mdt-cli project get|info <code>` is the canonical explicit lookup with `mdt-cli project <code>` as shortcut | Use `mdt-cli project` to list all projects when no code is supplied | Keeps the no-argument form focused on local context while aligning help output with the real command tree |
| Attribute mutation grammar | `mdt-cli ticket attr <ticket> <attr-op><value>...` is the canonical attribute-mutation form in v1, while `mdt-cli attr <ticket> <attr-op><value>...` remains a supported shortcut alias; scalar attrs use `=` and relation attrs may use `=`, `+=`, or `-=` | Also support `mdt-cli <ticket> attr ...`, markerless `mdt-cli <ticket> <attr>=<value>` writes, or implicit append semantics | The canonical tree stays on the `entity action` pattern while preserving a short write alias for terminal use |
| Project init behavior | `mdt-cli project init` bootstraps `.mdt-config.toml` and related project metadata in the current folder | Require a separate top-level init command or reuse ticket creation flow | Aligns with the requested parity with `bun run project:create` |
| `create` token parsing | Type and priority tokens are order-independent; slug becomes title only when no quoted title is supplied | Type and priority are positional, or slug always overrides title | Matches the CR examples and avoids ambiguous CLI usage |
| STDIN create semantics | Piped content is written after generated frontmatter and H1, and template generation is skipped entirely | Piped content augments or merges with a generated template | The CR explicitly defines STDIN mode as "no template" |
| Path display basis | Relative paths are relative to the detected project root; absolute paths require explicit config | Relative paths are relative to the caller's current directory | Project-root-relative output stays stable across subdirectories |
| Color gating | ANSI color output is allowed only for interactive terminals when color is enabled and `--no-color` is not set | Always emit colors whenever config says `true` | Prevents broken pipes and unreadable redirected output |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `cli.ticket.absolutePath` | Controls whether ticket paths print as relative or absolute | `false` | Paths print relative to the project root |
| `cli.display.color` | Controls whether interactive terminal output may use badge colors | `true` | Interactive output may use colors; redirected output stays plain text |

## UAT Refinements (2026-03-30)

- BR-4 expanded: default 10-ticket limit (newest-first), --all/--limit flags, --files/--info output modes, ticket ls alias, positional filter arguments
- BR-5 expanded: per-element output format with color spec (code described, id gray, title white, description normal, path gray)
- BR-10 expanded: pipe-separated old→new confirmation format; no-op exits 0 with unchanged message
- BR-11 expanded: per-element color assignments (ticket title white, ticket key light-cyan, project code dark cyan, project ID gray, file paths gray)
- BR-18 added: positional list filter behavior (AND cross-field, comma+fuzzy within field) on status, priority, type, assignee, epic
- BR-19 added: --guide flag at global and per-namespace scope, generated from commander tree

## Review Notes

- The requirements intentionally lock project detection to filesystem-root search even though the current MCP helper shows a bounded search depth. Architecture should treat the existing implementation as insufficient, not as the target behavior.
- The `project` namespace now owns current-project inspection, project listing, project-code lookup, and project initialization. Architecture should avoid reintroducing a parallel top-level `projects` command unless the CR is revised again.
- The parser decision is now explicit at the product boundary: `commander` owns the canonical command tree, while only the approved shortcut forms remain outside that tree.
- CLI read/list/current-project behaviors should consume the shared entity-service boundary (`ProjectService`, `TicketService`) rather than treating backend helpers such as `ProjectManager` as the public read/query API.
- Ticket creation is canonical under `ticket create`, with `mdt-cli create` retained only as an alias for the same path.
- Attribute mutation is intentionally stricter than ticket lookup: v1 supports canonical `mdt-cli ticket attr <ticket> <attr-op><value>...` plus the `mdt-cli attr ...` shortcut alias, but not ticket-key-prefixed write shortcuts.
- Relation attributes now have explicit operator semantics: `=` replaces the whole list, `+=` appends with duplicate suppression, and `-=` removes values. Scalar attributes stay `=` only.
- Error handling stays user-facing: invalid keys, missing arguments, and missing project context are behavioral outcomes that must remain explicit in CLI output and later tests.

---
*Canonical requirements and route summaries: [requirements.trace.md](./requirements.trace.md)*
*Rendered by /mdt:requirements via spec-trace*
