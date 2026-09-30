# Requirements: MDT-249

**Source**: [MDT-249](../MDT-249-list-view-column-sorting.md)
**Generated**: 2026-09-30

## Overview

Clickable column sorting for the list view: Key, Title, Status, Created, and Updated headers become sort controls synced with the existing SortMenu, sort preferences become view-scoped (list independent from board+swimlane), Status gains a lifecycle-order comparator, and the table gains a Created column with relative timestamps. Benefits: sorting becomes discoverable where the data lives, list and board stop overwriting each other's sort, and the Status column carries real ordering semantics.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md (storage shape + key), tasks.md (verify) |
| C2 | tests.md (E2E preservation), tasks.md (verify) |
| C3 | architecture.md (header button contract), tests.md (aria assertions) |
| C4 | architecture.md (CR_STATUS_SORT_ORDER definition), tasks.md |
| C5 | architecture.md (fixed-mode timestamp prop), tests.md |
| C6 | tests.md (preservation tests), tasks.md (scope guard) |
| Edge-1 | architecture.md (sanitize-and-default read), tests.md (stale-shape unit test) |

## Non-Ambiguity Table

| Concept | Final Semantic (chosen truth) | Rejected Semantic | Why |
|---------|-------------------------------|-------------------|-----|
| "unknown values sort last" | Unknown statuses sort after all known statuses in BOTH directions (ascending: lifecycle order then unknowns; descending: reversed lifecycle then unknowns) | Ascending-only unknown-last, where descending reverses fully (unknown first) | Lead decision 2026-09-30: matches the CR AC "unknown values sort last" literally under either direction; cost is one comparator guard |
| Sort scope membership | `board` scope covers board AND swimlane (/epics); `list` scope covers the list view; documents view has no sort scope | Three scopes (board, swimlane, list) | Swimlanes share the board view branch and within-column semantics; a separate scope adds state for identical behavior |
| Status default direction | Ascending (Proposed first) — the lifecycle order as written | Descending | The CR presents the lifecycle order as the feature's headline ordering; first click should produce exactly that |
| "Created beside Updated" | Created column renders immediately before (left of) Updated in LTR | Right of Updated, or column-order preference | AC-5 says "beside"; one fixed position avoids a preference surface |
| Header↔dropdown sync | Both write the same per-scope preference through the same handler; neither is a shadow state | Header keeps local state reconciled to the menu | Single source of truth; the controlled SortMenu makes this free |
| "Stale flat value" | Any stored value that is not the per-scope record shape — including the pre-change flat `{selectedAttribute, selectedDirection}` — is discarded; both scopes reset to defaults | Attempted migration of flat value into both scopes | CR decision: "stale flat shape falls back to per-scope defaults (no migration)"; sanitize-and-default precedent |
| Attributes column | Not sortable, stays a static header — mixed-type data | Sortable by string coercion | CR Scope (Unchanged) |
| Priority | Remains dropdown-only in list scope — no column | Add a Priority column | CR Scope (Unchanged): "Priority (dropdown-only, no column)" |

## Storage

| Key | Shape | Default | When Absent/Stale |
|-----|-------|---------|-------------------|
| `markdown-ticket-sort-preferences` (localStorage) | `Record<'board' \| 'list', SortPreferences>` | Each scope: attribute `code`, direction `desc` (pre-change default) | Reset whole record to per-scope defaults, never throw |

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
