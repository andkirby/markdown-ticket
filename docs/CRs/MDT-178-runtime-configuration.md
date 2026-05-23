---
code: MDT-178
status: Proposed
dateCreated: 2026-05-23T12:23:33.682Z
type: Architecture
priority: High
---

# Centralize runtime configuration

## Problem

Runtime/deployment configuration is currently read directly by backend modules and UI-adjacent sharing logic. This created a real sharing failure mode: `.env.local` affects Vite allowed hosts, but backend share/invite origin selection can still fall back to `localhost` or miss configured deployment domains.

Canonical guide: [Runtime Configuration Architecture](../architecture/runtime-configuration-architecture.md)

## Desired Outcome

MDT has one server-side runtime configuration boundary. Environment variables are parsed once, validated into a typed runtime config, and injected into routes, middleware, stores, and policy helpers.

Feature modules do not read `process.env` directly. Sharing link generation uses configured public origins from the runtime config and keeps `ALLOWED_DOMAINS` backward-compatible.

## Scope

In scope:
- Add a typed backend runtime config boundary.
- Centralize parsing for auth, config directory, read-session secret, allowed origins, allowed domains, and public link origins.
- Inject runtime config into auth/sharing routes and security helpers.
- Preserve existing env variable compatibility, especially `ALLOWED_DOMAINS`.
- Add tests proving share/invite link origins use runtime config instead of defaulting to localhost.

Out of scope:
- Changing project registry TOML schema.
- Moving sharing state into project-local `.mdt-config.toml`.
- Designing multi-user accounts or RBAC.
- Removing existing env variables without a separate deprecation decision.

## Acceptance Criteria

- [ ] Backend has one typed runtime config module that parses env at startup.
- [ ] Direct backend `process.env` reads are limited to config/startup/test setup boundaries.
- [ ] Sharing and invite link generation honors `PUBLIC_LINK_ORIGINS` when set.
- [ ] Sharing and invite link generation derives from `ALLOWED_DOMAINS` when no public link origin is set.
- [ ] Multiple configured public origins are exposed to the sharing UI for owner selection.
- [ ] Existing deployments using `ALLOWED_DOMAINS=host.example.com` continue to work.
- [ ] Route/unit tests cover configured public origin, allowed-domain fallback, and current-origin fallback.
- [ ] Documentation points operators to the runtime config SOT.

## Verification

- `bun run validate:ts`
- `bun run --cwd server jest tests/security/originPolicy.test.ts tests/api/read-token-management.test.ts --runInBand`
- `bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium`