---
code: MDT-178
status: Implemented
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

Feature modules do not read `process.env` directly. Sharing link generation uses the configured `PUBLIC_ORIGIN` from runtime config.

## Scope

In scope:
- Add a typed backend runtime config boundary.
- Centralize parsing for auth, config directory, read-session secret, allowed origins, and the public origin.
- Inject runtime config into auth/sharing routes and security helpers.
- Add tests proving share/invite link origins use runtime config instead of defaulting to localhost.

Out of scope:
- Changing project registry TOML schema.
- Moving sharing state into project-local `.mdt-config.toml`.
- Designing multi-user accounts or RBAC.
- Adding compatibility branches for removed origin variables.

## Acceptance Criteria

- [x] Backend has one typed runtime config module that parses env at startup.
- [x] Direct backend `process.env` reads are limited to config/startup/test setup boundaries.
- [x] Sharing and invite link generation honors `PUBLIC_ORIGIN` when set.
- [x] Removed origin variables are not part of runtime behavior.
- [x] Route/unit tests cover configured public origin and current-origin fallback.
- [x] Documentation points operators to the runtime config SOT.

## Verification

- `bun run validate:ts`
- `bun run --cwd server jest tests/security/originPolicy.test.ts tests/api/read-token-management.test.ts --runInBand`
- `bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium`
