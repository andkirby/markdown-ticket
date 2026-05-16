# Domain Audit: MDT-114

**Scope**: mcp-server/src/tools/handlers/**, mcp-server/src/utils/section/**
**Generated**: 2026-01-03

## Summary

| Category | 🔴 High | 🟡 Medium | 🟢 Low |
|----------|---------|-----------|--------|
| DDD Violations | 1 | 1 | 0 |
| Structural Issues | 2 | 1 | 0 |

## DDD Violations

### 🔴 High Severity

#### God Service
- **File**: `ModifyOperation.ts` (219 lines)
- **Methods**: 1 `execute()` method with 140 lines internal
- **Dependencies**: 9 constructor parameters (crFileReader, sectionResolver, validationFormatter, simpleContentProcessor, simpleSectionValidator, markdownSectionService, markdownService, crService, sanitizer)
- **Fix direction**: Split into focused strategies - extract content processing and header renaming logic

### 🟡 Medium Severity

#### Feature Envy
- **Method**: `ModifyOperation.execute()` lines 134-160
- **Accesses**: `headerLevel`, `headerText`, `content` from `SectionMatch` model
- **Fix direction**: Extract `HeaderRenamer` utility to encapsulate header detection and renaming logic

## Structural Issues

### 🔴 High Severity

#### Layer Violation
- **File**: `utils/section/ValidationFormatter.ts`
- **Location layer**: Utils/Infrastructure
- **Contains**: `formatModifyOutput()` lines 46-70 — tool-specific markdown with ✅ emoji, operation descriptions
- **Actual layer**: Presentation (tool output formatting)
- **Fix direction**: Move to `handlers/sections/SectionPresenter.ts` or rename to `ToolResponseFormatter` to clarify presentation purpose

#### Scattered Cohesion
- **Concept**: Section manipulation
- **Scattered across**:
  - `utils/section/CRFileReader.ts` (86 lines)
  - `utils/section/SectionResolver.ts` (58 lines)
  - `utils/section/ValidationFormatter.ts` (71 lines)
  - `utils/simpleSectionValidator.ts` (132 lines)
  - `utils/simpleContentProcessor.ts` (124 lines)
  - `handlers/operations/ModifyOperation.ts` (219 lines)
  - `handlers/operations/GetOperation.ts` (66 lines)
  - `handlers/operations/ListOperation.ts` (49 lines)
- **Count**: 8 files in 3 directories (handlers/operations/, utils/section/, utils/)
- **Fix direction**: Consolidate section-specific utilities into `handlers/sections/` alongside operations

### 🟡 Medium Severity

#### Mixed Responsibility
- **File**: `ModifyOperation.ts` (219 lines)
- **Responsibilities**:
  1. Orchestration (lines 97-104, 162-204) — coordinate read/validate/write flow
  2. Business logic (lines 134-160) — header rename detection and extraction
  3. Content processing coordination (lines 123-132) — sanitize and validate
- **Fix direction**: Extract `HeaderRenamer` utility (lines 134-160), keep orchestration only

## Dependency Analysis

```text
ModifyOperation.ts (handlers/operations/)
  ├── CRFileReader (utils/section/)
  ├── SectionResolver (utils/section/)
  ├── ValidationFormatter (utils/section/) ← LAYER VIOLATION (presentation)
  ├── SimpleSectionValidator (utils/)
  ├── SimpleContentProcessor (utils/)
  ├── MarkdownSectionService (shared/)
  ├── MarkdownService (shared/)
  ├── CRService (services/)
  └── Sanitizer (utils/)

GetOperation.ts (handlers/operations/)
  ├── CRFileReader (utils/section/)
  ├── SectionResolver (utils/section/)
  ├── ValidationFormatter (utils/section/) ← LAYER VIOLATION (presentation)
  └── Sanitizer (utils/)

ListOperation.ts (handlers/operations/)
  ├── CRFileReader (utils/section/)
  ├── SectionResolver (utils/section/)
  └── ValidationFormatter (utils/section/) ← LAYER VIOLATION (presentation)
```

**No cycles detected.**
**Direction issue**: `utils/section/ValidationFormatter` contains presentation logic (markdown formatting, emoji output) but lives in infrastructure layer.

## Domain Concept

**Core Domain**: Section Manipulation
**Operations**: list (enumerate), get (read), modify (replace/append/prepend), validate, format output
**Current State**: Scattered (8 files, 3 directories)
**Natural Grouping**:

```text
handlers/sections/
├── SectionService.ts          # Core: find, read, modify orchestration
├── SectionPresenter.ts        # Format tool output (from ValidationFormatter)
├── SectionOperations.ts       # Strategies: List, Get, Modify
├── HeaderRenamer.ts           # Extracted header detection logic
├── ContentProcessor.ts        # Content sanitization and validation
├── SectionValidator.ts        # Section path validation
└── FileRepository.ts          # CR file reading (from CRFileReader)
```

## Recommendations

1. **Immediate**: Fix layer violation — move `ValidationFormatter` → `SectionPresenter` in handlers/sections/
2. **Immediate**: Consolidate scattered section logic into `handlers/sections/` directory
3. **Next cycle**: Extract `HeaderRenamer` from `ModifyOperation` (lines 134-160)
4. **Next cycle**: Reduce `ModifyOperation` complexity by splitting content processing flow

## Next Steps

To fix violations:
1. Create refactoring CR from this audit (MDT-114 prep already addresses this)
2. Run `/mdt:architecture MDT-114 --prep` to design the fix
3. Execute via `/mdt:tasks` → `/mdt:implement`

---
*Generated by /mdt:domain-audit v2*
