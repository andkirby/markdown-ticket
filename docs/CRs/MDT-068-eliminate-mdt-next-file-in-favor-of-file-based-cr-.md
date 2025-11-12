---
code: MDT-068
title: Eliminate .mdt-next File in Favor of File-Based CR Numbering
status: Proposed
dateCreated: 2025-11-11T17:11:54.459Z
type: Architecture
priority: High
---

# Eliminate .mdt-next File in Favor of File-Based CR Numbering

## 1. Description

### Problem Statement
The current CR numbering system relies on both file scanning and a separate `.mdt-next` counter file, creating redundancy and potential synchronization issues. This dual approach complicates the system architecture and introduces maintenance overhead.

### Current State
The system uses two mechanisms for CR numbering:
- Scanning existing CR files to find the highest number (implemented and working correctly)
- Reading/writing to `.mdt-next` file as a counter (legacy approach)

### Desired State
- Eliminate the `.mdt-next` file dependency entirely
- Use only file-based numbering by scanning existing CR files
- Maintain backward compatibility and prevent duplicate numbers
- Simplify the numbering logic across all services

### Impact Areas
- Backend ProjectService (project creation)
- Backend TicketService (CR creation) 
- MCP server CR service
- Project configuration templates

## 2. Decision Rationale

### Why This Change Is Necessary
- **Simplification**: Removes unnecessary file I/O operations and file state management
- **Reliability**: Eliminates potential desync between file numbers and counter file
- **Maintainability**: Reduces complexity in the numbering system
- **Consistency**: Aligns with the already-implemented file scanning logic

### What It Accomplishes
- Reduces code complexity by removing counter file management
- Eliminates a potential failure point (file permissions, corruption)
- Simplifies project initialization and CR creation workflows
- Improves system reliability by relying on a single source of truth

### Project Alignment
This change supports the architecture goal of simplification and reliability. It removes legacy dependencies while maintaining all existing functionality.

## 3. Solution Analysis

#### Approach A: Complete Removal of Counter File (Chosen)
**Description**: Remove all `.mdt-next` file operations and rely solely on file scanning.
**Pros**: 
- Eliminates file synchronization complexity
- Reduces code complexity significantly
- Removes a potential failure point
- Simplifies project initialization
- Improves overall system reliability
**Cons**: 
- Requires directory scanning for each new CR (minimal performance impact)
- Removes explicit counter state visibility

#### Approach B: Keep Counter File as Backup (Rejected)
**Description**: Maintain counter file but use it only as fallback when file scanning fails.
**Pros**: 
- Provides backup mechanism
- Maintains explicit counter state
**Cons**: 
- Adds unnecessary complexity
- Doesn't solve the core architectural issue
- Still requires file synchronization logic

### Decision Factors
- **Reliability**: Single source of truth eliminates sync issues
- **Simplicity**: Fewer moving parts and failure points
- **Performance**: File scanning impact is negligible for typical project sizes
- **Maintainability**: Less code to maintain and debug

### Justification
Approach A is superior because the file scanning logic is already implemented and working correctly. The `.mdt-next` file creates unnecessary complexity without providing significant benefits. Modern file systems make directory scanning efficient, and the performance impact is minimal compared to the architectural simplification gains.

## 4. Implementation Specification

The implementation will focus on removing counter file operations while enhancing the existing file scanning logic:

**Backend Services**:
- Modify `ProjectService.ts` to remove counter file creation during project setup
- Update `TicketService.ts` to remove counter file references
- Enhance `ticketNumbering.ts` to use file-based numbering exclusively

**MCP Server**:
- Update `crService.ts` to remove `updateCounter` method calls
- Refine `getNextCRNumber` to use only file scanning
- Remove counter file path resolution logic

**Shared Components**:
- Update project configuration templates to remove counter file references
- Ensure consistent file scanning behavior across all services

**Error Handling**:
- Implement robust error handling for file system operations
- Ensure graceful degradation when directory scanning encounters issues
- Maintain atomic operations to prevent race conditions during concurrent CR creation

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

**Qualitative Improvements**:
- Reduced code complexity in numbering services
- Eliminated file synchronization issues
- Simplified project initialization process
- Improved system reliability by removing failure points

## 7. Deployment Strategy

**Simple Deployment**:
1. Deploy the changes to all environments simultaneously
2. No migration needed - system works with existing `.mdt-next` files but won't create new ones
3. Existing `.mdt-next` files will be ignored but can be manually cleaned up

**Rollback Plan**:
- Revert to previous version to restore counter file functionality
- No data loss - CR numbers remain valid