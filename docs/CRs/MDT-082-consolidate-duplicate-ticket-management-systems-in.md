---
code: MDT-082
title: Consolidate duplicate ticket management systems into shared service
status: Proposed
dateCreated: 2025-11-24T00:00:10.528Z
type: Technical Debt
priority: Medium
dependsOn: MDT-071
blocks: MDT-071
---

# Consolidate duplicate ticket management systems into shared service

## 1. Description
### Problem
- **Critical technical debt**: Ticket CRUD operations exist only in `mcp-server/`, not accessible to web components
- **Architecture gap**: `shared/` directory has models but lacks comprehensive ticket service
- **Code duplication**: `server/services/TicketService.ts` contains outdated duplicate logic
- **Missing integration**: Web server cannot perform ticket CRUD operations through shared infrastructure

### Affected Artifacts
- `mcp-server/src/services/crService.ts` - Complete CRUD operations (source of truth)
- `server/services/TicketService.ts` - Outdated duplicate logic (REMOVE)
- `server/utils/ticketNumbering.ts` - Counter file dependency (REMOVE)
- `shared/services/ProjectService.ts` - Missing `getProjectCRs()` method (ADD)
- `shared/models/Ticket.ts` - Complete models (✅ existing)
- `shared/services/CRService.ts` - Basic ticket operations (✅ existing)

### Scope
- **Consolidate**: Move CRUD operations from `mcp-server/crService.ts` to `shared/services/TicketService.ts`
- **Remove**: Delete duplicate web server ticket logic
- **Enhance**: Add missing methods to existing shared services
- **Maintain**: Preserve all existing MCP server functionality
- **Enable**: Provide ticket CRUD access to web components through shared layer
## 2. Decision
### Chosen Approach
Consolidate ticket CRUD operations from `mcp-server/crService.ts` into `shared/services/TicketService.ts` and remove web server duplicates.

### Rationale
- **Single source of truth**: MCP server CRUD operations are complete and tested
- **Architecture consistency**: All ticket operations in shared layer accessible to both MCP and web
- **Leverage existing infrastructure**: Use `shared/models/Ticket.ts`, `CRService.ts`, `ProjectService.ts`
- **Enable web features**: Web components can perform ticket CRUD through shared service
- **Eliminate technical debt**: Remove duplicate logic from `server/` directory
## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
----------|---------------|--------------|
| **Chosen Approach** | Create shared service in `shared/` | **ACCEPTED** - Single source of truth, maintains MCP server fixes |
| Remove web server logic | Use MCP server only for ticket creation | Breaks web server independence, adds coupling |
| Keep both systems | Accept technical debt | Requires perpetual dual maintenance |
| Database solution | Store ticket numbers in database | Adds infrastructure complexity, over-engineering |

## 4. Artifact Specifications
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `shared/services/TicketService.ts` | Service | Consolidated CRUD operations from MCP server |
| Method: `shared/services/ProjectService.ts.getProjectCRs()` | Method | Missing method needed by MCP server |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/services/crService.ts` | Logic moved | Move CRUD methods to shared layer |
| `mcp-server/src/services/crService.ts` | Imports updated | Import from `shared/services/TicketService` |
| `server/services/TicketService.ts` | File removed | Delete outdated duplicate logic |
| `server/utils/ticketNumbering.ts` | File removed | Delete counter file dependency |
| `shared/services/CRService.ts` | Enhanced | Leverage existing ticket creation logic |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `shared/TicketService.listCRs()` | `shared/ProjectService.getProjectCRs()` | Ticket listing |
| `shared/TicketService.createCR()` | `shared/CRService` | Ticket object creation |
| `shared/TicketService` | `shared/MarkdownService` | File operations |
| MCP server tools | `shared/TicketService` | All ticket CRUD |
| Web components | `shared/TicketService` | Ticket CRUD access |

### Key Methods to Consolidate

**From `mcp-server/crService.ts`:**
- `listCRs(project, filters)` → `shared/TicketService.listCRs()`
- `getCR(project, key)` → `shared/TicketService.getCR()`
- `createCR(project, data)` → `shared/TicketService.createCR()`
- `updateCRStatus(project, key, status)` → `shared/TicketService.updateCRStatus()`
- `updateCRAttrs(project, key, attrs)` → `shared/TicketService.updateCRAttrs()`
- `deleteCR(project, key)` → `shared/TicketService.deleteCR()`
- `getNextCRNumber(project)` → `shared/TicketService.getNextCRNumber()`
## 5. Acceptance Criteria
### Functional
- [ ] `shared/services/TicketService.ts` exists with all CRUD methods from MCP server
- [ ] `shared/services/ProjectService.ts.getProjectCRs()` method implemented
- [ ] `server/services/TicketService.ts` file completely removed
- [ ] `server/utils/ticketNumbering.ts` file completely removed
- [ ] MCP server imports and uses `shared/TicketService`
- [ ] All existing MCP ticket tools continue working
- [ ] `shared/models/Ticket.ts` leveraged for all data structures
- [ ] `shared/services/CRService.ts` integrated for ticket creation

### Non-Functional
- [ ] Ticket CRUD operations accessible from both MCP and web layers
- [ ] No duplicate ticket business logic across codebases
- [ ] Single source of truth for ticket operations in shared layer
- [ ] All existing MCP server functionality preserved
- [ ] Performance: < 50ms for ticket CRUD operations

### Testing
- Unit: `shared/TicketService.listCRs()` returns filtered ticket list
- Unit: `shared/TicketService.createCR()` creates ticket with proper numbering
- Integration: MCP server creates ticket through shared service
- Integration: Web components can access shared ticket operations
- Regression: All existing MCP ticket tools function unchanged
- Migration: Projects with existing tickets continue working
## 6. Verification

### Technical Debt Reduction
- Before: 2 duplicate ticket management systems (MCP + web)
- After: 1 shared ticket management system in `shared/`
- Code reduction: ~50 lines of duplicate business logic eliminated
- Maintenance burden: Bug fixes apply once instead of twice

### By Artifacts
- `shared/services/TicketService.ts` exists with required methods
- `server/utils/ticketNumbering.ts` file does not exist
- Both servers import from shared service
- All existing ticket creation tests pass
- No performance regression in ticket creation operations

## 7. Deployment
### Migration Strategy

| Phase | Artifacts Modified | Validation | Rollback |
|-------|-------------------|------------|----------|
| 1 | Create `shared/services/TicketService.ts` | All methods present | Delete shared file |
| 2 | Add `getProjectCRs()` to `ProjectService.ts` | Method returns tickets | Remove method |
| 3 | Update MCP server imports | Tools work via shared service | Restore original imports |
| 4 | Remove `server/services/TicketService.ts` | No web server errors | Restore from git |
| 5 | Remove `server/utils/ticketNumbering.ts` | No missing dependencies | Restore from git |

### Validation Commands
```bash
# Verify shared service exists with required methods
ls -la shared/services/TicketService.ts
grep -E "(listCRs|getCR|createCR|updateCRStatus|updateCRAttrs|deleteCR|getNextCRNumber)" shared/services/TicketService.ts

# Verify ProjectService has missing method
grep -A 10 "getProjectCRs" shared/services/ProjectService.ts

# Verify duplicates removed
! ls -la server/services/TicketService.ts
! ls -la server/utils/ticketNumbering.ts

# Test MCP server integration
npm run test -- --testPathPattern=mcp-server.*crService
```