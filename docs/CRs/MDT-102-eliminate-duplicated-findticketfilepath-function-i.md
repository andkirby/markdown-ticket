---
code: MDT-102
status: Proposed
dateCreated: 2025-12-23T22:43:52.392Z
type: Technical Debt
priority: Medium
phaseEpic: Phase 1b - Integration
---

# Eliminate duplicated findTicketFilePath function in MCP server handlers

## 1. Description

### Problem

- MCP server handlers (`crHandlers.ts`, `sectionHandlers.ts`) duplicate `findTicketFilePath` function
- Server properly uses shared services via adapter pattern, but MCP server implements its own path resolution
- Two implementations of same functionality increase maintenance burden and risk of divergence

### Affected Areas

- MCP server tool handlers: Path resolution logic for finding ticket files
- Shared services: Existing `TicketService.getCRPath()` is private and not reusable
- Integration pattern: MCP server should follow same pattern as web server

### Scope

- **In scope**: Refactor MCP handlers to use shared services for ticket file path resolution
- **Out of scope**: Changes to shared service interfaces (reuse existing capabilities)

## 2. Desired Outcome

### Success Conditions

- MCP server handlers obtain ticket file paths through shared services
- No duplicated path resolution logic exists in MCP server codebase
- Both server and MCP server use same underlying mechanism for ticket file operations
- Change is transparent to MCP tool users (no behavior changes)

### Constraints

- Must maintain existing MCP tool behavior and interfaces
- Must follow existing adapter pattern used by web server
- Cannot require changes to shared service public API (use existing capabilities)
- Must not break existing e2e tests

### Non-Goals

- Not changing shared service internal implementation
- Not modifying web server code
- Not adding new shared service methods (expose existing if needed)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Integration | Should `getCRPath()` be made public in shared `TicketService`? | Must not break existing web server |
| Integration | Should MCP server use adapter pattern like web server? | Must maintain MCP tool interface |
| Implementation | Should handlers use `ticket.filePath` from `getCR()` results? | Must handle cases where full Ticket not needed |

### Known Constraints

- MCP handlers currently need file path without full Ticket object scan
- Web server adapter pattern uses string `projectId` to `Project` object conversion
- Shared `TicketService.getProjectCRs()` already returns `Ticket[]` with populated `filePath`

### Decisions Deferred

- Specific implementation approach (determined by `/mdt:architecture`)
- Whether to expose `getCRPath()` as public or use existing methods
- Task breakdown for implementation (determined by `/mdt:tasks`)

## 4. Acceptance Criteria

### Functional

- [ ] MCP handlers no longer contain `findTicketFilePath` function
- [ ] File path resolution uses shared services (via adapter or direct method call)
- [ ] All existing MCP tools continue to work correctly
- [ ] E2e tests pass without modification (except for test-specific assertions)

### Non-Functional

- [ ] No net increase in lines of code
- [ ] Code follows existing adapter pattern used by web server
- [ ] Error handling for missing ticket files is preserved

## 5. Verification

### How to Verify Success

- Automated: All 213 MCP e2e tests pass after refactoring
- Automated: `grep -r "findTicketFilePath" mcp-server/src/` returns no results
- Code review: MCP handlers follow same pattern as web server adapter