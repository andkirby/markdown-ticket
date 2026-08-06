# UAT Refinement Brief

## Objective

Narrow the backend API local-development no-auth carve-out so it applies only to **loopback-host** requests. One running instance reached both locally (loopback `Host`) and through a Cloudflare tunnel (public `Host`) must keep local convenience (no token, no unlock panel) while the tunnel path still requires auth. Closes the accidental-exposure hole where `API_SECURITY_AUTH=false` granted owner-admin to every host, including the tunnel.

This is a refinement of MDT-157's own BR-1.6 ("local development workflow continues to work without configuration changes") — "local" means loopback, not "any host that reached a disabled-auth backend."

## Approved Changes

- The no-auth/`no-auth-dev` owner grant applies only when the request `Host` hostname is loopback (`localhost`, `127.0.0.1`, `::1`), regardless of whether `API_SECURITY_AUTH` is on or off.
- Non-loopback `Host` with auth disabled falls through to read-only/401 — **not** owner. (Closes the pre-UAT defect.)
- `GET /api/auth/session` uses the same loopback decision so the UI does not show a spurious unlock panel locally.
- The request `Host` is the only bypass authority. `X-Forwarded-Host`, `CF-Connecting-IP`, `Origin`, `Referer`, `X-Forwarded-For`, and `socket.remoteAddress` are explicitly NOT authorities (C4 strengthened).
- An existing read-only session takes precedence over the bypass on any host: a loopback request carrying a read-only cookie stays read-only, NOT promoted to owner (C12). `GET /api/auth/session` reports `localExempt` only when no read-only session takes precedence.
- Host parsing is exact-match on the parsed hostname (rejects lookalikes like `localhost.evil`, `127.0.0.1.evil`), with bracketed IPv6 (`[::1]:3001` → `::1`) and port normalization; missing/malformed → fail closed (Edge-5).
- Vite `/api` proxy: `changeOrigin: true → false` on `/api`, `/api/events`, `/api-docs` so the backend sees the real browser `Host` (aligns dev with `nginx.conf` `Host $host`).
- Backend binds loopback by default (`API_BIND_ADDRESS=127.0.0.1`); Docker compose sets `0.0.0.0` (needed for nginx) and defaults `API_LOCAL_HOST_BYPASS=false`.
- New env: `API_BIND_ADDRESS`, `API_LOCAL_HOSTS` (CSV, default `localhost,127.0.0.1,::1`), `API_LOCAL_HOST_BYPASS` (default on native, off Docker).

## Changed Requirement IDs

- `BR-1.6` — **refine_in_place** (narrowed: no-auth local compat is loopback-host only).
- `C4` — **refine_in_place** (strengthened: `X-Forwarded-Host`/`CF-Connecting-IP` not bypass authorities).
- `BR-1.8` — **additive** (disabled-auth on non-loopback host is NOT owner).
- `C11` — **additive** (loopback bind default; Docker opt-in; `API_LOCAL_HOST_BYPASS`).
- `C12` — **additive** (read-only session precedence over the loopback bypass; no silent escalation).
- `Edge-5` — **additive** (forged `Host: localhost` over non-loopback connection is contained by the bind boundary; Host lookalikes rejected; IPv6/ports normalized).

## Affected Downstream Trace

- **BDD**: added scenario `backend_loopback_host_local_bypass` (covers BR-1.6 narrowed + BR-1.8) and `loopback_bypass_does_not_escalate_readonly_session` (covers BR-1.6 + C12).
- **Architecture**: added `OBL-backend-loopback-host-bypass`; updated the auth-gate mermaid flow; added the loopback-host truth table; new artifacts `ART-server-auth-router`, `ART-server-runtime-config`.
- **Tests**: added `TEST-backend-loopback-host-bypass` (integration); extended `TEST-backend-api-auth-contract`/`TEST-backend-api-auth-unit` coverage notes for loopback cases.
- **Tasks**: added `TASK-6` as the current remaining execution slice.

## Execution Slices

### Slice 1: Loopback-host owner bypass + bind boundary (TASK-6)

**Objective**: implement the narrowed no-auth carve-out, the shared loopback helper, the session-endpoint consistency, and the bind boundary.

**Direct artifacts/files**:

- `server/security/apiAuth.ts` — `isLocalHostRequest(req, localHosts)`; `localHosts`/`localHostBypassEnabled` in `parseApiAuthConfig`; loopback branch after exempt-route check; narrowed `!config.enabled` owner grant.
- `server/routes/auth.ts` — reuse `isLocalHostRequest` in `GET /api/auth/session`.
- `server/config/runtimeConfig.ts` — carry `localHosts` + `localHostBypassEnabled`.
- `server/server.ts` — `API_BIND_ADDRESS` (default `127.0.0.1`), `app.listen(PORT, HOST, …)`.
- `vite.config.ts` — `changeOrigin: false` on three proxy blocks; `server.host`/`preview.host` default `127.0.0.1`.
- `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml` — `API_BIND_ADDRESS=0.0.0.0`, `API_LOCAL_HOST_BYPASS=false`.
- `.env.example`, `docs/AUTH_SESSION_GUIDE.md`, `docs/ENVIRONMENT_VARIABLES.md` — document new env + bind default.
- `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` — loopback accept/reject matrix + integration truth-table cases.

**Direct GREEN targets**:

- `TEST-backend-loopback-host-bypass`
- `backend_loopback_host_local_bypass`

**Impacted canonical task IDs**:

- `TASK-6` (this slice). No prior task is reopened; TASK-1's existing local-no-auth cases are narrowed, not invalidated.

**Why this slice exists**:

- Closes the accidental-exposure defect where one tunneled instance with `API_SECURITY_AUTH=false` granted owner to the whole internet. Keeps the operator's local convenience (no token) while restoring auth on the tunnel path.

## Review-Round Corrections (post-implementation)

Two review rounds corrected defects in the initial implementation; these are reflected in the canonical trace and CR §4 acceptance:

1. **Effective `authEnabled` for the UI (P1).** `GET /api/auth/session` now reports `authEnabled = config.enabled || !localExempt`. A non-exempt caller on a disabled-auth backend (tunnel `Host`) sees `authEnabled:true` → locked UI, not `no-auth-dev`. Previously it reported the raw config flag, so the UI entered `no-auth-dev` and then failed on writes.
2. **Shared helper for gate/session parity (P2).** Extracted `isLoopbackBypassEligible(req, config, readSession)` — used identically by the `/api` gate and the session endpoint. The two had diverged on read-session scoping (gate keyed on `authenticated`; session on `authenticated && non-empty scopes`), so an authenticated-but-empty/revoked-scope read session could make the UI show `no-auth-dev` while the gate denied owner. Now keyed on `readSession.authenticated` alone in both places (C12 tightened).
3. **`NODE_ENV`-undefined default (P3).** `API_LOCAL_HOST_BYPASS` defaulted off for undefined `NODE_ENV`, but the documented `bunx tsx server.ts` dev path sets none → ordinary local dev lost no-token owner. Fixed: default ON for unset/`development`/`local`; OFF for `production`/`test`/Docker.
4. **`vite --host` override (P2).** Root `dev` script dropped bare `--host` (it forced `0.0.0.0`, defeating the loopback listen default). Added `dev:lan` (`VITE_SERVER_HOST=0.0.0.0`) escape hatch.

Test coverage added: empty-scope read-session blocks `localExempt`; tunnel+disabled reports effective `authEnabled:true`. Gates: 70 assertions pass (`--forceExit`); the suite has a pre-existing open-handle teardown leak that causes intermittent socket exhaustion under `--runInBand` without `--forceExit` — not introduced by this change.

## Validation

```bash
bun run validate:ts
bun run --cwd server jest tests/security/apiAuth.test.ts tests/api/api-auth.test.ts tests/api/reverse-proxy-compat.test.ts tests/api/auth-stress-matrix.test.ts
bun run lint
spec-trace validate MDT-157 --stage all
```

Manual:

1. `API_SECURITY_AUTH=true API_AUTH_TOKEN=x bun run dev:full`
2. `http://localhost:3075` loads owner-capable UI with no unlock panel.
3. Same instance via tunnel hostname → requires token / shows unlock.
4. `curl -H "Host: evil.example" http://localhost:3075/api/config` → 401.

## Watchlist

- `changeOrigin: false` must not break SSE (`/api/events`) or reverse-proxy-compat/stress-matrix suites — these are the regression risk for the proxy flip.
- Do not trust `X-Forwarded-Host`/`CF-Connecting-IP` — they are spoofable and would re-open the hole.
- Do not let the loopback bypass escalate an existing read-only session to owner (C12) — that would silently defeat read tokens locally.
- Reject Host lookalikes (`localhost.evil`) and normalize bracketed IPv6/ports, or the bypass becomes a substring/parsing-confusion oracle (Edge-5).
- Docker path keeps `API_BIND_ADDRESS=0.0.0.0` (nginx needs it) — the bypass is gated off there via `API_LOCAL_HOST_BYPASS=false`.
- MDT-176 C6 ("preserve MDT-157 behavior") stays intact: this corrects MDT-157 to match its own requirement text; MDT-176's session UX consumes the corrected decision.
- Residual risk (documented, not silently safe): operator sets `0.0.0.0` bind AND bypass on a hostile LAN → LAN can forge `Host: localhost`. Operator decision.

## Open Decisions

- None unresolved. Requirement identity (refine_in_place vs additive) is decided and synced. New-CR alternative was rejected because BR-1.6 already promised local-without-auth; this is that requirement implemented correctly.
