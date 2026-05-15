# Requirements: MDT-077

**Source**: [MDT-077](../MDT-077-project-entity-configuration-architecture.md)
**Generated**: 2026-05-15
**CR Type**: Feature Enhancement

## Overview

MDT-077 defines the project entity contract beneath Web UI, API, CLI, and MCP project operations. The core requirement is not CRUD alone: the system must preserve correct behavior across global-only, project-first, and auto-discovery configuration modes.

MDT-143 remains the agent-oriented command interface. MDT-077 owns the storage, identity, validation, update, and readback semantics those commands consume.

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Project source of truth | The write target depends on the configuration mode. | Always write global registry by project id. | Auto-discovered and project-first projects may not have complete registry records. |
| Project-first registry file | Registry stores discovery metadata only; local config stores mutable operational fields. | Registry is upgraded with operational fields during normal updates. | Mixing fields changes discovery semantics and caused stale/missing project behavior. |
| Auto-discovery project | Local config is sufficient for read and update if the project is discoverable by path. | Update requires a registry file. | Auto-discovery explicitly has no global registry entry. |
| Description update | Description-only updates are valid mutations and must read back through all public project reads. | Description is optional display-only data that can be dropped from update/readback. | UI edit form and project selector rely on this field. |
| Interface ownership | Web UI, API, CLI, and MCP use one shared project contract. | Each interface can maintain its own project update logic. | Divergent logic caused simple CRUD regressions. |

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md: configuration mode ownership; tests.md: mode matrix |
| C2 | architecture.md: shared project contract; tasks.md: remove duplicate write paths |
| C3 | architecture.md: validation boundary; tests.md: invalid field/path cases |
| C4 | architecture.md: readback and event/state refresh; tests.md: UI persistence E2E |
| C5 | architecture.md: registry/local consistency; tests.md: failure and fallback cases |

## Configuration Modes

| Mode | Registry | Local Config | Write Target |
|------|----------|--------------|--------------|
| Global-only | Complete project definition | Not required | Registry |
| Project-first | Path/active/discovery metadata | Complete operational project definition | Local config for operational fields |
| Auto-discovery | Not required | Complete operational project definition | Local config |

## Current Requirement Focus

- Lock project identity resolution before writes.
- Lock update behavior for editable fields: name, description, repository, active state where supported.
- Lock readback after update across API, Web UI, CLI, and MCP reads.
- Lock fallback behavior when a visible/discovered project has no registry file.
- Lock tests around persisted state, not just success messages.

## UAT Refinements

The 2026-05-15 UAT round approves four follow-up refinements for the same ticket:

1. Configuration mode must be explicit before persistence decisions.
2. Project identity resolution must return enough context to choose the correct write target.
3. Project mutation must enter through one shared application boundary.
4. Contract tests must cover create/register, read, update, and readback across all three modes.

Rollback-on-failure remains deferred. The current requirement is still to preserve previous content where possible and report the failed write target.

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
