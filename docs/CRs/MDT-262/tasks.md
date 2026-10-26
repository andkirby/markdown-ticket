# Tasks: MDT-262

## Scope Boundaries

Only plugin runtime/test/documentation paths, root README and this ticket's workflow artifacts. Cloud, CLI/shared business logic, frontend/backend and unrelated dirty work are excluded.

## Ownership Guardrails

Shared tables own capabilities; host adapters own runtime mechanics; plugin docs and shipped skill own usage/discovery. No duplicated business logic. Constraints C1–C4 apply to Task 1; C1/C5 to Task 2.

## Milestones

M1 (Task 1): project_lifecycle, ticket_lifecycle, trace_lifecycle through registered BB tools with real CLIs.
M2 (Task 2): discover_tool_guidance through packaged skill, coverage inventory and fresh installed BB session.

### Task 1: Complete native adapters and executable coverage

**Canonical Task**: TASK-1. **Skills**: bb-plugin-authoring.
**Creates**: plugins/bb/lib/spec-trace-tools.js, plugins/tests/coverage.test.ts, plugins/bb/tests/coverage.test.ts.
**Modifies**: plugins/_lib/mdt-tools.js, plugins/_lib/spec-trace-tools.js, plugins/_lib/run-cli.js, plugins/_lib/bb-workspace.js, plugins/bb/server.ts, plugins/bb/lib/mdt-tools.js, plugins/bb/lib/run-cli.js, plugins/bb/lib/bb-workspace.js, plugins/bb/package.json, plugins/dsh/mdt.js, plugins/dsh/spec-trace.js, plugins/dsh/lib/kit.js, plugins/tests/core.test.ts, plugins/tests/dsh.test.ts, plugins/tests/lib-sync.test.ts, plugins/tests/bb-workspace.test.ts, plugins/bb/tests/plugin.test.ts. Modify only when required; unchanged owner files are preservation boundaries.
**Deletes**: None.
**Must Not Touch**: CLI/shared/cloud implementation or unrelated worktree paths.
**Boundary/Exclude**: No cloud wrappers or generic arbitrary-command tool. No DSH live host changes.
**Duplication Guard**: Extend existing tables and runners; sync install-safe copies, never add business rules in adapters.
**Makes GREEN**: project_lifecycle, ticket_lifecycle, trace_lifecycle, TEST-native-coverage, TEST-regression.
**Re-plan Trigger**: CLI grammar or SDK cannot support the declared command without changing business owners.
**Verify** (plugins cwd): `/opt/homebrew/bin/bun test tests bb/tests`.
**Observe**: registered tools execute real project/ticket/trace lifecycle in temporary fixture from coverage.test.ts; `bb plugin build plugins/bb` from root.
**Done when**:
- [x] New capability tests show RED then GREEN.
- [x] Complete plugin suite, build and typecheck pass; bounded execution/host guards preserved.
- [x] Mutation boundaries and synced copies checked.

### Task 2: Document and verify tool discovery

**Canonical Task**: TASK-2. **Skills**: bb-plugin-authoring.
**Creates**: plugins/README.md, plugins/docs/coverage.md, plugins/docs/usage.md.
**Modifies**: plugins/bb/skills/mdt-tools/SKILL.md, plugins/dsh/AGENTS.md, plugins/dsh/DEBUG.md, README.md, docs/SKILLS.md.
**Deletes**: None.
**Must Not Touch**: Runtime ownership from Task 1 or unrelated documentation.
**Boundary/Exclude**: Do not claim DSH live readiness or native cloud support.
**Duplication Guard**: One plugin entry point and one coverage matrix; root README links instead of duplicating setup.
**Makes GREEN**: discover_tool_guidance, TEST-docs.
**Re-plan Trigger**: Installed package does not expose its shipped skill/catalog in a fresh session.
**Verify** (plugins cwd): `/opt/homebrew/bin/bun test tests/coverage.test.ts`.
**Observe**: install/reload the scoped BB plugin; fresh BB session discovers tools and loads mdt-tools skill.
**Done when**:
- [x] README, docs and skill explain command contracts, examples, cloud exclusion and verification lanes.
- [x] Independent review passes and verified/pending evidence is recorded.

## Architecture Coverage Check

All 28 concrete artifact paths map to Task 1 or Task 2. Missing runtime file: BB spec-trace copy, created by Task 1. Missing test/docs files are assigned above. Numeric gaps: 0. Existing workspace helpers/tests need no mutation unless contract changes require it.
