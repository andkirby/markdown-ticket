# Discovery: Custom Ticket Code Namespace (`--code`)

**Status**: Deferred — requires domain-model change
**Date**: 2026-04-05

## Summary

Allow ticket codes to use a namespace other than the project code, so that a single project can host multiple ticket-code prefixes (e.g., `API-001`, `ERP-001` within project `ABC`).

## Proposed CLI Surface

```bash
# Default: ticket code = project code (unchanged behavior)
ticket create feature "Add endpoint"
# → ABC-001  (inside project ABC)

# Custom namespace within current project
ticket create --code API feature "Add endpoint"
# → ABC/API-001

# Custom namespace + alien project
ticket create --code API --project QWE feature "Add endpoint"
# → QWE/API-001
```

## Config Allowlist

Only whitelisted namespaces are permitted:

```toml
# .mdt-config.toml
[project]
code = "ABC"
ticketCodes = ["ABC", "API", "ERP"]
```

- `ticketCodes` defaults to `[project.code]` when absent
- `--code` value must exist in the allowlist or creation fails
- The project code itself must always be in the list

## Why This Is Not a CLI-Only Change

The ticket-code prefix is hard-coupled to the project code across **6 shared modules**:

| Module | Coupling Point |
|--------|---------------|
| `TicketService.createCR()` | Builds `crKey = project.project.code + "-NNN"` |
| `TicketService.getNextCRNumber()` | Regexes `project.project.code-(\d+)` to scan existing files |
| `TicketService.getCR()` | Matches by `key.toUpperCase() === cr.code` (relies on prefix uniqueness) |
| `WorktreeService.detect()` | Gates on `ticketCode.startsWith(projectCode)` |
| `TicketLocationResolver.resolve()` | Passes `projectCode` for worktree branch prefix matching |
| `normalizeKey(key, projectCode)` | Validates and pads key against project code prefix |

For `ABC/API-001` to work:

1. **Key format changes** from `{PROJECT}-{NNN}` to `{PROJECT}/{NAMESPACE}-{NNN}` (or flat `NAMESPACE-{NNN}` with project-scoped counter)
2. **Counter scanning** must be namespace-aware — counting `API-` files independently from `ABC-` files
3. **Worktree routing** must match on namespace prefix, not project code
4. **Key normalization** must accept both `{PROJECT}-{NNN}` (legacy) and `--code` paths
5. **Config schema** must validate and store the `ticketCodes` allowlist
6. **CR filename** — `ABC/API-001-slug.md` (nested) vs `API-001-slug.md` (flat in same dir) — either has filesystem and scanning implications

## Decision Needed

The key open question is the **file layout**:

| Option | Filename Example | Pros | Cons |
|--------|-----------------|------|------|
| Flat: namespace as prefix | `docs/CRs/API-001-slug.md` | Simple, current scanning works with minor regex change | Prefix collision across projects sharing a namespace |
| Nested: project/namespace | `docs/CRs/ABC/API-001-slug.md` | No collision, natural grouping | Breaks `MarkdownService.scanMarkdownFiles()` which expects one level |
| Hybrid: config-gated | Configurable per project | Maximum flexibility | Two codepaths to maintain |

## Recommendation

Defer to a dedicated CR. The domain-model scope (config schema, key format, counter scanning, worktree routing, file layout) is too large for a UAT delta on MDT-143. The safe UAT items (`--tickets-path`, `--project`) can ship independently.

## Related

- MDT-143 (parent CR)
- `shared/services/TicketService.ts` (create, counter, getCR)
- `shared/services/ticket/TicketLocationResolver.ts` (path resolution)
- `shared/services/WorktreeService.ts` (worktree branch matching)
- `shared/utils/keyNormalizer.ts` (key validation/padding)
- `domain-contracts/src/project/schema.ts` (config schema)
