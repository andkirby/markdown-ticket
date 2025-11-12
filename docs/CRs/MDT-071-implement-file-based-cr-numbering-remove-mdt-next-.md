---
code: MDT-071
title: Implement File-Based CR Numbering (Remove .mdt-next Dependency)
status: Proposed
dateCreated: 2025-11-11T17:12:10.842Z
type: Feature Enhancement
priority: High
phaseEpic: MDT-069
---

# Implement File-Based CR Numbering (Remove .mdt-next Dependency)

## 1. Description

### Problem Statement
The current CR numbering system uses both file scanning and a `.mdt-next` counter file, creating redundancy and potential synchronization issues.

### Current State
System currently uses dual mechanisms:
- File scanning to find highest CR number (implemented correctly)
- `.mdt-next` counter file for number tracking (legacy approach)

### Desired State
- Eliminate `.mdt-next` file dependency entirely
- Use only file-based numbering by scanning existing CR files
- Maintain backward compatibility and prevent duplicate numbers

## 2. Rationale

### Why This Change Is Necessary
- **Simplification**: Removes unnecessary file I/O operations
- **Reliability**: Eliminates potential desync between file numbers and counter file
- **Maintainability**: Reduces complexity in the numbering system

### What It Accomplishes
- Reduces code complexity by removing counter file management
- Eliminates a potential failure point (file permissions, corruption)
- Simplifies project initialization and CR creation workflows

## 3. Solution Analysis

#### Approach: Complete Removal of Counter File
**Description**: Remove all `.mdt-next` file operations and rely solely on file scanning.

**Pros**: 
- Eliminates file synchronization complexity
- Reduces code complexity significantly
- Removes a potential failure point
- Simplifies project initialization
- Improves overall system reliability

**Cons**: 
- Requires directory scanning for each new CR (minimal performance impact)

## 4. Implementation Specification

### Files Requiring Changes

**Backend Services**:
- `server/services/ProjectService.ts` - Remove counter file creation (line 229-230)
- `server/services/TicketService.ts` - Remove counter file usage (line 257)
- `server/utils/ticketNumbering.ts` - Remove counter file operations (lines 127, 154-155)

**MCP Server**:
- `mcp-server/src/services/crService.ts` - Remove updateCounter calls (line 127) and updateCounter method (lines 302-309)

**Configuration Changes**:
- Remove `counterFile` references from project templates
- Update project configuration schema

### Technical Details

**File Scanning Logic**: 
The existing `getNextCRNumber` method in `crService.ts` already implements proper file scanning:
```typescript
// Lines 268-279 already scan files correctly
const crFiles = await glob('*.md', { cwd: project.project.path });
for (const filename of crFiles) {
  const match = filename.match(new RegExp(`${project.project.code}-(\d+)-`, 'i'));
  // ...
}
```

**Changes Needed**:
1. Remove `.mdt-next` file creation in `ProjectService.ts`
2. Remove counter file reading in `ticketNumbering.ts`
3. Remove `updateCounter` calls in `crService.ts`
4. Remove counter file path resolution logic

## 5. Acceptance Criteria

**Functional**:
- [ ] Project creation no longer creates `.mdt-next` file
- [ ] CR creation successfully determines next number from existing files
- [ ] No duplicate CR numbers are generated
- [ ] System handles empty CR directories correctly
- [ ] All existing CRs are numbered correctly

**Non-Functional**:
- [ ] Reliability: CR numbering remains consistent across concurrent operations
- [ ] Maintainability: Code complexity reduced by removing counter file logic
- [ ] Performance: CR creation time impact is less than 50ms increase
- [ ] Compatibility: Existing projects continue to work without migration

**Testing**:
- [ ] Unit: `getNextCRNumber` returns correct number for empty directory
- [ ] Unit: `getNextCRNumber` correctly identifies highest existing number
- [ ] Integration: Project creation completes without creating counter file
- [ ] Integration: Multiple concurrent CR creations don't produce duplicate numbers
- [ ] Manual: Verify CR numbers are sequential across different project states

## 6. Success Metrics

- Code complexity reduced in numbering services
- Eliminated file synchronization issues
- Simplified project initialization process
- Improved system reliability by removing failure points