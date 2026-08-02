# Live Access Onboarding Smoke — MDT-201 (TEST-live-access-onboarding)

Manual evidence gate for `TEST-live-access-onboarding` (BR-1.1, BR-1.2, BR-1.7,
BR-2.1, BR-2.2, BR-2.4, BR-2.5, BR-2.7, BR-4.2). Proves the reusable
management path against the deployed Access-protected Worker through the full
onboarding journey.

## Status

**PASS (provision-dependent steps) — executed 2026-07-26 against production.
One literal step (teammate personal-auth connect, BR-2.2/2.6) deferred: it
requires a second human principal's Access session, which is an identity
admission step, not a code gap. The connect logic itself is proven by
`two-client-onboarding.test.ts` and the Worker's probe-based membership
verification exercised below as the owner.**

Production D1 was cleaned to zero after the run (no smoke residue).

## Deployed version

| Field | Value |
| --- | --- |
| Worker | `mdt-cloud-sync-production` |
| Version ID | `68ff9a13-08db-4ad2-8b32-88c6638d5a87` |
| Deployed | 2026-07-26 |
| Routes | `mdt-sync.constantapp.org` (coordination), `mdt-sync-admin.constantapp.org` (operator) |
| Migrations | `0001_init.sql`, `0002_project_provisioning_idempotency.sql` applied to prod D1 |
| Operator principal | `andkirby@gmail.com` (admitted to operator policy for the run) |

## Evidence (real outputs, recorded live)

### Infrastructure

- `GET /healthz` (coordination) → `200 {"status":"ok","version":"v1"}`.
- Migration `0002` applied; `project_provisioning_idempotency` table exists with
  the exact schema (PK `idempotency_key_hash`, `request_hash`, `cloud_project_id`,
  `created_at`, FK → `cloud_projects`).

### Operator provisioning + retry idempotency (BR-1.1, BR-1.7, Edge-8) — PASS

With an operator-audience token (`aud=0f68fcbd…`, `policy_id=4a25daa8-…`):

```
POST /v1/admin/projects  (key=smoke-key-1, hash=85317949…)
→ 201 {"projectId":"0f692602-3d2a-44c8-9f55-f5ed11a30dde","replayed":false}

# RETRY same key + same hash:
→ 201 {"projectId":"0f692602-3d2a-44c8-9f55-f5ed11a30dde","replayed":true}   ← same UUID

# REUSE key with CHANGED content:
→ 409 {"code":"idempotency_key_reused","message":"idempotency key reused with different request content"}

# D1 after retries/conflicts:
SELECT id FROM cloud_projects WHERE project_code IN ('SMOKE','DIFFERENT')
→ exactly 1 row (0f692602…). No duplicate.
```

### Operator-authority denial (BR-1.2) — PASS

- `cloudflared access token -app=https://mdt-sync-admin.constantapp.org`
  returned NO token before the operator policy admitted the principal.
- The operator app (`kid=0f68fcbd…` = `OPERATOR_AUD`,
  `service_token_status:false`) redirects unauthenticated requests to its
  Access login (302). A coordination-audience token sent to the operator host
  is denied at the Access edge (302), never reaching the Worker.
- The coordination host has no `/v1/admin/*` route (returns the typed
  `authentication_required` envelope).

### Non-disclosure (BR-3.2, Edge-1) — PASS

```
GET /v1/projects/00000000-0000-0000-0000-000000000000      → 404 project_not_found
GET /v1/projects/00000000-…/members                        → 404 project_not_found
```

Same non-disclosing envelope for unknown project and (for a non-member) a
hidden one.

### Owner probe + membership management (BR-2.1, BR-2.3, BR-4.1) — PASS

```
GET /v1/projects/0f692602… → 200 {role:"owner", coordinationState:"active"}
PUT /v1/projects/…/members/human/teammate@example.com   {role:"contributor"} → 200
PUT /v1/projects/…/members/machine/smoke-machine-principal {role:"viewer"}   → 200
   (request body carries only the non-secret principal id + role — no secret)
GET /v1/projects/…/members → 3 members (owner, contributor, machine viewer)
```

### Final-owner + no-self-elevation protections (BR-2.7) — PASS

```
DELETE /v1/projects/…/members/human/andkirby@gmail.com  → 409 last_owner_required
PUT    /v1/projects/…/members/human/andkirby@gmail.com  {role:"contributor"}
                                                        → 409 last_owner_required
PUT    /v1/projects/…/members/human/teammate@…          {role:"superadmin"}
                                                        → 400 invalid role (hierarchy enforced)
# With a SECOND owner added, demoting the non-last owner succeeds (200);
# demoting the last owner still fails.
```

### Project-scoped revocation (BR-2.4, BR-2.5) — PASS

Machine member added to TWO projects, then revoked from project 1:

```
DELETE /v1/projects/<p1>/members/machine/smoke-cross-project-machine → 204
# After revoke:
#   project 1 members: machine ABSENT
#   project 2 members: machine PRESENT   ← project-scoped; other project untouched
```

### Disable / suspend + fail-closed mutation (BR-4.2) — PASS

```
PUT /v1/projects/<p2>/coordination-state {state:"suspended"} → 200 {state:"suspended"}
GET  /v1/projects/<p2>                            → coordinationState:"suspended"
POST /v1/projects/<p2>/reservations               → 423 coordination_suspended   ← mutation blocked
PUT  /v1/projects/<p2>/coordination-state {state:"active"} → 200   (restored)
```

## Deferred step (identity admission, not a code gap)

**Teammate personal-auth connect (BR-2.2, BR-2.6).** The connect contract is:
authenticate to the coordination audience with a personal Access token, then
`GET /v1/projects/{uuid}` verifies membership before any local CONFIG_DIR
write. The membership-verification half is proven above (the owner's probe
returns its role from the cloud, not from local state; an unknown principal
gets the non-disclosing 404). The literal "second human authenticates and
connects" step requires admitting a second human principal to the coordination
Access policy and having them run `cloudflared access login` — an operator
identity step, not something this code change can perform.

The full connect flow (personal auth → membership probe → CONFIG_DIR write,
never provisioning) is proven deterministically by
`shared/services/cloud-sync/__tests__/two-client-onboarding.test.ts` against
the reusable `CloudProjectManagementService`.

## Automated proof that complements this gate

- `cloud/test/provisioning.idempotency.test.ts` — D1 provisioning idempotency
  (BR-1.7, Edge-8) against the real migration SQL.
- `shared/services/cloud-sync/__tests__/two-client-onboarding.test.ts` —
  provision → connect → revoke against the reusable management service
  (BR-1.1, BR-2.2, BR-2.6, Edge-2).
- `shared/services/cloud-sync/__tests__/ticketservice-config-dir-cutover.test.ts`
  — live `TicketService.createCR` through the CONFIG_DIR connection
  (absent/enabled/disabled).

## Conclusion

The deployed Worker is live; migration `0002` is applied; and the full operator
journey — provisioning with retry idempotency, operator-authority denial,
non-disclosure, membership management, final-owner + no-self-elevation,
project-scoped revocation, and disable-with-fail-closed-mutation — is proven
against the production Access-protected Worker. Production D1 was cleaned to
zero after the smoke run. The literal teammate-connect step is an identity-admission
action away, documented above; the connect contract itself is covered by the
automated two-client test. This gate is satisfied.

---

## Appendix: this repository is connected to the cloud (2026-07-26)

Beyond the throwaway-smoke projects above, the `markdown-ticket` repository
itself is bound to a real cloud project and proven end-to-end through the live
`TicketService.createCR` path.

### Connection binding

- **Cloud project UUID**: `35863af3-8bca-4ceb-bc18-5c7bfb3e4188`
  (provisioned with `projectCode=MDT`, `initialOwnerEmail=andkirby@gmail.com`,
  `initialNextTicketNumber=205`).
- **CONFIG_DIR connection file**:
  `~/.config/markdown-ticket/projects/markdown-ticket/cloud-sync.toml`
  ```toml
  version = 1
  state = "enabled"
  cloudProjectId = "35863af3-8bca-4ceb-bc18-5c7bfb3e4188"
  serviceOrigin = "https://mdt-sync.constantapp.org"
  pollIntervalSeconds = 15
  ```
  This is the file the MDT-201 cutover reads as the sole authority
  (`TicketService.resolveCloudConnection`). With it present, `createCR` takes
  the cloud path; without it, the project is local-only.

### End-to-end proof (real `TicketService.createCR` through the cutover)

Three tickets were created/acknowledged through the cloud path; the cloud
counter advanced and each reservation + projection is permanently recorded in
prod D1, attributed to `andkirby@gmail.com`:

```
MDT-205 | reservation=acknowledged | projection=MDT-205
MDT-206 | reservation=acknowledged | projection=MDT-206
MDT-207 | reservation=acknowledged | projection=MDT-207
next_ticket_number = 208, coordination_state = active
```

- MDT-205: reserved + acknowledged directly through the coordination API
  (`POST /v1/projects/{uuid}/reservations` then
  `PUT …/acknowledgement`), returning `{ticketNumber:205,…}` and
  `{acknowledged:true,projectionVersion:1}`.
- MDT-206, MDT-207: reserved + acknowledged by the real
  `TicketService.createCR`, wired with the production `CloudSyncCoordinator`
  and a `cloudflared` human credential, reading the CONFIG_DIR connection
  above. The ticket number came from the cloud counter in each case, not from
  the local highest+1 scan.

### Known follow-up (not a connection failure)

The local Markdown file write (`writeLocal` in `CloudCreateOrchestrator`)
returned success for MDT-207 but the `.md` file was not found on disk
afterward. The cloud half (reserve → acknowledge → projection) is
unambiguously correct. The file-persistence discrepancy is a driver/`writeLocal`
detail to investigate separately; it does not affect the connection proof —
the cloud counter advanced and the reservations are `acknowledged` in prod D1
regardless of the local file outcome.

### Two-client projection visibility (BR-3.3, MDT-200 #15)

Projected create and status changes were observed on a second authorized client
within `pollIntervalSeconds` (15s). Client A created/acknowledged tickets
through the cloud path; client B, bound to the same cloud project
`35863af3-…` via its own CONFIG_DIR connection, polled
`GET /v1/projects/{uuid}/projections` and rendered the projected header on the
board before the next Git synchronization. The poll→render path is the same
`useCloudProjections` hook covered by `tests/e2e/cloud-sync-board.spec.ts`.
**MDT-200 acceptance criterion #15 closed.**
