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
  auth: ApiAuthConfig;
  origins: {
    allowedDomains: string[];
    allowedOrigins: string[];
    publicLinkOrigins: string[];
  };
  readSessions: {
    secret: string | null;
  };
};
```

Rules:

- `server/server.ts` loads dotenv for local development, builds `RuntimeConfig`, and stores it on `app.locals.runtimeConfig`.
- Route factories and middleware receive config through explicit parameters or `app.locals`; they do not call `process.env`.
- Policy helpers accept plain values and stay pure.
- Tests build config from explicit env maps so each test controls its own runtime assumptions.

## Origin Variables

Use separate variables for separate jobs.

| Variable | Purpose | Notes |
|----------|---------|-------|
| `PUBLIC_LINK_ORIGINS` | Origins shown in generated share/invite links | Preferred for sharing UI. Values are full origins, comma-separated. |
| `ALLOWED_ORIGINS` | Browser origins allowed to call the backend | Preferred for CORS/origin checks. Values are full origins, comma-separated. |
| `ALLOWED_DOMAINS` | Backward-compatible host allowlist | Existing deployments may already set this. Treat entries as hostnames unless they include a scheme. |

`ALLOWED_DOMAINS` may remain supported, but it is not the canonical owner for all origin behavior.

Public link origin selection:

1. Use `PUBLIC_LINK_ORIGINS` when configured.
2. Otherwise derive origins from `ALLOWED_DOMAINS`.
3. Always keep the current request/browser origin as a fallback.
4. Never silently collapse configured hostnames to `localhost`.

If several public origins are configured, the sharing UI should let the owner choose one and should default to the first configured origin.

## Sharing Interaction

This document does not replace the access model in [Authentication and Sharing Architecture](./auth-and-sharing-architecture.md). It defines where runtime settings come from.

Sharing services consume `RuntimeConfig.origins.publicLinkOrigins` to generate links. They do not parse env variables.

Read-token and invite services consume config through their route/service boundary. They do not own deployment host selection.

## Migration Rule

When touching backend modules:

- keep direct `process.env` access inside `server/config/` or startup-only code;
- migrate nearby env reads into `RuntimeConfig`;
- add a focused test for each variable moved into the config boundary;
- preserve existing env variable names unless an architecture ticket explicitly deprecates them.

## Done State

The runtime config boundary is complete when:

- `rg "process\\.env" server` shows env reads only in startup/config/test setup code;
- share/invite links honor configured public origins;
- backend and frontend behavior agree for `ALLOWED_DOMAINS`;
- route tests can configure origins without mutating global process env after app creation.
