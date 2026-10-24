# MDT-258 leftovers result

Status: **complete**. All four documented leftovers landed and independently
reviewed (two review rounds, all findings closed). Baseline: `e27b9d1f`.
Commits: `7d8a5da3` (e2e), `da001cba` (dead exports), `89c73cde` +
`c4cf1599` (eslint gate), `0d8bde47` (MDT-099), `97b41a7a` + `cb4febdf`
(review fixes). Note: `0840242f` (MDT-170) is the parallel work stream and
is not part of this job.

## 1. E2E — Chromium installed, full suite run, 4 failures fixed

Chromium + chromium-headless-shell installed; first full browser run of the
suite ever in this checkout: 384 passed / 4 failed / 9 skipped. All four
failures were reproduced at the pre-MDT-258 parent commit `f292ac42`
(self-contained worktree, pinned zod v3 for domain-contracts) — pre-existing,
never seen because no browser could launch before:

| Failing spec | Root cause | Fix |
| --- | --- | --- |
| `board/invalid-status.spec.ts` (badge variant) | MDT-246 (`3991809f`) deliberately dropped `.badge--invalid`; styling keys off `[data-status="invalid"]` (badge.css:54). Test asserted the dead class. | Assert `data-status="invalid"` (current contract). |
| `ticket/side-doc-pane.spec.ts` BR-1.3 | The pane restores scroll one frame after the entry paints (rAF at TicketSidePane.tsx:263); the test read `scrollTop` before that frame and drove the offset while a restore frame was pending. Product behavior correct (probe verified restore lands at 480). | Flush the pending frame (double-rAF) before driving the offset; `expect.poll` for restored positions. |
| `sharing/read-access-journey.spec.ts:142` | MDT-244 added an unconditional `GET /api/config/selector` at App mount — an endpoint runtime policy 403s for viewers (`OwnerOnlyApiPrefix.CONFIG`) — 3 reloads = 3 forbidden probes. | Owner-gate the caller: `TicketKeyOptionsLoader` (own module, composed in App) loads only for owner-capable sessions; viewers keep defaults, no probe. Strict owner-only assertion restored in the test (an earlier exemption was rejected in review as masking the policy gap). |
| `ticket/type-icon-options.spec.ts:156` | Cross-run pollution: the sharing spec's runtime-config override cycle forced `NODE_ENV=test`, flipping `API_LOCAL_HOST_BYPASS`'s default OFF for the rest of the run — later tests lost the owner hamburger entry (no Settings item). | `scripts/e2e/backend.ts`: overrides change only the named keys; DELETE restores the captured boot config; deps type completed (TS2339 fixed). |

Final: **388 passed / 0 failed / 9 skipped** (full wrapper run, verified
twice; second run includes the parallel stream's MDT-170 frontend change).
Board render + create/update flows pass in a real browser (388 green
includes `ticket/boundary-crud` + full board/list/navigation suites).

## 2. Dead-export burn-down (shared + mcp-server only)

- Root cause of most false "unused" findings: knip's jest plugin never
  fired, so test-file imports were invisible. Fixed by adding the jest
  testMatch globs as knip entries for `shared` and `mcp-server` — this
  legitimately cleared ~50 findings without touching code.
- Burned down: shared 39 exports/types (demoted internal-only symbols
  across cloud-sync, epicRules, project, ticket subdocuments, path utils,
  test-lib; deleted 11 fully dead ones incl. `extname`, `join`,
  `getBaseNameWithoutExtension`, `resolveProjectRelativePath`,
  `applyTrustToConnection`, `ProjectConfigurationModes`, `ProjectScanOptions`,
  `ProjectValidationResult`, `ProjectExport`, `CloudAllocationResult`,
  `SimpleCR`, duplicate `TestCRResult`). mcp-server: 13 demoted after the
  entry fix exposed them.
- Kept (documented exceptions): `DevLogBatchSchema`/`FrontendLogBatchSchema`
  alias (untouched); `ProjectDetectionResult` (importing shared test);
  `mcp-server/src/tools/config/allTools.ts` trio `PROJECT_TOOLS`/
  `CR_SECTION_TOOLS`/`TOOL_CATEGORIES` — source-read contract of
  `toolConfiguration.test.ts` — under a one-file knip baseline.
- Whole-file `files` baselines left in place (file deletion is a separate
  decision from export burn-down); `server/**`, `cli/**`, `cloud/**`
  baselines untouched.
- Gate state: `bun run knip` exits 0; the stricter
  `knip --workspace mcp-server --include-entry-exports --include exports,types`
  also exits 0 (entries narrowed to `src/index.ts` + tests after review
  caught the everything-as-entry hole). Known limit: the same strict lens
  on `shared` still reports entry-export findings from the test-lib barrel
  consumed by server/cli tests — those workspaces' baselines are out of
  scope here.

## 3. eslint `no-unsafe-type-assertion` gate (the failed attempt, landed)

- Rule `ts/no-unsafe-type-assertion: 'error'` via typed linting
  (`projectService`), active in **root** `eslint.config.ts`
  (`server/**/*.ts` + `mcp-server/src/**/*.ts`, dist/test/config scoped off)
  and mirrored in **server** and **mcp-server** package configs — lefthook
  eslint-staged (root) and both package lints agree.
- Baseline: **37 files / 149 casts** (29 server + 8 mcp-server), line-1
  `/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline … */`
  markers; line 2 after the shebang in `mcp-dev-tools/src/index.ts`; no
  duplicates. Lesson from the failed attempt confirmed in practice: the
  staged `--fix` pass strips markers from any file the ROOT config does not
  gate — first commit lost 6 markers until the root scope covered
  `server/security/**` + `server/config/**` (`c4cf1599`).
- Fixes the gate surfaced: apiAuth loopback regex used capturing groups a
  blank `replace()` never read → now `^\[|\]$` (behavior identical,
  apiAuth suite 36/36); mcp test files scope `ts/no-explicit-any` off like
  the server package (pre-existing `--max-warnings` failures cleared); root
  mirrors the server package's `no-console` allowance for mcp-dev-tools +
  `routes/devtools.ts`.
- `lint:server` and `lint:mcp` exit 0 (full package runs, not
  changed-files). `lint:frontend` fails at HEAD exactly as before it
  (23 pre-existing errors in frontend `__tests__` files, untouched).

## 4. MDT-099 correction + claims guard

- The false "server/repositories/ no longer exists" claim is struck with a
  dated correction note (2026-10-24) naming `ConfigRepository.ts` and its
  DocumentService/TreeService consumers; history not rewritten.
- `scripts/doc-claims.test.ts` (~50 lines): walks `docs/CRs/MDT-*.md`
  fenced ```claims blocks, asserts every `paths_exist:` path exists, and
  requires the convention to stay exercised (MDT-099 carries the founding
  claim). Verified it fails on a stale path.

## 5. Verification evidence

| Check | Result |
| --- | --- |
| `bun run check:boundaries` | PASS — 152 identities / 160 occurrences / 25 decoder modules |
| `bun run test:boundaries` | PASS — 46 tests, 0 fail |
| `bun run knip` | exit 0 (strict mcp lens also 0) |
| `bun test ./domain-contracts/src` | 368 pass / 0 fail (baseline) |
| `bun run --cwd mcp-server test --runInBand` | 242 passed (one unrelated timing flake observed once, green on re-run) |
| `bun run --cwd shared build` | exit 0 |
| Shared jest (`CONFIG_DIR=<tmp>`, `--runInBand`) | 1103 pass / 3 fail — the documented test-lib integration baseline (MDT-099 recorded the same 3) |
| `bun run lint:server` / `lint:mcp` | exit 0 / exit 0 |
| `bun run test:e2e` | 388 passed / 0 failed / 9 skipped |
| `tsc --noEmit -p tsconfig.shared.json` | clean (incl. `scripts/e2e/backend.ts`) |

Not chased (documented pre-existing): frontend `test-setup.ts` TS errors +
frontend `__tests__` lint errors, 2 domain-contracts `bun:test` jest suites,
shared test-lib ×3 integration failures, shared strict-knip entry-export
findings (server/cli test consumers), intermittent mcp jest timing flake.
