# MDT-259 implementation and verification report

## Result

Implementation complete within the migration scope; acceptance remains **PARTIAL**, not `PATCH_READY`. Required Jest and repository-wide TypeScript commands still have pre-existing failures. Ticket status was not changed. MDT-258 implementation was not started.

Baseline revision: `f292ac42ad2059cbab8e8aecddb9e15eba2ca9ea`. The original dirty root package.json, AGENTS.md, CLAUDE.md, ticket file, .zcodeignore and openwiki changes are excluded from this commit.

## Work items

1. **Dependency migration:** domain-contracts and mcp-server now declare `zod: ^4.6.7`. `bun install` resolves Zod 4.6.7, with one Zod package entry in the workspace lockfile. The lock diff changes only those declarations, shared's removal, and Zod deduplication. No new dependency was added. The explicitly excluded server/mcp-dev-tools installation was not touched.
2. **API migration:** migrated all **30** current `.strict()` sites (the ticket's count of nine was stale). Base definitions use `z.strictObject`; derived `.extend()` inherits strictness. The MCP log-level enum uses `{ error }`; selector state uses `z.record(z.string(), SelectorStateEntrySchema)`. Scans find no remaining `.strict()`, `errorMap`, `required_error`, `.nonempty`, or Zod `.errors` access in domain-contracts source.
3. **Type equality:** `src/__tests__/contract-types.test.ts` checks Ticket, CreateTicketInput, ProjectConfig, GlobalConfig and SelectorState against schema inference. Independent expected output shapes also protect CreateTicketInput, ProjectConfig, GlobalConfig and SelectorState; selector input is separately checked. Build explicitly runs these checks under the production strict tsconfig, and Jest uses that same configuration for this suite. The compatibility suite additionally compiles and runs with `exactOptionalPropertyTypes: true`; that option was not enabled in the package's original tsconfig.
4. **Dependency hygiene:** removed shared's unused Zod declaration (source import scan is empty). Retained mcp-server's declaration as explicitly required for MDT-258, although it remains intentionally unused until that ticket. Thus “zero phantom declarations” applies to shared, with the stated MCP exception.
5. **Downstream types:** the equality gate exposed pre-existing ProjectConfig drift: its schema accepts legacy string counters, passthrough keys and parsed document-preview defaults, while the handwritten interface differed. ProjectConfig now derives from its actual schema. ProjectFactory has one erased type assertion preserving its existing counter pass-through; no coercion, normalization or other runtime change was introduced. A future normalization policy remains outside this migration.
6. **Skills/docs:** updated the user-level `zod` skill with a “Targets Zod v3 (legacy)” header and pointer to `zod-validation-utilities`; fixed the latter's `.errors` example to `.issues` and added the async parsing note. These two files are outside the repository and cannot be included in this repository's commit. Updated docs/SKILLS.md and the living MDT-101 architecture dependency example. Preference-storage ownership and configuration formats remain unchanged.

## Compatibility findings and necessary deviations

The mechanical version bump alone changed behavior. Direct comparison against a bundled pre-migration Zod 3.25.76 baseline exposed and drove these compatibility repairs:

- **Partial document settings:** v4 applies defaults inside optional properties. Remove outer defaults before making the document-settings object partial; `{}` stays `{}`, while explicit `preview: {}` still fills its nested defaults.
- **Object defaults:** use v4 `.prefault()` where v3 parsed the default. This preserves nested parsing and independent mutable defaults across calls. The empty selector record retains `.default({})`; input permits undefined/partial entries, output is a fully defaulted record.
- **Unbounded integers:** v4 `.int()` adds a safe-integer limit. Eight existing unbounded integer sites use `Number.isInteger` refinements so accepted large integers remain accepted, including tolerant fallback behavior. Bounded integer schemas retain native `.int()`.
- **Persisted timestamps:** v4's datetime grammar rejects previously accepted minute precision and offset forms. A shared private config timestamp regex preserves the v3 grammar, including its existing permissive numeric-offset rule. No tightening was introduced.
- **Error text:** one existing project-validator test now checks the v4 missing-object message along with its issue code and path. Rejection behavior is unchanged, as permitted by the ticket.

These extra source edits are required by the ticket's no-behavior-change invariant, rather than schema-policy work. Added verification configuration, compatibility tests, the touched validator test and the single shared adapter assertion are the final mutation-intent additions to the initial plan. No baseline test-runner/frontend repairs were included.

## Executed evidence

Commands were run from the repository root unless noted. Full outputs, the bundled baseline and comparison scripts are retained in the originating BB thread's `mdt259` artifact directory; working copies remain under `/tmp/mdt259`.

| Command | Result |
| --- | --- |
| `bun install` | PASS; Zod 4.6.7 installed; only Zod lock changes. Required sandbox escalation for Bun's cache/temp writes. |
| `bun run --cwd domain-contracts build` | PASS; production build, strict equality compilation and exact-optional compatibility compilation. |
| `bun run --cwd domain-contracts build && bun run --cwd domain-contracts test` | Build PASS. Jest: **265 passed**, 21 suites passed; two pre-existing suites fail to load `bun:test`. Exit 1. |
| `bun run --cwd domain-contracts test --testPathIgnorePatterns 'patterns.test.ts\|search/__tests__/search.test.ts'` | PASS: **265 tests**, 21 suites. Supplemental diagnosis only; does not replace the required unfiltered command. |
| `bun test ./domain-contracts/src` | PASS: **329 tests**, 23 files, 791 assertions. Baseline: **281 tests**, 21 files. All original 217 Jest tests plus both Bun-only suites execute; 48 new regression/type checks added. |
| `bun run validate:ts:all` | **5 packages pass, frontend fails** with the same two test-setup errors as baseline. No remaining migration-induced errors. This script omits CLI. |
| `bun run --cwd cli build` | PASS. |
| `bun run build:all` | Domain, shared, server, MCP and cloud builds PASS; frontend blocked by those same pre-existing errors. |
| `bun run --cwd mcp-server test --runInBand` | PASS: **159 tests**, 11 suites. |
| `bun run --cwd shared test --runInBand` | **1042 passed, 4 failed**, 82 suites. Three project-discovery integration failures and one sandbox config-directory write failure; the same four failures reproduced with the bundled v3 contracts. |
| `CONFIG_DIR=/tmp/mdt259/shared-test-config bun run --cwd shared test --runInBand` | **1043 passed, 3 failed**; 81 suites pass. Explicit writable config resolves the sandbox failure; discovery integration still fails. |
| `bun run --cwd server jest --runInBand` | **774 passed, 6 failed, 8 skipped**, 70 suites; suite-wide run has unstable API/watcher failures. Process remained open after reporting and was stopped with Ctrl-C (exit 130); see retained log. |
| Server comparison: same five suspect suites on v4 and bundled v3, `--runInBand --forceExit` | Both: **27 passed, 3 failed**. Both API suites pass; watcher timeouts and the runtimeConfig PinStateService environment-read check fail identically. Full v3 run also fails (**776 passed, 4 failed, 8 skipped**), including a different API test. Full server suite is not certified green. |
| `bun run --cwd domain-contracts lint` | PASS. |
| `bunx eslint shared/services/project/ProjectFactory.ts --config shared/eslint.config.ts --max-warnings 0` | PASS. |
| `bun /tmp/mdt259/compare.ts` and `bun /tmp/mdt259/edge-compare.ts` | **4,125** v3/v4 parse comparisons, **zero differences** in acceptance or deep output equality. Covers all 105 exported schemas across a 39-input corpus plus 30 focused edge cases; finite characterization, not exhaustive proof. |
| Repeated default mutation probe | Both versions return independent nested defaults. |
| `bunx markdownlint-cli2 docs/CRs/MDT-259/plan.md docs/CRs/MDT-259/result.md docs/SKILLS.md docs/CRs/MDT-101/architecture.md` | PASS: four files, zero errors. |
| `git diff --check` | PASS before staging. Final scoped staging and hooks recorded in commit output. |

The baseline dependency documentation and public config owners were re-read against the final changes. Only the dependency example and skill selection claims required edits. No runtime boundary wiring, persisted format, watcher behavior, transport, authorization rule or performance claim changed.

## Remaining gates and acceptance mapping

- **AC1 PARTIAL:** package builds and every executable domain test passes, including the original 217. The exact Jest command still cannot load `ticket/__tests__/patterns.test.ts` and `search/__tests__/search.test.ts`, which already imported `bun:test` before migration.
- **AC2 PASS:** the five required equality checks, independent shape snapshots, selector input/output split and strict/exact-optional compatibility checks pass through both tsc and Jest.
- **AC3 BLOCKED BY BASELINE:** frontend/src/test-setup.ts has TS2306 for the global-only jest-dom declaration and TS2322 for assigning Bun's afterEach to Jest's global lifecycle type. All five other projects and CLI compile. Repairing these prerequisites is the smallest next decision.
- **AC4 PASS with explicit ticket exception:** one locked Zod major, no shared phantom; MCP declaration deliberately retained for MDT-258. Transitive packages' compatible `^3 || ^4` ranges are not installed v3 copies.
- **AC5 SUPPORTED WITH LIMITS:** original tests plus added fixtures and direct comparisons support preserved behavior; error text differs as allowed. Shared/server full-suite readiness remains unverified because of the recorded baseline/environment/unstable failures. No performance improvement is claimed.

## MDT-258 handoff

- Author schemas with v4 `z.strictObject`, `{ error }`, explicit record key/value schemas and `.issues`; the modern v4 skill is primary.
- Use `z.input` for pre-parse data and `z.output`/`z.infer` for parsed values. The equality suite and build gates can be reused for CI drift gate 3. TicketSchema retains its pre-existing explicit `ZodType<Ticket>` annotation, so that particular equality assertion checks the public annotation; it does not independently prove every underlying field matches the interface. Runtime schema fixtures still apply.
- `.prefault` is deliberate compatibility code. Do not replace it with `.default`, simplify partial document settings, use safe integers, or tighten timestamps without a separate behavior decision.
- Zod v4 APIs such as `z.stringbool`, `z.iso.datetime`, `z.templateLiteral` and `z.toJSONSchema` are available. This change does not adopt them at runtime boundaries or remove the SDK's transitive zod-to-json-schema dependency.
- MCP's Zod declaration is ready for the future real import. No MDT-258 phase or CI boundary gate has been implemented here.
