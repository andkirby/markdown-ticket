# Architecture: MDT-262

## Overview

Use a table-driven CLI adapter. Shared tool definitions own names, descriptions, JSON Schema parameters, argv and optional stdin. BB and DSH own host registration and execution. Business behavior stays in the CLI/shared services.

## Owners and Structure

- `plugins/_lib/mdt-tools.js`: eleven non-cloud MDT operations and exact per-command contracts.
- `plugins/_lib/spec-trace-tools.js`: eight operational spec-trace tools, flag mapping and entity/stage vocabulary.
- `plugins/_lib/run-cli.js`: shared argument/output helpers; no workspace policy.
- `plugins/_lib/bb-workspace.js`: BB thread environment to server-local workspace resolution.
- `plugins/bb/server.ts`: schemas, tool registration, CLI settings/binary resolution, bounded cancellable subprocesses.
- `plugins/bb/lib/`: byte-identical install-safe copies; sync tests prevent drift.
- `plugins/dsh/mdt.js`, `plugins/dsh/spec-trace.js`, `plugins/dsh/lib/kit.js`: Cordis registration, quoting, sandbox and stdin forwarding.
- `plugins/tests/*.test.ts`, `plugins/bb/tests/*.test.ts`: offline contracts and temporary real-CLI journeys.
- `plugins/README.md`, `plugins/docs/coverage.md`, `plugins/docs/usage.md`, `plugins/bb/skills/mdt-tools/SKILL.md`, `plugins/dsh/AGENTS.md`, `plugins/dsh/DEBUG.md`, root `README.md`, `docs/SKILLS.md`: human and agent entry points.

## Runtime Flow

Agent selects schema-described tool → host validates input → BB resolves environment and rejects remote host → resolve binary at call time → exact argument array and optional stdin → CLI/shared services → command-specific stdout/error extraction. spec-trace workdir and project-init directory resolve relative to the validated thread workspace. DSH preserves its shell service and sandbox contract.

## Program Design

Tool definition: `{ name, description, params, argv(args), stdin?(args) }`. Registration binds each definition to its CLI runner and timeout. Existing public tool names remain stable; new operations are additive. Ticket delete is cwd-only; rename remains text. No shell evaluation on BB. DSH must quote each argv token and handle stdin without untrusted command interpolation.

## Invariants

1. Cloud commands have no native registration and cannot be invoked through a generic flags/command escape hatch.
2. Reject option-like positional injection; typed values cannot change the selected command.
3. Host guard runs before spawning, including explicit workdir/directory requests.
4. Combined stdout/stderr remains bounded at 256 KiB, overflow fails, and cancellation/timeout terminate execution.
5. Stdin defaults closed; content is explicitly passed only for create.
6. Preserve full CLI diagnostics and text/JSON distinctions.
7. Shared source and BB install-safe copies stay identical.

## Extension and Rollback

Change canonical tables first, sync BB copies, add coverage against the real CLI, update the matrix and skill. New aliases reuse existing tools. Revert this scoped plugin change and reinstall/reload the prior plugin to roll back; no data migrations or server restart required. DSH host remount remains a separate operator step.

## Least-confident Decisions

CLI option/positional conventions differ by command; exact argument tests plus real lifecycle evidence arbitrate, rather than assuming every command accepts --json/-p. BB session tool catalogs update only when a new provider session is constructed, so fresh-thread live verification is required after installation.
