---
code: MDT-225
status: Approved
dateCreated: 2026-08-08T08:27:03.768Z
type: Feature Enhancement
priority: Medium
level: epic
---

# Epic level model and swimlane board

## 1. Description

### Problem

The system has no concept of an epic: no way to mark a ticket as an epic, no
validated child→epic link, and no board view that groups tickets by epic. This
blocks epic rollup/progress, epic lifecycle (closing an epic), and the
Jira/YouTrack-style swimlane board that power users expect.

### Scope

This epic delivers the epic data model and the swimlane board UI:

- **MDT-205** (Implemented) — `level` field (`ticket` | `epic`), `phaseEpic`
  target validation (must be an Approved/Implemented epic), epic close guard
  (can't close an epic with non-terminal children), alias resolution, CRUD
  across CLI/MCP/REST. The data foundation.
- **MDT-206** (In Progress) — the swimlane board view: one lane per epic,
  status columns across lanes, epic progress, lane collapse, status-only
  drag (no cross-epic reassignment via drag). The board UI that consumes the
  MDT-205 data layer.

### Key decisions (settled in prior architecture review)

- `level` is an axis orthogonal to status/type/priority — not a `type=Epic`.
- The child→epic link stays as the existing `phaseEpic` up-pointer (no
  `epicId`, no stored `children[]` array). Children derived in-memory.
- No migration: existing tickets default to `level: ticket` on read.
- Epics are never rendered as cards on the flat board (documented divergence
  from `designs/board-zai/design3-epics.md` §2).

## 2. Children

| Ticket | Status | Role |
|--------|--------|------|
| MDT-205 | Implemented | Data model + validation (level, phaseEpic, close guard) |
| MDT-206 | In Progress | Swimlane board UI |

## 3. References

- `designs/board-zai/design3-epics.md` — epic UX spec (§1 data model, §6
  progress, §8 swimlanes)
- Prior architecture discussion: `level` + `phaseEpic` model, validated vs
  torvalds-doctrine (no `epicId`, no children array, no migration)