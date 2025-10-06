# Design Analysis & Improvement Plan

**Implementation Status**: This design proposal was implemented in MDT-063. See `docs/CRs/MDT-063-design-pattern-refactoring-architecture-decision-r.md` for the complete implementation details, architecture diagrams, and production results.

## Current Architecture Issues

### 1. Code Duplication
**Problem**: File tree building logic exists in multiple places:
- `DocumentService._scanDirectory()` - builds document trees with metadata
- `fsTree.js buildFileSystemTree()` - builds file system trees for path selection
- Both implement similar filtering and tree construction logic

**Impact**: 
- Maintenance overhead (changes needed in multiple places)
- Inconsistent behavior between path selection and document navigation
- Bug in blacklist filtering (fixed recently but shows the risk)

### 2. Mixed Responsibilities
**Problem**: Services handle multiple concerns:
- `DocumentService`: Business logic + file system operations + configuration parsing
- `FileSystemService`: Simple wrapper around `fsTree.js`
- Configuration parsing scattered across services

**Impact**:
- Violates Single Responsibility Principle
- Hard to test individual components
- Tight coupling between layers

### 3. Inconsistent Abstractions
**Problem**: 
- `fsTree.js` returns basic file objects
- `DocumentService` returns enriched objects with metadata
- No common interface or contract

**Impact**:
- Frontend receives different data structures
- Hard to extend or modify tree building logic

## Recommended Design Patterns

### 1. **Strategy Pattern** - Tree Building Strategies
```javascript
// Different strategies for different use cases
class PathSelectionStrategy {
  buildTree(files, config) {
    // Basic tree for path selection (no metadata)
  }
}

class DocumentNavigationStrategy {
  buildTree(files, config) {
    // Enriched tree with titles, dates, etc.
  }
}
```

**Benefits**:
- Single tree builder with pluggable strategies
- Easy to add new tree types (e.g., search results, filtered views)
- Consistent filtering logic across all strategies

### 2. **Repository Pattern** - Configuration Access
```javascript
class ConfigRepository {
  async getProjectConfig(projectPath) {
    // Single place for config parsing
  }
}
```

**Benefits**:
- Centralized configuration logic
- Easy to mock for testing
- Consistent config parsing across services

### 3. **Facade Pattern** - Unified Tree Service
```javascript
class TreeService {
  getPathSelectionTree(projectPath) {
    // Uses PathSelectionStrategy
  }
  
  getDocumentNavigationTree(projectId) {
    // Uses DocumentNavigationStrategy
  }
}
```

**Benefits**:
- Simple interface for controllers
- Hides complexity of strategy selection
- Single entry point for all tree operations

### 4. **Command Pattern** - File Operations
```javascript
class FileMetadataCommand {
  execute(filePath) {
    // Extract title, dates, etc.
  }
}
```

**Benefits**:
- Encapsulates file operations
- Easy to add caching, error handling
- Testable in isolation

## Implementation Plan

### Phase 1: Foundation (High Priority)
1. **Create `ConfigRepository`**
   - Move all config parsing logic here
   - Used by all services that need project config

2. **Create `TreeBuilder` with Strategy Pattern**
   - `PathSelectionStrategy` - basic tree building
   - `DocumentNavigationStrategy` - enriched tree building
   - Shared filtering logic using `fsIgnoreList.js`

### Phase 2: Service Layer (Medium Priority)
3. **Create `TreeService` Facade**
   - Simple methods: `getPathSelectionTree()`, `getDocumentNavigationTree()`
   - Orchestrates ConfigRepository + TreeBuilder + appropriate strategy

4. **Refactor Existing Services**
   - `DocumentService` uses `TreeService.getDocumentNavigationTree()`
   - `FileSystemService` uses `TreeService.getPathSelectionTree()`
   - Remove duplicate code

### Phase 3: Enhancement (Low Priority)
5. **Add Command Pattern for File Operations**
   - `FileMetadataCommand` for extracting titles/dates
   - `FileContentCommand` for reading document content
   - Add caching layer if needed

## Benefits of This Design

### Immediate Benefits
- **Single Source of Truth**: All tree building goes through one place
- **Consistent Filtering**: Same blacklist logic everywhere
- **Easier Testing**: Each component has single responsibility
- **Bug Prevention**: Fix filtering once, works everywhere

### Long-term Benefits
- **Extensibility**: Easy to add new tree types or strategies
- **Maintainability**: Changes isolated to specific components
- **Performance**: Can add caching at strategy level
- **Flexibility**: Can swap strategies based on user preferences

## Migration Strategy

### Step 1: Create New Components (No Breaking Changes)
- Add `ConfigRepository`, `TreeBuilder`, `TreeService`
- Keep existing services working

### Step 2: Gradual Migration
- Update one controller at a time to use `TreeService`
- Test each migration thoroughly

### Step 3: Cleanup
- Remove old methods from services
- Delete duplicate code
- Update tests

## Risk Mitigation

### Low Risk Changes
- Creating new components alongside existing ones
- Adding facade methods that delegate to existing logic

### Medium Risk Changes  
- Refactoring existing services to use new components
- Changing data structures returned to frontend

### High Risk Changes
- Removing old code (do this last, after thorough testing)

## Success Metrics

- **Code Reduction**: ~30% reduction in tree-building related code
- **Bug Prevention**: Single place to fix filtering issues
- **Test Coverage**: Each component easily testable in isolation
- **Performance**: Consistent performance across all tree operations
- **Developer Experience**: Clearer separation of concerns

## Next Steps

1. Review this plan with team
2. Create `ConfigRepository` first (lowest risk, highest impact)
3. Implement `TreeBuilder` with strategies
4. Create `TreeService` facade
5. Begin gradual migration of existing services

## TODO Items

### High Priority
- **Root Node Consistency**: Tree navigator root node should behave like tree editing - show only 1st level documents, not all nested files. Currently tree navigator shows all files while path selector shows proper hierarchy.

This approach provides a solid foundation for the file tree functionality while maintaining backward compatibility during migration.
