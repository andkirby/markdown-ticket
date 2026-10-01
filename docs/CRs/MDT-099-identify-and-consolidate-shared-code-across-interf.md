---
code: MDT-099
status: Implemented
dateCreated: 2025-12-18T01:14:35.798Z
type: Architecture
priority: Medium
phaseEpic: MDT-233
---

# Identify and Consolidate Shared Code Across Interfaces

> **Re-baselined 2026-10** (MDT-101 close-out triage). Implemented same day; see Work Items and Verification.

## 1. Description

### Original Problem (2025-12) — obsolete
- Code duplication across `server/`, `frontend/`, `mcp-server/` for common operations
- `server/repositories/ConfigRepository.ts` duplicated TOML handling, only accessible to server
- No clear boundaries for shared vs interface-specific code

### Why obsolete (verified 2026-10)
- `server/repositories/` no longer exists; TOML handling lives in `shared/services/project/*`
- Boundaries codified: `cli/` thin-shell rule (AGENTS.md), `domain-contracts` dependency direction (MDT-101)
- `shared/` services are the consumption hub for all interfaces

### Actual work (this ticket, post re-baseline)
Leftover compatibility and duplication debt from the MDT-101 contract migration:
1. `domain-contracts` `dependencies` carried tooling (eslint, glob, swagger-jsdoc) — runtime imports are zod-only
2. Pure re-export shims in `shared/models/` (`WorktreeTypes`, `SubDocument`, `PublicLinkOrigin`) with zero or near-zero direct importers
3. `mcp-server/src/tools/__tests__/test-fixtures.ts` hand-rolled `TicketData`/`TicketFilters` although contracts export supersets
4. Mixed adapter files (`Project.ts`, `Ticket.ts`, `Types.ts`, `Config.ts`) hold legitimate shared-layer business logic alongside contract re-exports, with no documented role

## 2. Work Items (all complete)

### W1: domain-contracts dependency hygiene
- Moved `@antfu/eslint-config`, `@eslint-react/*`, `@typescript-eslint/*`, `glob`, `swagger-jsdoc` to `devDependencies`; runtime `dependencies` = `{ zod }` only

### W2: Pure-shim retirement
- Deleted `shared/models/WorktreeTypes.ts` (0 direct importers)
- Deleted `shared/models/SubDocument.ts` (3 relative importers rewritten to `@mdt/domain-contracts`)
- Deleted `shared/models/PublicLinkOrigin.ts` (barrel re-pointed to `@mdt/domain-contracts`)
- `@mdt/shared` public API unchanged (barrel exports the same names)
- Worktree schema tests (the only coverage) relocated to `domain-contracts/src/project/__tests__/worktree.test.ts`

### W3: Ratified mixed adapter files
- `models/Ticket.ts` (normalize functions), `models/Project.ts` (legacy migration), `models/Types.ts` (enums + app shapes), `models/Config.ts` (status/attribute/server config) stay in `shared` with headers documenting the adapter role
- Rationale: MDT-101 architecture assigns business logic and transport/app config to `shared`, not contracts

### W4: mcp-server test fixtures derive from contracts
- `TicketData`/`TicketFilters` re-exported from `@mdt/domain-contracts` (supersets of the former local interfaces)
- Local `Ticket` kept: transport-response shape (`string` enums, nullable dates, `inWorktree` adornments) — excluded from contracts by MDT-101's transport-payload rule

## 3. Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Fate of pure shims | Retire | Zero/near-zero direct importers; contracts importable directly |
| Fate of mixed `models/` files | Ratify as shared adapter layer | Service-layer business logic belongs in `shared` per MDT-101 |
| mcp local `Ticket` type | Keep local | Transport-response shape; MDT-101 keeps transport payloads out of contracts |
| `StatusConfig`/`AttributeConfig`/`ServerConfig` | Stay in `shared/models/Config.ts` | App/transport config, never promoted to domain contracts |
| domain-contracts `testing/` fixtures | Deleted (2026-10, MDT-101 post-close) | Subpath never wired, zero external consumers |

## 4. Acceptance Criteria

- [x] W1: `domain-contracts` runtime `dependencies` = `{ zod }` only; lockfile updated; build + tests green
- [x] W2: no pure re-export shim remains in `shared/models/`; barrel exports unchanged names; suites green
- [x] W3: mixed adapter files carry headers documenting their role
- [x] W4: `test-fixtures.ts` derives `TicketData`/`TicketFilters` from contracts; local `Ticket` documented as transport shape
- [x] No new test failures vs recorded baseline (217 domain-contracts / 995 shared / 159 mcp / 775 server; pre-existing failures unchanged: 2 `bun:test` suites, shared test-lib ×3, server runtimeConfig + openapi, flaky worktree-sse)

## 5. Verification

### Executed Evidence (2026-10-01)
- `bun run --cwd domain-contracts build && test`: 217 passed (+10 relocated worktree tests); same 2 pre-existing `bun:test` suite failures
- `bun run --cwd shared build && jest`: 995 passed (−10 relocated), same 3 pre-existing test-lib failures
- `bun run --cwd mcp-server jest`: 159/159 (rewritten fixtures exercised)
- `bun run --cwd server jest`: 775 passed, failures identical to baseline
- `bun run validate:ts`: passed; eslint 0 errors on all touched files
- `bun install`: lockfile confirmed, no version changes

### Discovery: gitignore `_*` rule ate `__tests__` dirs
Staging W2/W4 changes revealed `.gitignore` pattern `_*` (scratch-file convention) also matched `__tests__` directories — new test files were silently never committed repo-wide (including the MDT-101 template contract tests). Fixed via `!**/__tests__/` negation; stranded files rescued in commits `f5336b97` + `00bed81e` (rescued suites verified green: cloud-sync 24/245, related shared suites 35/418). Also surfaced: the frontend jest environment is not installed in this checkout — follow-up candidate.
