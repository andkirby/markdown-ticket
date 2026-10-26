# Tasks: MDT-261

## Scope and execution

User approved the architecture and requested completion. Use mdt:implement --all. Policy and staged adapters have disjoint file ownership and can have up to two workers; creation integration remains with the lead. No shared-hook repository mutation before recorded local verification.

### Task 1: policy (TASK-1)

**Milestone**: M1 — policy

**Skills**: mdt:implement

**Structure**: `domain-contracts/src/ticket/creation-result.ts`, `domain-contracts/src/ticket/index.ts`, `shared/templates/catalog.ts`, `shared/templates/legacy-instructions.ts`, `shared/services/TemplateService.ts`, `shared/services/ticket/content-inspection.ts`, `scripts/generate-ticket-templates.ts`, `shared/package.json`, `shared/templates/architecture.md`, `shared/templates/bug-fix.md`, `shared/templates/feature-enhancement.md`, `shared/templates/technical-debt.md`, `shared/templates/documentation.md`, `shared/templates/research.md`, `shared/templates/templates.json`, `shared/tests/services/MDT-261/content-inspection.test.ts`, `shared/tests/services/MDT-261/template-catalog.test.ts`, `domain-contracts/src/ticket/__tests__/creation-result.test.ts`

**Makes GREEN**: TEST-content-inspection, TEST-template-catalog, TEST-diagnostic-contract

**Constraint carryover**: BR-1.1,BR-1.2,C1,C2,C3,Edge-2

**Scope**: Schemas, pure content inspection, compiled template catalog, projections and compatibility phrases.

**Boundary**: Own only listed source paths. No cloud coordination internals, server restarts or unrelated work.

**Creates**:
- domain-contracts/src/ticket/creation-result.ts
- shared/templates/catalog.ts
- shared/templates/legacy-instructions.ts
- shared/services/ticket/content-inspection.ts
- scripts/generate-ticket-templates.ts
- shared/templates/research.md

**Modifies**:
- domain-contracts/src/ticket/index.ts
- shared/services/TemplateService.ts
- shared/package.json
- shared/templates/architecture.md
- shared/templates/bug-fix.md
- shared/templates/feature-enhancement.md
- shared/templates/technical-debt.md
- shared/templates/documentation.md
- shared/templates/templates.json
- shared/tests/services/MDT-261/content-inspection.test.ts
- shared/tests/services/MDT-261/template-catalog.test.ts
- domain-contracts/src/ticket/__tests__/creation-result.test.ts

**Deletes**: None

**Must Not Touch**: shared/services/cloud-sync/**; unrelated staged changes; external shared-hooks checkout before the local gate.

**Anti-duplication**: Import canonical diagnostics and shared inspection; no policy in adapters or hook.

**Duplication Guard**: Inspect current owners before coding and reject a second detector or independent transport notice.

**Re-plan Trigger**: Changed owner/API, cloud retry identity drift, a weakened canonical assertion, or effective hook omission.

**Verify**:

```bash
bun run --cwd shared jest tests/services/MDT-261/content-inspection.test.ts tests/services/MDT-261/template-catalog.test.ts --runInBand
```

**Observe**: Execute the same real-process acceptance command at this checkpoint; after the final task execute all creation/staged/browser acceptance and build/type/lint checks recorded in the sealed verification plan.

**Done when**:
- [x] Required feature behavior transitions from RED to GREEN
- [x] All planned mutations present and no unrelated mutation
- [x] No duplicate policy or weakened assertion
- [x] Runtime proof and applicable constraints pass

### Task 2: staged (TASK-2)

**Milestone**: M2 — staged

**Skills**: mdt:implement

**Structure**: `shared/services/ticket/staged-validation.ts`, `cli/src/commands/validate.ts`, `cli/src/index.ts`, `cli/src/output/formatter.ts`, `scripts/check-ticket-templates.sh`, `lefthook.yml`, `cli/mdt-cli/SKILL.md`, `scripts/AGENTS.md`, `cli/tests/e2e/ticket/validate.spec.ts`, `cli/tests/e2e/ticket/template-hook.spec.ts`

**Makes GREEN**: TEST-staged-template-validation, unfinished_staged_body, genuine_staged_body, staged_version_wins, changed_primary_scope, validator_failure_visible

**Constraint carryover**: BR-2.1,BR-2.2,BR-2.3,BR-2.4,BR-2.5,C4,C5,C6,Edge-1

**Scope**: Git index/config snapshot, validation presentation and tracked local hook, including full effective configuration tests.

**Boundary**: Own only listed source paths. No cloud coordination internals, server restarts or unrelated work.

**Creates**:
- shared/services/ticket/staged-validation.ts
- cli/src/commands/validate.ts
- scripts/check-ticket-templates.sh
- cli/tests/e2e/ticket/template-hook.spec.ts

**Modifies**:
- cli/src/index.ts
- cli/src/output/formatter.ts
- lefthook.yml
- cli/mdt-cli/SKILL.md
- scripts/AGENTS.md
- cli/tests/e2e/ticket/validate.spec.ts

**Deletes**: None

**Must Not Touch**: shared/services/cloud-sync/**; unrelated staged changes; external shared-hooks checkout before the local gate.

**Anti-duplication**: Import canonical diagnostics and shared inspection; no policy in adapters or hook.

**Duplication Guard**: Inspect current owners before coding and reject a second detector or independent transport notice.

**Re-plan Trigger**: Changed owner/API, cloud retry identity drift, a weakened canonical assertion, or effective hook omission.

**Verify**:

```bash
bun test cli/tests/e2e/ticket/validate.spec.ts cli/tests/e2e/ticket/template-hook.spec.ts
```

**Observe**: Execute the same real-process acceptance command at this checkpoint; after the final task execute all creation/staged/browser acceptance and build/type/lint checks recorded in the sealed verification plan.

**Done when**:
- [x] Required feature behavior transitions from RED to GREEN
- [x] All planned mutations present and no unrelated mutation
- [x] No duplicate policy or weakened assertion
- [x] Runtime proof and applicable constraints pass

### Task 3: creation (TASK-3)

**Milestone**: M3 — creation

**Skills**: mdt:implement, mdt-frontend

**Structure**: `shared/services/TicketService.ts`, `cli/src/commands/create.ts`, `cli/src/output/structured.ts`, `mcp-server/src/tools/handlers/crHandlers.ts`, `server/services/TicketService.ts`, `frontend/src/services/ticketCreationResponse.ts`, `frontend/src/services/ticketCreationResponse.test.ts`, `frontend/src/hooks/useTicketOperations.ts`, `frontend/src/services/dataLayer.ts`, `cli/tests/e2e/ticket/template-diagnostics.spec.ts`, `cli/tests/e2e/helpers/cli-runner.ts`, `shared/tests/services/MDT-261/create-diagnostics.test.ts`, `mcp-server/src/tools/handlers/__tests__/create-diagnostics.test.ts`, `server/tests/services/MDT-261/create-diagnostics.test.ts`, `plugins/tests/template-diagnostics.test.ts`, `docs/design/surfaces/ticket-creation-feedback.spec.md`, `docs/TICKET_TEMPLATE_GUARD.md`, `bun.lock`, `package-lock.json`, `mcp-server/src/services/crService.ts`

**Makes GREEN**: TEST-create-template-diagnostics, TEST-browser-creation-feedback, generated_body_notice, authored_body_clean, supplied_instruction_notice

**Constraint carryover**: BR-1.1,BR-1.2,BR-1.3,C1,C2,C6

**Scope**: Actual formatter outcome, compatible shared creation result and CLI/MCP/HTTP/browser/native propagation; documentation and lockfile reconciliation.

**Boundary**: Own only listed source paths. No cloud coordination internals, server restarts or unrelated work.

**Creates**:
- frontend/src/services/ticketCreationResponse.ts
- shared/tests/services/MDT-261/create-diagnostics.test.ts
- mcp-server/src/tools/handlers/__tests__/create-diagnostics.test.ts
- server/tests/services/MDT-261/create-diagnostics.test.ts
- plugins/tests/template-diagnostics.test.ts
- docs/design/surfaces/ticket-creation-feedback.spec.md
- docs/TICKET_TEMPLATE_GUARD.md

**Modifies**:
- shared/services/TicketService.ts
- cli/src/commands/create.ts
- cli/src/output/structured.ts
- mcp-server/src/tools/handlers/crHandlers.ts
- server/services/TicketService.ts
- frontend/src/services/ticketCreationResponse.test.ts
- frontend/src/hooks/useTicketOperations.ts
- frontend/src/services/dataLayer.ts
- cli/tests/e2e/ticket/template-diagnostics.spec.ts
- cli/tests/e2e/helpers/cli-runner.ts
- bun.lock
- package-lock.json
- mcp-server/src/services/crService.ts

**Deletes**: None

**Must Not Touch**: shared/services/cloud-sync/**; unrelated staged changes; external shared-hooks checkout before the local gate.

**Anti-duplication**: Import canonical diagnostics and shared inspection; no policy in adapters or hook.

**Duplication Guard**: Inspect current owners before coding and reject a second detector or independent transport notice.

**Re-plan Trigger**: Changed owner/API, cloud retry identity drift, a weakened canonical assertion, or effective hook omission.

**Verify**:

```bash
bun test cli/tests/e2e/ticket/template-diagnostics.spec.ts
```

**Observe**: Execute the same real-process acceptance command at this checkpoint; after the final task execute all creation/staged/browser acceptance and build/type/lint checks recorded in the sealed verification plan.

**Done when**:
- [x] Required feature behavior transitions from RED to GREEN
- [x] All planned mutations present and no unrelated mutation
- [x] No duplicate policy or weakened assertion
- [x] Runtime proof and applicable constraints pass

## Architecture coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|---|---:|---:|---:|---|
| policy | 18 | 18 | 0 | Pass |
| staged | 10 | 10 | 0 | Pass |
| creation | 20 | 20 | 0 | Pass |

## Evidence-driven task refinements

- Task 3 also owns the preservation doubles for the additive MCP/server operation API, plugins/docs/coverage.md, and tests/e2e/ticket/template-warning.spec.ts. Their exact canonical paths are in architecture.trace.md and TASK-3. Existing call/argument assertions remain; obsolete complete-template message assertions now check a returned diagnostic fixture.
- Task 3 modifies frontend/src/test-setup.ts to repair two pre-existing production typecheck errors in its ambient Jest/Bun declarations. The DOM registration order and side-effect matcher setup are preserved; 26 frontend cases verify the bridge. This is required build viability, not a product behavior change.
- Browser proof uses the actual production DataLayer consumer and mounted Toaster rather than a nonexistent routed Create control. ProjectView hides the legacy Board header. No new UI entry point or weakened diagnostic requirement.
- Added real shared/installed native-runner process tests, actual HTTP/MCP forwarding cases and the final actual-effective-hook execution proof.
- Updated ownership: policy 18, staged 10, creation 32 paths; all 60 canonical paths have exact task ownership, no deletions or numeric coverage gap.

## Accepted task proof

- TASK-1: domain build/schema 4 tests; policy/catalog/legacy and explicit custom overrides pass; final shared preservation run 97 tests. RED evidence is sealed in the verification plan.
- TASK-2: 28 real index/hook cases, 114 assertions; actual registered root Lefthook job blocks and passes using isolated index/object storage; no main index or worktree mutation.
- TASK-3: seven creation-format cases; five shared operation cases; MCP 38, HTTP/service six, browser/frontend 26, one actual browser feedback case, and 135 broader CLI/native preservation cases pass. Full build and CLI build pass.
- The existing CLI runner change was completed in the earlier BDD phase and is an unchanged implementation input, not a missing implementation action. Concurrent foreign changes are excluded and snapshotted without being attributed to this task.

Task 3 also modifies Dockerfile, server/Dockerfile, mcp-server/Dockerfile and .dockerignore to carry the new shared-build template-check inputs. This corrects an introduced packaging prerequisite; no container deployment is performed. The test preloader fix uses synchronous DOM-first matcher loading and was proven with three consecutive 26-case preservation runs.

Independent review follow-ups: Task 2 preserves the existing frontmatter parser's padded delimiters, CRLF, indented scalar keys and spaces before the colon (four additional RED→GREEN cases). Task 3 reconciles docs/DEVELOPMENT_GUIDE.md so users edit catalog.ts and regenerate/check projections; human CLI output does not print the same correction twice. These refine already-approved compatibility/presentation obligations, with no new capability or lost assertion.
