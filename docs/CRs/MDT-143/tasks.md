# Tasks: MDT-143

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **CLI package**: `cli/` owns command grammar, output, stdin capture, shortcut normalization, and process-level UX
- **Shared project reads**: go through `shared/services/ProjectService.ts`
- **Shared project init backend**: stays in `shared/tools/ProjectManager.ts`
- **Shared ticket reads and attr writes**: go through `shared/services/TicketService.ts`
- **Document edits**: out of scope for MDT-143 v1

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| CLI bootstrap + shortcuts | `cli/src/index.ts`, `cli/src/utils/args.ts` | Task 1 |
| Ticket read/list | `cli/src/commands/view.ts`, `cli/src/commands/list.ts` | Task 2 |
| Project namespace | `cli/src/commands/project.ts` | Task 3 |
| Ticket create + stdin | `cli/src/commands/create.ts`, `cli/src/utils/stdin.ts` | Task 4 |
| Ticket attr parsing + mutation | `cli/src/commands/attr.ts` | Task 5 |
| Output formatting + colors | `cli/src/output/formatter.ts`, `cli/src/output/colors.ts`, `cli/src/utils/cliConfig.ts` | Task 6 |
| CLI E2E harness | `cli/tests/e2e/` | Task 7 |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2, Task 4, Task 6 |
| C2 | Task 5 |
| C3 | Task 6 |
| C4 | Task 2, Task 3 |
| C5 | Task 4, Task 5 |
| C6 | Task 6, Task 7 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M0: Bootstrap | — | Task 1 | CLI package builds and exposes commander entrypoint |
| M1: Read Paths | `view_ticket_from_detected_project`, `view_ticket_across_projects`, `list_tickets_in_detected_project`, `show_current_project_details`, `list_projects_via_project_namespace`, `resolve_project_token_without_subcommand_collision` | Task 2, Task 3, Task 6 | Ticket/project read flows GREEN |
| M2: Mutations | `initialize_project_in_current_folder`, `create_ticket_from_slug_with_order_independent_tokens`, `create_ticket_from_piped_input`, `update_ticket_attributes_in_one_command` | Task 4, Task 5, Task 6 | Create/attr/init flows GREEN |
| M3: Verification | all MDT-143 scenarios | Task 7 | CLI E2E suite GREEN |

---

## Tasks

### Task 1: Bootstrap CLI package and commander tree (M0)

**Structure**: `package.json`, `cli/package.json`, `cli/tsconfig.json`, `cli/src/index.ts`, `cli/src/utils/args.ts`

**Scope**: Add the CLI workspace package, bin entry, commander bootstrap, and approved shortcut normalization  
**Boundary**: `args.ts` may normalize only approved shortcuts and must not become a second parser

**Makes GREEN**:
- `TEST-cli-bootstrap`

**Done when**:
- [ ] `cli/bin/mdt-cli` is exposed through `cli/package.json`
- [ ] Canonical `ticket` and `project` namespaces are registered in commander
- [ ] Supported shortcuts rewrite into the canonical command tree before parse

---

### Task 2: Implement ticket read/list commands on shared services (M1)

**Structure**: `cli/src/commands/view.ts`, `cli/src/commands/list.ts`

**Scope**: Implement ticket get/list command handlers on top of `ProjectService` and `TicketService`  
**Boundary**: Command modules must not perform their own project traversal or markdown file scans

**Makes GREEN**:
- `view_ticket_from_detected_project`
- `view_ticket_across_projects`
- `list_tickets_in_detected_project`
- `TEST-cli-ticket-read`

**Done when**:
- [ ] Ticket read/list routes use shared project-context resolution
- [ ] Bare-key and cross-project lookups share the same normalized key path
- [ ] Errors for invalid keys and missing project context remain user-facing

---

### Task 3: Implement project namespace on shared project services (M1)

**Structure**: `cli/src/commands/project.ts`

**Scope**: Implement project current/get/info/list/init commands and bare project-code shortcuts  
**Boundary**: Use `ProjectService` for project reads and `ProjectManager` only for bootstrap/init

**Makes GREEN**:
- `show_current_project_details`
- `list_projects_via_project_namespace`
- `resolve_project_token_without_subcommand_collision`
- `initialize_project_in_current_folder`
- `TEST-cli-project`

**Done when**:
- [ ] `project`, `project current`, `project get|info`, and `project ls|list` all route through one commander subtree
- [ ] Bare `project <code>` lookup preserves lowercase subcommand reservation rules
- [ ] `project init` materializes project configuration in the current folder

---

### Task 4: Implement ticket create and stdin flow (M2)

**Structure**: `cli/src/commands/create.ts`, `cli/src/utils/stdin.ts`

**Scope**: Implement `ticket create` and top-level `create` alias, including order-independent parsing and stdin handling  
**Boundary**: Ticket persistence must stay behind shared ticket ownership; CLI must not write markdown directly

**Makes GREEN**:
- `create_ticket_from_slug_with_order_independent_tokens`
- `create_ticket_from_piped_input`
- `TEST-cli-ticket-create`

**Done when**:
- [ ] `ticket create` and `create` route to the same create path
- [ ] Stdin mode writes generated frontmatter and H1 followed by literal body content
- [ ] Create input is treated as data, not shell instructions

---

### Task 5: Implement ticket attr parser and mutation flow (M2)

**Structure**: `cli/src/commands/attr.ts`

**Scope**: Parse CLI attr tokens into shared `AttrOperation` requests and invoke shared ticket attr updates  
**Boundary**: CLI may parse argv tokens, but shared code remains the owner of attr mutation semantics

**Makes GREEN**:
- `update_ticket_attributes_in_one_command`
- `TEST-cli-ticket-attr`

**Done when**:
- [ ] Scalar `=` and relation `=`, `+=`, `-=` tokens map to shared attr operations
- [ ] Unsupported fields, operators, and missing args fail with corrective errors
- [ ] One command can apply multiple attr operations and print one confirmation response

---

### Task 6: Implement formatter, color policy, and CLI config (M1/M2)

**Structure**: `cli/src/output/formatter.ts`, `cli/src/output/colors.ts`, `cli/src/utils/cliConfig.ts`

**Scope**: Centralize labeled field rendering, path display policy, and ANSI gating  
**Boundary**: Output policy stays in CLI; shared code should not emit terminal formatting

**Makes GREEN**:
- `render_colored_relative_ticket_output`
- `render_absolute_ticket_path_when_configured`
- `TEST-cli-ticket-read`
- `TEST-cli-project`
- `TEST-cli-ticket-create`

**Done when**:
- [ ] Relative/absolute path output respects CLI config defaults
- [ ] ANSI colors are emitted only for interactive color-enabled targets
- [ ] Badge color categories remain aligned with the web UI mapping

---

### Task 7: Add CLI E2E harness and suites (M3)

**Structure**: `cli/tests/e2e/`

**Scope**: Add repo-native CLI E2E coverage using `@mdt/shared/test-lib` and the built CLI binary  
**Boundary**: Use real process execution; do not replace the harness with shell-only suites or browser Playwright flows

**Makes GREEN**:
- `TEST-cli-bootstrap`
- `TEST-cli-ticket-read`
- `TEST-cli-project`
- `TEST-cli-ticket-create`
- `TEST-cli-ticket-attr`

**Done when**:
- [ ] CLI E2E covers canonical commands and retained shortcuts
- [ ] Temp projects and config are provisioned through `@mdt/shared/test-lib`
- [ ] Suites assert stdout, stderr, exit codes, and resulting files where applicable

---

## Post-Implementation

- [ ] `mdt-cli` exposes the canonical `entity action` command tree plus approved shortcuts
- [ ] Project reads go through `ProjectService`; project init goes through `ProjectManager`
- [ ] Ticket reads and attr writes go through `TicketService`
- [ ] CLI output stays formatter-owned and TTY-aware
- [ ] CLI E2E coverage is GREEN

---
*Canonical task ownership and GREEN links: [tasks.trace.md](./tasks.trace.md)*
*Rendered by /mdt:tasks via spec-trace*
