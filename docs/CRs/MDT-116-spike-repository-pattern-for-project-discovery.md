---
code: MDT-116
status: Proposed
dateCreated: 2026-01-10T00:00:00.000Z
type: Architecture
priority: High
---

# Spike: Repository Pattern for project discovery

## 1. Description

### Requirements Scope
`none`

### Problem
- The project discovery and registration system has evolved from single-source to dual-source without proper architectural refactoring
- Multiple sources of truth exist: global registry files and auto-discovered projects
- Inconsistent access patterns: some operations work with both sources, others only with registered projects
- Logic duplication: MCP server has its own `ProjectDiscoveryService` implementation
- Violation of Single Responsibility Principle: `ProjectService` handles too many concerns

### Affected Artifacts
- `shared/services/ProjectService.ts` - Facade with 25+ public methods
- `shared/services/project/ProjectDiscoveryService.ts` - Registry + auto-discovery
- `shared/services/project/ProjectConfigService.ts` - Config operations with business logic
- `shared/services/project/types.ts` - Service interfaces
- `mcp-server/src/services/projectDiscovery.ts` - DUPLICATE of shared implementation
- `server/controllers/ProjectController.ts` - Uses project services
- `server/controllers/DocumentController.ts` - Delegates to ProjectController

### Scope
- **Changes**: Introduce Repository Pattern for unified project access, eliminate MCP duplicate, refactor service responsibilities
- **Unchanged**: Project data model, configuration file formats, API contracts

## 2. Decision

### Chosen Approach
Implement Repository Pattern to provide unified interface to project data regardless of source, then refactor services to have clear single responsibilities.

### Rationale
- Repository Pattern encapsulates data source complexity behind a single interface
- Eliminates the dual-source problem at the architectural level (not just with workarounds)
- Reduces logic duplication between shared and MCP server
- Improves testability by abstracting data access
- Enables future data source changes without affecting business logic

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Repository Pattern with unified access | **ACCEPTED** - Addresses root cause architecturally |
| Auto-register all projects | Create registry files for discovered projects | Breaks design intent, requires manual steps |
| Keep workarounds | Add per-operation checks like configureDocuments fix | Technical debt accumulates, inconsistent patterns |
| Single source only | Require all projects to be registered | Eliminates auto-discovery feature |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `IProjectRepository` | Interface | Unified project access interface |
| `ProjectRepository` | Class | Repository implementation |
| `IProjectRegistry` | Interface | Registry data access |
| `IConfigStore` | Interface | Configuration storage |
| `DocumentConfigurationService` | Class | Document configuration business logic |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `ProjectService` | Refactor | Become thin orchestrator, delegate to repository |
| `ProjectConfigService` | Refactor | Remove business logic, config operations only |
| `ProjectDiscoveryService` | Refactor | Discovery coordination only, no business logic |
| `MCP ProjectDiscoveryService` | Remove | Use shared implementation instead |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| ProjectController | ProjectRepository | IProjectRepository |
| DocumentController | ProjectRepository | IProjectRepository |
| TreeService | ProjectRepository | IProjectRepository |
| MCP Server | ProjectRepository | IProjectRepository |

## 5. Acceptance Criteria

### Functional
- [ ] `ProjectRepository.findAll()` returns both registered and auto-discovered projects
- [ ] `ProjectRepository.findById(id)` works for any project regardless of source
- [ ] `ProjectService` delegates all data access to `ProjectRepository`
- [ ] `ProjectService.configureDocuments()` uses repository for project lookup
- [ ] MCP server uses shared `ProjectRepository` instead of duplicate implementation
- [ ] No regression in existing functionality

### Non-Functional
- [ ] All existing tests pass
- [ ] Test coverage for new repository layer > 80%
- [ ] No performance degradation in project operations
- [ ] TypeScript compilation passes without errors

### Testing
- [ ] Unit: Test `ProjectRepository` with registered projects
- [ ] Unit: Test `ProjectRepository` with auto-discovered projects
- [ ] Unit: Test `ProjectRepository` merge logic
- [ ] Integration: Test all controllers use repository correctly
- [ ] Regression: All existing API tests pass

## 6. Verification

### By CR Type
- **Architecture/Technical Debt**: Unified project access, clear separation of concerns
  - Single `ProjectRepository` interface for all project access
  - No difference between registered and auto-discovered projects
  - Clear service responsibilities with single concern per service
  - No code duplication between shared and MCP server

### Success Metrics
- Number of service methods in `ProjectService` reduced by 50%
- Zero duplication between shared and MCP server
- All project operations work consistently for both sources
- Test coverage for repository layer > 80%

## 7. Deployment

### Complex Changes

| Part | Artifacts Deployed | Rollback |
|-------|-------------------|----------|
| 1 | New repository classes and interfaces | Revert commits |
| 2 | Refactored ProjectService | Revert commits |
| 3 | Updated controllers | Revert commits |
| 4 | Removed MCP duplicate | Revert commits |

### Deployment Steps
```bash
# Build shared code
npm run build:shared

# Build MCP server
cd mcp-server && npm run build

# Restart services
npm run dev:full
```

## Investigation Document

See `architectural-investigation-report.md` in this ticket folder for detailed analysis including:
- Current architecture diagram
- Complete problem catalog
- Root cause analysis
- Detailed refactoring plan with timelines
- Test coverage analysis
