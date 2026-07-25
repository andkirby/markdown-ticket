# Deployed Access Evidence — MDT-200 Slice 1

Manual evidence for `TEST-deployed-access-human` and
`TEST-deployed-access-machine` (BR-2.1, BR-2.2). Recorded against the live
production Worker `mdt-cloud-sync-production`.

## Deployed version

| Field | Value |
| --- | --- |
| Worker | `mdt-cloud-sync-production` |
| Version ID | `7cd6d19c-62a0-4ca5-ba14-166be8d9af23` |
| Deployed at | 2026-07-24T20:32:16Z |
| Routes | `mdt-sync.constantapp.org`, `mdt-sync-admin.constantapp.org` |
| Cron | `*/15 * * * *` (UTC) |

## Verified automatically

- **Unit tests (local, bun test):** 9 JWT-validation cases pass against real
  RSA-signed fabricated tokens — human/machine principal derivation, wrong
  audience/issuer/expiry/alg rejection, signature failure, ambiguous-principal
  rejection, and unknown-kid JWKS refresh-once (Edge-5).
- **Worker logic (local wrangler dev, bypassing Access):**
  - `GET /healthz` → `200` `{"requestId":...,"data":{"status":"ok","version":"v1"}}`
  - Protected route without `Cf-Access-Jwt-Assertion` → `401` typed envelope
    `{"error":"authentication_required",...}`
  - Unknown route → `400 invalid_request` non-disclosing envelope
- **Real Access JWKS reachable:** `GET https://kirbyapp.cloudflareaccess.com/cdn-cgi/access/certs`
  → `200`, 2 keys present. This is the endpoint the validator fetches at runtime.
- **Access protects the origin:** unauthenticated `GET https://mdt-sync.constantapp.org/healthz`
  → `302` Access login redirect (edge policy gates the whole hostname).

## Operator-side checks

- [x] **Human attribution (BR-2.1):** IdP login at `mdt-sync.constantapp.org`
  via `cloudflared access login`, token carried `email: andkirby@gmail.com`,
  `aud: 99333d6a…` (coordination). Worker validated the assertion against the
  real JWKS and extracted `principal = {kind: human, id: andkirby@gmail.com}`.
  Protected route returned `400 invalid_request` (no Slice-2 route), proving
  the token passed validation — not `401`. **TEST-deployed-access-human closed.**
- [ ] **Machine attribution (BR-2.2):** needs a real Access service token and
  machine membership against the reconciled deployment candidate.
- [ ] **Current-release audit record:** after deploying the reconciled source,
  record the human or machine principal and protected action from D1 without
  copying credentials or token claims into this file.

### Bugs found and fixed during live validation

1. **Audience as array:** real Access JWTs ship `aud` as `["…"]`, not a string.
   Fixed in `access/jwt.ts` (array-aware check) + regression test.
2. **Illegal invocation:** validator stored the bare `fetch` global detached
   from `globalThis`, throwing in the Workers runtime. Fixed with
   `globalThis.fetch.bind(globalThis)`. Unit tests missed this because bun's
   `fetch` does not enforce `this` binding — a Workers-runtime integration test
   is owed in Slice 2.

## Finding for User Review: `/healthz` behind Access

The architecture implies `/healthz` is an unauthenticated liveness probe, but
the Access application policy gates the entire hostname `mdt-sync.constantapp.org`,
so `/healthz` returns `302` (login redirect) to unauthenticated callers. Options:

1. Add an Access policy bypass for the exact path `/healthz` (Access config
   change, no Worker change) — keeps liveness probes public.
2. Treat `/healthz` as member-gated like everything else; health checks come
   through Access with a service token.

Either is valid; this is an Access-policy decision, not a Worker defect. Slice 1
ships option 2 by default (no bypass configured).

## Notes

- D1 migration `0001_init.sql` **is applied** to production `02996cfe…` (all six
  tables + five indexes, verified 2026-07-24T21:38Z). See `migration.md`.
- No staging environment; production-only deploy per user decision.
