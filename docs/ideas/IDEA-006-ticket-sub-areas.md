---
id: IDEA-006
status: triage
date: 2026-07-11
resolution-date:
promoted-to:
---

# Sub-Areas Within a Project

## Idea
Let a user organize tickets into "sub-areas" within a single project — e.g. `API`, `UI`, `DB` inside the `MDT` project. The original instinct was to embed the area in the ticket key: `MDT/API-123` would mean "ticket #123 in the API area of MDT." After research, the recommended shape is an `area` frontmatter attribute kept **out of** the key.

## Investigation
Researched in [IDEA-006-ticket-sub-areas.research.md](./IDEA-006-ticket-sub-areas.research.md). Five options were evaluated against UX quality and implementation complexity; the key-embedded format (`MDT/API-123`) ranked **worst** on the complexity-to-UX ratio.

**Why `MDT/API-123` (the original idea) is rejected:**
- Bakes categorization into identity — changing a ticket's area becomes a **rename**, the most expensive operation in MDT (cascades through `relatedTickets`, `dependsOn`, `blocks`, git branches, worktrees).
- `/` is illegal in filenames, and the key is embedded in the filename today.
- Collides with the CLI's existing cross-project syntax (`PROJECT/KEY`, e.g. `MDT/API-123` already means "ticket API-123 in project MDT" in `cli/src/commands/{view,attr,rename}.ts`).
- Fragmented numbering (no single project-wide sequence).
- MDT-143's discovery doc already analyzed a near-identical feature (custom namespaces → `ABC/API-001`) and **deferred it** as "requires domain-model change," identifying 6 hard-coupled modules (`createCR`, `getNextCRNumber`, `getCR`, `WorktreeService.detect`, `TicketLocationResolver.resolve`, `normalizeKey`).

**Recommended alternative — `area` as a frontmatter attribute (Option C):**
```yaml
---
code: MDT-123          # identity — never changes
area: API              # categorization — freely mutable
---
```
- Additive only: zero changes to key format, filename, counter, worktree, or routing.
- Mutable: moving API→UI is a one-field edit, no rename, no reference churn.
- Preserves a single project-wide numbering sequence.
- Enables filtering (List column), grouping (Board swimlanes), and badges (area badge next to the code).
- Matches industry convention — Jira components, GitHub/Linear/GitLab labels **all** keep categorization out of the issue key.

**Effort:** S–M for Phase 1 (data model + minimal UI); M total with Phase 2 (swimlanes, create-form area picker, area colors). Mostly additive — no migration, existing 239 CRs simply have no `area`.

## Decision
Recommendation: **promote as a Feature Enhancement CR**, scoped to the Phase 1 plan in the research doc (add `area` field to domain contracts, serialize in MarkdownService, optional `[areas].known` config allowlist, minimal frontend badge/column/filter). Do **not** pursue the key-embedded `MDT/API-123` format — record it as rejected with rationale so it isn't re-investigated.

## Decision Update — 2026-10-19 (component reconciliation)

Supersedes the `area` naming above; the key-embedded rejection stands. Origin: epic refactor pain — one epic became a "bottomless well" of tickets spanning three packages/services, and sorting it needed a subsystem label. The user proposed the name `component`; it was implemented in mdt-cli (commit `82528a68`, free-text, no enum validation) and already carries real values in another project (gpt-german: `owned-runtime`, `tutor-learner`, `tutor-admin`). Renaming to `area` would now break an in-use field.

Established decisions:

- **Field:** the existing `component` attribute — single-valued *owning subsystem*, per-project. Vocabulary: optional per-project list in `.mdt-config.toml` (`[components] known = [...]`, `enforce` optional) — decided 2026-10-19, motivated by agent-facing flows: the list is injected into MCP tool schemas and CLI suggestions so agents stop guessing values, and makes the filter facet menu stable from day one (static behavior per MDT-196; derived from ticket set when unconfigured). Default advisory; hard rejection is opt-in per project and is never airtight since tickets are plain markdown files editable outside all APIs.
- **Concept contract:** `component` = one primary owning subsystem (containment). `impactAreas` = multiple *affected* subsystems — no traceable user need today, so demoted: remove its board-filter facet, keep the schema field dormant. Do not expose both as visible facets.
- **Cross-package epics** (e.g. a voice-system integration touching all packages) need no new field: an epic's component footprint is the union of its children's `component` values. Single-valued tickets + epic aggregation cover this.
- **Granularity rule (C4 mapping):** attribute values are top-level owned subsystems/packages — usually C4 *container*-level units (`frontend`, `server`, `mcp-server`, `cloud`, `cli`); libraries like `shared` qualify because ownership, not runnability, is the classifier. C4 *component*-level sub-systems inside a package (e.g. the server's event driver) are not attribute values — title/body, or `impactAreas` when affected-not-owned. The field name stays `component` (in use, Jira-familiar) despite the C4 tier mismatch; renaming to `container` would collide with Docker containers and break live values. A sub-system becomes an attribute value only when it becomes an independently owned unit (architecture split), or when ticket volume gives adoption evidence for splitting the value.
- **UX scope:** MVP = detail-panel badge + facet in the existing board filter popover (configured list when present, otherwise derived from the ticket set); list column optional. Later = swimlanes/grouping, board-card badge, create-form picker.

Next: UX specification against `docs/design/surfaces/` (board-filter-bar, ticket detail). Follow-up: code review of the CLI implementation (commit `82528a68`) — note its scope line says MCP/HTTP don't expose the field, but `TICKET_UPDATE_ATTRS` in domain-contracts `input.ts` already includes `component`, so `update_cr_attrs` likely accepts it; verify during review.

## References
- [IDEA-006 Research](./IDEA-006-ticket-sub-areas.research.md) — full evaluation of 5 options, evaluation matrix, industry comparison, phased rollout
- [MDT-143 / discovery-ticket-code-namespace.md](../CRs/MDT-143/discovery-ticket-code-namespace.md) — prior deferred analysis (6-module coupling)
- [ticket-numbering-scale.md](../../research/ticket-numbering-scale.md) — key/counter scaling research
- `domain-contracts/src/ticket/frontmatter.ts:8` — `CR_CODE_PATTERN` (the regex a key-embedded format would need to break)
- `domain-contracts/src/ticket/frontmatter.ts:43-44` — unused `phaseEpic` / `impactAreas` fields (closest existing analogues)
- `shared/utils/keyNormalizer.ts:38` — `formatCrKey`, single owner of key formatting (MDT-159)
- [docs/PRE_IMPLEMENT.md](../PRE_IMPLEMENT.md) — type-safe field/enum pattern for adding `area`
