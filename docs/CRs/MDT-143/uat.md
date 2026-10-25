# UAT Refinement Brief

## Objective

Make `mdt-cli create` reject unknown **explicit** type/priority tokens (e.g. `chore`,
`spike`, `urgent`) instead of silently coercing them to the defaults, per
[MDT-263](../MDT-263-strict-create-type-tokens.md). Today an unknown token falls
through `parseCreateTokens` and the ticket is created with `Feature Enhancement` /
`Medium` while the user's token is swallowed — the opposite of `mdt-cli ticket attr`,
which rejects unknown enum values and prints the valid set. Omitted type keeps its
`Feature Enhancement` default; only explicit unknown tokens are rejected.

## Approved Changes

| Change | Detail |
|--------|--------|
| Strict explicit token validation | Every part of an unquoted **single-word** `/`-combined create token (`<type>[/<priority>]` grammar position; a slash inside a multi-word title token is title text) must resolve against the canonical token maps (`TYPE_TOKENS`/`PRIORITY_TOKENS`, derived from `@mdt/domain-contracts`, own-property lookup); an unknown part is a structured error. Standalone single-word dash-less tokens that are not known enums are rejected **once any title is already determined** (a quoted/multi-word token, or an earlier bare word — order-independent, real-shell safe); the first bare word with no other title keeps the documented single-word-title derivation. Inherited object property names (`constructor`, `__proto__`) never resolve as enum tokens. |
| Error envelope parity with `attr` | Rejection throws `CliCommandError('INVALID_CREATE_TOKEN', …)` → plain mode: `Error: Unknown type token 'chore'. Valid types: … (aliases: …)` on stderr, exit 1; `--json`/`--yaml`: `ok=false` envelope with `error.code`/`error.message` and `error.details` carrying the valid sets. No ticket file is created. |
| Defaults untouched | Omitted type → Feature Enhancement, omitted priority → Medium. Known aliases (`bug`, `feature`, `debt`, `tech-debt`, `docs`, `p1`–`p4`, canonical values, any case) keep working. Dashed tokens (slug position) and quoted/spaced titles are never enum candidates. |
| Single source of truth | Validation consumes the existing alias maps in `cli/src/utils/aliases.ts` (already derived from domain-contracts); no third copy of the enum is introduced. mcp-server/frontend untouched — MCP `create_cr` already validates via the shared zod enums. |

## UAT Cases & Results (fail-first, executed 2026-10-26)

Run in an isolated temp project (`mdt-cli project init UAT … --tickets-path tickets`),
built-from-source CLI. Expected = MDT-263 behavior.

| # | Command | Expected (MDT-263) | Before (evidence) | After |
|---|---------|--------------------|-------------------|-------|
| U1 | `mdt-cli create chore/low 'UAT probe 1'` | Error, exit 1, valid set printed, **no ticket file** | ❌ FAIL — `Created UAT-001`, exit 0; frontmatter `type: Feature Enhancement`, `priority: Low` | ✅ PASS |
| U2 | `mdt-cli create spike 'UAT probe 2'` | Error (unknown explicit type token), exit 1, no ticket file | ❌ FAIL — `Created UAT-002`, exit 0; `spike` silently swallowed, `type: Feature Enhancement`, `priority: Medium` | ✅ PASS |
| U3 | `mdt-cli create feature/urgent 'UAT probe 3'` | Error (unknown priority token), exit 1, no ticket file | ❌ FAIL — `Created UAT-003`, exit 0; `urgent` silently swallowed, `priority: Medium` | ✅ PASS |
| U4 | `mdt-cli create chore/low 'UAT probe 4' --json` | `ok=false`, `error.code=INVALID_CREATE_TOKEN`, message with valid set | ❌ FAIL — `ok: true` envelope, ticket created with coerced type | ✅ PASS |
| U5 | `mdt-cli create bug/p1 'Control'` (known aliases) | Ticket created, `type: Bug Fix`, `priority: Critical` | ✅ PASS (control) | ✅ PASS |
| U6 | `mdt-cli create 'Just a title'` (omitted type/priority) | Ticket created, `Feature Enhancement` / `Medium` | ✅ PASS (control) | ✅ PASS |
| U7 | `mdt-cli create feature 'Refactor'` (single-word unquoted title, no quoted title present) | Ticket created, title `Refactor` — not an enum-position token | ✅ PASS (control) | ✅ PASS |
| U8 | `mdt-cli create bug 'Fix X' login-timeout` (dashed slug) | Ticket created with slug `login-timeout` — dashed tokens are never enum candidates | ✅ PASS (control) | ✅ PASS |

Before-evidence preserved verbatim: probes U1–U4 each exited 0 and created a ticket file
(`UAT-001`–`UAT-004`); U4 returned `"ok": true` with coerced `type.value`.
Temp project deleted after evidence capture.

## Changed Requirement IDs

- `BR-6` — refined in place (create honors only known type/priority tokens; defaults unchanged)
- `Edge-2` — refined in place (clarifies "unrecognized create token": unknown **explicit** type/priority token → reject with valid set; title/slug tokens are not enum candidates)

## Affected Downstream Trace

- requirements: BR-6, Edge-2 refined → validated, relocked, rendered
- bdd: `create_rejects_unknown_type_token`, `create_rejects_unknown_priority_token`, `create_defaults_for_omitted_tokens` added → rendered
- tests: `TEST-cli-create-strict-tokens` added → rendered
- tasks: `TASK-cli-create-strict-tokens` added → rendered

## Execution Slices

### Slice 1 — strict token validation in `parseCreateTokens` + unit tests

- **Objective**: reject unknown explicit type/priority tokens with the `attr`-style error envelope; keep defaults and alias behavior byte-identical.
- **Direct artifacts**: `cli/src/commands/create.ts`, `cli/tests/unit/commands/create.parse-tokens.test.ts`.
- **Direct GREEN targets**: `TEST-cli-create-strict-tokens`, `create_rejects_unknown_type_token`, `create_rejects_unknown_priority_token`, `create_defaults_for_omitted_tokens`.
- **Impacted canonical tasks**: `TASK-cli-create-strict-tokens`.
- **Why**: the enum maps already derive from domain-contracts (`cli/src/utils/aliases.ts`); the CLI shell must stop swallowing unknown tokens at its only token-parsing boundary.

## Validation

**Implemented 2026-10-26 (TASK-cli-create-strict-tokens) — re-run all GREEN:**

- U1–U4 (before: silent coercion, exit 0): now `exit=1`, `Error: Unknown create token 'chore/low' (part 'chore'). Valid types: … (aliases: …). Valid priorities: … (aliases: p1–p4).` on stderr; `--json` emits `ok:false` / `error.code=INVALID_CREATE_TOKEN` / `error.details.{hint,validTypes,validPriorities}`; no ticket file created.
- U5–U8 (controls): `bug/p1` → Bug Fix/Critical; omitted tokens → Feature Enhancement/Medium; `feature Refactor` → title `Refactor`; `bug 'Fix X' login-timeout` → slug `login-timeout` (filename `UAT-004-login-timeout.md`). Temp project deleted after evidence capture.
- Unit: `cli/tests/unit/commands/create.parse-tokens.test.ts` 22/22 (10 new strict-validation cases; includes the order-regression `spike` before quoted title). E2E: `cli/tests/e2e/ticket/create.spec.ts` 18/18 (3 new rejection cases + renamed legacy title-derivation case).
- Full `bun run --cwd cli test`: 196 pass / 15 fail — the 15 failures are `mdt-cli cloud` presentation-path tests, **verified pre-existing** by stashing this diff and reproducing the identical 15 failures (stale untracked `shared/dist` from the in-flight MDT-200 allocator investigation lacks exports HEAD `cli/src/commands/cloud.ts` imports; `bun run --cwd cli build` fails on the same unrelated cloud files, zero errors in files touched here).
- Lint/typecheck of changed files: no tsc errors attributable to this diff (build blocked only by the pre-existing shared/dist drift documented above).
- Trace: requirements relocked; `spec-trace validate MDT-143 --stage all` passes; requirements/bdd/tests/tasks projections re-rendered.

**Review round (codex subthread, 2026-10-26) — FAIL → fixed → all GREEN:**

Reviewer findings and resolutions:
1. MAJOR shell-quoted slash titles (`bug 'Fix input/output'`) regressed + single-word quoted titles escaped validation in real shells (quotes are stripped) → slash branch now single-word-only; bare-word rejection is order-independent once any title is determined. Verified: `create bug 'Fix input/output'` creates with title `Fix input/output`; `create spike 'Probe'` rejects.
2. MAJOR canonical multi-word type (`Feature Enhancement`) counted as explicit title, rejecting a following bare-word title → explicit-title pre-pass now excludes enum-resolving tokens. Verified: `create 'Feature Enhancement' 'Real Title'` consumes the enum and titles `Real Title`.
3. MAJOR inherited properties (`constructor/low`, `__proto__/p1`) bypassed validation via `in` lookups → all token-map membership now `Object.hasOwn`. Verified: both reject with `(part '…')` errors.
4. MINOR mixed-scope hunks in the review diff → foreign pre-existing hunks in create.spec.ts excluded from the commit (selective staging).
5. MINOR `cli/mdt-cli/SKILL.md` create section not updated → updated with the strict-token contract.

Post-fix evidence: unit 26/26 (6 new regression tests), create e2e 18/18, all unit command suites 34 tests/0 fail, live shell probes R1–R7 (rejections exit 1 with no ticket file; controls `bug 'Fix input/output'`, `'Feature Enhancement' 'Real Title'`, `feature/p2`, omitted-token defaults all correct). Requirements relocked and `--stage all` revalidated after the BR-6/Edge-2 wording refinement.

## Watchlist

- Stricter slash-token rule: an unquoted **single-word** token containing `/` is always `<type>[/<priority>]`; a single-word slash-containing title (e.g. `24/7`) can no longer be expressed bare — use a multi-word title (`'24/7 service'`) or a dashed slug. Multi-word slash titles (`'Fix input/output'`) keep working (verified).
- Real-shell quoting nuance: the shell strips quotes, so `create spike 'Probe'` arrives as two bare words and is rejected (second bare word with a title already determined) instead of silently titling the ticket `spike`. First-bare-word titles (`create feature Refactor`) keep working.
- A bare unknown word after a slug-derived title (e.g. `create fix-database-pool extra`) now rejects where HEAD silently dropped it — the drop was silent data loss of the same class MDT-263 kills.
- `mdt-cli create chore` (single unknown token, no title candidate) still derives the title from the token (`Chore`) — legacy single-word-title behavior pinned by existing tests; there is no enum position to validate without a title.
- The cloud `create` coordinator path is broken for this repo (pending-recovery state, see MDT-262 / MDT-200 investigation); UAT ran against a local temp project via the same `parseCreateTokens` boundary.
- `cli/tests/e2e/ticket/create.spec.ts` carries pre-existing uncommitted foreign hunks (ambiguous-key BR-1.10 test, cloud-bound create test); they are excluded from the MDT-263 commit via selective staging.

## Open Decisions

None. Only-known-tokens acceptance was decided by the user on 2026-10-24 (MDT-263); adding `Chore` to the enum is explicitly out of scope.
