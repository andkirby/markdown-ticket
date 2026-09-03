# BDD

**Source**: [MDT-244](../MDT-244-type-icon-ticket-key-options.md)
**Generated**: 2026-09-02

## Overview

One user journey family: viewing ticket keys and type badges under the two app-configuration display options. Seven scenarios across four journeys (key-line glyph, badge glyph, viewer-header suppression, absent-key defaults). Canonical scenarios live in `spec-trace`; see `bdd.trace.md`.

## Acceptance Strategy

- Executable gate: `tests/e2e/ticket/type-icon-options.spec.ts` (Playwright, registered as `TEST-type-icon-key-options`), expected RED until implementation.
- Every scenario sets options through the **live config API** (`PATCH /api/config` + `X-MDT-Owner-Intent: 1`) — the same client → backend → `user.toml` path Settings uses — never through localStorage or store seeding. This keeps the E2E honest about the app-configuration contract (C1).
- Fresh `CONFIG_DIR` per run (wrapper) guarantees the absent-keys scenario starts truly unset.

## Test-Facing Contract Notes

- Assertions key off `svg[data-type="<formatted-type>"]` inside `[data-testid="ticket-code"]` (key line) and `[data-testid="ticket-type"]` (badge) — matching the `data-type` convention already in `badge.css`.
- The viewer-header suppression scope needs a **new test hook**: `[data-testid="ticket-detail-header"]` on the compact header element. Without it, the attributes-row badge (which stays visible) is indistinguishable from the header badge. Adding this hook is part of implementation (see `tests/AGENTS.md` → "Adding test hooks").
- Fixture note: the `simple` scenario dataset spans three types; ticket #1 is Architecture (`data-type="architecture"`).
- Config writes require the owner-intent header; if the test backend rejects them, the tests stage must revisit auth wiring (do not fall back to localStorage).

## Execution Notes

- Run: `bun run test:e2e -- tests/e2e/ticket/type-icon-options.spec.ts`
- All seven tests expected to fail pre-implementation (RED), pass after (GREEN).
- Known unrelated reds in the suite (worktree-sse, parallel workstream) are out of scope.
