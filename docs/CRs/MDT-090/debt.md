# MDT-090 Technical Debt Analysis

**CR**: MDT-090
**Date**: 2025-01-16
**Files Analyzed**: 5
**Debt Items Found**: 6 (2 High, 3 Medium, 1 Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `mcp-server/src/tools/` |
| File extension | `.ts` |
| Max file size | Not specified |

## Summary

MDT-090 has been partially implemented with significant progress made. The main MCP tools file has been reduced from 1168 lines to 174 lines (85% reduction), handlers have been extracted into separate modules, and the YAML parser duplication has been eliminated. However, some technical debt remains including direct file I/O operations and MCP-specific utilities that could leverage shared services.

## Size Compliance

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `mcp-server/src/tools/index.ts` | 174 | <800 | ✅ |
| `mcp-server/src/tools/handlers/crHandlers.ts` | 484 | Not specified | ✅ |
| `mcp-server/src/tools/handlers/projectHandlers.ts` | 126 | Not specified | ✅ |
| `mcp-server/src/tools/handlers/sectionHandlers.ts` | 493 | Not specified | ✅ |

## High Severity

### 1. Direct File I/O Operations: Bypassing shared MarkdownService

- **Location**: `crHandlers.ts` (line 104), `sectionHandlers.ts` (lines 103, 170, 232, 376)
- **Evidence**: Direct use of `fs.readFile()` and `fs.writeFile()` instead of MarkdownService
- **Impact**: Inconsistent error handling, missing file watching integration, potential file corruption
- **Suggested Fix**: Replace all direct file operations with MarkdownService methods

### 2. YAML Frontmatter Pattern Duplication: Inconsistent regex usage

- **Location**: `sectionHandlers.ts` (lines 108, 175, 235)
- **Evidence**: Manual regex matching instead of using `PATTERNS.YAML_FRONTMATTER` from shared constants
- **Impact**: Inconsistent YAML parsing, potential edge case failures
- **Suggested Fix**: Import and use shared patterns from `constants.ts`

## Medium Severity

### 3. MCP-Specific Content Processing: Duplicated sanitization logic

- **Location**: `crHandlers.ts` (line 159), `sectionHandlers.ts` (line 415)
- **Evidence**: Use of `SimpleContentProcessor` instead of shared content processing
- **Impact**: Inconsistent content handling, duplicated sanitization logic
- **Suggested Fix**: Create shared ContentProcessingService or extend MarkdownService

### 4. MCP-Specific Section Validation: Duplicated validation logic

- **Location**: `sectionHandlers.ts` (lines 247, 307)
- **Evidence**: Use of `SimpleSectionValidator` instead of shared validation
- **Impact**: Inconsistent validation rules, potential for divergent behavior
- **Suggested Fix**: Create shared SectionValidationService

### 5. Missing Business Logic in Shared Services

- **Location**: Multiple handler files
- **Evidence**: Business logic scattered across handlers that should be in shared services
- **Impact**: Code duplication risk, maintenance burden
- **Suggested Fix**: Extract common business logic patterns to shared services

## Low Severity

### 6. Response Formatting Inconsistency: Varied formatting patterns

- **Location**: All handler files
- **Evidence**: Manual response formatting with emojis and text styling
- **Impact**: Inconsistent user experience across MCP tools
- **Suggested Fix**: Create shared response formatting utilities (MCP-specific but reusable)

## Suggested Inline Comments

**File**: `mcp-server/src/tools/handlers/crHandlers.ts`
**Line**: 104
```typescript
// TECH-DEBT: Direct File I/O - Bypassing shared MarkdownService
// Impact: Inconsistent error handling, missing file watching integration
// Suggested: Use markdownService.parseMarkdownFile() instead
// See: MDT-090/debt.md
```

**File**: `mcp-server/src/tools/handlers/sectionHandlers.ts`
**Line**: 376
```typescript
// TECH-DEBT: Direct File I/O - Bypassing shared MarkdownService
// Impact: Potential file corruption, inconsistent error handling
// Suggested: Use markdownService.writeMarkdownFile() instead
// See: MDT-090/debt.md
```

**File**: `mcp-server/src/tools/handlers/sectionHandlers.ts`
**Line**: 108
```typescript
// TECH-DEBT: YAML Pattern Duplication - Inconsistent regex usage
// Impact: Edge case failures, inconsistent parsing
// Suggested: Use PATTERNS.YAML_FRONTMATTER from shared/constants.ts
// See: MDT-090/debt.md
```

## Recommended Actions

### Immediate (High Severity)
1. [ ] Replace all direct `fs.readFile()` calls with `markdownService.parseMarkdownFile()`
2. [ ] Replace all direct `fs.writeFile()` calls with `markdownService.writeMarkdownFile()`
3. [ ] Import and use `PATTERNS.YAML_FRONTMATTER` from shared constants

### Deferred (Medium/Low)
1. [ ] Create shared ContentProcessingService to replace SimpleContentProcessor
2. [ ] Create shared SectionValidationService to replace SimpleSectionValidator
3. [ ] Extract common business logic from handlers to shared services
4. [ ] Create MCP-specific response formatting utilities for consistency

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Main tools file lines | 1168 | 174 | <800 | ✅ |
| Direct file I/O operations | Unknown | 6 | 0 | ❌ |
| YAML parser duplication | 1 | 0 | 0 | ✅ |
| Handler extraction | Not done | 3 handlers | ≥2 | ✅ |
| Total debt items | — | 6 | 0 | ❌ |

---
*Generated: 2025-01-16*
