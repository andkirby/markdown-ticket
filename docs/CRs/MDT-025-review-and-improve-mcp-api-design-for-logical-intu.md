---
code: MDT-025
title: Review and improve MCP API design for logical, intuitive interface
status: Implemented
dateCreated: 2025-09-07T07:55:37.634Z
type: Feature Enhancement
priority: Medium
blocks: MDT-026,MDT-027
---

# Review and improve MCP API design for logical, intuitive interface

## 1. Description

### Problem Statement
The current MCP API has inconsistencies in error handling and user guidance that make it less intuitive for LLMs to use effectively. Specifically, the getTemplate function provides unhelpful error messages compared to validation functions.

### Current State
- MCP API has 5 different CR templates (Bug Fix, Feature Enhancement, Architecture, Technical Debt, Documentation)
- `getTemplate()` throws generic errors without listing valid types
- `validateCRData()` provides helpful error messages with valid type lists
- Error handling is inconsistent across different API methods
- Some functions may lack proper input validation or guidance
- Parameter naming inconsistent (`crKey` vs `key`)
- Content truncation without warning (500 char limit)
- Redundant project validation code repeated across functions
- No way to discover available template types programmatically

### Desired State
- Consistent, helpful error messages across all MCP API functions following standardized format
- Clear guidance for valid parameters and expected inputs with available options listed
- Logical API design that's intuitive for LLMs to use
- Comprehensive error handling with actionable feedback and specific failure reasons
- Well-structured API responses that facilitate proper usage
- Consistent parameter naming throughout API
- Template discoverability through dedicated endpoint

### Rationale
LLMs need clear, consistent feedback to use APIs effectively. When error messages don't provide guidance about valid options, it leads to trial-and-error interactions and poor user experience.

### Impact Areas
- MCP Server API design
- Error handling consistency
- LLM integration experience
- Developer experience
- API documentation

## 2. Solution Analysis

### Issues Identified

#### 1. Inconsistent Error Messages (HIGH PRIORITY)
**Problem**: `getTemplate()` returns generic "not found" vs `validateCRData()` lists valid options
**Impact**: LLMs can't self-correct without trial-and-error
**Solution**: Standardize all error messages to include valid options
**Created**: Error standards guide (`docs/MCP_API_ERROR_STANDARDS.md`)

#### 2. Parameter Naming Inconsistencies (HIGH PRIORITY - BREAKING)
**Problem**: API uses `crKey` but objects use `key` property
**Impact**: Confusing parameter names, inconsistent usage
**Solution**: Change all API parameters from `crKey` → `key`
**Files affected**: `tools/index.ts`, `services/crService.ts`, documentation

#### 3. Content Truncation Without Warning (LOW PRIORITY)
**Problem**: `get_cr` silently truncates content at 500 chars with just "..."
**Impact**: Users don't know actual content length or how to get full content
**Solution**: Show content length info: "Content (1,250 chars, showing first 500):"

#### 4. Template Discovery Gap (MEDIUM PRIORITY)
**Problem**: No way to programmatically list available template types
**Impact**: LLMs must guess or refer to external documentation
**Solution**: Add `list_cr_templates()` endpoint returning available types

#### 5. Generic Status Update Failures (MEDIUM PRIORITY)
**Problem**: `update_cr_status` returns generic failure without specific reasons
**Impact**: Can't distinguish between "CR not found" vs "file locked" vs "invalid transition"
**Current missing errors**:
- Invalid status transitions (Implemented → Proposed)
- File permission issues
- YAML parsing failures
- File locked by another process
**Solution**: Enhanced error handling with specific failure types and messages

#### 6. Redundant Project Validation (LOW PRIORITY)
**Problem**: Every function repeats same project lookup and validation code
**Impact**: Code duplication, inconsistent error messages
**Solution**: Extract to `validateProject(projectKey)` helper method

#### 7. Validation API Design (NO ACTION)
**Problem**: API forces type in data object, but validation accepts it separately
**Analysis**: Keep current approach for consistency with `create_cr` API
**Rationale**: Minor redundancy vs API consistency trade-off

## 3. Implementation Specification

### Phase 1: High Priority Fixes (Breaking Changes)
1. **Parameter Naming Standardization**
   - Change `crKey` → `key` in all API schemas (`tools/index.ts`)
   - Update function parameters in `services/crService.ts`
   - Update documentation and examples

2. **Error Message Standardization**
   - Apply error standards from `docs/MCP_API_ERROR_STANDARDS.md`
   - Update `getTemplate()` to list valid types
   - Standardize project not found errors across all functions

### Phase 2: Medium Priority Enhancements
3. **Add Template Discovery**
   - New endpoint: `list_cr_templates()`
   - Returns array of available template types
   - Update API documentation

4. **Enhanced Status Update Error Handling**
   - Specific error messages for different failure types
   - Invalid status transition detection
   - File I/O error categorization

### Phase 3: Low Priority Improvements
5. **Content Display Enhancement**
   - Show actual content length in `get_cr` responses
   - Format: "Content (1,250 chars, showing first 500):"

6. **Code Cleanup**
   - Extract `validateProject(projectKey)` helper method
   - Apply across all functions using project validation

## 4. Acceptance Criteria

### Core Functionality
- [ ] All MCP API functions provide helpful error messages with valid options listed
- [ ] Error message format is consistent across all functions following standards guide
- [ ] Invalid input parameters return actionable guidance with available choices
- [ ] API parameter naming follows consistent conventions (`key` not `crKey`)
- [ ] No generic "not found" errors without context or available options

### Template System
- [ ] `list_cr_templates()` endpoint returns available template types
- [ ] `get_cr_template()` errors list valid types when invalid type provided
- [ ] Template discovery works programmatically without external documentation

### Error Handling
- [ ] Status update failures provide specific reasons (file locked, invalid transition, etc.)
- [ ] Project validation errors list available projects consistently
- [ ] Content truncation shows actual length and preview indication

### Code Quality
- [ ] Project validation logic centralized in helper method
- [ ] No code duplication in project lookup across functions
- [ ] Existing functionality remains unchanged (no breaking changes beyond parameter names)

### Documentation
- [ ] Error standards guide created and applied consistently
- [ ] API documentation updated with new endpoints and parameter changes
- [ ] Breaking changes clearly documented for users

## 5. Implementation Notes

### Investigation Completed (2025-09-07)
- Full API analysis completed identifying 7 specific issues
- Error standards guide created (`docs/MCP_API_ERROR_STANDARDS.md`)
- Priority assessment completed with impact analysis
- Breaking change impact assessed (parameter naming only)

### Files Requiring Updates
- `mcp-server/src/tools/index.ts` - API schemas and error messages
- `mcp-server/src/services/crService.ts` - Function parameters and error handling
- `mcp-server/src/services/templateService.ts` - Error message in getTemplate()
- Documentation and examples with parameter name changes

## 6. References

### Analysis Results
- 7 specific API issues identified and documented
- Error standards guide: `docs/MCP_API_ERROR_STANDARDS.md`
- Content truncation location: `tools/index.ts:463`
- Parameter inconsistency confirmed: `crKey` used in API, `key` in objects

### Related Documentation
- `docs/create_ticket.md` - Template type documentation
- `mcp-server/MCP_REQUEST_SAMPLES.md` - Examples requiring updates
- MCP Server codebase: `/mcp-server/src/`

### Technical Dependencies
- No external dependencies required
- Breaking change: API parameter naming (`crKey` → `key`)
- Backward compatibility maintained except for parameter names

## 7. Implementation Notes

### Analysis Results (2025-09-08)
Upon detailed review of the current MCP API implementation, all major issues identified in this CR have already been addressed:

#### ✅ Issues Already Resolved:
1. **Parameter Naming Consistency**: API already uses `key` consistently throughout, not `crKey`
2. **Template Discovery**: `list_cr_templates()` endpoint already implemented with descriptions
3. **Content Truncation**: Already shows content length info: "Content (1,250 chars, showing first 500):"
4. **Template Error Messages**: `templateService.getTemplate()` already provides helpful error messages with valid types listed
5. **Status Update Error Handling**: Enhanced error handling already implemented with specific failure types:
   - Invalid status transitions with valid options listed
   - File permission errors with actionable messages
   - File system errors with specific reasons
6. **Project Validation**: `validateProject()` method already provides consistent error messages with available projects listed
7. **Error Message Standards**: Implementation already follows the standards guide created for this CR

#### ✅ Current Error Handling Quality:
- **Project not found**: "Project 'XYZ' not found. Available projects: MDT, API, WEB"
- **Invalid CR type**: "Invalid CR type 'bugfix'. Must be one of: Bug Fix, Feature Enhancement, Architecture, Technical Debt, Documentation"
- **Status transitions**: "Invalid status transition from 'Implemented' to 'Proposed'. Valid transitions from 'Implemented': In Progress"
- **File system errors**: Specific messages for permissions, file locks, etc.

#### 📋 Implementation Status:
All acceptance criteria have been met by the existing implementation. The MCP API already provides:
- Consistent, helpful error messages across all functions
- Clear guidance with available options listed
- Logical API design intuitive for LLMs
- Comprehensive error handling with actionable feedback
- Template discoverability through dedicated endpoint

### Conclusion
This CR identified important API design principles and created standards documentation, but the actual implementation work had already been completed in previous development cycles. The analysis and documentation provided valuable validation of the current API quality.

**Related Work**: MDT-029 (implemented same day) addressed MCP tool interface completeness, which resolved many of the same underlying issues identified in this analysis.
