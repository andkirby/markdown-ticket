---

# Architectural Drift Detection for MDT — Research Report

**Repo ground truth checked (read-only):** `.knip.json` exists but **ignores `mcp-server/**`, `domain-contracts/**`, `shared/**`, `cloud/**`** — which is exactly why drift #1 and #3 went uncaught. `server/controllers/ProjectController.ts` has 6 `req.body as X` casts; `mcp-server/package.json` declares `zod: ^3.22.4`; `server/repositories/ConfigRepository.ts` still exists.

## Per drift class

### #1 — Declared-but-unused runtime validation → **Knip (already installed; needs config fix)**

- Knip builds a full module graph and reports unused exports (`knip.dev/typescript/unused-exports`) and handles workspaces natively (`knip.dev/features/monorepos-and-workspaces`) — MDT's npm-style `workspaces` array is read out-of-the-box.
- **The "exported but only imported by tests" nuance:** default mode lints *all* source incl. tests (FAQ: "Unless using production mode, also lint all source code like tests, scripts…"), so a validator consumed only by tests counts as used. **`knip --production`** (production mode, `knip.dev/features/production-mode`) excludes tests/devDependencies, so those exports get reported. Run both: default for DX, prod mode for true dead code.
- **Fix for MDT:** remove the `ignore` entries for `domain-contracts/**`, `mcp-server/**`, `shared/**`, `cloud/**` and add proper per-workspace `entry` patterns (or add a second `.knip.prod.json` — a `knip:prod` script already exists). No new dependency.

### #2 — Blind trust-boundary casts → **`@typescript-eslint/no-unsafe-type-assertion`** ✅ (this is the big find)

- Shipped in **typescript-eslint v8.15.0 (2024-11-18**, PR #10051). Rule: "Disallow type assertions that narrow a type" (`typescript-eslint.io/rules/no-unsafe-type-assertion`). I verified the rule source: it explicitly handles `any` (message: *"Unsafe type assertion: type 'any' is more narrow than the original type"*) and even the `unknown ⇒ any` case. **`req.body as ProjectCreateInput` is flagged directly.** Type-aware (needs `parserOptions.project`), not configurable, `--fix`-less by design.
- **Why the rules you listed don't do it:** `no-unsafe-assignment` only flags assignments where the *resulting* type is `any` — `req.body as T` yields type `T`, so it passes (docs: `typescript-eslint.io/rules/no-unsafe-assignment`). `consistent-type-assertions` only restricts *style*, and its `objectLiteralTypeAssertions: 'never'` only covers object-literal initializers — `req.body as X` (identifier operand) is untouched (docs: `typescript-eslint.io/rules/consistent-type-assertions`).
- **Config** (in `server` and `mcp-server` eslint configs, where all boundary casts live):
  ```js
  rules: {
    "@typescript-eslint/no-unsafe-type-assertion": "error",
  }
  ```
  If repo-wide adoption is too noisy, scope with an override block for `controllers/**` / `tools/handlers/**`. Long tail of `as`-casts elsewhere can be burnt down via `--report-unused-disable-directives` + disable comments, matching the repo's existing `max-warnings 0` policy.
- **Alternative engine:** Oxlint ships the same rule (`typescript/no-unsafe-type-assertion`, added v1.12.0, backed by tsgolint type-aware checks) — `oxc.rs/docs/guide/usage/linter/rules/typescript/no-unsafe-type-assertion`. Only relevant if MDT swaps lint engines.
- Custom-rule fallback (if you were pinned to an older typescript-eslint): a ~30-line `TSAsExpression` visitor comparing checker types — but with v8.15+ you don't need it. Note the repo currently only sets `no-explicit-any: 'warn'` at root.

### #3 — Phantom dependencies → **Knip** (same config fix as #1)

Knip reports dependencies listed in `package.json` but never imported (`knip.dev/typescript/unused-dependencies`, guide: `knip.dev/guides/handling-issues`). The mcp-server `zod` entry is flagged the moment `mcp-server/**` leaves the `ignore` list. Knip also catches the inverse (unlisted deps, `knip.dev/reference/issue-types`). Dedicated tools like `sherif`/`check-dependency-version-consistency` (github.com/bmish/check-dependency-version-consistency) only add *version-consistency* checks — skip for now; Knip covers the actual finding.

### #4 — Doc-vs-code drift (ADR claims) → **no mature deterministic tool — needs a small convention test**

Searched hard for "architecture-as-code" checkers that verify prose claims against a codebase. Findings:

- The 2024–2026 ecosystem answer is **AI-based drift detection**: Dosu's Claude Code + GitHub Actions flow (dosu.dev/blog/how-to-catch-documentation-drift-claude-code-github-actions), Mintlify's guidance (mintlify.com/library/how-to-stop-documentation-drift), and community skills like `doc-drift-detector` (github.com/borghei/Claude-Skills). All probabilistic — fine as a review aid, wrong as a CI gate.
- FINOS **CALM** (calm.finos.org) models architecture as machine-readable JSON and validates the *model*, not prose-vs-repo — a bigger commitment than the problem warrants.
- **Recommendation: a ~50-line convention test** in the existing bun/Jest suite. MDT is literally a markdown-ticket tool whose CRs already have YAML frontmatter — add an optional `claims:` block (e.g. `claims: { deleted_paths: ["server/repositories"], no_direct_imports: { "server": ["zod"] } }`) to architecture CRs, and one test walks all CRs and asserts each claim. Your own tool becomes the doc-drift checker; deterministic, zero deps, exactly the repo's stated philosophy. This is a custom build, not an adoption.

### #5 — Duplicate hand-written types diverging from Zod → **compile-time type-equality tests** (no diffing tool exists)

- Nothing on npm diffs a Zod schema against a hand-written interface automatically; `zod-to-ts` (github.com/sachinraja/zod-to-ts) prints schemas as TS strings but string-diffing is brittle (formatting, aliases, recursion) — skip it.
- The standard, low-false-positive technique is a **type-level equality assertion** in a `*.test-d.ts` (or plain `types.test.ts`) checked by your existing `tsc` pass:
  ```ts
  type Expect<T extends true> = T;
  type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

  type _TicketMatches = Expect<Equal<HandWrittenTicket, z.infer<typeof TicketSchema>>>;
  // fails compilation the moment either side drifts
  ```
  (Pattern per StackOverflow "Check Zod types are equivalent to a TypeScript interface?" — stackoverflow.com/questions/75886482 — and Vitest's `expectTypeOf(...).toEqualTypeOf<>()` if you prefer vitest: vitest.dev/api/expect-typeof, vitest.dev/guide/testing-types.) MDT runs Jest + `tsc --project tsconfig.shared.json`, so a `.test-d.ts` under `typeCheck` globs works with zero new tooling. Also delete the duplicates where possible — the test is a guard, not an excuse.
- **Boundary enforcement bonus:** for "server may not import zod directly, must go through domain-contracts", **dependency-cruiser** is the right tool (rule from `github.com/sverweij/dependency-cruiser`, tutorial: github.com/sverweij/dependency-cruiser/blob/main/doc/rules-tutorial.md):
  ```js
  // .dependency-cruiser.cjs
  { forbidden: [{
      name: "server-no-direct-zod",
      severity: "error",
      from: { path: "^server" },
      to:   { path: "node_modules/zod" },
    }, {
      name: "consumers-via-domain-contracts",
      from: { pathNot: "^domain-contracts" },
      to:   { path: "^server/(repositories|services)" },  // example layering rule
    }]}
  ```
  `bunx depcruise server mcp-server cli cloud` is CI-able. **eslint-plugin-boundaries** (jsboundaries.dev/docs/rules, npmjs.com/package/eslint-plugin-boundaries) can express the same via `boundaries/dependencies` with element types — but it demands classifying your whole repo into elements; dependency-cruiser gets the same guarantee from one regex rule and additionally reports orphans/circulars. **ArchUnitTS** (github.com/LukasNiessen/ArchUnitTS) is the ArchUnit-style test-runner alternative — good, but redundant with dependency-cruiser for import-direction rules. Pick one; I'd pick dependency-cruiser and skip boundaries + ArchUnitTS.

## Minimal toolchain for MDT (in adoption order)

| Step | Tool | New deps | Catches | Setup cost |
|---|---|---|---|---|
| 1 | **Knip** — un-ignore 4 workspaces in existing `.knip.json`, add `entry` patterns; add `knip --production` run | 0 (already installed) | #1, #3 | ~30 min config |
| 2 | **`@typescript-eslint/no-unsafe-type-assertion: error`** in server + mcp-server configs (typescript-eslint ≥ 8.15) | 0 (version bump at most) | #2 | ~10 min |
| 3 | **dependency-cruiser** — 2–3 forbidden rules, `depcruise` script | 1 devDep | import-direction drift (incl. your "server must not import zod" rule) | ~1 h |
| 4 | **Convention tests**: `Expect<Equal<...>>` type tests under existing `tsc` + CR-frontmatter `claims:` assertion test in bun/Jest | 0 | #5, #4 | ~2 h, mostly design |

Skip: eslint-plugin-boundaries (overlaps #3's dep-cruiser, heavier config), ArchUnitTS (overlap), eslint-plugin-zod (style rules only, and targets zod@^4 — see below), zod-to-ts diffing (brittle), AI doc-drift services (optional later review aid, not a gate).

## Zod 3 → 4 note (repo pins ^3.22.4)

- The recommended toolchain is **zod-version-agnostic** (knip, dependency-cruiser, typescript-eslint rules) — nothing here blocks or complicates an upgrade.
- Ecosystem lag is real where you'd touch it: `eslint-plugin-zod` explicitly targets `zod@^4`; `zod-to-ts` now peers `zod@4` (it was built for v3) — so any v3-era schema-analysis tooling you adopt now should be re-checked at upgrade time.
- The migration (zod.dev/v4/changelog) changes *inferred types* in ways your type-equality tests are designed to catch — notably `z.unknown()`/`z.any()` no longer mark keys optional in `z.infer` output, changed `.default()` semantics (input→output type), and removed `.deepPartial()`/`.nonstrict()`. That's an argument for doing **step 4 before the upgrade**: the `Equal<>` tests become your upgrade safety net.

## Key sources

- Knip: knip.dev/features/monorepos-and-workspaces · knip.dev/features/production-mode · knip.dev/guides/handling-issues · knip.dev/reference/faq
- typescript-eslint: typescript-eslint.io/rules/no-unsafe-type-assertion (shipped v8.15.0, changelog line: "new rule `no-unsafe-type-assertion` #10051") · typescript-eslint.io/rules/no-unsafe-assignment · typescript-eslint.io/rules/consistent-type-assertions · proposals #7173, #8723
- dependency-cruiser: github.com/sverweij/dependency-cruiser (+ doc/rules-reference.md); cross-module rule walkthrough: dev.to/jacobandrewsky/avoid-cross-module-dependencies-with-dependency-cruiser-3b0b
- eslint-plugin-boundaries: jsboundaries.dev/docs/rules
- Zod: zod.dev/v4/changelog · github.com/sachinraja/zod-to-ts · stackoverflow.com/questions/75886482 · vitest.dev/api/expect-typeof
- ArchUnitTS: github.com/LukasNiessen/ArchUnitTS
- Doc drift (AI-era): dosu.dev/blog/how-to-catch-documentation-drift-claude-code-github-actions · mintlify.com/library/how-to-stop-documentation-drift · calm.finos.org

**Skipped/unverified:** I didn't benchmark knip runtime on the full 6-workspace graph after un-ignoring (expect it to surface a first-run backlog of findings — treat as a cleanup list, gate CI after triage). Risk: the `no-unsafe-type-assertion` rule is strict — `as`-casts in tests and `worker-configuration.d.ts`-adjacent code may need scoped overrides, so enable it per-package (server, mcp-server) first rather than at root.

