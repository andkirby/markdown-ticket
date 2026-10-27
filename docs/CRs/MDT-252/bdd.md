# BDD: MDT-252

## Overview

Acceptance journeys cover reference management, external navigation/details, discovery, and complete reference viewing/editing. Canonical scenarios live in [bdd.trace.md](bdd.trace.md); this file records execution strategy without duplicating those scenarios.

## Acceptance Strategy

- Ten canonical scenarios, at most three per journey, cover all behavior requirements.
- Reference management: create/read, ordered idempotent mutation, unsupported-ref preservation through unrelated edits.
- External navigation/details: correct-instance new-tab links, non-navigating inspection, read-only navigation.
- Discovery: board text filtering, key-shaped local/external result union with provenance/deduplication, explicit selection for partial matches.
- Complete reference viewing/editing: independent of board preferences.
- Browser framework: existing Playwright suite under `tests/e2e/`, using the project wrapper `bun run test:e2e -- <spec>` and isolated API/frontend ports.
- Executable acceptance is required; no waiver was requested or granted.

## Test-Facing Contract Notes

The tests must assert visible external identities and destinations instead of assuming local-number-derived links. Same tracker kind/key on two configured instances must lead to distinct destinations. Tests must keep external number formatting unchanged while retaining existing local-key shorthand behavior. The reference details control, keyboard activation, read-only behavior and card-click/drag isolation need actual browser verification.

## Execution Notes

`spec_trace_validate` at stage `bdd` passed with no issues. This proves trace consistency only. Concrete acceptance files now exist under ticket/external-references.spec.ts and quick-search/external-references.spec.ts. Initial real HTTP execution is RED because ticket reads omit refs; domain/shared assertion suites are also RED. UI placement A and configured display/search rules are agreed. Tests-stage and final implementation review must close any remaining detailed coverage gaps before full acceptance is claimed. No implementation or readiness is claimed.

## UAT: grouped references

One tracker instance produces one badge with one icon and up to three short keys. Different instances remain separate even when the tracker kind/key matches. Overflow contains only the additional keys, using identical configured shortening; all-fitting resolved groups have no redundant details trigger. Unavailable refs retain non-navigating explanation access. Physical keyboard coverage traverses three inline anchors before +N, activates a native external link, verifies the hidden key, and restores focus/query state.
