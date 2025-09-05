---
code: MDT-010
title: Implement MCP partial update functionality for CR field updates
status: Proposed
dateCreated: 2025-09-05
type: Feature Enhancement
priority: Medium
phaseEpic: MCP API Enhancement
lastModified: 2025-09-05T18:45:00.000Z
---

# Implement MCP partial update functionality for CR field updates

## Problem Statement

The system currently has a REST API PATCH endpoint for partial ticket updates (implemented in MDT-009), but the MCP API only supports full replacement operations or status-only updates. We need to add MCP partial update capability to achieve API parity between REST and MCP interfaces.

## Current State

MCP server has limited update capabilities:
- Only has `update_cr_status` for single field updates
- Only has `create_cr` for full CR creation
- No partial field updates capability
- No multiple field updates in one call

REST API has comprehensive PATCH endpoint that supports partial updates of any combination of fields.

## Desired State

MCP server should have full parity with REST API partial update functionality:
- New `update_cr` MCP tool that enables partial field updates
- Support for updating any combination of fields in a single call
- Maintain backward compatibility with existing tools
- Consistent behavior between REST PATCH and MCP update operations

## Rationale

API parity is essential for:
1. Consistent developer experience across interfaces
2. Feature completeness of MCP server
3. Future tooling that may rely on MCP for ticket management
4. Avoiding confusion between different update mechanisms

## Impact Areas

- MCP Server (`/mcp-server/src/`)
- MCP Tools Registry
- CR Service Layer
- API Documentation
- Client applications using MCP

## Solution Analysis

### Approaches Considered

1. **Extend update_cr_status** (Rejected)
   - Pros: Minimal API surface changes
   - Cons: Function name becomes misleading, breaks single responsibility principle

2. **Add update_cr tool** (Selected)
   - Pros: Clear separation of concerns, flexible field selection, maintains backward compatibility
   - Cons: Adds new tool to API surface

3. **Multiple specialized update tools** (Rejected)
   - Pros: Type-safe field updates
   - Cons: API bloat, maintenance overhead

### Trade-offs

- Performance: Single call vs multiple calls for multi-field updates
- API Surface: Additional tool vs overloaded existing tool
- Maintainability: Clear separation vs consolidated functionality

### Decision

Implement new `update_cr` MCP tool for maximum flexibility and API parity.

## Implementation Specification

### Requirements

1. Add `update_cr` tool to MCP tools array in `/mcp-server/src/tools/index.ts`
2. Implement `handleUpdateCR()` method for partial updates
3. Support updating any combination of fields: title, priority, phaseEpic, description, rationale, impactAreas, status
4. Leverage existing PATCH endpoint logic or create similar functionality
5. Maintain backward compatibility with `update_cr_status`
6. Proper error handling and validation

### API Changes

New MCP tool: `mcp__mdt-tickets__update_cr(projectCode, crCode, updateData)`

Example usage:
```typescript
mcp__mdt-tickets__update_cr("mdt", "MDT-009", {
  priority: "High",
  phaseEpic: "Performance Phase"
})
```

### MCP Tool Schema

```typescript
{
  name: "update_cr",
  description: "Update specific fields of an existing Change Request",
  inputSchema: {
    type: "object",
    properties: {
      project: { type: "string", description: "Project identifier" },
      code: { type: "string", description: "CR code to update" },
      updates: {
        type: "object",
        description: "Fields to update",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
          phaseEpic: { type: "string" },
          status: { type: "string", enum: ["Proposed", "Approved", "In Progress", "Implemented", "Rejected"] },
          assignee: { type: "string" },
          estimatedHours: { type: "number" },
          tags: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
          impactAreas: { type: "string" }
        }
      }
    },
    required: ["project", "code", "updates"]
  }
}
```

### Configuration Changes

No configuration changes required - backward compatible implementation.

## Acceptance Criteria

1. **Tool Registration**: update_cr tool appears in MCP tools list
2. **Partial Updates**: Can update any combination of supported fields in single call
3. **Field Validation**: Validates field values (e.g., priority enum, status transitions)
4. **Backward Compatibility**: Existing update_cr_status continues to work unchanged
5. **Error Handling**: Returns appropriate errors for invalid CR codes, invalid fields, validation failures
6. **Performance**: Single file write operation regardless of number of fields updated
7. **Audit Trail**: Updates lastModified timestamp on successful updates
8. **Type Safety**: Input schema enforces valid field types and enum values
9. **File Integrity**: Preserves non-updated frontmatter fields and markdown content
10. **Integration Test**: Multi-field update works (priority + phaseEpic + assignee in one call)

## Implementation Notes

*To be completed during implementation*

## References

- Related to MDT-009: PATCH endpoint optimization for drag-and-drop efficiency
- MCP Server architecture documentation
- REST API PATCH endpoint implementation for reference