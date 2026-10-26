# Test Plan: MDT-262

## Verification Map

- TEST-native-coverage: `plugins/tests/coverage.test.ts`, `plugins/bb/tests/coverage.test.ts` — complete non-cloud command set, alias mapping, real project/ticket/trace lifecycles, pagination/content, schema and argument boundaries. A failing registered spec_trace_validate call must retain stdout JSON issue codes and remediation guidance together with stderr summary.
- TEST-regression: `plugins/tests/core.test.ts`, `plugins/tests/dsh.test.ts`, `plugins/tests/lib-sync.test.ts`, `plugins/tests/bb-workspace.test.ts`, `plugins/bb/tests/plugin.test.ts` — preserved error/output contracts, BB host guard, DSH shell/workdir/sandbox mapping, sync, output cap and cancellation.
- TEST-docs: coverage tests inspect the shipped skill and coverage inventory; human review checks root/plugin navigation and explicit CLI-only cloud policy.

## Commands

Run from `plugins/`: `/opt/homebrew/bin/bun test tests bb/tests`.
Run from root: `/opt/homebrew/bin/bun x tsc --project plugins/bb/tsconfig.json --noEmit`; `bb plugin build plugins/bb`; targeted ESLint over changed plugin sources.

Real CLI tests use a new temporary project root and isolated CONFIG_DIR; create/rename/delete affect only that fixture. They call registered BB tools through the real runners. No production server restart is needed.

## Evidence Boundaries

Automated registration/subprocess tests establish behavior of the plugin with real CLIs. A fresh BB thread verifies installed native discovery/skill availability after reload. The current session retains its old catalog. DSH offline tests establish adapter compatibility; DSH fresh-host live operation remains separately pending. No monorepo/cloud/full-stack readiness claim is made.
