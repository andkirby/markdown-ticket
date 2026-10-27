# Ticket template diagnostics and local commit guard

Ticket creation succeeds even when its generated body is unfinished. Shared services return operation diagnostics; CLI/MCP/HTTP render them, and BB/DSH preserve CLI JSON. The browser response adapter shows a persistent dismissible warning through the existing Sonner surface. Do not retry creation to address this warning: edit the created ticket.

## Complete the created ticket

Replace generated instructions with ticket-specific content. A concise real problem and desired outcome is enough for intake; later-stage implementation sections may be absent. Generated body warnings use TICKET_TEMPLATE_UNFILLED; supplied unfinished instructions use TICKET_CONTENT_UNFILLED; an empty scaffold uses TICKET_BODY_EMPTY.

## Validate the proposed commit

```sh
mdt-cli ticket validate --staged
mdt-cli ticket validate --staged --json
mdt-cli ticket validate --staged --yaml
```

The command reads the complete Git index version and staged project configuration. It examines changed primary tickets under the configured path/code, including epics, with no MDT server or network access. It does not stage or modify files. Working-tree fixes do not repair a still-unfinished staged version; stage the corrected ticket and re-run.

Explicit generated markers, recognized legacy template instructions and headings/comments/boilerplate-only bodies block. Ordinary planning words, links, technical brackets, code/quoted examples, and unchecked intake criteria do not independently block. Legacy deferral is allowed only in Implementation Notes before Implemented. This guard detects scaffolding, not prose quality.

## Shared hook and prerequisites

Tracked lefthook.yml imports configs/mdt/check-ticket-templates.yml from
[agent-commit-hooks v0.5.0](https://github.com/rikby/agent-commit-hooks/tree/v0.5.0).
The remote script delegates to `mdt-cli ticket validate --staged` from this
repository's working directory. Content policy remains in MDT shared services;
there is no local launcher or duplicate guard registration.

The installed `mdt-cli` must support `ticket validate` (MDT-261 or newer), with
its runtime and built dependencies available. The hook probes command support;
the nominal CLI version alone does not establish compatibility. Missing or
unsupported CLI commands fail with setup instructions. For a source checkout:

```sh
bun run build:domain-contracts
bun run build:shared
bun run --cwd cli build
mdt-cli ticket validate --help
bunx lefthook install
bunx lefthook dump --format json
```

The effective pre-commit configuration must contain exactly one
`check-ticket-templates.sh` script alongside existing remote hooks and the local
CSS gate. Remote `scripts`/`source_dir` resolution supports the pinned tag.
`MDT_CLI` may select a different executable; provide it through the invoking
shell or CI environment because some Lefthook versions do not propagate YAML
environment overrides. It accepts a single executable path/name, not shell
arguments. The hook preserves `GIT_INDEX_FILE` and never stages fixes.

The consumer hook tests install the published pinned remote into isolated Git
repositories and verify real blocked/accepted commits and missing-CLI failure.
They also exercise the actual registered root job against temporary index/object
storage without changing the real index or working ticket files.

## Template ownership

shared/templates/catalog.ts owns built-in text and metadata for all six types. Markdown files and templates.json are generated projections; fallback uses the compiled catalog. New prompts use explicit `mdt:placeholder` comments and later-stage sections remain absent/empty. Custom explicit file-template loading is retained; custom prompt instructions should use markers so the guard can identify them.

```sh
bun run --cwd shared build:tools
bun scripts/generate-ticket-templates.ts
bun scripts/generate-ticket-templates.ts --check
```

The shared build checks projection drift after compilation. Legacy instruction compatibility lives in shared/templates/legacy-instructions.ts; extend tests with a concrete old template when adding compatibility phrases.

## Distribution

The shared hook commit and v0.5.0 tag are published. This repository consumes
that tag and has removed its earlier local registration and launcher. Other
projects can opt into the same remote config after making a compatible MDT CLI
available. All consumers use the shared staged-content detector; do not copy its
phrase rules into shell or CI.
