---
code: MDT-077
status: In Progress
dateCreated: 2025-11-13T22:10:34.006Z
lastModified: 2026-05-15T00:00:00.000Z
type: Feature Enhancement
priority: High
phaseEpic: Core Reference Architecture
assignee: Core Architecture
---

# Project Entity Configuration Architecture

## 1. Description

### Problem

The project entity is not a simple CRUD record. A project can be represented by a global registry entry, a project-local `.mdt-config.toml`, or an auto-discovered local config with no registry entry. Project operations currently risk drifting across Web UI, API, CLI, MCP, and shared services when each interface handles identity, persistence, and validation differently.

MDT-143 gives agents and humans a simpler command-oriented interface. This ticket owns the underlying project semantics those commands must rely on.

### Affected Areas

- Shared project services and project configuration persistence
- Server API project controllers
- Web UI project selector and edit form
- CLI project commands from MDT-143
- MCP project read operations
- E2E and API coverage for project CRUD contracts

### Scope

- Define the canonical project entity behavior across global-only, project-first, and auto-discovery modes.
- Define update/readback behavior for editable project fields.
- Define interface consistency rules for Web UI, API, CLI, and MCP.
- Define the regression test strategy for project configuration modes.

### Out of Scope

- Replacing MDT-143 command UX.
- Supporting legacy project configuration fields outside `CONFIG_SPECIFICATION.md`.
- Performance optimization beyond correctness and consistency.

## 2. Desired Outcome

- Project identity, storage ownership, and readback behavior are explicit.
- Description/name/repository updates persist in the correct configuration location for each mode.
- Web UI, API, CLI, and MCP observe the same project state after writes.
- Tests cover the three configuration modes and the update paths that previously failed.

## 3. Key Semantics

| Concept | Chosen Semantic |
|---------|-----------------|
| Project identity | A project can be addressed by code, id, or path, but persistence must resolve to one canonical project instance before writing. |
| Global-only mode | Complete project definition lives in global registry; no local config is required. |
| Project-first mode | Global registry stores discovery metadata; project-local config stores operational fields. |
| Auto-discovery mode | Project-local config is the source of truth; no global registry entry is required. |
| Read behavior | Project reads merge registry and local config where both exist. |
| Update behavior | Mutable fields are written to the source of truth for that project mode, then read back through the same public project contract. |
| MDT-143 relationship | MDT-143 exposes agent-oriented commands over this project contract; it does not redefine storage semantics. |

## 4. Acceptance Criteria

- [ ] Requirements trace exists for project entity behavior.
- [ ] Requirements distinguish global-only, project-first, and auto-discovery modes.
- [ ] Requirements include description-only update and readback.
- [ ] Requirements include missing-registry/local-config fallback behavior.
- [ ] Requirements include cross-interface consistency for Web UI, API, CLI, and MCP reads.
- [ ] Historical MDT-077 materials are archived under `docs/CRs/MDT-077/archive/`.
- [ ] Current requirements avoid implementation design decisions that belong in architecture.

## 5. References

> Requirements trace projection: [requirements.trace.md](./MDT-077/requirements.trace.md)

> Requirements notes: [requirements.md](./MDT-077/requirements.md)

> Current command interface ticket: [MDT-143](./MDT-143-cli-entrypoint-alternative-to-mcp.md)

> Archived historical material: [archive](./MDT-077/archive/)

> Configuration specification: [CONFIG_SPECIFICATION.md](../CONFIG_SPECIFICATION.md)
