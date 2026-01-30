---
code: MDT-099
status: Proposed
dateCreated: 2025-12-18T01:14:35.798Z
type: Architecture
priority: Medium
phaseEpic: Core Reference Architecture
---

# Identify and Consolidate Shared Code Across Interfaces

## 1. Description
### Problem
- Code duplication exists across server/, frontend/, and mcp-server/ interfaces for common operations
- Configuration handling (like `server/repositories/ConfigRepository.ts`) is duplicated in server but needed by CLI, Web UI, and MCP
- Business logic scattered across different interfaces creates maintenance burden
- No clear architectural boundaries for what belongs in shared vs. interface-specific code
- Example: `server/repositories/ConfigRepository.ts` handles TOML parsing but is only accessible to server, forcing CLI and MCP to duplicate this logic

### Affected Areas
- Backend services: Business logic in server/services/
- Shared code: Utilities in shared/ directory
- Frontend components: UI components in src/components/
- MCP codebase: Model Context Protocol server implementation

### Scope
- **In scope**: Identify code that should be shared across interfaces
- **Out of scope**: Specific implementation details of how to move the code
## 2. Desired Outcome

### Success Conditions
- Common operations use shared implementations across CLI, Web UI, and MCP interfaces
- Configuration access is consistent regardless of interface
- Single source of truth exists for business logic
- Clear architectural guidelines define what belongs in shared vs. interface-specific code

### Constraints
- Must maintain backward compatibility with existing interfaces
- Cannot break existing tests
- Must follow MDT-077 requirements for eliminating code duplication
- Should preserve interface-specific concerns (e.g., HTTP handling in server)

### Non-Goals
- Not changing the fundamental architecture of each interface
- Not forcing all code into shared (only what makes sense)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Configuration | Which configuration handling belongs in shared vs. server? | ConfigRepository.ts example suggests need for sharing |
| Business Logic | How to identify what business logic should be shared? | Must consider interface-specific concerns |
| Validation | Where should validation logic live? | Needs to be consistent across interfaces |
| State Management | What state management patterns should be shared? | Frontend has different concerns than backend |

### Known Constraints
- Must maintain functional equivalence across all interfaces
- Shared code should not have interface-specific dependencies
- Must respect existing project boundaries

### Decisions Deferred
- Which specific files/components to move (determined by architecture)
- Implementation approach for moving code (determined by architecture)
- Task breakdown for implementation (determined by tasks)

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Configuration operations work identically across CLI, Web UI, and MCP
- [ ] No duplicate business logic exists between interfaces
- [ ] Shared code can be imported without circular dependencies
- [ ] Each interface has clear boundaries of concerns

### Non-Functional
- [ ] All existing tests continue to pass
- [ ] Code duplication reduced by measurable amount
- [ ] Build time does not significantly increase

### Edge Cases
- [ ] Shared code handles interface-specific requirements gracefully
- [ ] Error handling remains consistent across interfaces
- [ ] Performance does not degrade due to abstraction overhead

## 5. Verification

### How to Verify Success
- Manual verification: All interfaces work identically for common operations
- Automated verification: Test suite validates shared functionality
- Code review: No duplicate logic exists between interfaces
