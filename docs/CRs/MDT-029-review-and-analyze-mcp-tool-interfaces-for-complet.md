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
- [ ] Document all attributes used in existing tickets
- [ ] Compare with MCP tool schemas
- [ ] Identify gaps and inconsistencies

### Phase 2: Schema Updates
- [ ] Add missing attributes to tool input schemas
- [ ] Update TypeScript interfaces
- [ ] Add validation rules for new attributes

### Phase 3: Testing & Documentation
- [ ] Test schema changes with LLM interactions
- [ ] Update MCP documentation
- [ ] Verify backwards compatibility

## 4. Acceptance Criteria
- [ ] All ticket attributes available through MCP tools
- [ ] LLMs can create tickets with full relationship data
- [ ] Schema validation prevents invalid attribute values
- [ ] Documentation reflects complete capabilities
- [ ] No breaking changes to existing integrations
- [ ] Performance maintained or improved

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*