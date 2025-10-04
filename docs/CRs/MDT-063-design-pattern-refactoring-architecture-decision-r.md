---
code: MDT-063
title: Design Pattern Refactoring - Architecture Decision Record
status: Implemented
dateCreated: 2025-10-04T18:05:48.929Z
type: Architecture
priority: High
phaseEpic: Phase 2 - Architecture Improvements
assignee: Development Team
---

# Design Pattern Refactoring - Architecture Decision Record

# Design Pattern Refactoring - Architecture Decision Record

## Description

The file tree building functionality suffered from code duplication, inconsistent filtering, and mixed responsibilities across multiple services. The original blacklist filtering issue revealed deeper architectural problems that needed systematic resolution.

## Rationale

Implemented a comprehensive refactoring using established design patterns to create a maintainable, extensible architecture for file operations.

## Solution Analysis

### Architecture Overview

#### C4 Level 1: System Context

```mermaid
C4Context
    title System Context - File Tree Management

    Person(user, "Developer", "Uses markdown ticket board")
    System_Ext(browser, "Web Browser", "Frontend application")
    System(mdt, "Markdown Ticket Board", "Project management with file-based storage")
    System_Ext(fs, "File System", "Markdown files and project directories")

    Rel(user, browser, "Interacts with")
    Rel(browser, mdt, "API calls")
    Rel(mdt, fs, "Reads/writes files")
    Rel(fs, mdt, "File change notifications")
```

#### C4 Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram - File Operations Architecture

    Person(user, "Developer")
    
    Container_Boundary(frontend, "Frontend") {
        Container(cache_ui, "Cache Utils", "TypeScript", "Frontend cache management")
        Container(ui, "React UI", "TypeScript/React", "User interface components")
    }
    
    Container_Boundary(Storage, "File System") {
        System_Ext(fs, "File System", "Project files and documents")
    }

    Container_Boundary(backend, "Backend Server") {
        Container(api, "REST API", "Node.js/Express", "HTTP endpoints")
        Container(patterns, "Process", "JavaScript", "Strategy, Command, Facade patterns")
        Container(services, "Business Services", "JavaScript", "Document & File services")
        Container(watcher, "File Watcher", "Chokidar", "Monitors file changes")
    }

    Rel(user, ui, "Uses")
    Rel(ui, api, "HTTP/JSON")
    Rel(ui, cache_ui, "Cache operations")
    Rel(api, services, "Business logic")
    Rel(services, patterns, "Uses patterns")
    Rel(watcher, fs, "Monitors")
    Rel(patterns, fs, "File operations")
    Rel(watcher, patterns, "Cache invalidation")
```

#### C4 Level 3: Component Diagram

```mermaid
C4Component
    title Component Diagram - Process Layer Implementation

    Container_Boundary(patterns, "Process Layer") {
        Component(strategy_factory, "TreeStrategyFactory", "Factory Pattern", "Creates appropriate strategies")
        Component(config_repo, "ConfigRepository", "Repository Pattern", "Centralized config access")
        Component(file_invoker, "FileOperationInvoker", "Command Pattern", "File operation orchestration")
        Component(facade, "TreeService", "Facade Pattern", "Unified interface for tree operations")
    }

    Container_Boundary(strategies, "Strategy Implementations") {
        Component(path_strategy, "PathSelectionStrategy", "Strategy", "Basic tree building")
        Component(tree_builder, "TreeBuilder", "Context", "Uses strategies to build trees")
        Component(doc_strategy, "DocumentNavigationStrategy", "Strategy", "Enriched tree with metadata")
    }

    Container_Boundary(commands, "Command Implementations") {
        Component(read_cmd, "ReadFileCommand", "Command", "File reading with cache")
        Component(metadata_cmd, "ExtractMetadataCommand", "Command", "Metadata extraction with cache")
    }

    Container_Boundary(services, "Business Services") {
        Component(doc_service, "DocumentService", "Service", "Document business logic")
        Component(fs_service, "FileSystemService", "Service", "File system operations")
    }

    Rel(doc_service, facade, "Uses")
    Rel(fs_service, facade, "Uses")
    Rel(facade, strategy_factory, "Creates strategies")
    Rel(facade, config_repo, "Gets config")
    Rel(facade, tree_builder, "Builds trees")
    Rel(tree_builder, path_strategy, "Uses")
    Rel(tree_builder, doc_strategy, "Uses")
    Rel(doc_strategy, file_invoker, "Uses")
    Rel(file_invoker, read_cmd, "Executes")
    Rel(file_invoker, metadata_cmd, "Executes")
```

### Cache Management Architecture

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as REST API
    participant Cache as File Cache
    participant Watcher as File Watcher
    participant FS as File System

    UI->>API: Request documents
    API->>Cache: Check cache
    alt Cache Hit
        Cache-->>API: Return cached data
    else Cache Miss
        API->>FS: Read files
        FS-->>API: File content
        API->>Cache: Store in cache
    end
    API-->>UI: Return documents

    Note over Watcher,FS: File changes
    FS->>Watcher: File modified
    Watcher->>Cache: Invalidate cache
    
    Note over UI,API: Manual cache clear
    UI->>API: POST /api/cache/clear
    API->>Cache: Clear all cache
    API-->>UI: Success response
```

## Implementation

### 1. Strategy Pattern - Tree Building
- **PathSelectionStrategy**: Basic tree for path selection UI
- **DocumentNavigationStrategy**: Enriched tree with metadata for navigation
- **TreeBuilder**: Context that uses strategies to build trees

### 2. Repository Pattern - Configuration
- **ConfigRepository**: Single source of truth for `.mdt-config.toml` parsing
- Eliminates duplicate config parsing across services
- Provides consistent defaults and error handling

### 3. Facade Pattern - Unified Interface
- **TreeService**: Simple interface hiding complexity
- `getDocumentTree(projectId)` - For document navigation
- `getPathSelectionTree(projectId)` - For path selection

### 4. Command Pattern - File Operations
- **ExtractMetadataCommand**: Cached metadata extraction (title, dates)
- **ReadFileCommand**: Cached file content reading
- **FileOperationInvoker**: Orchestrates commands with cache management

### Cache Features
- **Configurable TTL**: Cache expiration configurable via global config (default: 1 hour)
- **File watcher invalidation**: Real-time cache clearing on file changes
- **Manual clearing**: UI button and API endpoint for cache management
- **No size limits**: Noted for production consideration

**Configuration Example:**
```toml
# ~/.config/markdown-ticket/config.toml
[cache]
ttl = 7200  # 2 hours cache TTL
```
## Acceptance Criteria

### ✅ Completed
- [x] **~150 lines of duplicate code removed**
- [x] **Single source of truth** for tree building logic
- [x] **Consistent blacklist filtering** across all operations
- [x] **Clean separation of concerns**
- [x] **File operation caching** reduces disk I/O
- [x] **Intelligent cache invalidation** maintains data freshness
- [x] **Design patterns** provide clear structure
- [x] **Cache management API** with UI integration
- [x] **Configurable cache TTL** via global configuration
### ❌ Not Covered Cases

#### 1. Ticket Operations Caching
**Issue**: TicketService still uses direct `fs.readFile()` calls
**Impact**: Inconsistent performance between documents and tickets
**Solution**: Extend FileOperationInvoker to TicketService

#### 2. Global Cache Strategy
**Issue**: Each service creates its own FileOperationInvoker instance
**Impact**: Separate caches, no shared benefits
**Solution**: Singleton FileOperationInvoker or dependency injection

#### 3. Cache Size Management
**Issue**: No memory limits on cache growth
**Impact**: Potential memory issues with large projects
**Solution**: LRU eviction or size-based limits

#### 4. Cross-Project Cache Pollution
**Issue**: Cache keys don't include project context
**Impact**: Files with same relative paths across projects may conflict
**Solution**: Project-scoped cache keys

#### 5. Distributed Cache Invalidation
**Issue**: File watcher only works for local file changes
**Impact**: External file modifications (Git, editors) may not invalidate cache
**Solution**: Periodic cache validation or enhanced file monitoring

### Future Considerations

#### Production Enhancements
- **Distributed caching** (Redis) for multi-instance deployments
- **Cache warming** strategies for frequently accessed files
- **Metrics and monitoring** for cache hit rates
- **Graceful degradation** when cache is unavailable

#### Performance Optimizations
- **Batch file operations** for large directory scans
- **Streaming responses** for large file trees
- **Compression** for cached content
- **Background cache refresh** before TTL expiration

### Testing Strategy

#### Unit Tests Needed
- Strategy pattern implementations
- Command pattern with mocked file system
- Cache TTL and invalidation logic
- Configuration repository parsing

#### Integration Tests Needed
- End-to-end tree building workflows
- File watcher cache invalidation
- API cache management endpoints
- Cross-service cache consistency