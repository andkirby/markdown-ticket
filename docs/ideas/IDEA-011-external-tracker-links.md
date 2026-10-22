---
id: IDEA-011
status: promoted
date: 2026-10-19
resolution-date: 2026-10-19
promoted-to: MDT-252
---

# External Issue Tracker Links (Jira / GitHub / GitLab)

## Idea
Relate MDT tickets to issues in external trackers (Jira, GitHub, GitLab) and build the URLs automatically from a per-project pattern, e.g. `https://{company-name}.atlassian.net/browse/{project}-{number}`.

## Investigation
Intake-level take (2026-10-19):

- **Independent capability** — unrelated to the `component` attribute (IDEA-006): that is internal ownership taxonomy, this is cross-system identity. Do not couple them.
- **Fits MDT's model** — MDT is local-first ticketing; tracker links make it an index/jump layer over team trackers. Bodies already render markdown links (`linkNormalization.ts`); this adds first-class config + auto-URL + badge rendering, not raw linking.
- **The real challenge is identity mapping, not URL templating.** Two shapes:
  1. *Pattern-only* — template resolves from the ticket's own key (`PROJ-{number}`). Zero new model, but divergence is **silent**: a drifted number renders a badge that links to *another valid issue*, not an error. Also not key-search-free: MDT zero-pads numbers (`PROJ-12` → `PROJ-012`, `shared/utils/keyNormalizer.ts:38`), and the key schema caps at 5-char codes / 4-digit numbers (`domain-contracts/src/ticket/frontmatter.ts:8`) while Jira keys reach 10 chars and issue numbers pass 9999.
  2. *Stored refs* — frontmatter field with **tracker-scoped** values (e.g. `refs: ["jira:PROJ-123", "gh:org/repo#42"]`) + per-tracker URL template. Robust; key-mirror becomes the opt-in special case.
- **MVP (revised after second opinion):** ship stored refs **with** the first badges — optional `refs` in frontmatter, tracker-scoped values, per-tracker URL templates in `.mdt-config.toml`, refs included in the free-text search predicate (small), detail-panel badge + optional list column. Rationale: the badge is exactly the UI that lies silently on divergence, so "add refs when divergence is observed" is the wrong trigger — divergence is not observable from the outside. Key-mirror alignment (seeded numbering, one MDT project per tracker project) remains an explicit opt-in convenience, never an invariant.
- **Out of scope:** two-way sync, MCP reads of external trackers, per-component tracker routing (speculative), and multi-code namespaces within one project — MDT-143's deferred 6-module change is not justified by external linking; refs attach many external identities to one stable MDT identity.

## Decision
**Promoted 2026-10-19 → [MDT-252](../CRs/MDT-252-external-tracker-links.md)** (feature). Revised MVP (refs with first badges, tracker-scoped — later refined to instance-scoped at review) carried into the CR together with its open-questions list (eight items at latest count; see MDT-252).

## Second opinion
2026-10-21 — Codex review (@thread:thr_g5ynmg2ccm): verdict **"B as the durable model, A as an optional convenience, C deferred."** Adopted above: silent wrong-link hazard defeats template-first; refs must be tracker-scoped; prior art (bugwarrior's dedicated external-identity attributes; Jira rewriting keys on project moves) supports stable local identity + stored external identity. Repo correction from that review: ticket numbering scans filenames and honors `startNumber`; `.mdt-next` is no longer the allocator (`shared/services/TicketService.ts:1202`).

2026-10-19 — Consultant review (@thread:thr_u6zqw3x92s) refined the ref design at CR stage: kind-scoped refs (`jira:PROJ-123`) superseded by **instance-scoped** refs (`work:PROJ-123` → `[trackers.work]` in project config); see MDT-252 for the applied form.

## References
- [IDEA-006 — ticket sub-areas / component attribute](./IDEA-006-ticket-sub-areas.md) — adjacent but independent; shares only the per-project config mechanism
- `frontend/src/utils/linkNormalization.ts` — existing link normalization/rendering
- [docs/CONFIG_SPECIFICATION.md](../CONFIG_SPECIFICATION.md) — project config conventions (`.mdt-config.toml`)
