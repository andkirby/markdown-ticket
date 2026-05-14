# UAT Architecture Watchlist: MDT-077

**Source**: [MDT-077](../MDT-077-project-entity-configuration-architecture.md)
**Created**: 2026-05-15

## Purpose

Capture architecture improvements to raise during UAT before widening MDT-077 scope. These items are not approved implementation tasks yet; they are candidates for UAT refinement.

## Watchlist

### 1. Single Project Mutation Entry Point

Project mutation should route through one shared project application boundary. `ProjectManager` can remain a create/init facade, but update semantics should not be split across server adapters, `ProjectManager`, and low-level config services.

**UAT question**: Should MDT-077 introduce a dedicated `ProjectApplicationService` or fold this responsibility into `ProjectService`?

### 2. Explicit Configuration Mode

Configuration mode should be explicit instead of inferred from `metadata.globalOnly` or the presence of operational fields in registry data.

Candidate mode values:

- `global-only`
- `project-first`
- `auto-discovery`

**UAT question**: Where should mode live for existing configs without breaking current projects?

### 3. Canonical Project Identity Resolution

Code, id, and path resolution should be one named operation before read or write:

```text
resolveProjectIdentity(input) -> ProjectRef
```

This should prevent API, CLI, MCP, and UI flows from resolving projects differently.

**UAT question**: Should identity resolution return only a project record, or a richer write reference including mode and config path?

### 4. Separate Registry Metadata From Operational Config

Types should make it hard to write operational fields such as `name`, `description`, or `repository` into a project-first registry entry.

**UAT question**: Should registry and local config use separate TypeScript types instead of one broad `ProjectConfig` shape?

### 5. Safer Update Persistence

Project-first mode can touch both local config and registry metadata. Update behavior should define ordering and failure handling.

Candidate rule:

1. Validate input.
2. Resolve identity and mode.
3. Write operational config.
4. Update registry metadata if applicable.
5. Reread canonical project.

**UAT question**: Do we need rollback-on-failure now, or is preserve-old-content plus explicit failure reporting enough?

### 6. Shared Validation Results

UI validation can remain for UX, but server/shared validation must be authoritative and reused by API, CLI, and MCP where mutations exist.

**UAT question**: Should validation errors have a shared structured shape for all interfaces?

### 7. Project Contract Test Matrix

Add a table-driven suite that covers the project entity across modes:

| Mode | Create/Register | Read | Update | Readback |
|------|-----------------|------|--------|----------|
| Global-only | yes | yes | yes | yes |
| Project-first | yes | yes | yes | yes |
| Auto-discovery | local config | yes | yes | yes |

Required edge cases:

- missing registry fallback
- description-only update
- registry/local conflict
- failed write target
- project-first registry does not gain operational fields

**UAT question**: Should this live in shared integration tests first, with API/browser tests only covering representative paths?

### 8. Frontend State Update Source

After edit save, the API should return canonical refreshed project data. The UI should update the selected project from that response immediately and use background refresh only for reconciliation.

**UAT question**: Should `project:changed` remain the primary update mechanism, or become a secondary refresh signal?

## Proposed UAT Decision

Approve the following as MDT-077 follow-up scope:

1. Explicit mode model.
2. Canonical identity resolution.
3. Single mutation entry point.
4. Contract test matrix.

Defer full transactional rollback unless UAT finds real corrupted-state risk.
