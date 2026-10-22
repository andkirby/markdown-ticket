---
code: MDT-258
status: Proposed
dateCreated: 2026-10-22T00:00:00.000Z
type: Architecture
priority: High
dependsOn: MDT-259
---

# Enforce runtime boundary validation with CI drift gates

> Evidence reports: [boundary-validation-design.md](MDT-258/boundary-validation-design.md) (full input inventory + phased design) · [drift-tooling-research.md](MDT-258/drift-tooling-research.md) (toolchain research with sources). Build on MDT-101 (contract architecture) and MDT-099 (shared-code consolidation), both Implemented.

## 1. Problem

MDT-101 declared "boundary validation happens where unknown input enters the system" and made `domain-contracts` Zod schemas the single source of truth. The schema layer held; the runtime enforcement did not:

- Only 2 of ~26 Express input sites schema-validate (`SearchController.ts:29`, `ProjectController.ts:159`); everything else is `req.body as X` casts or unvalidated destructuring — **write paths included** (create/PATCH/PUT CR, project create/update/sharing, config writes). Full sweep (Express + 10 MCP tools + ~25 file-ingress + browser + cloud/CLI edges): design report §A.
- All 10 MCP tool argument objects enter with zero schema validation (partial manual checks exist in `mcp-server/src/utils/validation.ts`) — the highest-risk trust boundary is LLM-controlled.
- A mixed PATCH (`{status: valid, priority: {bad:true}}`) can write status before failing on priority (`TicketService.ts:368`) — partial-mutation hazard.
- Dead validation wrappers in `domain-contracts` (`validateTicket`, `validateProjectConfig`, `validateTemplate*`, …) mask the missing enforcement. Note: `safeValidateMcpServerConfig` IS live (`mcp-server/src/config/index.ts:98`); no `validateCRFrontmatter` symbol exists.
- Phantom deps: `mcp-server` declares zod without importing it; `shared` declares **zod ^4.3.6** (cross-major vs domain-contracts' ^3.22.4) without importing it.
- `.knip.json` ignores exactly the workspaces where this drift lives (`mcp-server/**`, `domain-contracts/**`, `shared/**`, `cloud/**`).
- MDT-099 claims `server/repositories/` was deleted; `ConfigRepository.ts` is live (used by `DocumentService`, `TreeService`). Ticket record is wrong; consolidation is NOT in scope here.

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Express pattern | One typed `parseRequest(schema, raw, res, source)` helper, called directly in controllers | No new deps, no middleware rewrite; structured 400s with issue paths, no raw values echoed |
| MCP pattern | `defineTool(schema, handler)` registry; parse once before dispatch; `-32602` with `error.data.issues` | Single authority for all 10 tools; preserves stdio + both HTTP branches |
| Schema placement | Missing boundary schemas in `domain-contracts/*/input` (follow `ticket/input.ts` pattern) | Contract layer owns shapes; compatibility rules documented in design report §B |
| Dead wrappers | Delete (per-execute table in design report §E); keep live validators | Do not create fake callers to justify dead exports |
| mcp-server zod dep | Keep — becomes real runtime import via envelope schemas | Report §E |
| shared zod ^4 dep | Remove (phantom, cross-major) | Nobody imports zod in shared |
| ConfigRepository | Keep, validate its ingress | Live code; consolidation is separate work |
| Zod version | Migrate to ^4 via [MDT-259](MDT-259-migrate-domain-contracts-to-zod-v4.md) **before phase 0**; this ticket's phases run on v4 | New schemas written natively on v4 avoids double audit; blast radius at minimum (1 consumer, 12-site migration surface, MCP SDK accepts ^4) |

## 3. Phased plan (each phase independently shippable)

| Phase | Scope | Gate |
|---|---|---|
| 0 | Helpers + MCP registry + AST boundary checker + compatibility fixtures recording current accepted payloads | Checker passes on unchanged code, rejects seeded bypasses; zero behavior change |
| 1 | CR writes (create/PATCH/PUT/delete) + all MCP mutation tools | Mixed bad-payload makes zero mutation-service calls; valid-input behavior unchanged |
| 2 | Project + config writes (create/update/sharing/enable/disable, configure-documents, reloads) | Invalid reload leaves files unchanged |
| 3 | Remaining mutation/session envelopes (pins, favorites, selector, tokens, invites, log batches) | Shape failures = structured 400; auth failures stay 401/403 |
| 4 | Persisted-file ingress (TOML configs, frontmatter, templates.json, journals) | No behavior change for legacy formats; corrupt journals can't drive replay writes |
| 5 | Read requests + browser ingress | Every advertised MCP tool has a validator; no non-baselined raw reads |

Full acceptance criteria per phase: design report §C.

## 4. CI drift gates (adopt in order, ~zero new deps)

1. **Knip**: un-ignore the 4 workspaces, add entry patterns, run default + `--production` modes. Catches dead exports + phantom deps. First run = triage backlog, gate after.
2. **`@typescript-eslint/no-unsafe-type-assertion: error`** in server + mcp-server configs (typescript-eslint ≥ 8.15). Catches `req.body as X` directly — verified the rule flags exactly this pattern; `no-unsafe-assignment` does NOT.
3. **Type-equality tests** (`Expect<Equal<HandWritten, z.infer<Schema>>>` under existing tsc): catches interface-vs-schema divergence; created in MDT-259 as its migration gate, reused here.
4. **Boundary convention checker** (`scripts/check-boundary-validation.ts`, AST-based, legacy manifest that only shrinks): design report §D. Baseline identity = file + function + expression; new unvalidated reads fail CI.
5. Optional: **dependency-cruiser** (1 devDep) for import-direction rules ("server must not import zod directly"); **claims: convention test** for doc-vs-code drift (architecture CRs assert facts like `deleted_paths`). Skip for now if 1–4 land clean.

## 5. Out of scope

- Frontend client-side response validation, cloud worker inputs (follow-up)
- ConfigRepository consolidation (separate ticket; only fix MDT-099's record via `claims:` test)
- Zod v3→v4 migration (moved to [MDT-259](MDT-259-migrate-domain-contracts-to-zod-v4.md), which gates this ticket)
- MCP advertised-JSON-schema/OpenAPI unification (parity checks only in phase 1)
- Any transport rewrite (Express stays)

## 6. Acceptance criteria

- [ ] Phase 0–1 landed: all CR write paths + MCP mutations schema-validated; mixed bad-payload performs zero mutations (test-proven)
- [ ] Knip un-ignored and clean (post-triage); phantom zod deps resolved
- [ ] `no-unsafe-type-assertion` error-level in server + mcp-server; existing violations baselined or fixed
- [ ] Boundary checker in `check` script + PR CI; manifest shrinks every phase, never auto-grows
- [ ] Dead validation wrappers deleted with barrels updated; `safeValidateMcpServerConfig` retained with coverage
- [ ] No behavior change for currently-valid inputs (compat fixtures prove it); invalid inputs get structured 400 / `-32602`
