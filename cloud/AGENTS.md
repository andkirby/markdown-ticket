# cloud

LLM helper for `/cloud`.

## Purpose

Independently built Cloudflare Worker workspace for cloud coordination:
D1-backed allocation, memberships, projections, the `ProjectProjectionHub`
Durable Object stream, and scheduled maintenance. Authoritative owner docs
live in [`docs/architecture/cloud-sync/`](../docs/architecture/cloud-sync/)
(README, data-and-consistency, identity-and-access, operations).

## Best Practices

- 👍 D1 stays authoritative (memberships, projection versions, project
  revisions). The Durable Object sequences delivery only — never a second
  ticket or projection store.
- 👍 Migrations are forward-only, one ordered file per change, applied with
  `wrangler d1 migrations apply`. Never edit an applied migration; never
  create or repair schema at runtime.
- 👍 Keep `migrations/*.sql` in sync with the schema section of
  `data-and-consistency.md`, and record production applies in
  `cloud/test/operations/migration.md`.
- 👍 Scheduled maintenance reads must stay proportional to their working set:
  every cron predicate needs a usable index (see MDT-226 `C-16` — the
  retention scan once full-scanned 12,714 rows 96×/day).
- 👍 Tests run real SQL against `bun:sqlite` using the production schema from
  `migrations/` (apply all files in order, like `wrangler` does). Durable
  Object tests need a Workers-runtime harness, not plain SQLite.
- 👍 Every state change writes an `audit_events` row; projections and audit
  detail never contain ticket bodies.
- 👍 No secrets in `wrangler.jsonc` — use `wrangler secret put`. Production
  only; no staging environment.

## Keep Out

- 👎 imports of filesystem-aware packages (`shared`, `server`, `cli`,
  `mcp-server`, `src`) — only `@mdt/domain-contracts` is allowed.
- 👎 timer-driven polling loops in the push path; the hub hibernates.

## Change Flow

1. Contract change in `domain-contracts` first, then the cloud module
2. `application/` use case → `d1/` or `durable/` implementation
3. Tests against the real schema (`test/`); manual/deployed probes get an
   evidence file under `test/operations/`
4. New schema → forward-only migration + `data-and-consistency.md` sync
5. `bun run --cwd cloud cf:types` when bindings change

## Verify

- `bun run --cwd cloud test`
- `bun run --cwd cloud build`
- `bun run --cwd cloud deploy:dry-run`
- `bun run validate:ts`
