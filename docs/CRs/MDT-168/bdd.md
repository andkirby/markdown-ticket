# BDD

## Overview

MDT-168 acceptance is organized into six journeys that exercise the
configuration-management surface end to end: reads with exposure metadata,
valid mutations with atomic persistence, validation failures, permissions,
guarded operations, and browser-only isolation. Each scenario is traced to a
behavior requirement (`BR-*`); constraints and edge cases (`C*`, `Edge-*`)
are intentionally excluded from scenario coverage and are handled in
`mdt:tests` + `mdt:architecture`.

The assessment verdict (Option 2 — Redesign Inline) is reflected: scenarios
assert the _bounded_ behaviors the redesign must deliver (atomic writes, no
partial application, side-effect refresh, registry/local consistency) rather
than generic TOML editing.

A UAT-2026-07-26 scenario (`selector_pref_change_refreshes_live_consumers`,
BR-7.1) closes a same-session freshness gap: persisting
`ui.projectSelector.*` through Settings must also notify the project selector
rail so live selector consumers re-fetch backend prefs without a full page
reload. Browser-only prefs stay browser-only; nothing is broadcast on
unrelated config writes.

## Acceptance Strategy

- **Framework**: Playwright (browser E2E) exists at `tests/e2e/` with isolated
  ports 6173/4001 and `shared/test-lib` `TestEnvironment`/`ProjectFactory`.
  Some scenarios (pure API validation, atomic-failure, default-deny) are best
  covered as server unit/API tests and are cross-linked from `tests.md`.
- **Scenario budget**: 12 total scenarios across 6 journeys (within the
  normal-mode budget of 12 total / 3 per journey).
- **Executable gating**: not waived. Provisional E2E file targets are recorded
  in `tests.md`; BDD does not create test-plan file links yet because the
  concrete spec files are produced in `mdt:tests`.

## Journey Map

| Journey                       | Scenarios                                                                                                                                                                                 | Covers                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Reads & exposure              | `read_returns_exposure_metadata`, `read_omits_fileonly_and_unknown`                                                                                                                       | BR-1.1, BR-1.2                 |
| Valid mutations               | `valid_editable_selector_persisted_atomically`, `document_config_patch_refreshes_tree`, `global_user_setting_persisted_with_side_effect`, `project_metadata_edit_returns_effective_value` | BR-2.1, BR-3.1, BR-3.2, BR-3.3 |
| Validation failures           | `reject_disallowed_or_unknown_selector`, `reject_invalid_value_never_defaults`                                                                                                            | BR-2.2, BR-2.3                 |
| Permissions                   | `readonly_denied_config_detail_and_mutation`                                                                                                                                              | BR-5.1                         |
| Guarded operations            | `guarded_op_requires_confirmation`, `guarded_op_keeps_registry_local_consistent`                                                                                                          | BR-4.1, BR-4.2                 |
| Browser-only isolation        | `browser_only_never_reaches_backend`                                                                                                                                                      | BR-6.1                         |
| Same-browser consumer refresh | `selector_pref_change_refreshes_live_consumers`                                                                                                                                           | BR-7.1                         |

## Test-Facing Contract Notes

These mechanics must be preserved by implementers and E2E authors:

- **Exposure classification values** are exactly `editable`, `guarded`,
  `readOnly`, `fileOnly` (lowerCamel) as defined in the exposure matrix and
  `ui-ownership.md`. E2E/UI assertions should use these literal strings.
- **Scope values** are `project`, `global`, `user`, `registry`.
- **Mutation rejection** must return a _field-level_ error naming the
  offending selector, not a generic 400 body. The response shape is locked as
  a stable contract (C-9); OpenAPI must document it.
- **Owner-only endpoints**: all configuration detail reads and mutations are
  owner-only (`/api/config/*` via `accessPolicy.ts` isOwnerOnlyRoute).
  Read-only/anonymous callers get 403 (BR-5.1, C-8). E2E must exercise a
  read-only session, not just an absent-auth request.
- **Browser-only settings** to assert isolation against: theme quick toggle,
  default view, card density, markdown density, event history visibility,
  document tree recents/sort/collapse (see `src/config/*.ts`). Changing any of
  these must not produce a TOML-writing network call.
- **maxDepth** valid range differs by concept: document maxDepth is 1–10,
  discovery maxDepth is 1–50. Validation tests must use range-appropriate
  boundary values.
- **Same-browser consumer refresh (BR-7.1)** is triggered only by a successful
  `applyConfig` for `ui.projectSelector.visibleCount` or
  `ui.projectSelector.compactInactive`. The transport is the narrow named
  window event already used by `useSelectorData`
  (`mdt:selector-prefs-updated` / `SELECTOR_PREFS_SYNC_EVENT`) — not a generic
  event bus, and not broadcast on unrelated config writes. On the signal,
  `useSelectorData` re-fetches backend prefs from `/api/config/selector` and
  layers browser-only localStorage overrides (accentEnabled/autocolor/
  accentStyle) on top, preserving the initial-load merge order. E2E must
  verify the rail updates without a full page reload.

## Execution Notes

- Run focused config E2E with isolated test commands (do not restart dev
  servers): `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test <file> --project=chromium`.
- Atomic-failure and default-deny behaviors are cheaper to prove at the
  server unit/API layer (`server/tests`) and are mirrored there in `tests.md`.
- The pre-existing `system.test.ts` / `documents.test.ts` port-binding flakiness
  is unrelated; new config API tests should avoid reusing flaky port fixtures
  and prefer the `TestEnvironment` isolation harness.

---

Use `bdd.trace.md` for canonical scenario rows and coverage summaries.
_Rendered by mdt:bdd via spec-trace_
