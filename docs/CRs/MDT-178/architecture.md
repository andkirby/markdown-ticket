# Architecture: MDT-178

## Overview

Runtime configuration becomes a startup-owned server boundary. `server/config/runtimeConfig.ts` parses env into a typed `RuntimeConfig`, `server/server.ts` stores it on `app.locals.runtimeConfig`, and route/middleware code consumes that object instead of reading `process.env` during request handling.

## Pattern

**Pattern**: App-local runtime configuration with pure policy helpers.

The backend keeps deployment state at startup and passes plain values into policies. Routes can read `RuntimeConfig` from Express app locals, but feature modules must not parse env directly.

## Runtime Config Boundary

`RuntimeConfig` contains:

- `configDir`
- `auth`
- `origins.allowedOrigins`
- `origins.publicOrigin`
- `readSessions.secret`
- `nodeEnv`
- local/test fallback flags needed by existing read-session compatibility

`buildRuntimeConfig(env)` is the only normal runtime parser. Tests may pass explicit env maps to the parser. `getRuntimeConfig(req)` only reads `app.locals.runtimeConfig`; missing app-local config is a setup error, not a request-time fallback path.

## Public Link Origin Flow

1. Startup parses `PUBLIC_ORIGIN`.
2. `PUBLIC_ORIGIN` is used for generated share/invite link bases and browser deployment origin checks.
3. If absent, generated links do not derive configured origins from other env vars.
4. Current browser origin remains a fallback only when no public origins are configured and the origin derived from `Origin` or `Referer` is allowed by the origin policy.
5. `server/security/publicLinkOrigins.ts` resolves the shared `PublicLinkOriginOptions` response shape: `{ options, selectedOrigin?, notice? }`.
6. Invite creation accepts only origins present in the runtime public-link options.

## Route Wiring

- `createApiAuthMiddleware(runtimeConfig.auth, originPolicy, runtimeConfig)` enforces owner/read-only access.
- `createAuthRouter()` reads runtime config from `req.app.locals` per request.
- `createReadTokensRouter()` reads runtime public-link options from `req.app.locals`.
- `createShareRouter()` reads the configured read-session secret from `req.app.locals`.
- `createPublicReadTokensRouter()` uses the same read-session secret and config directory boundary.

## Module Boundaries

- `server/config/runtimeConfig.ts`: owns env parsing, defaults, and strict `getRuntimeConfig(req)` app-local access.
- `server/security/originPolicy.ts`: owns pure allowed-origin and CORS/request-origin policy; no direct env reads.
- `server/security/publicLinkOrigins.ts`: owns generated-link origin option selection and returns the shared API response contract.
- `shared/models/PublicLinkOrigin.ts`: owns the frontend/backend `PublicLinkOriginOptions` response type.
- `server/security/apiAuth.ts`: owns auth behavior and request access decisions; no direct env reads outside parser compatibility.
- `server/routes/*`: own HTTP request/response behavior and consume config from app locals.
- UI components do not parse deployment env; they consume API-provided origin options.

## Invariants

- Direct backend `process.env` reads stay in `server/config`, startup, dev utilities, and tests.
- `PUBLIC_ORIGIN` is the only deployment origin variable for app origin behavior.
- Public link origins are not stored in `.mdt-config.toml`.
- Generated link bases must not accept arbitrary request body origins.
- Tests that need runtime settings construct app-local config before exercising routes.
- The owner UI renders server-provided public link origin options directly; it does not merge in browser origin or synthesize fallback notices.

## Test Strategy

- `server/tests/config/runtimeConfig.test.ts` verifies env parsing, defaults, and read-session secret fallback.
- `server/tests/config/runtimeConfig.test.ts` also enforces the env-boundary scan: direct `process.env` reads outside `server/config`, startup, tests, docs, dist, and development tooling are failures.
- `server/tests/security/originPolicy.test.ts` verifies pure allowed-origin policy behavior.
- `server/tests/security/publicLinkOrigins.test.ts` verifies generated-link option selection.
- `server/tests/api/read-token-management.test.ts` verifies invite URL construction for `PUBLIC_ORIGIN` and current-origin fallback.
- `src/components/SettingsModal/ReadAccessTokens.test.tsx` verifies the UI uses the server-selected origin without rendering an owner picker.
- `tests/e2e/sharing/read-access-journey.spec.ts` verifies owners generate invite links using `PUBLIC_ORIGIN`.

## Extension Rule

New backend env variables must be added to `RuntimeConfig` first, covered by parser tests, then injected into the feature module that needs them.

Operator-facing environment documentation lives in `docs/ENVIRONMENT_VARIABLES.md` and should link back to `docs/architecture/runtime-configuration-architecture.md` as the SOT.

---
Use `architecture.trace.md` for canonical artifact and obligation records.
