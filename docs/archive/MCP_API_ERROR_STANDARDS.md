# MCP API Error Message Standards

## Error Message Format

All MCP API errors should follow this standardized format:

### Pattern
```
[Context]: [What went wrong]. [Available options/next steps]
```

### Examples

**✅ Good:**
```
Project 'XYZ' not found. Available projects: MDT, API, WEB
Invalid CR type 'bugfix'. Must be one of: Bug Fix, Feature Enhancement, Architecture, Technical Debt, Documentation
Template not found for type 'invalid'. Valid types: Bug Fix, Feature Enhancement, Architecture, Technical Debt, Documentation
```

**❌ Bad:**
```
Project not found
Unknown tool
Failed to update status
```

## Specific Error Types

### 1. Not Found Errors
**Format**: `[Resource] '[identifier]' not found. Available [resources]: [list]`

**Examples**:
- `Project 'XYZ' not found. Available projects: MDT, API, WEB`
- `CR 'MDT-999' not found in project 'MDT'. Existing CRs: MDT-001, MDT-002, MDT-003`

### 2. Invalid Input Errors  
**Format**: `Invalid [field] '[value]'. Must be one of: [valid options]`

**Examples**:
- `Invalid status 'done'. Must be one of: Proposed, Approved, In Progress, Implemented, Rejected`
- `Invalid priority 'urgent'. Must be one of: Low, Medium, High, Critical`

### 3. Validation Errors
**Format**: `[Action] failed: [specific reasons with field names]`

**Examples**:
- `CR creation failed: Title is required, Invalid type 'bugfix'`
- `CR validation failed: Description required for Bug Fix type`

### 4. Operation Errors
**Format**: `Failed to [action] [resource]: [specific reason and resolution]`

**Examples**:
- `Failed to update CR 'MDT-001': Invalid status transition from 'Implemented' to 'Proposed'`
- `Failed to create CR: File system permissions denied. Check directory write access.`

## Implementation Requirements

1. **Always include available options** when user provides invalid input
2. **Be specific about what failed** - avoid generic "operation failed"
3. **Provide actionable next steps** when possible
4. **Use consistent terminology** across all functions
5. **Include context** - which project, CR, or operation was involved

## Error Response Structure

```typescript
interface ErrorResponse {
  message: string;     // Human-readable error following standards above
  code?: string;       // Optional error code for programmatic handling
  context?: object;    // Optional additional context (available options, etc.)
}
```