# MDT-259 controlled refactor contract

## Assessment

- Decision: READY for the migration; baseline verification repairs await the user's answer.
- Baseline revision: `f292ac42ad2059cbab8e8aecddb9e15eba2ca9ea`.
- Problem: mixed Zod majors and legacy APIs would duplicate MDT-258 schema work.
- Scope/acceptance owner: MDT-259; MDT-258 is a dependent consumer, not implementation scope.
- Baseline: domain-contracts build passes; `bun test ./domain-contracts/src` passes 281 tests in 21 files. The prescribed Jest command passes 217 tests but two additional suites cannot import `bun:test`. After the domain build, `bun run validate:ts:all` passes five packages and fails only the frontend test setup (TS2306, TS2322). No application runtime failure was observed.
- Initial unrelated changes: AGENTS.md, CLAUDE.md, root package.json, MDT-259 ticket, .zcodeignore, openwiki/. Preserve these; do not stage them.

## Invariants and plan

- Preserve accepted/rejected payloads, parsed output, unknown-key policy, defaults, transforms and validation wrappers. Error-message internals may differ.
- Keep the existing domain-contracts -> shared -> consumer dependency direction and public exports.
- Mechanically replace every current `.strict()` site (30, rather than the ticket's historical nine), migrate `errorMap` and the selector record key schema, and pin both authorized consumers to `^4.6.7`.
- Remove shared's unused Zod declaration. Keep mcp-server's declaration for MDT-258.
- Add compile-time equality assertions and characterization tests; retain all existing assertions. Investigate input/output/default changes with direct v3/v4 comparisons using a bundled baseline in `/tmp/mdt259/v3-contracts.js`.
- Correct compile-time contract drift exposed by equality tests without changing runtime schema rules. Stop for any correction that requires a new public behavior decision.
- Compare native v4 APIs with the current schema composition; use the smallest compatible change. No performance claim or unrelated schema modernization is planned.

## Mutation intent

Allowed modifications: domain-contracts/package.json, domain-contracts/tsconfig.test.json, domain-contracts/src/{access/schema.ts,app-config/schema.ts,config/schema.ts,project/schema.ts,project/worktree.ts}, shared/package.json, mcp-server/package.json, bun.lock, docs/CRs/MDT-101/architecture.md, docs/SKILLS.md. Consumer source changes are allowed only for migration-induced TypeScript errors and must be listed in the result before committing.

Allowed creates: domain-contracts/src/__tests__/{contract-types.test.ts,zod-migration.test.ts}, domain-contracts/tsconfig.type-tests.json, docs/CRs/MDT-259/{plan.md,result.md}. No deletions.

External authorized skill edits: ~/.agents/skills/zod/SKILL.md and ~/.agents/skills/zod-validation-utilities/SKILL.md. These are outside this Git repository and will be reported separately.

Conditional verification repairs (only if approved): remove the `bun:test` imports in domain-contracts/src/{ticket/__tests__/patterns.test.ts,search/__tests__/search.test.ts} so Jest globals work; frontend/src/test-setup.ts type-only repair. Record authorization and precise changes in the result.

## Documentation reconciliation

Impact: UPDATE_REQUIRED. Owners: domain-contracts/AGENTS.md (pure contracts and canonical types), docs/CRs/MDT-101/architecture.md (dependency/contract ownership), docs/architecture/preference-storage-architecture.md (schema/default ownership), docs/CONFIG_SPECIFICATION.md and docs/CONFIG_GLOBAL_SPECIFICATION.md (persisted configuration behavior), docs/SKILLS.md (active skill selection). Searches covered dependency versions, validation, defaults, config parsing, and schema ownership. Only the architecture's `^3.x` dependency example and skill guidance require updates; runtime ownership and persisted formats stay the same. Historical problem statements in MDT-258/259 stay historical. Manually compare the changed claims with final code; run Markdown checks on changed docs.

## Verification gates

| ID | MDT-259 criterion | Evidence |
| --- | --- | --- |
| AC1 | Domain build and all tests green; no legacy strict/errorMap/one-argument record | `bun run --cwd domain-contracts build && bun run --cwd domain-contracts test`; source scan |
| AC2 | Entity/input equality checks execute | strict TypeScript type tests plus Jest, covering Ticket, CreateTicketInput, ProjectConfig, GlobalConfig, SelectorState |
| AC3 | Consumer compilation | `bun run validate:ts:all`; CLI build (the root script omits CLI); `bun run build:all` |
| AC4 | One installed Zod major; no shared phantom | `bun install`; inspect lock diff and manifests; imports scan; mcp-server intentionally retained for MDT-258 |
| AC5 | Preserve behavior | baseline/after suites, migration characterization fixtures, differential v3/v4 parse results including strict keys/defaults and malformed values; affected shared/MCP suites |
| R1 | Bounded patch/docs/commit | final diff, explicit path staging, cached whitespace/scope checks, hooks, post-commit status |

Artifact owner: this ticket directory (plan and result); temporary verbose logs/probes in `/tmp/mdt259/`. Final report and commits provide durable review evidence. Ticket status remains unchanged. Known baseline verification failures are reported separately unless authorized repairs resolve them.
