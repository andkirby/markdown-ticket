---
code: MDT-263
status: Implemented
dateCreated: 2026-10-24T17:20:00.000Z
type: Bug
priority: Low
relatedTickets: MDT-143,MDT-262
implementationDate: 2026-10-26
implementationNotes: Strict explicit type/priority token validation in cli/src/commands/create.ts parseCreateTokens: unknown slash-combined part or standalone unknown dash-less single word (when a quoted/multi-word title is present) rejects via CliCommandError INVALID_CREATE_TOKEN with valid sets + aliases (plain stderr and --json/--yaml ok=false envelopes), no ticket file created; omitted type/priority keep Feature Enhancement/Medium; token maps remain derived from domain-contracts. UAT fail-first evidence + specs under docs/CRs/MDT-143/ (BR-6, Edge-2 refined; requirements relocked). Unit 22/22, create e2e 18/18; full cli suite has 15 pre-existing cloud failures reproduced with this diff stashed (stale shared/dist from MDT-200 work).
---

# CLI create silently coerces unknown type tokens — enforce strict enum validation

## Problem

`mdt-cli create chore/low 'X'` silently creates the ticket as **Feature Enhancement** (priority honored). Unknown type tokens fall through `parseCreateTokens` to the default type with no warning — the opposite of `mdt-cli ticket attr`, which rejects unknown enum values and prints the valid set.

User decision (2026-10-24): **only known tokens/aliases are valid** for enum-ish fields (status, type, priority). Unknown explicit tokens must be rejected.

## Repro

```sh
mdt-cli create chore/low 'Test ticket'
# → ticket created with type: Feature Enhancement; expected: error, no ticket
```

## Expected

- Unknown explicit type token (e.g. `chore`, `spike`) → structured error (`--json`: `ok=false` with the valid set), human-readable otherwise, exit 1, **no ticket file created**.
- Omitted type still defaults to Feature Enhancement — only *explicit unknown* tokens are rejected.
- Priority token follows the same rule (unknown priority token → error, not silent default).
- Single source of truth for the valid set: the domain-contracts/shared canonical enum — the CLI token list should not be a third copy of it.

## Affected areas

- cli: `parseCreateTokens` (cli/src/commands/create.ts) + error envelope.
- shared/domain-contracts: canonical type/priority enum source.
- mcp-server/server: inherit shared validation if moved to the shared boundary (do not broaden scope otherwise).
- bb/DSH native tools: transport-clean already — they surface CLI errors as tool errors.

## Notes

- Created as a file directly: the cloud creation coordinator is currently broken for this project (stale counter — see MDT-262 commit history and the MDT-200 allocator investigation); `mdt-cli create` fails with "Coordinator does not support the requested creation identity and minimum".

## Related

- MDT-143 (CLI entrypoint — specs live in docs/CRs/MDT-143/)
- MDT-262 (native tools — surfaced this via live verification)
