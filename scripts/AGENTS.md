# scripts/ — Repo Tooling

Guidance for agents working in this directory.

## Rules

- `scripts/` is repo tooling and is **tracked by default** — eslint and the root tsconfig (`include: ["scripts"]`) cover it automatically. A new tool needs zero gitignore or config work: drop it in with a header comment stating its purpose.
- The `_*` prefix is the local-scratch convention — never commit those.
- `scip-finder` and `scip-index` are globally installed (homebrew); usage is documented in the root `AGENTS.md`. The local `scripts/index.scip` is a regenerable index artifact (ignored).
- Hand-written `.js` needs an explicit `!` negation in `.gitignore` (the global `**/*.js` rule exists for build output).

## Inventory (tracked)

| Entry | Purpose | Referenced by |
|---|---|---|
| `e2e/` | E2E wrapper + out-of-process backend + temp-dir cleanup (MDT-239) — design rationale in [e2e/AGENTS.md](e2e/AGENTS.md) | `package.json` `test:e2e*` |
| `validate-ts.sh`, `validate-changed-ts.sh` | tsc per project / changed files | `validate:ts*` |
| `lint-changed.sh` | eslint on changed files | `lint:changed*` |
| `smart-server.sh` | Dev server lifecycle | `smart-server*`, `DEBUG.md` |
| `inspect-config.ts` | Where each setting lives | `inspect:config*`, `docs/CONFIG_INSPECTION.md` |
| `tests-report.sh` | FAIL-file test report | `DEBUG.md` |
| `parse-css.mjs`, `setup-css-gate.sh` | CSS syntax pre-commit gate | lefthook |
| `install-git-hooks.sh`, `githooks/` | Hook installation | `hooks:install` |
| `validate-mermaid-md` | Mermaid block linting | lefthook |
| `check-shared-usage.sh` | Dead-code check in shared/ via `scip-finder` | — |
| `sync-dates.ts` | Frontmatter dates ← git history | `docs/review-dates-*.md` |
| `build-trace-store.ts`, `render-traceability-view.ts`, `render-verification-report.ts` | Spec-trace store + report renderers | spec-trace workflow |
| `migrate-*.sh`, `migrate-blocks.ts`, `lib/` | Historical one-time migrations | — |
| `blarify/` | Code-graph build/watch (external service) | own README |
