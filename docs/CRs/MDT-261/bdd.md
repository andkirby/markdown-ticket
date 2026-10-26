# BDD: MDT-261

## Overview

Eight canonical scenarios group into four journeys: creation (three), staged content policy (two), commit snapshot/scope (two), and explicit validator failure (one). Each covers behavior IDs only; constraints and edge cases will be closed by the Tests stage.

## Acceptance Strategy

- Framework: repo-native CLI process E2E using Bun, built cli/dist/index.js, shared TestEnvironment/ProjectFactory and real isolated Git repositories. cli/tests/e2e/AGENTS.md explicitly defines CLI process tests as this project's E2E surface.
- Executable acceptance required; no waiver. Native BB/DSH, MCP and HTTP propagation will additionally need transport contract tests in the Tests stage.
- New files: cli/tests/e2e/ticket/template-diagnostics.spec.ts and cli/tests/e2e/ticket/validate.spec.ts. Existing CLI runner receives an optional entrypoint so these acceptance tests execute compiled output while preserving its default behavior for older tests.
- Proposed operator contract exercised by tests: `mdt-cli ticket validate --staged --json`. This is a design candidate awaiting architecture review; adjust the acceptance adapter if the approved public command changes, preserving scenario semantics.
- Native transport passthrough, human/YAML rendering, spaces/renames/deletions, staged path configuration, epic scope and actual hook-unavailable behavior remain additional verification obligations. The provisional test-plan links are intended coverage, not claims of complete executed proof.

## Test-Facing Contract Notes

- Creation with generated content remains successful and creates one file. TICKET_TEMPLATE_UNFILLED appears once; actual content inspection can contain multiple location findings without duplicating one location.
- Structured validation failure may use the existing CLI error stream; acceptance reads the sole structured envelope from stdout or stderr.
- Staging fixtures operate only in temporary repositories and compare the index before/after validation.
- No browser server is needed for these CLI acceptance journeys. Frontend feedback still requires its own existing form/hook verification before delivery.

## Execution Notes

- `bun test cli/tests/e2e/ticket/create.spec.ts`: baseline exit 0; 18 passed, 79 assertions.
- `bun run --cwd cli build`: exit 0 before new acceptance tests.
- `bun test cli/tests/e2e/ticket/template-diagnostics.spec.ts cli/tests/e2e/ticket/validate.spec.ts`: exit 1; 1 passed, 13 failed. Expected pre-implementation red: generated/supplied bodies have no diagnostics and `ticket validate` is not implemented (Commander emits an unknown-command error rather than a structured result).
- Trace requirements and BDD validators: exit 0 with no issues. These validations establish intended links, not feature readiness.

## Verified frontend seam

Live ProjectView mounts Board with showHeader=false, hiding the legacy Create control. Browser verification therefore executes the production DataLayer creation API with the routed board/Toaster mounted, preserving the intended shared diagnostic behavior without inventing a new UI entry point. The first click-based probe could not reach the hidden control; its pending response promise terminated the Playwright worker. That failed probe is not acceptance evidence.
