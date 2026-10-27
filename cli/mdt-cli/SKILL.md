---
name: mdt-cli
description: Use mdt-cli for terminal ticket and project operations, shell automation, staged-ticket validation, and cloud management. Covers reference mutations and epic constraints. Use when native MDT tools are unavailable or the user requests the CLI.
---

# MDT CLI

Use `mdt-cli`. Prefer available native MDT tools for supported operations unless the user requests the CLI. Cloud management and staged-ticket validation remain CLI-only. This skill describes command behavior; ticket specification and lifecycle workflows belong to the MDT workflow skills.

## Resolve the project and key

- Inside a project, omit `-p`: resolution walks upward to the nearest `.mdt-config.toml`, with registry fallback. `mdt-cli project --json` reports the current project.
- Use `-p <code>` for another project. On commands that support it, the explicit project overrides a key-embedded project code. Unknown projects fail with exit 1.
- Use `mdt-cli project ls` for registry discovery when needed; it is not a prerequisite for ordinary ticket work.
- Keys accept bare numbers (`12` → the current project's `012`) and full keys (`ABC-12` → `ABC-012`). `mdt-cli 12` is a view shortcut. External refs use their own identities and are never normalized as local keys.

## Choose the command

Use canonical commands in automation; shortcuts are optional. Check `<command> --help` for current flags and allowed values, or `--guide` for the generated command manual.

```bash
mdt-cli ticket get 12 --json
mdt-cli ticket list --json --limit 10 --offset 0
mdt-cli ticket list --all status=impl priority=high,critical
mdt-cli ticket create --json feature/high 'Add dark mode' dark-mode
mdt-cli ticket attr 12 priority=High 'status=In Progress'
mdt-cli ticket deps 12 --check --json
mdt-cli ticket rename 12 'Clearer title' clearer-title
mdt-cli ticket delete 12 --force
mdt-cli project get ABC --json
mdt-cli project init ABC 'Example project' --dir /existing/project --tickets-path tickets
```

- Get returns metadata, paths and subdocument listings; it does not return the full Markdown body. Get/list JSON includes stored `refs` when present.
- List defaults to 10 newest tickets. `--all`, `--limit`, `--offset`, `--files` and `--info` control selection/output. Filters AND across fields and fuzzy-match comma-separated alternatives within a field. Fields: `status`, `priority`, `type`, `level`, `assignee`, `component`, `epic`/`phase`.
- Rename changes the authoritative H1 title and filename slug, not the ticket key. Omit the slug to derive it from the title.
- Delete prompts only on a TTY without `--force`; non-TTY stdin implicitly forces deletion. It also removes empty ticket directories.
- Project init requires an existing target directory. It creates/merges the managed MDT working-state `.gitignore` block while preserving unmanaged lines.
- Top-level `create`, `attr`, `rename`, `delete`, `list`/`ls` and bare ticket keys are shortcuts for the corresponding ticket commands.

## Create tickets

Type/priority tokens are order-independent. Prefer an explicit type and a multi-word title:

```bash
mdt-cli ticket create --json --stdin feature/high 'Add dark mode' <<'BODY'
## Problem
Users need a dark theme option.
BODY
```

Types include `bug`, `feature`, `architecture`, `tech-debt`, `documentation`, `research`. Priorities accept `critical`/`p1`, `high`/`p2`, `medium`/`p3`, `low`/`p4`.

- `--stdin` or piped input supplies the body; the CLI generates frontmatter/H1 and skips the template. It does not take stdin as frontmatter attributes.
- An unquoted dashed token after the title becomes the slug; without an explicit title, the slug supplies it.
- Unknown explicit type/priority tokens fail with `INVALID_CREATE_TOKEN`, valid values/aliases and no ticket file. Slash-combined type/priority tokens must be single words. A slash inside a multi-word title is text; a single-word title like `24/7` cannot be expressed bare because shell quotes do not survive parsing. Use a multi-word title. Once a title is determined, unknown bare words are rejected rather than silently ignored.
- Create has no `refs` parameter or `level` token. Use the returned key with `ticket attr` to attach refs or promote an epic.
- With cloud coordination enabled, create requires a live Access credential and the shared coordinator. It never allocates a local fallback number.

## Update attributes and external refs

Fields: `status`, `priority`, `level`, `phase`, `assignee`, `component`, `related`, `depends`, `blocks`, `refs`, `impl-date`, `impl-notes`. Quote any whole operand containing shell spaces or special characters.

Relations (`related`, `depends`, `blocks`) and `refs` support `=` replace, `+=` add, `-=` remove. Other fields accept `=` only. Unknown fields/enum values fail with valid choices; use `mdt-cli ticket attr --help` for the current values and aliases. `component` is free text and supports list filtering.

```bash
mdt-cli ticket attr 12 related+=MDT-100 depends-=MDT-050
mdt-cli ticket attr 12 'refs=work:PRJ-123,gh:acme/widgets#42'
mdt-cli ticket attr 12 'refs+=gh:#43'
mdt-cli ticket attr 12 'refs-=gh:acme/widgets#42'
mdt-cli ticket attr 12 'refs='
```

External refs are ordered, instance-scoped strings. Instance names such as `work` and `gh` come from the project's `.mdt-config.toml`; they are not built-in tracker aliases. Tracker configuration remains file-only.

- Add/replacement operands may expand `instance:#number` only through that instance's explicit `defaultRepo`. Existing stored shorthand never rebinds on reads, config changes or unrelated edits.
- Adds append absent refs; removal matches exact stored strings only and is idempotent. `refs=` clears the list.
- Unknown refs, untouched entries and their order survive unrelated writes. Full stored identities remain independent of display shortening and local ticket numbers.
- For identifiers containing commas, supply a JSON string array operand, e.g. `'refs=["future:identifier,with-comma","gh:acme/widgets#42"]'`.

## Epics

An epic is a ticket with `level=epic`; children link through `phase` (`phaseEpic`). Children are derived from these links, not a stored `children` array.

```bash
mdt-cli ticket create feature 'Auth overhaul' auth-overhaul
mdt-cli ticket attr <returned-key> level=epic status=Approved
mdt-cli ticket attr <child-key> phase=<epic-key>
mdt-cli ticket list --all phase=<epic-key>
mdt-cli ticket list --all level=epic
```

- Ticket-key phase targets, including cross-project targets, must exist, be epics, and be `Approved` or `Implemented`. Failures report `EPIC_TARGET_NOT_FOUND`, `EPIC_TARGET_NOT_EPIC` or `EPIC_NOT_USABLE`. Non-key phase text passes through.
- Closing an epic (`status=Implemented`) requires all children to be terminal: `Implemented`, `Rejected` or `Partially Implemented`. Errors name blockers; zero-child epics close freely. Reopening to `Approved` is allowed.
- `level` accepts `e`/`t` aliases. Promotion needs no migration.

## Validate staged tickets

```bash
mdt-cli ticket validate --staged --json
```

This offline guard reads primary ticket files and `.mdt-config.toml` from the Git index. It checks added/modified/renamed tickets and epics; unchanged historical tickets, deletions and subdocuments are excluded. It does not resolve runtime projects or access cloud services.

Exit 0 means clean or not applicable; exit 1 means unfinished content or a validator/configuration failure. An unstaged fix cannot repair staged content: correct it, stage it, then retry. `--staged` is required. The commit hook requires an installed CLI with this command and built dependencies; unavailable support is a setup failure, not a skipped clean check.

## Cloud and output

Use `mdt-cli cloud --help` to select provisioning/binding, login, status/doctor, members or credentials commands. Cloud management has no native plugin wrapper. Existing cloud configuration still governs ordinary ticket commands.

Use `--json` for machine-readable results or `--yaml` where supported. Failures retain diagnostics; a failed command is not a successful empty result. Rename returns text. Paths default to project-relative; `cli.ticket.absolutePath=true` in `~/.config/mdt/cli.toml` requests absolute paths. Colors apply on TTY and are suppressed when piped or `NO_COLOR=1`.
