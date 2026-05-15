# Tasks: MDT-077

**Source**: [MDT-077](../MDT-077-project-entity-configuration-architecture.md)
**Generated**: 2026-05-15

## Current Execution Closure

These tasks represent the current remaining UAT work. They are not a historical log of completed project edit fixes.

## Task Slices

| Task | Objective | Direct Green Targets |
|------|-----------|----------------------|
| `TASK-mode-identity-contract` | Introduce explicit configuration mode and canonical write-reference contract. | `TEST-shared-project-config-modes`, `TEST-shared-project-discovery-contract`, `TEST-project-contract-mode-matrix` |
| `TASK-single-mutation-boundary` | Route public project updates through one shared mutation boundary. | `TEST-project-api-read-update-contract`, `TEST-project-browser-edit-readback`, `TEST-project-validation-boundary` |
| `TASK-contract-matrix` | Add table-driven project mode contract tests and read contract coverage. | `TEST-project-contract-mode-matrix`, `TEST-cli-project-read-contract`, `TEST-mcp-project-read-contract` |

## Execution Notes

- Keep API, CLI, MCP, and Web UI adapters thin.
- Make mode and write-reference decisions inside shared project services.
- Prefer shared integration tests for exhaustive mode coverage.
- Keep API/browser tests focused on representative user-facing readback regressions.

---
Use `tasks.trace.md` for canonical task records and closure validation.
