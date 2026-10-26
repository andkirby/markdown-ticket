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

## Local hook and prerequisites

Tracked lefthook.yml registers the local template guard. scripts/check-ticket-templates.sh delegates to the repository's built CLI; shell contains no content policy. Missing Bun, missing builds or unsupported validator commands fail explicitly with a remedy.

```sh
bun run build:domain-contracts
bun run build:shared
bun run --cwd cli build
lefthook dump --format json
```

Verify that the effective pre-commit configuration contains the guard alongside existing remote and local jobs. Local composition and isolated block/pass/missing-validator tests are verified on Lefthook 2.1.8. Other versions need the same effective-config proof; the root config retains its earlier observation about 2.1.10 rather than assuming it behaves identically.

## Template ownership

shared/templates/catalog.ts owns built-in text and metadata for all six types. Markdown files and templates.json are generated projections; fallback uses the compiled catalog. New prompts use explicit `mdt:placeholder` comments and later-stage sections remain absent/empty. Custom explicit file-template loading is retained; custom prompt instructions should use markers so the guard can identify them.

```sh
bun run --cwd shared build:tools
bun scripts/generate-ticket-templates.ts
bun scripts/generate-ticket-templates.ts --check
```

The shared build checks projection drift after compilation. Legacy instruction compatibility lives in shared/templates/legacy-instructions.ts; extend tests with a concrete old template when adding compatibility phrases.

## Rollout boundary

This ticket establishes and verifies local MDT enforcement. The separate shared-hooks repository and other consuming projects are not changed in the initial rollout. Before distributing the hook there, record the validator/version dependency and verify a separate consuming project using the same staged-content command. Reuse the shared detector; do not copy its phrase rules into shell or CI.
