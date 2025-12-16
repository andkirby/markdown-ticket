---
code: MDT-090
status: On Hold
dateCreated: 2025-12-07T14:58:59.933Z
type: Technical Debt
priority: Medium
dependsOn: MDT-091
---

# Investigate and refactor MCP server business logic duplication

## 1. Description
### Problem
- MCP server contains duplicated business logic that should exist in shared services
- Title extraction logic incorrectly implemented in MCP server instead of using shared TitleExtractionService
- Manual YAML parsing in MCP tools bypasses shared MarkdownService
- Mixed responsibilities where MCP handles both proxy logic and business logic

### Affected Artifacts
- `mcp-server/src/tools/index.ts` (contains duplicated CR operations, YAML parsing, title handling)
- `shared/services/MarkdownService.ts` (should be single source for markdown operations)
- `shared/services/TitleExtractionService.ts` (should be single source for title extraction)
- `shared/services/CRService.ts` (should handle all CR operations)
- Backend server endpoints (may need to absorb some MCP-specific logic)

### Scope
- **Changes**: Refactor MCP server to use shared services, move any missing business logic to shared layer
- **Unchanged**: MCP tool interfaces and JSON-RPC protocol

### Dependencies
- **MDT-091**: This CR depends on MDT-091. The E2E testing framework must be implemented first to provide a safety net for this refactoring work, ensuring we can verify that the refactoring doesn't break existing functionality.

### Refactoring Tasks Added to Scope

1. **Remove Custom YAML Parser**
   - Delete `parseYamlFrontmatter` method from MCP server (lines 1134-1160)
   - Replace all usage with shared MarkdownService YAML parsing
   - Update `get_cr` tool to use MarkdownService for content parsing

2. **Implement Title Extraction Service Integration**
   - Import TitleExtractionService in MCP server
   - Replace manual title extraction logic (line 524) with shared service
   - Ensure consistent title extraction across MCP and backend

3. **Extract Business Logic to Shared Services**
   - Review all CRUD operations in MCP tools
   - Move any business logic not already in shared services
   - Ensure MCP server only handles protocol translation

4. **Add Comprehensive Test Coverage**
   - Unit tests for MCP tools delegating to shared services
   - Integration tests verifying identical results between MCP and backend
   - Test coverage for all refactored components
## 2. Decision

### Chosen Approach
Investigate MCP server business logic and refactor it to be a thin proxy using shared services.

### Rationale
- Eliminates code duplication between MCP and shared services
- Ensures consistent behavior across backend server and MCP server
- Reduces maintenance burden by having single source of truth
- Simplifies MCP server to focus on protocol translation only

## Architecture Design
> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Thin Proxy Pattern
- Components: 5 (MCPTools, 3 handler groups, 4 shared services)
- Key constraint: MCPTools ≤300 lines, handlers ≤200-300 lines

**Extension Rule**: To add new MCP tools, create handler in appropriate handlers/*.ts file (limit 200-300 lines) and delegate to shared services.

## 3. Alternatives Considered
## 4. Artifact Specifications
### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| `docs/CRs/MDT-090/architecture.md` | Documentation | Detailed architecture design with component boundaries |
| `mcp-server/src/tools/handlers/` | Code directory | Extracted tool handlers (NEW) |
| `mcp-server/src/tools/handlers/projectHandlers.ts` | Code | Project-related MCP tools (NEW) |
| `mcp-server/src/tools/handlers/crHandlers.ts` | Code | CRUD operation MCP tools (NEW) |
| `mcp-server/src/tools/handlers/sectionHandlers.ts` | Code | Section management MCP tools (NEW) |
| `mcp-server/tests/integration/` | Test directory | Integration tests (NEW) |
| `mcp-server/tests/integration/mcp-backend-consistency.test.ts` | Test | Verify identical outputs (NEW) |
| `mcp-server/tests/integration/service-delegation.test.ts` | Test | Verify service usage (NEW) |

| `docs/CRs/MDT-090/investigation.md` | Documentation | Detailed report of duplicated business logic findings |
### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/tools/index.ts` | Refactor | Reduce from 1168 to ≤300 lines, extract handlers, remove duplicated logic |
| `shared/services/` | Potentially extend | Add any missing business logic from MCP |
| `mcp-server/src/tools/__tests__/basic.test.ts` | Update | Update tests to work with refactored structure |

### Integration Points

| From | To | Interface |
|------|----|-----------| 
| MCPTools constructor | Shared services | Dependency injection |
| Tool handlers | Shared services | Method calls |
| Integration tests | Both servers | Consistency verification |

## 5. Acceptance Criteria
### Functional
- [ ] Investigation report identifies all duplicated business logic in MCP
- [ ] All MCP tools delegate to shared services for business logic
- [ ] Title extraction uses only shared TitleExtractionService
- [ ] No manual YAML parsing in MCP server
- [ ] Backend server and MCP server produce identical results for same operations

### Non-Functional
- [ ] MCP server code reduced by at least 30% (current: 1374 lines in index.ts)
- [ ] All existing MCP tool interfaces preserved
- [ ] No performance degradation in MCP operations

### Testing
- E2E: Comprehensive e2e test coverage for all MCP tools
- Unit: Verify MCP tools delegate to correct shared service methods
- Integration: Test MCP server produces same results as backend server
- Manual: Verify all MCP tools still work after refactoring
### Refactoring Acceptance Criteria

- [ ] Custom `parseYamlFrontmatter` method completely removed from MCP server
- [ ] All MCP tools use shared MarkdownService for YAML parsing
- [ ] TitleExtractionService imported and used for all title operations
- [ ] MCP server code reduced from 1168 to <800 lines (30% reduction)
- [ ] All existing MCP tool interfaces preserved
- [ ] Comprehensive unit test coverage added for refactored components
- [ ] Integration tests verify identical outputs between MCP and backend servers
## 6. Verification

### By CR Type
- **Refactoring**: Tests pass, MCP server code reduced, shared services usage verified

### Metrics
- Lines of code in MCP server reduced (baseline: 1374 lines in index.ts)
- Number of shared service methods used by MCP (target: maximize)
- Test coverage maintained or improved

## 7. Deployment
### Investigation Phase
- Document all business logic in MCP server
- Categorize as: MCP-specific, shared, or backend-merge candidate
- Create detailed refactoring plan

### Refactoring Phase
- Incrementally move business logic to appropriate location
- Update MCP to use shared services
- Add comprehensive tests for integration points
- Verify MCP tool outputs remain unchanged

### Session 2025-12-07

- Q: Which specific business logic in MCP server is not already in shared services and needs to be moved? → A: Response formatting logic, MCP-specific validation rules, The rest has to be investigated
- Q: How should we measure 'identical results' between MCP and backend servers? → A: Ideally, we need to write e2e tests for the MCP server first. All tools must be covered.
- Q: Which backend server endpoints might need to absorb MCP-specific logic? → A: The backend MUST NOT absorb code from MCP. We need to consolidate logic from mcp-server/ and server/ in shared/. If something is pretty specific - it should stay. In the same time, if ticket key validation is implemented in shared/ probably we can remove it from other placed. But it has to be reviewed properly. MCP server is for LLMs - LLM must understand errors properly.
- Q: How should we measure 'no performance degradation' in MCP operations? → A: No.
- Q: What should the 'investigation report' deliverable contain? → A: Markdown document in docs/CRs/MDT-090/investigation.md

### Applied Clarifications

**Updated Scope Section**:
- Added principle: Consolidate common logic in shared/, don't move MCP-specific to backend
- Added requirement: MCP server errors must be LLM-friendly
- Clarified that ticket validation logic in shared/ should replace duplicate implementations

**Updated Artifact Specifications**:
- Added investigation.md as formal deliverable
- Clarified that shared services may need extension for common validation logic
- Specified that MCP-specific validation and response formatting stay in MCP layer

**Updated Acceptance Criteria**:
- Emphasized e2e test coverage for all MCP tools as verification method
- Removed performance criteria (user indicated not needed)
- Added requirement that error messages are LLM-comprehensible