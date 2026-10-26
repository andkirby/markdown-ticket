# Requirements: MDT-200

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`requirements.trace.md`](requirements.trace.md). This document is the concise
human contract grouped by area. IDs are stable.

## Allocation and Recovery (BR-1.*)

- **BR-1.1** — Concurrent creates through CLI, MCP, and HTTP for one cloud project return unique numbers; a cloud-bound create never writes or acknowledges a second local ticket with an occupied key, including a different slug. Raw filesystem writes are detected as conflicts when observed, not claimed to be impossible.
- **BR-1.2** — Concurrent requests sharing one idempotency key return one
  stable reservation; the counter advances once.
- **BR-1.3** — Different cloud projects allocate independently.
- **BR-1.4** — A failed local Markdown write retries its original reservation and immutable creation identity without number reuse; only a verified replay of the same creation may reuse an existing file. A conflicting held reservation remains explicit recoverable work, never a silent replacement allocation.
- **BR-1.5** — A cloud-bound create fails recoverably when coordination is
  unavailable; **no local fallback number, temporary key, range, or lease**.
- **BR-1.6** — Existing Markdown tickets stay readable/editable during an
  outage; new cloud-bound creation stays blocked.
- **BR-1.7** — Local-only projects with no CONFIG_DIR cloud connection preserve existing allocation, creation, and board behavior and make no cloud call. Enabled connections coordinate; disabled, malformed, or untrusted connections never resume local numbering (MDT-201 cutover).

## Identity and Isolation (BR-2.*)

- **BR-2.1** — Real Access validates human attribution from a verified email.
- **BR-2.2** — Real Access validates service-token machine attribution from a
  verified `common_name`.
- **BR-2.3** — Viewer/contributor/owner roles enforced per project.
- **BR-2.4** — Unknown/hidden projects return the same non-disclosing response.
- **BR-2.5** — Revoked membership blocks the next operation; no authz cache.

## Projection and Board (BR-3.*)

- **BR-3.1** — Acknowledged tickets expose only the approved header projection,
  never a body.
- **BR-3.2** — Stale projection writes rejected via expected-version semantics.
- **BR-3.3** — Another authorized client sees projected changes within the
  configured polling interval.
- **BR-3.4** — Board distinguishes cloud-projected state from canonical local
  state; implies no ownership/presence.

## Operations (BR-4.*)

- **BR-4.1** — Allocation/projection/membership/denial/recovery produce
  structured redacted audit records.
- **BR-4.2** — Disabling cloud binding leaves all durable ticket content usable
  from Markdown/Git.

## Edge Cases (Edge-*)

- **Edge-1** — Idempotency-key reuse with a different request hash →
  `409 idempotency_key_reused`, no new number.
- **Edge-2** — Lost acknowledgement → recoverable replay; if abandoned,
  `orphaned`; number never reused.
- **Edge-3** — Scheduled handler expires `reserved` > 24h to `abandoned` in
  bounded batches; counter never decremented, reservation never deleted.
- **Edge-4** — Final owner cannot be removed/demoted; no self-elevation.
- **Edge-5** — Unknown `kid` → refresh JWKS once and retry (key rotation).
- **Edge-6** — Headless adapters refuse service-token headers off-allowlist and
  reject redirects.

## Constraints (C*) — invariants, not BDD targets

- **C1** — Package boundary: `cloud/` owns Worker runtime under
  `cloud/src/cloudflare/`; app packages reach it only via `@mdt/domain-contracts`
  + JSON/HTTPS; main app never imports `@mdt/cloud`.
- **C2** — Authority split: D1 owns project/membership/counter/reservations/
  idempotency/projection-versions/audit; Markdown/Git owns body + headers;
  D1 never writes back to Markdown.
- **C3** — Numbers never reused; counter monotonic.
- **C4** — Cloud binding opt-in per project, after provisioning + membership
  probe.
- **C5** — No credentials in `.mdt-config.toml` or registry.
- **C6** — The effective trusted-origin set combines distribution-provided
  origins with global `fileOnly` `cloudSync.allowedOrigins`; its empty default
  denies custom origins but does not require per-device project activation for
  a shipped service.
- **C7** — Rate limiting is abuse-only, never a correctness mechanism.
- **C8** — First slice excludes presence, offline allocation, body sync,
  WebSockets, Durable Objects.

## Source

Derived from `docs/CRs/MDT-200-cloud-sync-first-slice.md` §4 (Acceptance
Criteria) and the four `docs/architecture/cloud-sync/` owner documents.

## UAT 2026-10-24 — collision stabilization

Source implementation and local review are complete as of2026-10-26;
[verification.md](verification.md) owns execution evidence and open live gates.
The statements below remain the approved requirements, not production claims.

Refined in place: BR-1.1, BR-1.4, BR-1.7 above. Additive requirements below
preserve the existing authority split. MDT-226 supersedes historical projection
polling/DO exclusions; this round does not reopen that delivery architecture.

- **BR-1.8** (behavior; route `bdd`) — A fresh cloud-bound create scans canonical ticket identities across the physical repository and known worktrees, fails closed on scan errors or ambiguity, journals its observed minimum number and creation identity, and obtains a coordinator-assigned number at or above that minimum and the authoritative counter. Replay preserves the original allocation inputs and result.
- **BR-1.9** (behavior; route `bdd`) — A watched or startup-discovered file in a cloud-bound project is classified as verified same creation, conflict, unmanaged, or verification pending. A key already reserved for another creation is a conflict; missing identity or inaccessible evidence is unverified. Detection preserves the file and emits a bounded actionable diagnostic without automatically reserving, acknowledging, publishing, renumbering, or deleting it.
- **BR-1.10** (behavior; route `bdd`) — When multiple local files claim one ticket key, key-based CLI, MCP, and HTTP reads and mutations report ambiguity with authorized relative file paths instead of selecting the first match or changing an unrelated ticket. Files remain available for explicit path-based inspection and operator resolution.
- **BR-4.3** (behavior; route `bdd`) — An authorized operator can dry-run and explicitly reconcile an existing cloud project after a collision: preserve allocation history, audit corrections, raise the counter to at least the maximum of its current value, highest retained reservation plus one, and reviewed canonical high-water plus one, and resolve incorrect creation/projection associations before resuming coordination. Repeating a repair is idempotent and never reuses a number.
- **C9** (constraint; route `tests`) — Ticket number, filename, mutable header equality, event origin, or membership alone does not establish creation identity. New cloud creates persist a non-secret immutable creationId in canonical frontmatter, journal, and the coordinator reservation; its scoped association is verified before cloud publication. Legacy files or journals without evidence remain unverified until explicit audited reconciliation. No secret or active cloud binding is added to repository configuration.
- **C10** (constraint; route `tests`) — Allocation floor and creationId are immutable idempotency inputs verified by the coordinator, not trusted solely through an opaque client requestHash. Reservation insert, counter advance, idempotency result, and allocation audit stay atomic under differing-floor and operator-repair races. A protocol/capability mismatch fails closed; it never silently ignores the floor or creation identity.
- **C11** (constraint; route `tests`) — File watchers are observation adapters, not allocation or import authorities. Shared services own classification and identity policy; server adapters preserve physical file identity internally and expose only authorized relative diagnostic paths. Duplicate events are coalesced; failures do not start unbounded cloud probes or interactive authentication.
- **Edge-7** (edge_case; route `tests`) — A manual file uses an already reserved or acknowledged key, copies another creationId, or duplicates a slugged key: reject a proven mismatched association as conflict, retain unknown associations as verification pending, and never infer ownership from the number or overwrite either creation.
- **Edge-8** (edge_case; route `tests`) — Watcher verification encounters unavailable coordination, missing credentials, partial files, permission errors, or repeated events: preserve bytes, retain a deduplicated actionable pending diagnostic, and retry only through a bounded or explicit recovery path without cloud writes.
- **Edge-9** (edge_case; route `tests`) — Git, another process, or a known worktree changes occupied keys during creation or an operator raises the counter after allocation pre-read: recheck identity at write and acknowledgement boundaries, suppress stale reservation inserts transactionally, and surface detected conflicts without silently renumbering. Unseen writes in disconnected clones cannot be guaranteed absent.

The current implementation does not satisfy these additions. Full automatic
manual-file adoption, a general legacy-import CLI, and commit-hook enforcement
remain follow-up capability work; this round provides safe detection, durable
identity for new creates, and explicit incident reconciliation.

## Review follow-up 2026-10-25 — existing contract gaps

The corrected independent challenge and parent reproductions are technical
review evidence within the October24 round, not another user acceptance run.
No requirement ID, kind, route or approved meaning changes in this follow-up.

| Finding | Existing authority | Required closure |
| --- | --- | --- |
| F2 explicit recovery gap; F3 uncertain lock-owner handling | BR-1.4, C5, C9, C10, Edge-2, Edge-8 | Shipped explicit inspection/resume/reviewed resolution with original evidence retained |
| F4 lowercase project code fails verification | BR-1.1, BR-1.4, BR-1.7, BR-1.8, C9 | Consistent canonical identity before writing and strict cloud verification |
| F1 safe inventory failure lacks remediation | BR-1.8, BR-1.9, C11, Edge-8 | Actionable relative-path/cause diagnostics while keeping creation fail-closed |
| F5 bounded observation loses previous proof between passes | BR-1.9, C9, C11, Edge-8 | Stable last verified evidence, explicit freshness and safe invalidation |

F6 authorization-bypass claim was retracted. The zombie-lock subcase is
unproven; PID reuse remains a confirmed limitation. Neither becomes a new
requirement. Full import CLI, automatic startup recovery writes, automatic
renumbering, journal deletion and age-only lock theft are not introduced.
