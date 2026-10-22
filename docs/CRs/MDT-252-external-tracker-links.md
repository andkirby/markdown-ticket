---
code: MDT-252
status: Proposed
dateCreated: 2026-10-22T04:01:08.680Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-253
---

# External issue tracker links (Jira / GitHub / GitLab)

## Problem

Teams track work in Jira/GitHub/GitLab while MDT is the local-first layer. Tickets need a first-class relation to their external counterparts: searchable by external key, rendered as clickable links built from per-project configuration.

## Established direction (from IDEA-011 + second opinion)

- Stored, **instance-scoped refs** in frontmatter (e.g. `refs: ["work:PROJ-123", "gh:acme/widgets#42"]`) ship **with** the first badges. A ref names a *configured tracker instance* (`[trackers.work] kind = "jira"` in `.mdt-config.toml`), not a tracker kind — two Jira instances can both contain `PROJ-123`, so kind-only refs would recreate the silent wrong-link problem. Template-only badges are rejected as MVP: on numbering divergence they render silently wrong links.
- Per-project URL templates in `.mdt-config.toml`. Local identity stays stable; external identity is stored data.
- Key-mirror alignment (one MDT project per tracker project, seeded numbering) is an explicit opt-in convenience, never an invariant. Schema caps documented: ≤5-char code, ≤4-digit number (`domain-contracts/src/ticket/frontmatter.ts:8`).
- Refs participate in free-text search (predicate extension — small).
- Out of scope: two-way sync, MCP reads of external trackers, per-component tracker routing, multi-code namespaces (MDT-143 stays deferred; refs cover the external-linking use case, not internal categorization).

## Open questions

1. **Extra key digit — out of scope; the review found a contract mismatch instead.** Widening is *not* needed here: `formatCrKey` already handles five digits (tests cover `MDT-10000`), `TICKET_KEY_INPUT_PATTERN` accepts five (`frontmatter.ts:16`), and the only blocker is the `CR_CODE_PATTERN` validation regex (`frontmatter.ts:8`) — live probe: `MDT-10000` input accepted, frontmatter schema rejected. That mismatch is an existing key-contract inconsistency worth separate tracking (ordinary local numbering reaches 10000 without any tracker); do not bundle it into MDT-252.
2. **Closed tracker kinds, open instance names** — `[trackers.<instance>] kind = "jira" | "github" | "gitlab"` + `baseUrl`; refs use the instance name (`work:PROJ-123`). Per-kind grammar: GitHub canonical `owner/repo#123`, `#123` only with an explicit default repo (expanded on write); GitLab full namespace paths incl. subgroups, issues only in MVP (MRs are `!123`); Jira keys NOT constrained by MDT's caps (Data Center allows underscores/digits), preserve base-URL context paths like `/jira`. Settle `gh` vs `github` aliasing once, explicitly. Extensibility rule: unsupported refs are preserved verbatim through reads and unrelated edits — never guessed; defer Linear/Asana adapters until requested.
3. **Refs field shape** — frontmatter key name (`refs`), value grammar, add/remove semantics in CLI `attr` and MCP `update_cr_attrs` / `create_cr`: duplicates, refs shared across tickets, idempotent add/remove, round-trip fidelity for unknown/unsupported refs through serializers and mutations.
4. **Config schema** — `.mdt-config.toml` `[trackers.<instance>]` keys (kind, baseUrl, template override), allowed placeholders, URL encoding, HTTP(S) validation, unresolved-placeholder behavior, `inspect:config` exposure class.
5. **Search routing trap (concrete)** — Quick Search parses `PROJ-123` as a local ticket key (`useQuickSearch.ts:48`) and the backend resolves it against a *local project named PROJ* (`TicketService.searchByTicketKey`), so extending board filtering alone will NOT make refs findable. Decide per surface. Quick Search recommendation: return local-key and exact external-ref matches together (labeled), never apply MDT zero-padding to external identifiers, rank exact refs above partial matches, never auto-open a fuzzy identifier match, dedupe by local identity.
6. **Unresolvable refs** — missing/unconfigured tracker instance: preserve the text (still searchable), never infer a destination.
7. **Mirror mode interaction** — explicit refs always win; seeded mirror numbering only *prepopulates* stored refs, never becomes a lookup fallback.
8. **UX handoff** — badge/link/list-column affordances go through `ux-designer-specifier` against `docs/design/surfaces/` before implementation.

## References

- Source idea + second-opinion record: `docs/ideas/IDEA-011-external-tracker-links.md` (Codex review thread thr_g5ynmg2ccm)
- Namespace prior art (deferred): `docs/CRs/MDT-143/discovery-ticket-code-namespace.md`
- Config conventions: `docs/CONFIG_SPECIFICATION.md`

## Review record

2026-10-19 — Consultant review (@thread:thr_u6zqw3x92s), verdict **FIX FIRST**: two factual corrections applied (five digits already supported by `formatCrKey`/`TICKET_KEY_INPUT_PATTERN` — only `CR_CODE_PATTERN` lags; Quick Search routes external keys into local-project resolution), plus the instance-scoped ref design replacing kind-scoped refs. No files changed by the reviewer; verification was source review plus a focused key-contract probe.