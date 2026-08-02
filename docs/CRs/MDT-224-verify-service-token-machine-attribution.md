---
code: MDT-224
status: Proposed
dateCreated: 2026-08-02T00:00:00.000Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-200
dependsOn: MDT-200
---

# Verify service-token machine attribution live

## 1. Description

### Requirements Scope

`partial`

### Problem

- `docs/CRs/MDT-200-cloud-sync-first-slice.md` acceptance criterion #9
  ("A real Access-protected environment validates service-token machine
  attribution") was deferred when MDT-200 was marked Implemented. The machine
  principal derivation is unit-tested and deployed, but no live request has
  been made *as* a machine principal and recorded in the audit.
- `cloud/test/operations/live-onboarding.md` added a machine member
  (`machine/smoke-machine-principal`) to a project roster during the live
  onboarding smoke, but never made an authenticated request carrying that
  service token's headers against a protected route. The resulting
  `principal.kind = machine` audit row therefore does not exist in prod D1.

### What Is Already Proven

- JWT validation handles machine principals: `cloud/src/cloudflare/access/jwt.ts`
  derives `principal = {kind: 'machine', id: <common_name>}` from a service
  token's `CF-Access-Client-Id` claim, unit-tested in
  `cloud/test/access.jwt.test.ts`.
- The deployed Worker runs the reconciled source (version
  `68ff9a13-…`, per `live-onboarding.md`).
- A machine principal can be added to a project membership (proven live in
  `live-onboarding.md`).

### What Is Missing

One live request authenticated with a real Cloudflare Access service token,
followed by confirmation that the D1 `audit_events` row records
`principal_kind = machine` and `principal_id = <common_name>`.

### Scope

- In scope:
  - Create (or select) a Cloudflare Access service token for the coordination
    application (`mdt-sync.constantapp.org`).
  - Add the service token's `common_name` as a project member if not already
    present.
  - Make one authenticated request to a protected coordination route (e.g.
    `GET /v1/projects/{uuid}`) carrying the service-token headers
    (`CF-Access-Client-Id`, `CF-Access-Client-Secret`).
  - Record the resulting D1 audit row confirming machine principal
    attribution.
  - Tick `cloud/test/operations/deployed-access.md` machine-attribution
    checkbox and paste the redacted audit evidence.
- Out of scope:
  - Storing the service-token secret in Git — never.
  - Changing the JWT validation logic — it is already correct and tested.

### Affected Artifacts

- `cloud/test/operations/deployed-access.md` — tick the
  `[ ] Machine attribution (BR-2.2)` checkbox and record redacted evidence.
- `docs/CRs/MDT-200-cloud-sync-first-slice.md` — criterion #9 is already
  checked with a cross-ref to this ticket; no further edit needed once the
  drill is recorded.

## 2. Decision

### Chosen Approach

Run one authenticated service-token request against the deployed coordination
Worker and record the redacted audit evidence. No code change.

### Rationale

- The validation logic is proven by unit tests; the only gap is the live
  drill and its recorded evidence.
- This is the same pattern as MDT-222 (operational drills): execute the
  documented procedure and record real output.

## 3. Acceptance Criteria

- [ ] A real Cloudflare Access service token authenticates to a protected
  coordination route against the deployed Worker.
- [ ] The resulting D1 `audit_events` row records `principal_kind = machine`
  and `principal_id = <common_name>`.
- [ ] `cloud/test/operations/deployed-access.md` records the redacted evidence
  (no secret, no full token, no sensitive claim values) and ticks the
  machine-attribution checkbox.

## 4. Verification

- The audit row exists in prod D1 with machine attribution.
- No credential, token, or secret is copied into the recorded evidence.
- The service-token secret remains outside Git.

## 5. Deployment

Operational verification only; no production code deployment.
