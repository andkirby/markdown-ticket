# MDT-258 Phases 0–1 result

Status: **READY for parent review**. Implementation and scoped acceptance gates pass. Repository-wide TypeScript remains blocked by the two documented frontend baseline errors; this is not an unrestricted full-repository `PATCH_READY` claim. Ticket status is unchanged.

Baseline: `9878e2d20fe8c0e5f75f5992b7afbd4d6963a3c8`. Mode: Execute, explicitly authorized by the support request. Plan SHA-256: `92460755448049900f3fc6df155ec69f002887a2b329ec1c2e694b8ae9ba359c`. Controlled-refactor skill SHA-256: `569a4c272adcaeab2e32b69c89c15783c04cee4893242d067eda8e851b1d372f`.

## Implemented scope

- Pure `BoundarySchema<T>` export and server `parseRequest`: discriminated result, structured HTTP 400, issue fields restricted to `code`, `path`, `message`, no input values included.
- Compatibility-corrected canonical create schema, PATCH schema, attribute/key/project inputs, and adapter-local REST/MCP envelopes. Entity/frontmatter policies and MDT-259 compatibility shims remain unchanged.
- REST create/PATCH/PUT/delete parameters and write bodies parse before service calls. PUT still calls `updateCRPartial`. REST create only projects fields its adapter consumes; ignored fields gain no write behavior.
- All ten MCP names use imported `defineTool` entries. The five mutation envelopes, including section operations and project/key context, validate before resolution. Five read entries explicitly retain their legacy behavior for Phase 5. Unknown names retain `-32601`; absent arguments become `{}` without masking supplied null/false/zero.
- Both HTTP branches preserve HTTP 200 JSON-RPC error responses and issue data. Stdio preserves SDK envelope checks and now retains structured issues for invalid whole-argument shapes too.
- TypeScript AST convention checker, exact legacy manifest, decoder registry, root `check:boundaries`/`test:boundaries` scripts, and dedicated push/pull-request CI job. CI installs with the frozen lockfile and requires no application builds or servers.
- OpenAPI uses REST create/PATCH variants. PUT documentation now references the same partial input contract.

## Baseline and compatibility release gate

Before endpoint wiring, domain build and **329 domain tests**, **16 ProjectController tests**, and **159 MCP tests** passed. Added compatibility fixtures then passed against the original dispatcher/controllers: **6 REST cases** and **5 MCP cases**, recording accepted payloads and positional service/handler arguments.

Those fixtures remain green after wiring. Self-review added a sixth MCP fixture for the original dispatcher's optional `create_cr.key` project context. The original dispatcher source establishes that late-discovered behavior. Separate adapter/service tests prove Medium defaulting and long-title warning behavior, rather than inferring either from schema success.

Phase 0 helpers introduce no route behavior by themselves. Only Phase 1 controllers, mutation registry entries and argument-envelope error adaptation activate validation. No Phase 2–5 boundary migration was performed.

## Executed verification

Commands run from the repository root. All results below are final, after repairing in-scope findings. Complete command outputs, including intermediate failures, are retained in the originating thread's `mdt258` artifacts.

| Command | Result |
| --- | --- |
| `bun run --cwd domain-contracts build` | PASS, exit 0; includes strict type equality and exact-optional migration checks. |
| `bun test ./domain-contracts/src` | PASS, exit 0; **349 tests**, **24 files**, **812 assertions**. Original baseline: 329 tests. |
| `bun run --cwd server jest --runInBand ProjectController parseRequest TicketService.boundary-compatibility ticketOpenApi` | PASS, exit 0; **48 tests**, **6 suites**, no skips. |
| `bun run --cwd mcp-server test --runInBand` | PASS, exit 0; **225 tests**, **14 suites**, no skips. Original baseline: 159 tests. |
| `CONFIG_DIR=<isolated temporary config> bun run --cwd shared test --runInBand template-compatibility` | PASS, exit 0; **1 test**, **1 suite**; pretest TypeScript compilation also passes. Uses the real TemplateService. |
| `bun run --cwd server build` | PASS, exit 0. |
| `bun run --cwd mcp-server build` | PASS, exit 0. |
| `bun run validate:ts:all` | Expected baseline failure, exit 1: **5 packages pass**, frontend alone fails with test-setup TS2306 and TS2322. No remaining task-induced errors. |
| `bun run check:boundaries` | PASS, exit 0; **254 exact identities**, **265 occurrences**, **23 decoder modules**. |
| `bun run test:boundaries` | PASS, exit 0; **30 tests**, **41 assertions**. |
| `bunx tsc --noEmit --target ES2022 --module ESNext --moduleResolution bundler --types bun --esModuleInterop --skipLibCheck --strict scripts/check-boundary-validation.ts scripts/check-boundary-validation.test.ts` | PASS, exit 0; checker and fixtures compile independently. |
| `bunx tsc --noEmit` | Supplemental root tooling check fails on four pre-existing DOM-name errors in ignored `scripts/_probe/` scratch files. No checker errors. Scratch files were preserved. |
| Focused ESLint on every changed TypeScript file, using owning package configurations | PASS after formatting repairs; no warnings. |
| `bunx markdownlint-cli2 docs/CRs/MDT-258/phase-0-1-plan.md docs/CRs/MDT-258/phase-0-1-result.md` | PASS, exit 0; two files, zero errors. |
| Generated OpenAPI runtime assertion probe | PASS: create requires only title/type; PUT references CRPatchInput, whose fields are optional. |
| `git diff --check` and scoped staged whitespace/scope checks | PASS. |

The composite root `check` cannot be green while the frontend baseline errors remain. Its boundary command also runs independently in CI. Full shared/server integration suites and browser journeys were not rerun; no new claim is made about their documented flakes or browser readiness. No user servers were restarted.

## Acceptance evidence

| Gate | Result and evidence |
| --- | --- |
| V1 — accepted create behavior | PASS: original REST/MCP fixtures retain missing priority, raw title spelling, long title, plain assignee, component/slug data. Real REST adapter still forwards Medium when priority is absent; real TemplateService still warns about long titles and missing priority. |
| V2 — partial update behavior | PASS: original PATCH/PUT fixtures retain partial bodies, string/array relationships, empty relationship arrays, level aliases, and ignored-only updates. PUT delegates to the same partial service. OpenAPI tests distinguish these inputs from complete entities. |
| V3 — MCP compatibility | PASS: fixtures retain raw project/key forms, numeric-leading project references, shorthand/lowercase keys, priority and level aliases, and section `update`. Real attribute handler filters null attributes into an empty operation list. All three transport paths normalize absent arguments; unknown/prototype tool names retain `-32601`. |
| V4 — reject before side effects | PASS: Supertest PATCH **and PUT** with `{status: 'In Progress', priority: {bad: true}}` return structured 400 and call **zero mutation services**. Dispatcher rejection table covers all five mutation tools and asserts **zero project-resolution and mutation-handler calls**. Malformed arrays/null/scalars and nested field shapes are covered. |
| V5 — error propagation | PASS: real MCP SDK dispatch over paired in-memory transports, active HTTP via Supertest, and the secondary HTTP dispatcher all retain `-32602` and `error.data.issues`. Helper tests cover nested paths, scalar/array/null/undefined roots, output inference, and absence of raw values. |
| V6 — drift guard | PASS: fixtures reject casts, raw aliases, destructuring/rest patterns, bracket/optional access, raw reuse after parsing, renamed Request bindings, arbitrary Request delegation, changed imported delegation owners, fake helpers, new tools missing registry entries, and new typed JSON/TOML casts. Approved helper parsing and exact legacy guards pass. Duplicate/moved/changed sites and stale exceptions fail. |

## Manifest policy and limits

The initial manifest has **254 identities / 265 occurrences**: 60 request reads, 121 explicitly identified Request delegations, 5 legacy tool reads, 1 legacy tool cast, 38 registered decoder calls, and 29 decoded-to-typed casts. Delegation identities include imported/local owner symbols as well as their call expression. Each exception carries a reason and owning phase.

The manifest is checked in, with **no regeneration mode in the checker or CI**. Remove entries as their boundaries migrate; the baseline should only shrink. Any proposed expansion needs explicit review. Counts cannot substitute for reviewing exact identities.

Request identification uses local symbols, typed/renamed parameters, route callbacks, named route handlers and aliases. Source consumption expressions are normalized with the TypeScript printer, retaining file, enclosing function/route and count. Production scanning includes server/MCP sources and shared/CLI decoder casts; tests, fixtures, generated output and OpenWiki are excluded. The decoder registry records each loader module, parser, fallback policy and fixture owner, including syntax-only trace reads and existing guards.

This is a constrained convention checker, not general taint analysis or proof of schema completeness. Decoder registry fixtures identify existing evidence owners; this change does not claim all legacy loaders already schema-validate. File-boundary migration and fuller file-corruption evidence remain Phase 4 work.

## Design adaptations and self-review repairs

1. Used Zod v4 `ZodType<T, unknown>` for the erased boundary alias; the report's sample generic signature was v3. No server runtime Zod import was added.
2. PATCH retains unknown keys with `z.looseObject`, preserving ignored-only no-op requests and existing service mapping. Priority remains a string on this REST adapter because the existing update service accepts strings; object/array/null shapes are rejected without adding an enum-policy change. The public input type also replaces the adapter's formerly narrower level type; runtime normalization is unchanged.
3. Project references retain empty-string fallback and numeric-leading codes. Create envelopes retain optional key-derived context, although that compatibility field was absent from the report's abbreviated envelope and advertisement. Services still own normalization. The positional create interface still declares nested type required although its implementation falls back to the top-level type; a single assertion is confined to already parsed data, preserving the original forwarded object instead of injecting a field.
4. The SDK's Server wrapper independently validates its built-in tools/call envelope and discards Zod issue data on failure. A local stdio envelope refinement reports whole-argument shape errors with issue data before that wrapper, while preserving SDK method/name/metadata/task/result checks. Selected mutation schemas still parse once in `defineTool`. The dormant secondary HTTP helper is exported solely so its actual implementation can be exercised.
5. The existing OpenAPI converter still read v3 tags after MDT-259. Added the minimal v4 tag/optional/array/enum/literal handling needed for meaningful REST projection output; removed ignored fields from PATCH advertisement and corrected PUT's full-entity reference. This does not attempt complete generated OpenAPI/JSON-schema unification.
6. Updated three existing missing-param assertions to require the authorized structured error contract. Updated one MCP mock's input type to `unknown` to match the dispatcher. Existing behavior tests were retained; no baseline suite was skipped or weakened.
7. Deferred optional dead-wrapper cleanup from section E to its owning later phases. No dependency/version changes, knip workspace changes, ESLint rule, file migration, ticket renumbering or status update was introduced.

The final self-review checked source ownership, service forwarding, error ordering, generated OpenAPI, scanner bypass fixtures, complete changed paths and unrelated dirty state. MDT-101's entity/frontmatter constraints still describe those entities; the MCP guide and server architecture owners do not require changes for these adapter-local additions. No performance improvement is claimed.

## Phase 2+ handoff

- Phase 2 should use the helper for project/config writes, with compatible schemas for real manager inputs and reloads. Preserve route authorization and existing selector/field error metadata.
- Phase 3 owns session/sharing/pin/favorite envelopes; Phase 4 owns the registered decoder/fallback migrations; Phase 5 owns the explicit legacy read-tool entries and remaining reads/browser ingress.
- Replace legacy exceptions with validated consumption and delete matching manifest entries in the same change. Keep registry/advertised-name and required-key/enum parity tests when adding tools.
- Shape validation prevents the reported malformed-field partial write. It does **not** make status-plus-attribute updates transactional against later stateful business-rule failures.
- Root dependency edits, instruction/document changes and OpenWiki from the parallel stream remain outside this change. Only the three boundary-related package-script changes are staged from the dirty root package file.
