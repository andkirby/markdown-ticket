# Requirements: MDT-252

**Source**: [MDT-252](../MDT-252-external-tracker-links.md)
**Canonical behavior/constraint records**: [requirements.trace.md](requirements.trace.md)

## Overview

MDT keeps a stable local identity while storing explicit references to external issues. References are instance-scoped, survive unrelated edits, resolve using optional project configuration, and participate in board and Quick Search discovery. Linking performs no external tracker requests.

The user's UI direction is tracker icon + external key + diagonal new-tab arrow. The user selected option A: references join the existing wrapping badge row. Use neutral shared badge chrome, link-text color, and vendor icon; tracker branding is represented by the icon rather than a competing badge palette. The style guide must be updated to this agreed composition.

## Non-Ambiguity Table

| Concept | Chosen semantic | Rejected semantic | Reason |
| --- | --- | --- | --- |
| Identity | `refs` is an optional ordered YAML string array; each interpreted ref uses `<instance>:<external-identifier>`. Local key is independent. | Kind-scoped identity or local-number-derived links | Two same-kind tracker instances can contain the same key. |
| Instance lookup | Instance names match configured names exactly; `gh` is permitted as an instance name, not an alias for tracker kind. Supported kind values are `jira`, `github`, `gitlab`. | Implicit provider or instance aliasing | No inferred destination. |
| Jira identifiers | Keep the supplied key spelling and issue-number digits; recognize a nonempty letter-led project segment with letters/digits/underscores followed by `-` and a positive issue number. | Applying MDT project-code length or number padding | The external tracker owns its key grammar. |
| Repository issues | GitHub uses `owner/repo#number`; GitLab uses `namespace[/subgroup]/repo#number`; positive issue numbers, issues only. | Treating `!number` as an issue | No merge-request adapter in this ticket. |
| Shorthand | Expand newly supplied replacement/add operands `<instance>:#number` only when that instance configures a default repository. Stored shorthand stays unavailable on reads even if configuration later supplies a default; an explicit replacement is required to normalize that stored string. Adding an unrelated ref never rewrites old shorthand. | Guessing repository from MDT project name or unrelated trackers | Stored identity must be reproducible. |
| Duplicate refs | Replacement deduplicates supplied canonical strings in first-occurrence order. Add deduplicates its normalized operands and appends only absent exact strings; it never deduplicates or rewrites the pre-existing list. The same ref may appear on multiple local tickets. | Global uniqueness or implicit case-changing rewrites | Multiple local tickets can refer to the same external issue. |
| Mutation | Ordered replace/add/remove operations; adding an already stored canonical string and removing an absent ref are no-ops. An empty replacement array clears refs. Reuse the existing CLI `=`, `+=`, `-=` syntax for the new `refs` field through shared mutation logic. Normalize only newly supplied replacement/add operands. For removal, remove only exact stored-string matches. Do not expand removal operands: the raw and expanded strings are distinct stored identities, and exact-only removal remains idempotent when both exist. To remove an expanded ref, supply its complete stored string. | CLI-owned business rules | Other consumers need identical mutation behavior. |
| Preservation | Unsupported/unconfigured ref strings remain verbatim through reads and unrelated edits. Replacement normalizes/deduplicates its supplied full list; add normalizes/deduplicates only its newly supplied operands. Untouched strings and order survive every operation, including pre-existing raw duplicates and shorthand. | Dropping unknown refs while serializing a status change | Forward compatibility and no hidden data loss. |
| Configuration | Optional root `[trackers.<instance>]` tables in `.mdt-config.toml`; fields `kind`, `baseUrl`, optional `defaultRepo`, optional `urlTemplate`, Jira `projectKeys`, and optional `display` settings. | Global tracker identity defaults | A ref is scoped by the current MDT project's configuration. |
| Default URL paths | Jira: `{baseUrl}/browse/{key}`; GitHub: `{baseUrl}/{repo}/issues/{number}`; GitLab: `{baseUrl}/{repo}/-/issues/{number}`. | Appending paths with a URL API operation that discards `/jira` or other context paths | Preserve existing installation prefixes. |
| Templates | A complete URL template uses `{baseUrl}` and the supported per-kind identifier placeholders; unknown, unavailable or unresolved placeholders make that destination unavailable. Data is encoded by component; final URL must be HTTP(S), credential-free and remain on the configured base origin. | Raw interpolation or fallthrough to another instance | Keep identifier data separate from URL structure. |
| Invalid configuration | An invalid or unsupported tracker entry yields unavailable refs and a diagnostic without suppressing the entire local project; unrelated edits preserve raw tracker tables. | Making a project disappear because one optional tracker is invalid | Existing tickets remain usable. |
| Config exposure | Tracker settings are project-owned `fileOnly`; document them in the configuration exposure inventory and inspection output. Resolve links for consumers without adding a tracker-settings form in this ticket. | New UI-editable configuration by accident | Follow existing exposure ownership. |
| Exact search | Case-insensitive equality on stored ref text and parsed external identifier text; preserve original spelling/digits for display and URLs. Local-only lookup may normalize local keys independently. | Padding/uppercasing external keys before matching | Search routing must not change external identity. |
| Search identity | Deduplicate results by local project identity plus local ticket key. Include local-key and external-ref provenance if both match the same ticket. | Deduplicating by external key | One external key can have several local counterparts. |
| Search ordering | Exact local/external identity matches outrank partial ref matches; stable existing ordering resolves ties. Partial/fuzzy ref matches require explicit selection. | Automatically opening a fuzzy result | Avoid silently navigating to the wrong local ticket. |
| Mirror numbering | Existing seeded local numbering does not generate an external destination; users persist explicit refs when they intentionally mirror a tracker. No new mirror-numbering UI or synchronization is introduced. | Local numbering as external lookup fallback | Explicit refs always supply external identity. |

## Constraint Carryover

| Constraint IDs | Required downstream treatment |
| --- | --- |
| C1, C2, C11 | Architecture: instance identity and local/external normalization boundaries. Tests/tasks: duplicate same-kind keys, long external keys, five-digit local-key regressions. |
| C3, C4 | Architecture: URL/template ownership and unavailable result model. Tests/tasks: credentials/schemes/unresolved tokens, encoding and context-path preservation. |
| C5, C6, C13 | Architecture: provider parsing and shorthand expansion boundary. Tests/tasks: GitLab subgroups, unsupported merge requests, absent default repository, no read-time shorthand rebinding, and exact-only removal when raw and expanded forms coexist. |
| C7, C10, C14 | Architecture: tolerant read/preservation boundaries. Tests/tasks: unknown refs/config, unrelated writes across all supported consumers, and an invalid optional tracker entry that leaves its local project available. |
| C8, C9 | UX: focus/target/text floors and preserving preference migration. Tests/tasks: keyboard/touch/density, first-run migration and later opt-out. |
| C12 | Architecture: no external tracker API or sync dependency. Tests/tasks: local-only operation and no new external network calls. |

## Configuration

Tracker settings are absent by default. A stored ref with no matching valid tracker configuration remains visible and searchable but has no link. Removing configuration must not remove refs. Provider-specific URL templates and optional default repository are subordinate to the explicitly named instance.

## Confirmed UX direction

The user selected A (existing badge flow), requested icon + key + arrow, configured shortening, broad number search and always-visible external badges in search results. See [ux-design.md](ux-design.md) for composition and full behavior. These decisions authorize the canonical design/styleguide update; runtime readiness still requires executable evidence and independent review.

### Configured shortening and edge cases

- Jira `projectKeys` is optional display context, not a restriction on stored refs. `display.projectCode` is `auto` by default or `always`. Auto removes the prefix only if exactly one configured project key matches that ref; no configured keys, several keys or a different prefix retain the full Jira key. Never infer scope from loaded, visible or filtered tickets.
- GitHub/GitLab `display.repository` is `name` by default (`widgets#123`); `none` requests compact `#123` only for a ref matching the explicitly configured `defaultRepo`. Other repositories retain their basename. No owner/group prefix is added to ordinary badges; details, accessible names and tooltips retain the complete repository path for collisions and verification.
- Multiple configured instances of the same tracker kind always retain instance labels in badges, even if only one instance occurs on the current ticket. Full identities remain available without navigation through the details control.
- Plain `123` participates in existing text search and matches local/external issue numbers; exact-number matches rank above partial ref matches. `#123` specifically matches the complete external repository-issue number, not `#1234` and not Jira or local tickets solely because their number is 123. Repository-shaped refs with missing tracker configuration remain discoverable by this syntax without inferring a destination.
- Search results show external badges whenever the returned ticket has refs, including title/local-key matches and when board reference badges or all card badges are hidden. Search can prioritize a matched ref inline so a hit is identifiable without opening overflow; the complete list remains inspectable.

Future owner/full-namespace display variants are deferred ideas, not part of this ticket's badge settings.

## Scope and validation notes

The source references describe no new external REST endpoints or tracker error codes. Consumer boundaries in scope are ticket create/read/metadata/update, project config read/preservation, board filtering, global/key-shaped Quick Search, and visible link/detail interactions. Input fields covered are refs and tracker kind/base URL/default repository/template. Canonical records contain one SHALL each; all have `timing:in-ticket`. Constraints use the tests route. Requirement-stage trace validation passed with no issues; UI concept agreement is recorded; executable implementation evidence is pending.
