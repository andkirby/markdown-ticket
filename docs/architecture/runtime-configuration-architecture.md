# Runtime Configuration Architecture

Source of truth for deployment/runtime configuration in MDT.

## Purpose

Runtime configuration is process/deployment state. It must be parsed once at server startup, validated into a typed object, and injected into modules that need it.

Feature modules must not read `process.env` directly. Direct env access makes behavior different between Vite, backend routes, tests, and production deployment.

## Ownership

| Concern | Owner | Storage |
|---------|-------|---------|
| Runtime env parsing | `server/config/runtimeConfig.ts` | environment variables and `.env.local` in dev |
| Project registry | existing project config services | `CONFIG_DIR/projects/*.toml` |
| Project-local behavior | existing project config services | project `.mdt-config.toml` |
| Sharing policy and tokens | sharing/auth services | `CONFIG_DIR/auth/*.json` |

Do not store deployment hostnames, public link origins, CORS origins, or secrets in project-local `.mdt-config.toml`.

## Runtime Config Contract

The backend exposes one typed `RuntimeConfig` object during startup.

Required shape:

```ts
type RuntimeConfig = {
  configDir: string;
  nodeEnv?: string;
  auth: ApiAuthConfig;
  origins: {
    allowedOrigins: string[];
    publicOrigin?: string;
  };
  readSessions: {
    secret?: string;
    allowLocalFallback: boolean;
  };
  ownerSessions: {
    maxAgeSeconds: number;
  };
  system: {
    devtoolsEnabled: boolean;
    isProduction: boolean;
    isTest: boolean;
    maintenanceEndpointsEnabled: boolean;
  };
  readTokens: {
    staticScopes: ReadTokenScope[];
  };
};
```

Rules:

- `server/server.ts` loads dotenv for local development, builds `RuntimeConfig`, and stores it on `app.locals.runtimeConfig`.
- Route factories and middleware receive config through explicit parameters or `app.locals`; they do not call `process.env`.
- Missing `app.locals.runtimeConfig` is a server setup error; request-time config fallback creation is not allowed.
- Policy helpers accept plain values and stay pure.
- Tests build config from explicit env maps so each test controls its own runtime assumptions.

## Origin Variables

Use one deployment origin variable.

| Variable | Purpose | Notes |
|----------|---------|-------|
| `PUBLIC_ORIGIN` | Canonical browser/API and generated link origin | Full `http(s)` origin. Added to backend allowed origins and used for share/invite link bases. |

Public link origin selection:

1. Use `PUBLIC_ORIGIN` when configured.
2. Otherwise use the current browser origin from `Origin` or `Referer` only when it is allowed by the origin policy.
3. Report when no safe origin can be selected.

## Session Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `OWNER_SESSION_MAX_AGE_DAYS` | Browser owner-session cookie lifetime | Positive integer days. Defaults to 14. Parsed into `RuntimeConfig.ownerSessions.maxAgeSeconds`. |

## Sharing Interaction

This document does not replace the access model in [Authentication and Sharing Architecture](./auth-and-sharing-architecture.md). It defines where runtime settings come from.

Sharing services consume `RuntimeConfig.origins.publicOrigin` to generate links. They do not parse env variables.

Read-token and invite services consume config through their route/service boundary. The read-token API returns server-owned `PublicLinkOriginOptions` (`options`, optional `selectedOrigin`, optional `notice`) and the UI uses that contract directly.

## Implementation Rules

- Direct `process.env` access belongs in `server/config/`, `server/server.ts`, development utilities, and tests.
- Runtime-dependent routes read `RuntimeConfig` from `app.locals.runtimeConfig`.
- Public link generation uses `RuntimeConfig.origins.publicOrigin` or the server-approved current request origin.
- Tests configure runtime assumptions through explicit env maps or app-local runtime config before request handling.
