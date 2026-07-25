# Assessment: MDT-200

## Verdict

**Recommendation**: Proceed in one ticket, delivered slice by slice, against
the already-deployed production Worker and D1. Stop at User Review.

MDT-199 approved the architecture and the live infrastructure is now
provisioned (Worker `mdt-cloud-sync-production` deployed, Access protecting
both routes, production D1 reachable, rate-limit namespaces configured). The
five delivery slices are sequential and each has a clean exit gate. None
requires reopening an approved decision. The diff is broad but bounded: one
new package (`cloud/`, scaffolded), one strategy seam in `shared/`, config
schema additions, and board projection presentation.

## Deployment Reality (recorded during pre-flight)

| Resource | State |
| --- | --- |
| Worker `mdt-cloud-sync-production` | Deployed (v `aecba2f3…`, 2026-07-24T18:30Z); currently returns 503 stub |
| Routes | `mdt-sync.constantapp.org` (coordination), `mdt-sync-admin.constantapp.org` (operator) |
| Cloudflare Access | Active (live probe returns 302 login redirect, not Worker 503) |
| Access apps | Provisioned; audiences in `cloud/wrangler.jsonc` vars |
| D1 `mdt-cloud-sync-production` | Exists (`02996cfe…`); **no migrations applied** (only `_cf_KV`) |
| Rate-limit namespaces | `2026072401` (read), `2026072402` (mutate) |
| Staging environment | Not provisioned; user chose production-only deploy |

**Implication**: the previously-assumed "deployed Access/D1" runtime gate is
**OPEN**. The real-Access and real-D1 acceptance criteria are reachable.
Slice 1's first concrete step is replacing the 503 stub with real routing.

## Feature Pressure

### What MDT-200 must deliver

- Cloud-bound ticket-number allocation through a real Worker + D1 transaction,
  with idempotent replay and recoverable local write failure.
- Cloudflare Access JWT validation (RS256, JWKS, pinned issuer/audience) and
  human/machine principal mapping on the Worker.
- Project membership, roles (viewer/contributor/owner), revocation, and
  cross-project non-disclosure.
- One-way, versioned Markdown→cloud header projection with conflict/stale
  handling and polling-based teammate visibility.
- A local strategy seam so `TicketService` selects local or cloud allocation
  from validated config; local-only projects unchanged.
- Operations: migrations, audit, rate limiting, observability, backup/restore,
  disablement, and durable documentation.

### Current system assumptions (verified against live code)

- Number allocation is a single inline method: `TicketService.getNextCRNumber`
  (`shared/services/TicketService.ts:602`), a filesystem `highest + 1` scan.
  **No strategy/allocator abstraction exists** — confirmed.
- `TicketService.createCR` (`shared/services/TicketService.ts:318`) is the
  single creation entry point; server, MCP call into it. CLI has no direct
  caller (creation flows through server/MCP).
- Project config is service-isolated: `ProjectConfigService`
  (`shared/services/project/ProjectConfigService.ts:74`) reads/writes
  `.mdt-config.toml`; `TicketLocationResolver` consumes it at create time.
- Board rendering (`src/components/Board.tsx`, `Column/`, `TicketCard.tsx`)
  consumes `Ticket` objects via hooks and is decoupled from allocation. The
  cloud projection surface is additive (new read-only stubs), not a rewrite.

## Scope and Slice Plan

The five slices from `pipeline-agent-prompt.md` map cleanly to the live code:

| Slice | Code surface | Exit gate |
| --- | --- | --- |
| 1. Protected skeleton | Replace 503 stub → routing, Access JWT validation, typed envelope, `/healthz`; **apply first D1 migration** | Real human + service-token assertions validated against the live Worker |
| 2. Membership + allocation | D1 migrations, repositories, allocation transaction, reservation lifecycle, scheduled maintenance | Deployed concurrency + replay + isolation + recovery tests pass |
| 3. Shared local orchestration | Strategy seam in `shared/services/cloud-sync/`, operation journal, credential providers, config schema | Local-only regressions green; cloud create has no local fallback |
| 4. Projection + board | Acknowledgement projection, versioned publish, polling, board stubs | Two independent clients observe updates within poll interval |
| 5. Operations + docs | Migrations/deploy/rollback drills, audit, telemetry, export/restore/disable, doc reconciliation | Operations release gate recorded |

## Non-Goals (unchanged from ticket)

No presence, no offline allocation, no body sync, no WebSockets/Durable
Objects, no cloud authority over ticket content, no Jira-style features.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Production-only deploy skips the staging gate the architecture recommends | High | Apply migrations to the empty production D1 first (no data to lose); record a Time Travel bookmark before each migration; smoke-test each slice against the live Worker before broadening |
| Deployed Worker is currently a 503 stub — any traffic is rejected | Medium | Acceptable now (Access blocks unauthenticated traffic); first implementation task restores real behavior |
| No strategy abstraction exists — wrapping `getNextCRNumber` touches the hottest create path | Medium | Preserve local allocator exactly behind the new interface; add strategy-selection tests that prove local-only equivalence |
| Real Access validation requires a JWKS fetch path the architecture specifies in detail | Medium | Implement per `identity-and-access.md` § Assertion Validation exactly; unit-test with fabricated RS256 tokens + test JWKS, then prove against live Access |
| D1 transaction shape must match the MDT-198 POC exactly | High | Copy the static prepared-statement batch from `data-and-consistency.md`; local D1 integration test before any remote apply |

## Dependencies

- **MDT-199**: approved architecture, owner docs, identity/data/operations
  contracts. **Do not reopen.**
- **MDT-198**: POC evidence (allocation batch shape, lifecycle model). Reference
  only when checking the static D1 allocation shape.
- **External (provided)**: Cloudflare account, Access apps, D1, rate-limit
  namespaces, custom domains. All provisioned.

## Downstream Tickets

- **MDT-201** depends on MDT-200 and owns the reusable project-onboarding and
  management workflow.
- **MDT-202** depends on MDT-200 and MDT-201 and owns the thin `mdt cloud`
  entry point.

Neither downstream ticket blocks completion of MDT-200's core cloud slice.

## Confidence

- **High**: slice boundaries, allocation seam, config seam, board surface,
  identity validation spec, data model, operations contract.
- **Medium**: exact JWKS caching behavior under live Access key rotation;
  deployed concurrency latency (POC was local-only).
- **Low**: none that would block starting Slice 1.

## Decision

Proceed through Requirements → BDD → Architecture → UX → Tests → Tasks →
Implement (slice by slice) → Review, then stop at User Review. Do not mark
`Implemented` and do not commit unless explicitly asked. Preserve unrelated
user changes, including downstream MDT-201/MDT-202 work.
