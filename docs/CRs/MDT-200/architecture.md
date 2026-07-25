# Architecture Reconciliation: MDT-200

This is the conformance map from approved requirements/scenarios to exact
implementation modules. It is **not** a new architecture — the permanent
contract lives in [`docs/architecture/cloud-sync/`](../../architecture/cloud-sync/)
and was approved by MDT-199. Reopen a decision only if live code or current
Cloudflare behavior proves it unsafe; record evidence and stop for User Review.

Spec Trace obligation IDs (`OBL-*`) are the canonical links; see
[`architecture.trace.md`](architecture.trace.md) for the rendered projection.

## Requirement → Module Conformance

| Area | Requirements | Obligation | Modules (cloud/) | Modules (shared/contracts) |
| --- | --- | --- | --- | --- |
| Package boundary | C1 | OBL-package-boundary | `worker.ts`, `http/router.ts`, `wrangler.jsonc` | `domain-contracts/src/cloud-sync/index.ts` |
| Allocation | BR-1.1–1.3, C2, C3 | OBL-allocation | `application/reservation.ts`, `d1/statements.ts`, `migrations/0001_init.sql` | `shared/services/cloud-sync/CloudSyncCoordinator.ts` |
| Recovery | BR-1.4, Edge-2 | OBL-local-orchestration | `application/reservation.ts`, `d1/projection.ts` | `create-orchestrator.ts`, `operation-journal.ts`, `recovery.ts` |
| No fallback | BR-1.5, BR-1.6, BR-1.7 | OBL-local-orchestration | — | `shared/services/TicketService.ts`, `allocator-strategy.ts` |
| Identity | BR-2.1, BR-2.2, Edge-5, C5 | OBL-identity | `access/jwt.ts`, `http/router.ts` | `credential-providers.ts`, domain principal/credential contracts |
| Membership | BR-2.3–2.5, Edge-4 | OBL-membership | `application/authorization.ts`, `application/membership.ts`, `d1/membership.ts` | membership contracts |
| Projection | BR-3.1–3.4 | OBL-projection | `application/projection-usecase.ts`, `d1/projection.ts` | `projection-sync.ts`, `CloudProjectionClient.ts`, server `TicketService.ts`, frontend projection hooks/components |
| Operations | BR-4.1, BR-4.2, C7, Edge-3 | OBL-operations | `d1/audit.ts`, `scheduled/maintenance.ts`, `rate-limit/guard.ts`, `worker.ts` completion events | local journals and `CLOUD_COORDINATION_GUIDE.md` |
| Config | C4, C6, Edge-6 | OBL-local-orchestration | — | `config.ts`, project/global config schemas and inspection registry |

## Static D1 Allocation Batch (must match MDT-198 POC)

`POST /v1/projects/{projectId}/reservations` executes one D1 batch per
`data-and-consistency.md` § Allocation Transaction:

```text
batch([
  1. INSERT reservation with projects.next_ticket_number
       only when no row exists for project + idempotency-key hash;
  2. INSERT OR IGNORE idempotency result by selecting the row with this
       request's reservation_id;
  3. UPDATE cloud_projects.next_ticket_number by one only when its current
       value equals this request's selected ticket number;
  4. INSERT allocation or replay audit event by comparing the selected
       reservation_id with this request's reservation_id;
  5. SELECT the row for project + idempotency-key hash.
])
```

Unique constraints are the final guard. A replay returns the existing
reservation without advancing the counter (BR-1.2). Reusing one key with a
different request hash returns `409 idempotency_key_reused` (Edge-1). The
implementation must not branch on intermediate results; the
`reservation_id` is request-scoped to keep the statement list static.

## Identity Flow (identity-and-access.md § Assertion Validation)

For every request reaching the Worker:

1. Read `Cf-Access-Jwt-Assertion`; never trust caller-supplied identity headers.
2. Parse bounded JWT; allow only `RS256`.
3. Select JWK by `kid` from the team-domain JWKS (cached ≤ 5 min).
4. Verify signature, exact issuer, accepted audience, `exp`, `nbf` if present,
   sane `iat`.
5. On unknown `kid`, refresh JWKS once and retry (Edge-5).
6. Derive one principal: human (normalized email) or machine (`common_name`).
7. Reject ambiguous/missing/malformed/expired/unverifiable claims.

Two audiences: coordination (`/v1/projects/*`) and operator (`/v1/admin/*`).
Vars `COORDINATION_AUD`/`OPERATOR_AUD` are already in `cloud/wrangler.jsonc`.

## Deployment Reality

- Worker `mdt-cloud-sync-production` and migration `0001_init.sql` are deployed.
- Routes `mdt-sync.constantapp.org` (coordination) and
  `mdt-sync-admin.constantapp.org` (operator) are Access-protected.
- D1 `02996cfe…` contains the coordination schema.
- Rate-limit namespaces `2026072401` (read), `2026072402` (mutate) bound.
- No staging environment (production-only deploy per user decision).
- The last recorded deployed version predates this reconciliation. Current
  source must pass the release checks and be redeployed before live acceptance
  evidence is refreshed.

## Slice → Module readiness

| Slice | Exit gate | Key modules to land |
| --- | --- | --- |
| 1 | Real human + service-token assertions on live Worker | `http/router.ts`, `access/jwt.ts`, `d1/audit.ts`, `0001` migration, `/healthz` |
| 2 | Deployed concurrency/replay/isolation/recovery pass | `application/reservation.ts`, `d1/*`, `application/membership.ts`, `scheduled/maintenance.ts` |
| 3 | Local-only green; cloud create no fallback | `shared/services/cloud-sync/*`, strategy seam in `TicketService`, config schema |
| 4 | Two clients observe changes in poll interval | `application/projection-usecase.ts`, `CloudProjectionClient.ts`, server poll adapter, board stub/poller in `src/` |
| 5 | Operations release gate recorded | disable/export/restore drills, doc reconciliation |
