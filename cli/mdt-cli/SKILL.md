---
name: mdt-cli
description: Use the `mdt-cli` CLI for quick ticket and project lookups from the terminal. This skill should be used when the user wants to inspect tickets, list projects, create tickets, or update attributes without MCP tools. Prefer `mdt-cli` over MCP read operations for single-entity lookups. Covers epic-level tickets (level=epic), the phaseEpic child→epic link, the epic close guard, and lifecycle (Proposed→Approved→Implemented).
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
mdt-cli ticket get -p <code> <key>   # Resolve within an explicit project (any cwd)
```

Prints ticket title, labeled metadata (status, type, priority, phase, assignee, dates), and path. If the ticket has a CR directory with subdocuments, lists them below the path.

`-p, --project <code>` — resolve the ticket within the given project instead of the cwd-detected one; explicit project wins over key-embedded codes. Unknown project → `Project <code> not found`, exit 1. Useful for non-interactive consumers running outside a project root.

## List

```bash
mdt-cli list                  # Shortcut
mdt-cli ls                    # Shortcut
mdt-cli ticket list           # Canonical form
mdt-cli ticket list --project <code>  # List another project's tickets
```

Shows up to 10 tickets sorted newest-first. Each ticket shows key + title on one line, then an indented metadata row.

Options:
- `--all` — show every ticket
- `--limit N` — override default count
- `--files` — file paths only
- `--info` — ticket info without paths
- `--json` — parseable output for LLM consumption
- `-p, --project <code>` — list tickets from a different project

Filters — positional `key=value` args with AND across fields, comma-separated fuzzy match within a field:

```bash
mdt-cli list status=impl priority=high,critical
```

Filterable fields: `status`, `priority`, `type`, `level`, `assignee`, `epic`/`phase`. (`level` accepts aliases: `e`→epic, `t`→ticket.)

## Create

```bash
mdt-cli create <type>[/<priority>] '<title>' [slug]
mdt-cli ticket create --project <code> feature 'Add dark mode'
mdt-cli ticket create --stdin feature 'Add dark mode' <<'EOF'
## Problem
Users need a dark theme option.
EOF
```

For an enabled `[project.cloudSync]` binding, `ticket create` uses the shared
cloud coordinator automatically. It requires a live Access credential and does
not allocate a local fallback number. Dedicated cloud project/member management
commands are owned by MDT-202.

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
mdt-cli ticket attr -p <code> <key> status=Approved   # Explicit project, any cwd
```

Updates ticket attributes. Normalizes aliases (e.g. `in-progress` → `In Progress`). Prints old→new confirmation per field.

`-p, --project <code>` — same semantics as on `ticket get`: explicit project wins, unknown project exits 1.

Keys: `status`, `priority`, `level`, `phase`, `assignee`, `related`, `depends`, `blocks`, `impl-date`, `impl-notes`.

Relations (`related`, `depends`, `blocks`) support `=` (replace), `+=` (add), `-=` (remove). All others use `=` only.

**Validation:** unknown keys and unknown enum values are rejected with the valid set printed. Enum fields:
- `status` ∈ Proposed · Approved · In Progress · Implemented · Rejected · On Hold · Partially Implemented. Column/synonym aliases map: `backlog`→Proposed, `open`→Approved, `done`/`complete`/`completed`/`d`→Implemented, `in-progress`→In Progress, `partial`→Partially Implemented, `deferred`→On Hold.
- `priority` ∈ Low · Medium · High · Critical. Aliases: `p1`–`p4`.
- `level` ∈ ticket · epic. Aliases: `e`→epic, `t`→ticket.
- `phase` (phaseEpic) — when set to a ticket key, the target must exist, be `level: epic`, and be `Approved` or `Implemented`. Free-text (non-key) values pass through unvalidated. See **Epics** below.

Run `mdt-cli ticket attr --help` for the full field/value reference.

## Epics

An epic is a ticket with `level: epic` (default is `ticket`). Epics group child
tickets via the existing `phaseEpic` field (the child→epic up-pointer). There is
no `epicId` and no stored `children[]` — children are derived in-memory from
`phaseEpic`. Adding `level` to an existing ticket promotes it; no migration.

### Lifecycle

Epics follow **Proposed → Approved → Implemented**. An epic must be `Approved`
before any child can reference it. Moving an epic to `Implemented` is the epic
"close" and is guarded (below).

```bash
mdt-cli create feature 'Auth overhaul' auth-overhaul   # creates a regular ticket
mdt-cli attr <key> level=epic                           # promote to epic
mdt-cli attr <key> status=Approved                      # make it referenceable
```

### Linking children (phaseEpic validation)

Setting `phase` to a **ticket key** validates the target on write:
- target must **exist** — else `EPIC_TARGET_NOT_FOUND`
- target must be `level: epic` — else `EPIC_TARGET_NOT_EPIC`
- target must be `Approved` or `Implemented` — else `EPIC_NOT_USABLE`

```bash
mdt-cli attr MDT-010 level=epic status=Approved         # the epic
mdt-cli attr MDT-020 phase=MDT-010                      # child link — accepted
mdt-cli attr MDT-020 phase=MDT-999                      # rejected: target missing
```

Free-text values that aren't ticket keys (e.g. `Q3 cleanup`) are **not**
validated — they pass through unchanged. Cross-project keys (`ABC-012`) are
validated against the target project's ticket.

### Epic close guard

An epic cannot move to `Implemented` while it has non-terminal children. The
error names the blocking children. Terminal statuses: `Implemented`, `Rejected`,
`Partially Implemented`. An epic with zero children closes freely; reopening
(`Implemented`→`Approved`) is always allowed.

```bash
mdt-cli attr MDT-010 status=Implemented                 # rejected if children open
```

### Listing epics and children

```bash
mdt-cli list level=epic                  # all epics
mdt-cli list phase=MDT-010               # children of one epic
```

### Workflow pattern: creating a parent epic

```bash
mdt-cli create feature '<epic title>' <slug>            # 1. create as ticket
mdt-cli attr <key> level=epic status=Approved            # 2. promote + approve
mdt-cli attr <child> phase=<key>                         # 3. link each child
```

Note: `create` does not accept a `level` token — promote with `attr` after
creation. Alias `e`/`t` work everywhere `level` is resolved.

## Project

```bash
mdt-cli project                # Current project info
mdt-cli project get <code>     # Project lookup (case-insensitive)
mdt-cli project ls             # List all projects
mdt-cli project init [code] [name] [-t <path>]  # Initialize project in cwd
```

Bare `mdt-cli project <code>` resolves as `project get <code>`. Lowercase `ls` and `list` are reserved as list aliases.

- **`-t, --tickets-path <path>`** — set a custom tickets directory (relative to project root).
- **init also scaffolds `.gitignore`** — a marker-delimited `# >>> MDT working state >>>` managed block (counter, trace projections, pipeline state, per-ticket working state, poc/prompts, plus a `!{tickets}/{CODE}-*.md` negation keeping ticket files trackable) is created or idempotently merged into an existing `.gitignore`; unmanaged lines are never touched. Entry list: `docs/MDT_WORKING_STATE_FILES.md`.

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
