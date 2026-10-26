# Pre-flight: MDT-261

- Source: [ticket](../MDT-261-unfinished-ticket-templates.md); status In Progress; parent MDT-232; related MDT-233 and MDT-229.
- Runtime: Bun, TypeScript; canonical schemas in domain-contracts; shared services; thin CLI/MCP/HTTP/native adapters.
- Workflow: global mdt:pipeline-e2e, matching MDT stage skills, spec-trace 0.4.0. docs/SKILLS.md retires the old standalone project pipeline; use the canonical lifecycle schema and validator.
- Owner documents read: AGENTS.md, README.md, docs/SKILLS.md, docs/PRE_IMPLEMENT.md, DEBUG.md, server/docs/ARCHITECTURE.md, domain-contracts/AGENTS.md, cli/AGENTS.md, cli/tests/e2e/AGENTS.md, plugins/README.md, plugins/dsh/AGENTS.md, scripts/AGENTS.md.
- Ticket commit: 291154f3, ticket only; all Lefthook checks passed after replacing the home shorthand with an environment-variable path.
- Baseline: `bun test cli/tests/e2e/ticket/create.spec.ts` — exit 0, 18 passed, 79 assertions. No application servers started or restarted.
- Planned verification: domain/shared/CLI/server/MCP builds; focused detector and adapter tests; CLI process E2E; isolated Git/Lefthook commits; frontend creation-feedback coverage; changed-file lint and type validation.
- Preserve concurrent cloud-sync edits to shared/services/cloud-sync/create-management-service.ts and shared/services/cloud-sync/project-state-store.ts. No task ownership in those modules. Recheck HEAD and worktree before every implementation handoff.
- Findings: native BB and DSH now share plugins/_lib/mdt-tools.js, including optional body input; ticket wording is refreshed to that live boundary. HTTP ProjectController returns the service creation result directly; frontend clients currently assume different response shapes, so diagnostics must be retained through their consumption.
- Gates: architecture skill requires explicit approval of consequential public-contract and cross-module decisions. Complete reviewable design before requesting it; never close without user approval.
