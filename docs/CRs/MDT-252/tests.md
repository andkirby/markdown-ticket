# Tests: MDT-252

Canonical file/coverage links: [tests.trace.md](tests.trace.md). Executable tests precede implementation; trace validation is not runtime proof.

## Executable lanes

- `bun run --cwd domain-contracts jest --runInBand --runTestsByPath src/ticket/__tests__/external-reference.test.ts`
- `bun test domain-contracts/src/ticket/__tests__/patterns.test.ts`
- `bun run --cwd shared jest --runInBand --runTestsByPath tests/services/external-reference.test.ts`
- `bun run test:e2e -- tests/e2e/ticket/external-references.spec.ts tests/e2e/quick-search/external-references.spec.ts tests/e2e/board/drag-drop.spec.ts --project=chromium`
- `bun run validate:ts`, `bun run build:all`, changed-file ESLint and semantic-class validation.
- Rebuild CLI separately (`bun run --cwd cli build`); root build:all does not include CLI.

## Initial executed evidence

Baseline full build passed. The new domain suite ran and failed 3/3 assertions; shared round-trip suite ran and failed 3/3 assertions. The initial real HTTP journey ran and failed because refs are absent from ticket reads (one failure; fail-fast left three not run). These are expected feature RED observations, not accepted final evidence. The E2E fixture uses actual isolated files, TOML, API and browser; external navigation is intercepted locally, never a tracker API call.

## Required mechanisms and review

Round-trip both inline and block arrays, unknown strings/duplicates, punctuation and Unicode. Verify raw shorthand/canonical coexistence, operand-only expansion, exact-only idempotent removal, no read-time rebinding, same-origin/context/subgroup URLs, invalid optional entries, numeric versus #number identity matches, and preserved local-key/drag behavior. Browser acceptance must cover actual focus/targets, grouped short links, touch/keyboard hidden-only overflow and unavailable explanations, overflow/viewport bounds, hidden-board versus visible-search/viewer refs, and read-only access.

The authored tests exercise these through public boundaries; the Tests stage is responsible for filling concrete gaps discovered during review before final verification. Final completion cannot infer unexecuted assertions from coverage labels. No external tracker service or new server mode is required. Existing servers must not be restarted; the isolated E2E wrapper owns only its temporary services.

## Verification reconciliation

The first domain-only run failed three new assertions (mdt252-domain-red.log). A later combined Jest invocation also included the existing bun:test patterns suite and was invalid for that preservation lane. Final verification separates the new Jest suite from the 53-case Bun patterns suite, with a no-DOM preload configuration. The corrected domain command has no fabricated immutable RED capture; the original executed RED assertions remain historical evidence. Existing shared/MCP/E2E immutable RED captures retain their original argv binding.

The required validate:ts check exposed legacy fixture omissions and ignored local scripts/_probe files in tracked-tooling scope. The narrowly declared fixture-shape and scratch-exclusion corrections preserve all assertions; the check now passes all six affected projects. Changed-file ESLint uses each package config and --no-warn-ignored because the stock changed wrapper treats intentionally ignored E2E/formatter paths as warnings. No lint rules are disabled.

Observed before sealed completion: 49/49 browser acceptance/regressions, 99/99 frontend filtering/render/keyboard tests, 47/47 server API/controller tests, 17/17 shared policy/round-trip tests, 3/3 domain contracts, 2/2 MCP contracts, 53/53 existing local-key patterns. Standalone style-guide light/dark and actual app compact/light, comfortable/dark screenshots were inspected. Exact sealed run and independent final review remain the completion authority; these counts do not claim a full repository suite run.

After the scope corrections, final plan sealing replays the saved implementation patch over the actual pre-feature code while retaining authored specs/tests. Every saved byte is restored after sealing. This lets the verifier bind runtime mutation actions honestly and capture the corrected domain Jest command as actual RED; final commands then execute on the restored implementation. Original immutable evidence remains unmodified.

Final keyboard audit added an actual input-to-result action path (F6/native Tab/Shift+F6), visible hint, empty-state handling, and a physical-keyboard browser journey. Frontend preservation retains all four source suites and all 99 tests. The two pure suites run directly (42 + 36). The two React suites are compiled unchanged with esbuild (React/ReactDOM and bun:test remain external), then run with the existing DOM preload (21). This reduces Bun module-descriptor pressure without removing assertions or mocking production behavior. The exact compile/test argv are sealed; generated bundles stay in Git evidence storage. The first sealed run correctly blocked on an ENFILE import failure after its earlier checks passed; it is retained as failed evidence, never re-labelled green.

Final boundary review added actual MCP read-handler JSON preservation with sanitization enabled/disabled (4 tests), real absent/add/replace/clear live updates across board/viewer/cached searches, and two controlled delayed-response races (2/2 targeted browser cases passed). The latter hold real HTTP response bodies to prove post-invalidation requests cannot reuse old transport promises and an old canonical response cannot survive A→B→A selection. Existing cross-project helper preservation adds 14 tests to the compiled UI lane (35 across three bundles; original pure lanes remain 42+36). The first final semantic verdict withheld completion for these gaps; all corrections receive a new sealed run rather than re-labelling the prior evidence.

The delayed-response guards also cross the dataLayer dedupe boundary using a per-hook namespace/cache generation and compare a committed selection generation for affected-ticket callbacks. Targeted race tests pass 2/2. The existing dataLayer deduplication suite also runs unchanged as a fourth compiled entry; explicit flattened entry names prevent silently selecting old bundle paths. Final totals are taken from the new sealed run rather than earlier counts.

Live/cached-query race fixtures use a unique external issue number derived from their isolated project code. Reusing PRJ-123 across the combined run correctly produced multiple matches from other fixture projects; the test now isolates its own external identity while retaining the full global-search/no-results assertions. Dedicated shared-ref/union cases continue to test multiple tickets pointing to the same external issue.

Popover focus is applied synchronously in the Radix onOpenAutoFocus lifecycle, where content is mounted. Deferring it to requestAnimationFrame could steal focus back after rapid Escape/Shift+F6. Physical keyboard repeat coverage verifies the correction without adding sleeps or weakening focus assertions.

Commit-gate reconciliation: package-specific ESLint runs from each package directory with package-relative file paths/config. Running those configs from the repository root did not match the package production glob and incorrectly removed the existing MDT-258 cast-baseline marker in crHandlers. The original marker is restored; no new suppression is introduced. The corrected lint invocations and root commit-hook lint must both pass.

## UAT: grouped instance badges and hidden-only overflow

The user replaced the original two-inline complete-list inspector with relationship-style groups: one icon, three short native links and +N per instance. Dropdowns use the same short labels and exclude resolved inline entries. Unavailable refs retain a non-navigating explanation control. Full raw identities remain in link titles/accessibility names and unchanged storage.

Current focused verification: 26/26 Chromium tests passed across external-reference ticket/search journeys and existing drag-drop regression. This includes one-icon grouping, separate same-kind instances, three inline keys, exact hidden-only shortened overflow, no redundant trigger for all-fitting resolved refs, native link isolation, physical F6/Tab/Shift+F6 traversal, unavailable reasons, density/light-dark, narrow long labels, styleguide, live replace/clear and delayed-response races. Frontend build, changed-file lint and changed TypeScript validation (two projects, five files) passed. Smartflyer's running Safari web app was refreshed after the build and visually confirmed the grouped short-number badges; no server was restarted.

Raw logs for this UAT round live in the requesting BB thread storage: mdt252-group-final-e2e.log, mdt252-group-build.log, mdt252-group-types.log and mdt252-group-lint.log. These are new scoped evidence; the original sealed plan/run/review remain immutable history for their original source. Codex thread thr_g5ynmg2ccm passed the scoped UAT implementation review; three stale old-inspector descriptions identified in that review were reconciled in the active docs.

All three updated Wireloom mockup blocks compile to HTML. Both changed frontend components are GREEN under ts-metrics (CC 16/4, CoC 13/11); the full frontend red-only inventory still reports existing unrelated files, not these components.
