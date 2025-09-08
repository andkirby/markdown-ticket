---
code: MDT-029
title: Review and analyze MCP tool interfaces for completeness
status: In Progress
dateCreated: 2025-09-08T13:09:04.324Z
type: Technical Debt
priority: Medium
---


# Review and analyze MCP tool interfaces for completeness

## 1. Description

### Problem Statement
MCP tool interfaces are missing many supported ticket attributes, limiting LLM awareness and capabilities. LLMs can only use attributes exposed in tool schemas, making hidden attributes effectively unusable for AI assistance.

### Current State
- MCP `create_cr` tool exposes: title, priority, phaseEpic, description, rationale, impactAreas, content
- Missing attributes: dependsOn, relatedTo, blockedBy, tags, assignee, estimatedHours, actualHours, etc.
- LLMs cannot use undocumented attributes, reducing AI assistance effectiveness
- Manual workarounds required (e.g., adding dependsOn manually after creation)

### Desired State
- Complete MCP tool schemas reflecting full data model
- LLMs aware of all available attributes and relationships
- Consistent interface between Web UI and MCP capabilities
- Self-documenting API through comprehensive schemas

### Rationale
Ensure LLMs have full visibility into data model capabilities to maximize AI assistance effectiveness

### Business Impact
- **User Experience**: LLMs can provide complete assistance without manual intervention
- **Data Integrity**: Proper validation of all attributes through schema
- **Development Efficiency**: Reduced need for manual corrections and workarounds
- **System Consistency**: Unified data model across all interfaces

## 2. Solution Analysis

### Root Cause Analysis
1. **Schema Drift**: MCP schemas not updated when new attributes added to data model
2. **Documentation Gap**: No process to ensure schema completeness
3. **Testing Gap**: No validation that MCP exposes full capabilities

### Related Questions (BA Analysis)
1. **Scope**: Which tools need review? (create_cr, update_cr_status, others?)
2. **Backwards Compatibility**: How to handle schema changes without breaking existing integrations?
3. **Validation Strategy**: Should all attributes be validated or just documented?
4. **Performance Impact**: Does exposing more attributes affect tool performance?
5. **User Training**: Do users need documentation updates for new capabilities?
6. **Integration Testing**: How to ensure Web UI and MCP stay in sync?
7. **Versioning**: Should MCP tools have version numbers for schema changes?
8. **Error Handling**: How to handle deprecated or renamed attributes?

### Impact Assessment
- **High Impact**: create_cr, update_cr_status (primary creation/modification tools)
- **Medium Impact**: list_crs, get_cr (query tools benefit from complete data)
- **Low Impact**: utility tools (templates, validation)

## 3. Implementation Specification

### Phase 1: Audit Current State
- [x] Document all attributes used in existing tickets
- [x] Compare with MCP tool schemas
- [x] Identify gaps and inconsistencies

### Phase 2: Schema Updates
- [x] Add missing attributes to tool input schemas
- [x] Update TypeScript interfaces
- [x] Add validation rules for new attributes

### Phase 3: Testing & Documentation
- [x] Test schema changes with LLM interactions
- [x] Update MCP documentation
- [x] Verify backwards compatibility

## 4. Acceptance Criteria
- [x] All ticket attributes available through MCP tools
- [x] LLMs can create tickets with full relationship data
- [x] Schema validation prevents invalid attribute values
- [x] Documentation reflects complete capabilities
- [x] No breaking changes to existing integrations
- [x] Performance maintained or improved

## 5. Implementation Notes

**Completed:** 2025-09-08

**Key Changes:**
- Updated manual_ticket_creation.md as authoritative source of truth
- Added `dependsOn`, `blocks`, `effort` attributes to MCP schemas
- Removed `estimatedHours` from all interfaces
- Added `On Hold` status to workflow
- Created `update_cr_attrs` tool for attribute updates
- Updated CRData interface and status transitions

**Files Modified:**
- `docs/manual_ticket_creation.md` - Complete attribute specification
- `mcp-server/src/tools/index.ts` - Tool schemas
- `mcp-server/src/types/index.ts` - TypeScript interfaces
- `mcp-server/src/services/crService.ts` - Status transitions

**Testing Results:**
- MCP server rebuilt successfully
- All tools accessible from fresh Q CLI sessions
- Schema validation working for new attributes
- Backwards compatibility maintained

**Follow-up Changes (2025-09-08):**
- Simplified attribute set: removed `effort`, `reviewers`, `riskLevel`, `tags`, `dependencies`, `impact`, `impactAreas`
- Disabled 3 MCP tools: `get_next_cr_number`, `validate_cr_data`, `find_related_crs`
- Updated documentation: `docs/manual_ticket_creation.md`, `docs/create_ticket.md`, `README.md`, `mcp-server/MCP_TOOLS.md`
- **Remaining work**: Update MCP server code and frontend to match simplified schemas
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*