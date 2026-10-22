---
code: MDT-253
status: Approved
dateCreated: 2026-10-22T05:25:24.660Z
type: Feature Enhancement
priority: Medium
level: epic
---

# External issues system

## Scope

Umbrella for relating MDT tickets to external issue trackers (Jira, GitHub, GitLab) and everything that grows from it.

## Children

- MDT-252 — External issue tracker links (instance-scoped refs, tracker config, badges, search) — Proposed
- MDT-255 — Outbound status mapping to external trackers — Proposed (Later-tier write path, scoped to explicit apply)

## Adapter strategy (2026-10-22)

External-tracker features delegate network work to existing CLIs — `twg` (Jira/Atlassian, installed; supports transition discovery), `gh` (GitHub, installed), `glab` (GitLab, when present) — instead of embedding API clients. MDT owns identity (refs), mappings, and state (files as truth); the CLIs own auth and HTTP. Missing/unauthenticated CLI → feature degrades gracefully to URL-only. No credentials in MDT config, tracked or otherwise.

## Possible improvements

Merged from the seed list + Codex brainstorm (2026-10-22, @thread:thr_g5ynmg2ccm). "Now" = establish the contract during MDT-252, not expand its scope.

**Now — portability & diagnosability**

- Offline ref doctor: machine-readable check for malformed refs, missing tracker config, ambiguous/shared mappings — local validity ≠ remote existence; shared refs reported, not auto-rejected *(absorbs the seed's shared-ref guard)*
- Clone-safe tracker configuration + alias migration: a clone resolves the same refs; alias/baseUrl changes preview affected files and never silently reinterpret identities; credentials stay out of tracked config

**Next — agent-driven imports & context**

- Rerun-safe selective import: re-run tracker queries without duplicate tickets or overwriting locally refined work; preview create/update/skip; disappearing from a query ≠ delete *(sharpens the seed's bulk import)*
- Explicit source snapshots with provenance: capture selected remote fields locally with ref/URL/time — remote observations stay distinct from local decisions
- Agent context bundle: one command returns ticket + linked local work + snapshots, attributed and timestamped; imported tracker text is content, never instructions; no hidden network fetches in local reads
- Relationship meaning for refs: few meanings (e.g. "same work" vs "related"), backward-compatible plain refs; sharpens the shared-ref guard — no generic graph prematurely
- Epic external-work coverage report: derived, file-based — which children share refs, which lack them; claims local coverage only
- URL→ref normalization: paste a tracker URL on create → parsed stored ref
- Quick Search / command-palette jump for external keys (per MDT-252 open question 5)
- Mirror-mode prepopulation: seeded numbering writes stored refs once, then gets out of the way
- MCP tools: let agents read/search external trackers (behind explicit user action)

**Later — write paths (largest scope/operational risk)**

- Reviewable outbound change sets: prepare proposed external status/comment changes, inspect, apply explicitly — drafts + one-shot, not a background bridge *(sharpens the seed's two-way sync)*
- Continuous sync/webhooks: adds an always-on runtime — separate opt-in deployment decision
- Remote-link backfill: write the MDT link into the external issue (write scope — security review first)
- Additional adapters (Linear, Asana) strictly on request; per-component tracker routing only with evidence

## Non-goals (standing)

- Making MDT keys *be* external keys — identity mirroring stays an opt-in convenience, never an invariant
- Multi-code namespaces within one project (MDT-143 stays deferred)