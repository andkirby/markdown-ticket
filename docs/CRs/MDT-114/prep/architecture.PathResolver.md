# PathResolver Refactoring Analysis

**Date**: 2026-01-03
**Status**: Current approach needs revision

## Current State (After Refactoring)

### Metrics

| File | MI | CC | CoC | Lines | Status |
|------|----|----|----|----|--------|
| `PathResolver.ts` | 28.58 | 13 | 17 | 275 | YELLOW |
| `ValidationSuggestionHelper.ts` | - | - | - | 69 | New |

### Dead Code Discovery

**Critical Finding**: PathResolver has **7 public methods** but only **1 is used**:

| Method | Used? | Lines | Notes |
|--------|-------|-------|-------|
| `validatePath()` | ✅ YES | 14 | Called by `SectionService.ts:59` |
| `resolve()` | ❌ NO | 14 | Dead code |
| `resolveAll()` | ❌ NO | 3 | Dead code |
| `parseHierarchical()` | ❌ NO | 3 | Dead code |
| `findMatch()` | ❌ NO | 8 | Dead code |
| `fallbackResolution()` | ❌ NO | 3 | Prep stub |
| `getPathResolver()` | ❌ NO | 3 | Getter never called |

**Impact**: ~180 lines (~65% of PathResolver) are unused!

### Actual Usage Flow

```
MCP Tool Call (manage_cr_sections)
         │
         ▼
SectionHandlers.handleManageCRSections()
         │
         ├── list ──────► SectionService.listSections() ──► no PathResolver
         ├── get ───────► SectionService.getSection() ─────► no PathResolver
         └── replace/append/prepend
                             │
                             ▼
                 SectionService.modifySection()
                             │
                             ▼
                    PathResolver.validatePath()  ◄── ONLY USE!
```

**Key Insight**: PathResolver is ONLY used for validation during modify operations. The other 6 public methods were likely added "for future use" but never called.

```
Before: MI 27.72, CC 15, CoC 25 (RED)
After:  MI 28.58, CC 13, CoC 17 (YELLOW)
Target: MI > 40, CC < 10 (GREEN)
```

**Only +3% MI improvement** - still in YELLOW zone with significant technical debt.

## What's Wrong

### 1. Tactical Extraction, Not Strategic

The `ValidationSuggestionHelper` extraction:
- ✅ Extracted 69 lines to new file
- ❌ Maintains same complex call chains
- ❌ Requires callback injection (leaky abstraction)
- ❌ `PathResolver` still has 8 private methods for validation

### 2. Mixed Responsibilities

`PathResolver` handles too many concerns:
- Path resolution (core purpose)
- Format validation
- Section matching
- Error message creation
- Suggestion generation

### 3. Complex Validation Flow

```
validate()
  └─> validateAgainstSections()
       └─> findExactMatches()
            └─> [0 matches] createNotFoundResult()
                 └─> ValidationSuggestionHelper.generateNotFoundSuggestions()
                      └─> (callback) this.findPartialMatches()
                           └─> ValidationSuggestionHelper.findPartialMatches()
```

Deep call stack for what should be simple validation logic.

## Better Architecture: Strategy Pattern

### Structure

```
mcp-server/src/services/SectionManagement/
  ├── PathResolver.ts          (100 lines) - orchestration only
  ├── validators/
  │   ├── FormatValidator.ts   (80 lines)  - format validation logic
  │   ├── MatchValidator.ts    (90 lines)  - section matching logic
  │   └── SuggestionEngine.ts  (70 lines)  - suggestion generation
  └── types.ts                 (20 lines)  - shared interfaces
```

### Component Diagram

```
┌─────────────────────────────────────────┐
│         PathResolver                    │
│  - resolve()                            │
│  - parseHierarchical()                  │
│  - validatePath() → delegates to →      │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
┌───────▼────────┐  ┌──────▼──────────┐
│ FormatValidator│  │  MatchValidator │
│                │  │                 │
│ validate(path) │  │ validate(path,  │
│                │  │   sections[])   │
└────────────────┘  └──────┬──────────┘
                           │
                  ┌────────▼──────────┐
                  │ SuggestionEngine  │
                  │                   │
                  │ generateFor()     │
                  │ findPartial()     │
                  │ formatList()      │
                  └───────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Size Limit |
|-----------|----------------|------------|
| `PathResolver` | Orchestration, public API | 90 lines |
| `FormatValidator` | Validate path format (no sections) | 80 lines |
| `MatchValidator` | Validate against available sections | 90 lines |
| `SuggestionEngine` | Generate helpful suggestions | 70 lines |

### Key Interfaces

```typescript
// validators/types.ts
export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  errors: string[];
  suggestions: string[];
}

export interface IPathValidator {
  validate(path: string, availableSections?: string[]): ValidationResult;
}
```

### Implementation Sketch

**FormatValidator** - Simple format checks
```typescript
export class FormatValidator implements IPathValidator {
  validate(path: string): ValidationResult {
    // Empty check
    // Hierarchical depth check (max 2 levels)
    // Returns early, no sections needed
  }
}
```

**MatchValidator** - Section matching with suggestions
```typescript
export class MatchValidator implements IPathValidator {
  constructor(private suggestionEngine: SuggestionEngine) {}

  validate(path: string, sections: string[]): ValidationResult {
    const exactMatches = this.findExact(sections, path);

    if (exactMatches.length === 0) {
      return this.notFoundResult(path, sections);
    }

    if (exactMatches.length > 1) {
      return this.multipleMatchResult(path, exactMatches);
    }

    return { valid: true, normalized: exactMatches[0] };
  }
}
```

**SuggestionEngine** - Pure utility
```typescript
export class SuggestionEngine {
  generateForNotFound(sections: string[], input: string): string[]
  findPartialMatches(sections: string[], input: string): string[]
  formatSectionList(sections: string[]): string[]
}
```

## Expected Results

| Metric | Current | After | Improvement |
|--------|---------|-------|-------------|
| PathResolver MI | 28.58 | 55+ | +93% |
| PathResolver CC | 13 | ≤5 | -62% |
| Overall complexity | YELLOW | GREEN | ✅ Target met |
| Testability | Hard (monolith) | Easy (isolated) | ✅ Better |
| Extension cost | Modify PathResolver | Add validator class | ✅ Lower |

## Benefits

1. **Single Responsibility**: Each class has one clear purpose
2. **Testability**: Test validators in isolation, no mocking needed
3. **Extensibility**: Add new validation rules without touching existing code
4. **Readability**: Clear flow, no deep callback chains
5. **Reusability**: `SuggestionEngine` usable across validators

## Migration Path

1. Create `validators/` directory
2. Remove `resolveAll()` - dead code, never used
3. Extract `FormatValidator` (format-only validation)
4. Extract `MatchValidator` (section matching)
5. Extract `SuggestionEngine` (pure utility)
6. Update `PathResolver` to use validators
7. Delete `ValidationSuggestionHelper.ts` (absorbed into SuggestionEngine)
8. Run tests to verify behavior preservation
9. Verify metrics (target MI > 40)

## Next Steps

- [ ] Review this architecture proposal
- [ ] Run `/mdt:architecture MDT-114 --prep` with this approach
- [ ] Implement Strategy pattern refactoring
- [ ] Verify metrics improvement
