---
code: MDT-192
status: Proposed
dateCreated: 2026-07-17T15:59:59.045Z
type: Architecture
priority: High
dependsOn: MDT-189
---

# Frontmatter Relationship Field Format Guard

## 1. Description

### Problem Statement

The relationship fields (`relatedTickets`, `dependsOn`, `blocks`) are declared
as scalar `z.string()` in `domain-contracts/src/ticket/frontmatter.ts:45-47`
and written to frontmatter as comma-joined scalars by
`shared/services/MarkdownService.ts:240-247` (`arr.join(', ')`). The read path
(`shared/models/Ticket.ts:80-83`, `normalizeArray`) splits on comma to produce
the runtime `string[]`.

There are three writers of frontmatter and no guardrail on the format:

1. `mdt-cli attr` → `TicketService` → `MarkdownService` (canonical).
2. `TicketService.updateTicketAttributes` from the HTTP / MCP / UI paths
   (canonical).
3. **Any agent or human hand-editing the `.md` file.** Nothing validates the
   result.

A hand-edit that writes `dependsOn: [MDT-189, MDT-190]` (YAML flow sequence)
instead of `dependsOn: MDT-189, MDT-190` (scalar) **happens to parse** — YAML
accepts flow sequences — but silently breaks every comma-split reader: the
normalizer yields `[MDT-189` and `MDT-190]` as keys, bracket characters become
part of the key, lookups fail, and the next canonical write reformats the field
without warning. This was observed in the wild during MDT-188 ticket creation
(see "Originating incident" below).

The bug is structural, not a one-off: any future agent or human is the third
writer of frontmatter, and nothing stops the fourth from inventing the same
syntax. A single guardrail on the frontmatter format prevents the whole class.

### Current Architecture

- Schema: `domain-contracts/src/ticket/frontmatter.ts:45-47` —
  `relatedTickets`, `dependsOn`, `blocks` are all `z.string().optional()`.
  Runtime type (`entity.ts:24-26`) is `string[]`, produced by normalization.
- Write path: `shared/services/MarkdownService.ts:240-247` —
  `arr.join(', ')` for non-empty arrays; empty arrays → field omitted.
- Read path: `shared/models/Ticket.ts:80-83` — `normalizeArray` splits on
  comma, trims, drops empties.
- Two canonical writers (CLI attr path, service mutation path) and one
  unguarded writer (direct file edit). No lint, no schema validation on
  commit, no schema validation on file-watch.

### Proposed Architecture

Add a frontmatter format guard that rejects relationship fields written in the
wrong shape. The guard validates; it does **not** transform. Silent rewrites
are how data drifts and how a writer loses trust in their own edit.

### Rationale

- **Prove it before you enforce it.** MDT-189's migration will rewrite every
  relationship field and is the natural moment to decide whether the canonical
  format stays scalar-string or moves to native YAML-array
  (`z.array(z.string())`). This guard must enforce whichever format MDT-189
  lands on — so this ticket is sequenced after MDT-189, not parallel to it.
- **Bugs that recur are structural.** The hand-edit happened once in three
  tickets during a single session. It will happen again. The cost of a guard
  is small; the cost of a third unguarded writer is recurring silent data
  corruption.

## 2. Solution Analysis

### Design Decisions (to confirm during implementation)

1. **Lint, don't transform.** Reject malformed relationship fields with an
   actionable error pointing at the canonical format. Do not silently rewrite
   — silent rewrites mask the underlying disagreement about format and make
   the original edit unrecoverable.

2. **One rule per field type, no plugin architecture.** v1 is: reject
   YAML-array (or YAML-mapping) values where the schema declares scalar. Do
   not build a general frontmatter linter with extension points. That is
   enterprise sludge for a three-field problem.

3. **The guard enforces whichever format MDT-189 declares canonical.** If
   MDT-189 keeps scalar-string, the guard rejects YAML arrays. If MDT-189
   migrates to native YAML-array, the guard rejects legacy scalar-string and
   the migration rewrites the back-catalog. Either way, this ticket's job is
   to make the canonical format the only accepted format.

4. **Scope: relationship fields only in v1.** Do not generalize to all
   frontmatter. Status, priority, dates have their own validators already
   (CRStatusSchema, CRPrioritySchema, ISODateSchema); relationship fields are
   the unguarded ones.

### Trade-offs Analysis

- **Gained:** recurring class of silent corruption prevented; the format
  question becomes explicit rather than discovered at runtime.
- **Lost:** a tiny ergonomic hit — hand-editors must use the canonical format
  or the guard rejects. This is the correct trade; the alternative is
  accepting any-shape input and silently normalizing, which is what produced
  the bug.

### Open Questions (deferred to implementation)

- **Guard placement: pre-commit hook vs. file-watch validation vs. both.**
  - Pre-commit catches hand-edits before they land. Use the project's existing
    hook infrastructure (`core.hooksPath` or equivalent).
  - File-watch validation catches edits from any tool that bypasses git
    (editors, scripts, MCP `update_cr` paths that write directly). Catches
    more, but runs after the fact.
  - Recommendation: pre-commit for v1 (cheapest, catches the common case);
    revisit file-watch integration if drift is observed post-ship.
- **Guard scope: relationship fields only, or all frontmatter?** v1 =
  relationship fields only. Generalizing is a separate ticket.
- **Error UX:** single-line git-style rejection, or structured multi-line with
  the offending value and the canonical form? Cheap either way; pick at
  implementation time.
- **Test fixture.** Use the MDT-188/189/190/191 incident as the negative test
  case — the exact YAML-array shape that triggered this ticket.

## 3. Implementation Specification

### Technical Requirements

- A guard function that parses a ticket file's frontmatter and rejects
  YAML-array / YAML-mapping values for `relatedTickets`, `dependsOn`, `blocks`
  (or, post-MDT-189, the inverse — reject legacy scalar-string if the canonical
  format moves to native arrays).
- Wired as a pre-commit hook (v1 recommendation) covering `docs/CRs/*.md`.
- Error message names the file, the field, the offending shape, and the
  canonical form. Non-zero exit blocks the commit.
- Unit tests on the guard function covering: canonical scalar, YAML flow
  sequence (`[A, B]`), YAML block sequence, YAML mapping, empty, omitted.

### Dependencies

- **MDT-189 must ship first.** MDT-189 decides the canonical format; this
  ticket enforces it. Enforcing a format before it's chosen means re-writing
  the guard.

### Risk Assessment

- **Low.** Additive guard, no mutation, no data migration of its own. The
  worst case is a false-positive that rejects a validly-formatted ticket,
  which is loud and recoverable. The status-quo worst case — silent
  corruption — is worse and quieter.
- **Sequencing risk.** If this ships before MDT-189 and MDT-189 changes the
  canonical format, the guard gets rewritten. Mitigation: hard `dependsOn:
  MDT-189`.

## 4. Acceptance Criteria

- [ ] A pre-commit hook (or agreed equivalent) validates frontmatter of every
  staged `docs/CRs/*.md` file.
- [ ] Committing a ticket with `dependsOn: [MDT-189, MDT-190]` is rejected
  with an error naming the file, field, offending shape, and canonical form.
- [ ] Committing a ticket with `dependsOn: MDT-189, MDT-190` (canonical
  scalar) succeeds.
- [ ] The same holds for `relatedTickets` and `blocks`.
- [ ] The MDT-188 incident tickets (MDT-189/190/191 with their now-canonical
  scalar frontmatter) pass the guard — i.e. the guard does not regress the
  fixed state.
- [ ] Unit tests on the guard function cover: canonical scalar, YAML flow
  sequence, YAML block sequence, empty, omitted, non-relationship field
  (untouched).
- [ ] The guard's canonical-format rule matches whatever MDT-189 declares
  (verified against MDT-189's acceptance criteria for the format decision).

## 5. Implementation Notes

*To be filled during/after implementation.*

## 6. References

- **Originating incident:** During MDT-188 epic creation, three child tickets
  (MDT-189, MDT-190, MDT-191) were hand-edited with YAML flow-sequence
  frontmatter (`dependsOn: [MDT-189, MDT-190]`) instead of the canonical
  scalar form. Caught in review; reverted and rewritten via `mdt-cli attr`.
  Commit `649115cb` contains the fix and the explanation. This ticket is the
  structural fix so the incident class does not recur.
- **Depends on:** MDT-189 (decides the canonical format this guard enforces)
- **Related:** MDT-188 (originating epic), MDT-143 (relationship batch-write
  semantics — distinct concern; this ticket is format, not batching)
- `domain-contracts/src/ticket/frontmatter.ts:45-47` — scalar-string schema
- `shared/services/MarkdownService.ts:240-247` — canonical write path
  (`arr.join(', ')`)
- `shared/models/Ticket.ts:80-83` — `normalizeArray` read path (comma-split)
- `cli/src/commands/attr.ts` — canonical CLI write surface
- `cli/mdt-cli/SKILL.md` — documented `attr +=/−=/=` interface