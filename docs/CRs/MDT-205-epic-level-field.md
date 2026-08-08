---
code: MDT-205
status: Implemented
dateCreated: 2026-08-08T00:00:00.000Z
type: Feature Enhancement
priority: High
level: ticket
phaseEpic: MDT-225
---

# Add epic level field with phaseEpic validation

## 1. Description

### Requirements Scope

`requirements`

### Problem

- The system has no concept of an epic. `phaseEpic` is a free-text field with no structural meaning — it can hold any string, and nothing validates that a value pointing at another ticket actually targets a real epic.
- This blocks any epic-level UX: swimlane views, epic rollup/progress, and epic lifecycle (closing an epic). Without a way to mark a ticket as an epic, none of the downstream work is possible.
- Prior design review settled the data model: an optional `level` field with default `ticket`, an epic being a ticket with `level: epic`. The child→epic link stays as the existing `phaseEpic` field.

### Affected Areas

- Domain model: ticket entity, frontmatter schema, input contracts
- Shared services: ticket normalization, serialization, validation, CRUD
- Backend: ticket API adapter, API documentation
- CLI: attribute mutation, list filtering, output
- MCP server: tool input schemas

### Scope

**In scope:**

- A `level` field on tickets (`ticket` | `epic`, default `ticket`)
- Validation that a `phaseEpic` value pointing at a ticket key requires that target to be an epic
- A three-state epic lifecycle: Proposed → Approved (usable) → Implemented (closed)
- An epic close guard: an epic cannot move to Implemented while it has non-terminal children
- A reference guard: only Approved or Implemented epics can be referenced by a child's `phaseEpic`
- CRUD support for `level` across all input surfaces

**Out of scope:**

- Migrating existing tickets (they default silently)
- Renaming `phaseEpic` or introducing a new link field
- Cloud sync of `level` (stays local this pass)
- Any board UI (covered by MDT-206)

### Constraints

- **No migration.** Existing tickets without `level` are treated as `ticket` on read.
- `phaseEpic` stays the link field (child→epic up-pointer). No `epicId`, no `children[]` array.
- The close guard is the first enforced status transition in a system that currently allows free movement; scoped narrowly to epics moving to `Implemented`.
- Epics are never rendered as cards on the flat board (documented divergence from `designs/board-zai/design3-epics.md` §2).

## 2. Desired Outcome

### Success Conditions

- When a ticket is marked `level: epic`, it is recognized as an epic everywhere (filters, CLI, MCP).
- When a user sets `phaseEpic` to a ticket key, the system guarantees the target exists, is an epic, and is in a usable state (Approved or Implemented) — otherwise the write is rejected with an actionable error.
- When a user attempts to close an epic (move to `Implemented`) while it has open children, the system blocks the close and names the blocking children.
- Free status movement is preserved for all non-epic tickets.

### Non-Goals

- Not rendering epics as cards in any board mode.
- Not syncing `level` through cloud projection.
- Not validating that `phaseEpic` free-text values (non-ticket-keys) match anything.

## 3. Open Questions

| Area | Question | Constraints |
|---|---|---|
| Cloud sync | Should `level` join the cloud projection contract? | Defer unless cloud-synced epics are needed. |
| Validation timing | Enforce phaseEpic target on write only, or also report broken references on read? | Write-time enforcement is required; read-side reporting is optional. |

### Decisions Deferred

- Implementation approach (determined by `mdt:architecture`)
- Specific artifacts and file placement (determined by `mdt:architecture`)
- Task breakdown (determined by `mdt:tasks`)

## 4. Acceptance Criteria

### Functional

- [x] A ticket can be created or updated with `level: epic`.
- [x] A ticket created without an explicit `level` reads back as a regular ticket (no on-disk migration required).
- [x] Setting `level` works identically through the CLI, MCP, and the backend API.
- [x] An epic moves through three states: `Proposed` → `Approved` → `Implemented`.
- [x] Setting `phaseEpic` to a ticket key whose target is NOT an epic is rejected, with an error that names the target and states the remediation.
- [x] Setting `phaseEpic` to a ticket key whose target does not exist is rejected with a clear error.
- [x] Setting `phaseEpic` to a `Proposed` epic is rejected with an error stating the epic must be `Approved` first.
- [x] Setting `phaseEpic` to an `Approved` or `Implemented` epic succeeds.
- [x] Setting `phaseEpic` to a value that is NOT a ticket key (free text) succeeds unchanged.
- [x] Moving an epic to `Implemented` while it has one or more non-terminal children is rejected; the error lists the blocking children.
- [x] Moving an epic to `Implemented` when all its children are terminal succeeds.
- [x] Moving a non-epic ticket to `Implemented` is unaffected (free movement preserved).
- [x] `level` is queryable/filterable (e.g. `ticket list level=epic`).
- [x] Alias shorthand (`e`→`epic`, `t`→`ticket`) resolves consistently across CLI and MCP.

### Non-Functional

- [x] `level` round-trips through YAML frontmatter — read, write, re-read yields the same value.
- [x] Alias resolution lives in the shared layer so CLI, MCP, and any future consumer apply identical rules (no drift).
- [x] API documentation (OpenAPI) describes the new field.

### Edge Cases

- Existing tickets with no `level` field must read as `ticket` without error.
- A `phaseEpic` value in a cross-project key format (e.g. `ABC-012`) is validated against the target project's ticket.
- Clearing `phaseEpic` on a ticket is always allowed, regardless of the epic's state.
- An epic with zero children can be moved freely (the close guard only applies when children exist and are non-terminal).
- Existing children already pointing at an epic when that epic is moved back to `Proposed` are not retroactively rejected — the reference guard applies to new writes, not historical state.
- Reopening an epic from `Implemented` back to `Approved` is allowed (closes are not permanent).
- Terminal statuses for the close-guard purpose: `Implemented`, `Rejected`, `Partially Implemented`.

## 5. Verification

### How to Verify Success

- Manual: create an epic, point a child at it, confirm acceptance; point a child at a non-epic, confirm rejection.
- Automated: shared-layer unit tests for the phaseEpic validation rule and the close guard; CLI and MCP end-to-end tests proving the rejections surface to each surface.
- Regression: full type validation and build pass; existing status-movement behavior for non-epic tickets is unchanged.

## 6. References

- `designs/board-zai/design3-epics.md` — epic UX spec (§1 data model, §6 progress)
- Related: MDT-206 (epic swimlane board — depends on this ticket)
- Prior architecture discussion settled the `level` + `phaseEpic` model (no `epicId`, no children array, no migration).
