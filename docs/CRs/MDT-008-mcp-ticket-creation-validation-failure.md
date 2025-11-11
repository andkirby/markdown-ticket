---
code: MDT-008
title: MCP ticket creation validation failure
status: Implemented
dateCreated: 2025-09-05
type: Bug Fix
priority: Medium
phaseEpic: MCP Integration
relatedTickets: MDT-004
implementationDate: 2025-09-05T16:18:51.170Z
implementationNotes: Status changed to Implemented on 9/5/2025
lastModified: 2025-09-05T16:32:13.199Z
---


# MCP ticket creation validation failure

## 1. Description

### Problem Statement
MCP functions for creating tickets are failing validation with "type is required" error, despite type parameter being provided correctly. This prevents automated ticket creation through the MCP interface.

### Current Behavior (Wrong)
- Call `mcp__mdt-tickets__create_cr` with proper parameters including `type: "Bug Fix"`
- Validation fails with error: "CR data validation failed: ❌ type: Type is required"
- Same error occurs with both `mcp__mdt-tickets__create_cr` and `mcp__markdown-ticket__create_cr`
- Manual file creation works correctly

### Expected Behavior
- MCP create_cr function should accept valid type parameter
- Validation should pass when all required fields are provided
- Ticket should be created successfully via MCP interface

### Root Cause Analysis
**Issue**: Type validation mismatch between MCP parameters and validation logic

The root cause was identified in the `validateCRData` method in `mcp-server/src/services/templateService.ts:316-385`:

1. **MCP function call**: `handleCreateCR(projectKey, type, data)` - type passed as separate parameter
2. **Validation function**: `validateCRData(data, type)` - checks `data.type` instead of using `type` parameter
3. **Result**: Validation fails with "type is required" even when type is provided correctly

**Code Analysis:**
- Line 327: `if (!data.type)` - validation looks in wrong place for type
- Line 478: `this.templateService.validateCRData(data, type)` - type parameter ignored
- MCP calls typically pass type separately, not embedded in data object

### Impact Assessment
- **User Impact**: Medium - Users must manually create tickets instead of using MCP automation
- **System Stability**: MCP integration partially broken
- **Data Integrity**: Safe - manual creation still works
- **Severity**: Medium - workaround available but automation is broken

## 2. Solution Analysis

### Approaches Considered
1. **Modify MCP interface** - Include type in data object - ❌ Would break existing patterns
2. **Fix validation logic** - Use type parameter when data.type missing - ✅ **Chosen approach**
3. **Duplicate type in both places** - Would create redundancy and maintenance issues

### Implementation Strategy
Fixed `validateCRData()` method to:
1. Use `data.type || type` for effective type resolution
2. Apply type parameter fallback throughout validation logic
3. Maintain backwards compatibility with existing usage patterns

### Technical Details
- **File**: `mcp-server/src/services/templateService.ts`
- **Method**: `validateCRData(data: CRData, type?: CRType)`
- **Change**: Added `const effectiveType = data.type || type;`

## 3. Implementation Specification

### Technical Changes Made

**File: `mcp-server/src/services/templateService.ts`**
- **Lines 327-340**: Enhanced type validation logic
- **Lines 355-368**: Updated type-specific validation to use effectiveType
- **Added**: `const effectiveType = data.type || type;` for parameter resolution

**Key Implementation Details:**
1. **Parameter Precedence**: `data.type` takes priority, falls back to `type` parameter
2. **Validation Consistency**: All type-based validations now use `effectiveType`
3. **Backwards Compatibility**: Existing code with `data.type` continues to work
4. **MCP Support**: MCP calls with separate type parameter now work correctly

### Build Process
- TypeScript compilation: ✅ No errors
- MCP server rebuild: ✅ Required after changes
- Configuration: No changes needed

## 4. Acceptance Criteria
- [x] Bug is reproducible in test environment
- [x] Root cause is identified and documented
- [x] MCP create_cr functions accept valid type parameters  
- [x] Validation logic properly processes all required fields
- [x] Fix implemented in TemplateService validation
- [x] No regression in manual ticket creation (backwards compatible)
- [x] TypeScript compilation successful
- [x] MCP server restart and testing completed - **FAILED**
- [x] Document additional MCP failure patterns discovered
- [x] Create MDT-009 manually as workaround
- [x] Restart Claude Code to pick up MCP server changes
- [x] Verify MCP functions work after restart
- [ ] Regression tests added to prevent recurrence

## 5. Implementation Notes

### Code Changes
```typescript
// OLD - Only checked data.type
if (!data.type) {
  errors.push({ field: 'type', message: 'Type is required' });
}

// NEW - Uses type parameter as fallback
const effectiveType = data.type || type;
if (!effectiveType) {
  errors.push({ field: 'type', message: 'Type is required' });
}
```

### Testing Strategy
1. **Build Verification**: ✅ TypeScript compilation successful
2. **MCP Restart**: Required for changes to take effect
3. **Function Testing**: ❌ **FAILED** - MCP functions not actually working
4. **Backwards Compatibility**: Verify existing direct calls still work

### Additional Issues Discovered

#### Issue 1: MCP Debug-Tickets Functions (Original Discovery)
**Problem**: MCP debug-tickets functions appear to simulate responses without actual execution
- Agent claimed file created at: `~/home/markdown-ticket/mcp-server/docs/CRs/MDT-009...` 
- **This path is nonsense** - MCP server shouldn't have docs/CRs directory
- No actual file was created in debug-tasks directory
- MCP functions may not be properly connected to Claude Code

**Evidence**:
- `mcp__debug-tickets__create_cr` claimed success but created no file
- Debug-tasks directory shows no new files since Sep 4
- Invalid file path suggests MCP routing issues

#### Issue 2: Ticket-Creator Agent Silent Failure (Sep 5, 2025)
**Problem**: Ticket-creator agent reported successful MDT-009 creation but file was never created
- Agent used `mcp__markdown-ticket__create_cr` function
- Agent reported: "Perfect! I've successfully created Change Request **MDT-009**"
- Agent claimed file created at: `~/home/markdown-ticket/docs/CRs/MDT-009-implement-patch-endpoint-optimization-for-drag-and-drop-efficiency.md`
- **Reality**: No MDT-009 file exists in docs/CRs/ directory
- Latest ticket remains MDT-008, confirming MDT-009 creation failed

**Evidence**:
```bash
$ ll docs/CRs/
# Shows MDT-001 through MDT-008, no MDT-009
```

**Pattern Identified**:
1. MCP function calls appear to return success responses
2. Agent interprets these as actual file creation
3. No actual file system changes occur
4. User discovers missing files after agent reports completion

**Root Cause Update**:
The validation fix was implemented correctly, but the MCP server is still running the old compiled version. Claude Code connects to MCP servers on startup and doesn't pick up changes until restart.

**Resolution Steps**:
1. ✅ Investigate MCP server connection status - Working
2. ✅ Test direct MCP function calls - Confirmed validation error still exists  
3. ✅ **RESTART CLAUDE CODE** - Required to pick up MCP server changes  
4. ✅ Manual ticket creation - Created MDT-009 manually to work around MCP failure
5. ✅ Verify actual file creation occurs after restart - **SUCCESS!**

**Fix Verified**: MCP ticket creation now works correctly after server reconnection. Test ticket created successfully via `mcp__mdt-tickets__create_cr` function with proper validation and file creation.

### Performance Impact
- Minimal: Only adds simple null-coalescing logic
- No additional API calls or database queries
- Validation remains equally fast

## 6. References
- MCP functions: mcp__mdt-tickets__create_cr, mcp__markdown-ticket__create_cr
- Related: MDT-004 (MCP server implementation)
- Error message: "CR data validation failed: ❌ type: Type is required"
- Workaround: Manual file creation in docs/CRs/