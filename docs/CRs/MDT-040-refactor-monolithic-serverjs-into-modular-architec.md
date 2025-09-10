---
code: MDT-040
title: Refactor monolithic server.js into modular architecture
status: Proposed
dateCreated: 2025-09-10T22:25:14.536Z
type: Technical Debt
priority: High
phaseEpic: Technical Infrastructure
description: The server.js file has grown to over 1,400 lines and violates single responsibility principle by handling routing, business logic, file operations, project management, logging, and more in a single file. This makes the codebase difficult to maintain, test, and extend.
rationale: Current monolithic structure creates maintenance bottlenecks, makes testing difficult, and increases risk of bugs. Modular architecture will improve code maintainability, enable better testing, and make future feature development faster. Note: File watching with chokidar is already well-implemented and should be preserved.
---

# Refactor monolithic server.js into modular architecture

## 1. Description

### Problem Statement
The server.js file has grown to over 1,400 lines and violates single responsibility principle by handling routing, business logic, file operations, project management, logging, and more in a single file. This makes the codebase difficult to maintain, test, and extend.

### Current State
- Single 1,400+ line server.js file handling all concerns
- Mixed routing, business logic, file operations, and utilities
- No separation of concerns or testable modules
- Difficult to locate and modify specific functionality
- Code duplication across similar operations

### Desired State
- Modular architecture with clear separation of concerns
- Dedicated service layer for business logic
- Organized route handlers by domain
- Reusable utility functions
- Testable, maintainable codebase

### Rationale
Current monolithic structure creates maintenance bottlenecks, makes testing difficult, and increases risk of bugs. Modular architecture will improve code maintainability, enable better testing, and make future feature development faster.

### Impact Areas
- Backend Architecture
- API Routes
- File Operations
- Project Management
- Development Experience

## 2. Solution Analysis

### Approaches Considered

**Option A: Gradual Refactoring**
- Pros: Low risk, incremental progress, no breaking changes
- Cons: Slower progress, temporary inconsistency

**Option B: Complete Rewrite**
- Pros: Clean slate, optimal architecture
- Cons: High risk, potential bugs, significant time investment

**Option C: Hybrid Approach (Recommended)**
- Pros: Balanced risk/reward, maintains functionality while improving structure
- Cons: Requires careful planning

### Chosen Approach: Hybrid Refactoring

1. **Extract Routes First** - Move API endpoints to separate files
2. **Create Service Layer** - Extract business logic
3. **Add Utility Libraries** - Replace manual implementations
4. **Implement Middleware** - Cross-cutting concerns

### Library Recommendations

**High Impact Libraries:**
- `fs-extra` - Enhanced file operations (~100 lines saved)
- `express-validator` - Request validation (~50 lines saved)
- `js-yaml` - YAML parsing (~40 lines saved)
- `helmet` + `compression` - Security/performance (~20 lines saved)

**Preserve Existing:**
- **chokidar** - File watching system is already well-implemented (MDT-002)
- **FileWatcherService** - Multi-project SSE architecture should remain unchanged

**Future Considerations:**
- Consider `fastify` for future rewrites (built-in validation/serialization)

## 3. Implementation Specification

### New Directory Structure
```
server/
├── server.js                 # Main entry point (minimal)
├── routes/
│   ├── index.js              # Route aggregator
│   ├── tasks.js              # Single project task routes
│   ├── projects.js           # Multi-project routes
│   ├── documents.js          # Document discovery routes
│   ├── system.js             # System/filesystem routes
│   └── dev-tools.js          # Development logging routes
├── services/
│   ├── taskService.js        # Task CRUD operations
│   ├── projectService.js     # Project management
│   ├── documentService.js    # Document discovery
│   └── logService.js         # Logging functionality
├── middleware/
│   ├── cors.js               # CORS configuration
│   ├── validation.js         # Request validation
│   └── errorHandler.js       # Error handling
├── utils/
│   ├── fileUtils.js          # File operations (using fs-extra)
│   ├── yamlUtils.js          # YAML parsing (using js-yaml)
│   └── constants.js          # Configuration constants
└── config/
    └── index.js              # Configuration management
```

### Implementation Phases

**Phase 1: Library Integration**
- Add `fs-extra`, `express-validator`, `js-yaml`, `helmet`, `compression`
- Replace manual implementations with library calls
- **Preserve existing chokidar/FileWatcherService implementation**
- Estimated reduction: ~200 lines

**Phase 2: Route Extraction**
- Extract task routes to `routes/tasks.js`
- Extract project routes to `routes/projects.js`
- Extract document routes to `routes/documents.js`
- Estimated reduction: ~600 lines from main file

**Phase 3: Service Layer**
- Create service classes for business logic
- Move file operations to `utils/fileUtils.js`
- Move YAML parsing to `utils/yamlUtils.js`
- Estimated reduction: ~400 lines from main file

**Phase 4: Middleware & Config**
- Extract middleware to separate files
- Centralize configuration management
- Add proper error handling
- Estimated reduction: ~200 lines from main file

### Dependencies to Add
```bash
npm install fs-extra express-validator js-yaml helmet compression
```

**Note**: `chokidar` is already installed and well-implemented - no changes needed to file watching system.

## 4. Acceptance Criteria

- [ ] server.js reduced to under 100 lines (entry point only)
- [ ] All routes organized in separate files by domain
- [ ] Business logic extracted to service layer
- [ ] File operations use fs-extra library
- [ ] Request validation uses express-validator
- [ ] YAML parsing uses js-yaml library
- [ ] Security middleware (helmet) implemented
- [ ] Response compression enabled
- [ ] All existing functionality preserved
- [ ] No breaking changes to API endpoints
- [ ] Improved error handling and logging
- [ ] Code is more testable and maintainable

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*