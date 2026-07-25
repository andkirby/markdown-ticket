# `cloud/` — Cloud Sync Coordination Worker

This is the independently built and deployed Cloudflare Worker workspace for
Markdown Ticket cloud coordination. Its package boundary and rationale are
owned by
[`docs/CRs/MDT-200/cloud-package-boundary.md`](../docs/CRs/MDT-200/cloud-package-boundary.md).

## Layout

Runtime implementation lives under `src/cloudflare/`, visibly provider-specific.
The tree is the permanent owner of Access validation, D1 coordination, Worker
HTTP, rate limiting, and scheduled maintenance:

```text
cloud/
  wrangler.jsonc            deployment source of truth (bindings, cron, vars)
  migrations/               ordered D1 migrations (Slice 2)
  src/cloudflare/
    worker.ts               HTTP + scheduled entry point
    http/                   versioned route mapping        (Slice 1)
    access/                 Access JWT validation + principal mapping (Slice 1)
    application/            allocation, membership, projection use cases (Slice 2+)
    d1/                     prepared statements + transactional batches (Slice 2)
    rate-limit/             Workers rate-limit adapter     (Slice 1)
    scheduled/              reservation + audit maintenance dispatch (Slice 2)
  test/                     unit, Workers-runtime, and D1 integration tests
```

See the
[Production Package Boundary](../docs/architecture/cloud-sync/README.md#production-package-boundary)
in the Cloud Sync Architecture for the authoritative tree and the dependency
direction.

## Dependency direction

```text
domain-contracts <- cloud/cloudflare
```

`cloud/` imports **only** `@mdt/domain-contracts` from this monorepo. It never
imports filesystem-aware `shared`, `server`, `cli`, `mcp-server`, or `src`.
The main application never imports `@mdt/cloud`; it reaches the Worker only
through the protected JSON/HTTPS contract.

## First setup

Generate the Cloudflare binding types before building or testing:

```bash
bun install
bun run --cwd cloud cf:types      # writes worker-configuration.d.ts
bun run --cwd cloud build         # tsc
bun run --cwd cloud deploy:dry-run
```

The checked-in `wrangler.jsonc` is the production deployment source. V1 has no
long-lived staging environment; destructive restore drills use a temporary
isolated D1 database.
