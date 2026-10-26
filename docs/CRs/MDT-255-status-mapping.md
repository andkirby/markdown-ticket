---
code: MDT-255
creationId: 5166dcc7-4add-4fb7-9c1b-3a109e986e4a
status: Proposed
dateCreated: 2026-10-22T05:54:32.983Z
type: Feature Enhancement
priority: Medium
phaseEpic: MDT-253
---

# Outbound status mapping to external trackers

## Problem

Teams keep working in Jira/GitHub while MDT reflects state locally. MDT-252 links tickets but state drifts: MDT says "Implemented" while Jira still shows "In Progress". Map local status transitions onto external tracker transitions — explicitly.

## Scope

- Outbound only: local status change → mapped external transition, applied on explicit user action.
- Per-instance mapping in tracker config: `[trackers.<instance>] statusMap = { "In Progress" = "On Review" }` — external workflow names are instance/project-specific.
- Reviewable apply: default dry-run ("PROJ-123: In Progress → On Review — apply?"), one-shot execution. No background bridge, no polling/webhooks (those live in MDT-253's Later tier as a separate opt-in decision).
- Transitions discovered via adapter CLI, never guessed (e.g. `twg jira workitem transition --id <KEY> --site <SITE> -o json` lists available transitions + required fields). Unmapped local statuses are reported, not invented.

## Adapter strategy

Exec existing CLIs — `twg` (Jira), `gh` (GitHub) — no embedded API clients, no credentials in MDT config (tracked or otherwise). Adapter missing/unauthenticated → feature degrades to URL-only with a clear message.

## Dependencies

- MDT-252 first: refs + `[trackers.*]` config schema are this ticket's raw material.
- MDT-254 (key-pattern SOT) not blocking but nice to settle before key matching matures.

## Out of scope

- Inbound status pull/reconciliation is out of scope here; continuous/background synchronization is separately gated (epic Later tier — an always-on runtime is only required for the continuous variant, not for on-demand pull).
- Comment bridging, field-level sync, bulk backfill.

## Open questions

1. Mapping granularity — per tracker instance, or per external project (Jira workflows differ per project)?
2. Unmapped local status: report-only, or block apply?
3. Stale-state check: external status moved by a human meanwhile — overwrite, or skip + report?
4. Does apply touch the MDT ticket too (e.g. impl-date), or strictly one-way?
5. Which statuses map — only In Progress/Implemented, or the full CRStatuses enum?