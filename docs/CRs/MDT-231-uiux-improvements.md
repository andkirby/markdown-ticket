---
code: MDT-231
status: Approved
dateCreated: 2026-08-17T08:51:18.645Z
type: Feature Enhancement
priority: Medium
level: epic
---

# UI/UX improvements

## 1. Description

### Problem

Standalone UI/UX enhancement tickets had no grouping epic after the
2026-08-23 epic-structuring pass created phase epics from the old phase
labels. This epic is the parent for discrete interface-polish tickets that
don't belong to a feature epic — tickets link to it via `phaseEpic` and its
children are derived from those pointers.

### Scope

Enhancements to existing surfaces: presentation options, hover affordances,
link behavior, density/visual polish. Explicitly **not** in scope:

- Epic/swimlane board work — parented under MDT-225.
- New views or architectural changes to routes/state — those get their own
  epic.

## 2. Children

| Ticket  | Status      | Role                                                              |
| ------- | ----------- | ----------------------------------------------------------------- |
| MDT-244 | Implemented | Ticket-type icon display options alongside the ticket key         |
| MDT-137 | Proposed    | Ticket preview hover cards on relationship badges + self-link fix |

## 3. References

- `docs/design/surfaces/` — per-surface design specs and mockups that
  children of this epic build on.
