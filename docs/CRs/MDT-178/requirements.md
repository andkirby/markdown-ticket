# Requirements: MDT-178

**Source**: [MDT-178](../MDT-178-runtime-configuration.md)
**Generated**: 2026-05-23

## Overview

MDT needs a single server-side runtime configuration boundary so deployment values are parsed once and injected into routes, middleware, stores, and policy helpers. Sharing links and browser deployment origin checks must use the single configured `PUBLIC_ORIGIN`.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | `architecture.md` module boundaries, `tasks.md` scope checks, env-boundary test |
| C2 | `originPolicy` tests and invite/share route tests |
| C3 | runtime config architecture notes and implementation exclusions |
| C4 | API test-app factory and route tests |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| Runtime config owner | `server/config/runtimeConfig.ts` parses env and returns `RuntimeConfig` | Each route/helper parses only the env vars it needs | Keeps startup behavior deterministic and testable |
| Public origin | `PUBLIC_ORIGIN` is the only configured deployment origin | Split generated-link and browser API origins across separate env vars | Matches the actual deployment model |
| Local fallback | Current allowed local/browser origin is fallback when `PUBLIC_ORIGIN` is absent | Invent configured origins from hostnames | Keeps unconfigured deployments explicit |
| Test configuration | Tests create app-local runtime config after env setup | Routes read `process.env` during each request | Prevents request order from changing config semantics |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| `PUBLIC_ORIGIN` | Full origin used for generated share/invite links and browser API origin checks | none | Use current allowed local/browser request origin fallback |
| `API_SECURITY_AUTH` / `API_AUTH_TOKEN` | Owner API auth configuration | local/test no-auth compatibility | Production emits migration guidance if auth is absent |
| `API_READ_SESSION_SECRET` | Explicit read-session signing secret | owner token or local/test fallback | No read session secret in production without auth or explicit secret |
| `CONFIG_DIR` | Global app config directory | shared default config path | Existing shared default path applies |

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
