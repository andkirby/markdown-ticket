# MDT-090 Investigation Report: MCP Server Business Logic Analysis

## Executive Summary

The MCP server code at `/mcp-server/src/tools/index.ts` contains several instances of business logic duplication with shared services. This report identifies all duplicated code, MCP-specific logic, and provides a clear extraction plan.

## 1. Business Logic Categories

### 1.1 MCP-Specific Logic (Should Stay in MCP)

- **Tool Schema Definitions** (Lines 22-327): MCP tool input/output schemas
- **Tool Call Routing** (Lines 329-370): `handleToolCall` switch statement
- **Response Formatting** (Lines 398-423, 433-453, etc.): User-facing formatted strings with emojis
- **MCP Tool Validation** (Lines 588-593): MCP-specific validation messages
- **Error Message Formatting** (Lines 366-368, etc.): MCP-specific error handling

### 1.2 Already Using Shared Services

The following shared services are already correctly imported and used:

- `ProjectService` (Line 2): Project discovery and validation
- `TemplateService` (Line 4): Template validation and improvement suggestions
- `MarkdownSectionService` (Line 5): Section management operations
- `CRService` (Line 3): Wrapper around shared TicketService

### 1.3 Duplicated Logic (Should Be in Shared)

## 2. Detailed Findings

### 2.1 YAML Parser Duplication

**Location**: Lines 1134-1168 in MCP server
**Duplicate of**: Lines 128-163 in `MarkdownService.ts`

**MCP Implementation**:
```typescript
private parseYamlFrontmatter(yamlContent: string): Record<string, any> | null {
  // Simple YAML parser implementation
  // Handles basic key-value pairs, arrays, and quoted strings
}
```

**Shared Implementation**:
```typescript
private static parseYamlFrontmatter(yamlContent: string): Record<string, any> | null {
  // Nearly identical implementation with date parsing
}
```

**Issues**:
- 90% code duplication
- Shared version includes date parsing (lines 149-155)
- MCP version lacks date handling
- Both have identical array parsing logic

### 2.2 Title Extraction Duplication

**Location**: Line 524 in MCP server (`handleGetCRConsolidated`)
**Duplicate of**: `TitleExtractionService.ts`

**MCP Implementation**:
```typescript
title: ticket.title || yaml.title || 'Untitled', // Use H1-extracted title first
```

**Shared Implementation**:
- Complete `TitleExtractionService` with caching
- H1 extraction with fallback logic
- File-based title extraction

**Issues**:
- MCP assumes title already extracted
- No access to extraction service
- Potential inconsistency in title handling

### 2.3 File I/O Operations

**Location**: Multiple locations in MCP server
**Should use**: Shared `MarkdownService`

**Direct File Operations**:
- Lines 501-503: `fs.readFile()` for attribute extraction
- Lines 780-781: `fs.readFile()` for section listing
- Lines 849-850: `fs.readFile()` for section getting
- Lines 909-910: `fs.readFile()` for section updates
- Line 1054: `fs.writeFile()` for section updates

**Issues**:
- Direct file operations bypass shared service
- No error handling consistency
- Missing file watching integration

### 2.4 Validation Logic Duplication

**Location**: Lines 921-942 in MCP server
**Should use**: Shared validation utilities

**MCP Implementation**:
```typescript
const sectionValidation = SimpleSectionValidator.validateSection(section, availableSections)
```

**Issues**:
- Uses MCP-specific `SimpleSectionValidator`
- Should use shared validation patterns from `constants.ts`

### 2.5 Content Processing Duplication

**Location**: Lines 599-615, 969-980 in MCP server
**Should use**: Shared content processing

**MCP Implementation**:
```typescript
const contentProcessingResult = SimpleContentProcessor.processContent(content, {
  operation,
  maxLength: 1000000
})
```

**Issues**:
- MCP-specific content processor
- Duplicated sanitization logic
- Should be in shared utilities

### 2.6 YAML Frontmatter Pattern Matching

**Location**: Lines 506, 784, 853, 913 in MCP server
**Already exists in**: `PATTERNS.YAML_FRONTMATTER` in constants.ts

**MCP Implementation**:
```typescript
const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/)
```

**Shared Implementation**:
```typescript
export const PATTERNS = {
  YAML_FRONTMATTER: /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
}
```

**Issues**:
- Inconsistent regex patterns
- Shared version more robust with whitespace handling

## 3. Missing Shared Services

### 3.1 Content Processing Service
A shared service needed for:
- Content sanitization
- Length validation
- Warning generation
- Markdown processing

### 3.2 Section Validation Service
A shared service for:
- Section existence validation
- Hierarchical path resolution
- Section naming conventions

### 3.3 Response Formatting Utilities
While response formatting is MCP-specific, some utilities could be shared:
- Date formatting
- Status/Priority value mapping
- File path normalization

## 4. Extraction Plan

### Phase 1: Immediate Duplicates Removal

1. **Replace YAML Parser** (Lines 1134-1168)
   - Import `MarkdownService.parseYamlFrontmatter`
   - Add date parsing support if needed
   - Remove duplicate method

2. **Use Shared YAML Pattern** (Lines 506, 784, 853, 913)
   - Import `PATTERNS.YAML_FRONTMATTER`
   - Update all pattern matches
   - Ensure consistent capturing groups

3. **Replace File I/O Operations**
   - Use `MarkdownService.parseMarkdownFile()` for reading
   - Use `MarkdownService.writeMarkdownFile()` for writing
   - Remove direct `fs` operations

### Phase 2: Service Creation

1. **Create `ContentProcessingService`** in shared
   - Move `SimpleContentProcessor` logic
   - Add comprehensive sanitization
   - Include length validation

2. **Create `SectionValidationService`** in shared
   - Move `SimpleSectionValidator` logic
   - Add hierarchical path support
   - Include section mapping utilities

3. **Enhance `TitleExtractionService` Integration**
   - Import and use in MCP server
   - Replace title extraction assumptions
   - Add caching benefits

### Phase 3: Response Standardization

1. **Create Response Formatting Helpers**
   - Extract common formatting patterns
   - Standardize date display
   - Centralize status/priority display

2. **Error Message Standardization**
   - Create error message templates
   - Standardize error codes
   - Improve user experience

## 5. Implementation Priority

### High Priority (MDT-090 Scope)
1. YAML parser duplication removal
2. File I/O operations consolidation
3. YAML frontmatter pattern standardization

### Medium Priority (Future)
1. Content processing service creation
2. Section validation service creation
3. Response formatting helpers

### Low Priority (Nice to Have)
1. Enhanced title extraction integration
2. Comprehensive error message standardization
3. Response template system

## 6. Risks and Considerations

### Breaking Changes
- YAML parser differences might affect date handling
- File I/O changes might impact error messages
- Response format changes affect MCP clients

### Migration Strategy
- Implement feature flags for gradual migration
- Maintain backward compatibility during transition
- Comprehensive testing for each extracted component

### Testing Requirements
- Unit tests for extracted services
- Integration tests for MCP server changes
- Regression tests for shared service modifications

## 7. Next Steps

1. Create MD tickets for each phase
2. Prioritize Phase 1 tasks for immediate implementation
3. Set up code review process for extraction
4. Update documentation after each phase
5. Monitor for performance impacts

---

**Report Generated**: 2025-12-08
**Analysis Scope**: `/mcp-server/src/tools/index.ts`
**Related Files**:
- `/shared/services/MarkdownService.ts`
- `/shared/services/TitleExtractionService.ts`
- `/shared/utils/constants.ts`
- `/mcp-server/src/services/crService.ts`
