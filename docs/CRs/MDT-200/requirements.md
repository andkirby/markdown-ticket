# Requirements: MDT-200

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`requirements.trace.md`](requirements.trace.md). This document is the concise
human contract grouped by area. IDs are stable.

## Allocation and Recovery (BR-1.*)

- **BR-1.1** — Concurrent creates for one cloud project return unique numbers,
  no duplicate rows.
- **BR-1.2** — Concurrent requests sharing one idempotency key return one
  stable reservation; the counter advances once.
- **BR-1.3** — Different cloud projects allocate independently.
- **BR-1.4** — A failed local Markdown write retries the same reservation and
  acknowledges it without number reuse.
- **BR-1.5** — A cloud-bound create fails recoverably when coordination is
  unavailable; **no local fallback number, temporary key, range, or lease**.
- **BR-1.6** — Existing Markdown tickets stay readable/editable during an
  outage; new cloud-bound creation stays blocked.
- **BR-1.7** — Local-only projects behave exactly as before (compatibility).

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
