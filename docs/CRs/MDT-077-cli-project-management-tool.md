---
code: MDT-077
status: In Progress
dateCreated: 2025-11-13T22:10:34.006Z
type: Feature Enhancement
priority: High
phaseEpic: Core Reference Architecture
assignee: CLI Development
---

# CLI Project Management Tool Requirements

## 1. Description

### Problem

- Multiple project management code paths create inconsistent behavior across CLI, Web UI, and MCP interfaces (read only
  for MCP)
- Dual configuration system (global registry + local config) lacks clear architectural patterns
- Server-side project management duplication results in 80% code redundancy and maintenance overhead
- Missing comprehensive CLI testing strategy for command-line tools

### Affected Areas

- Frontend: Project management interface and user interactions
- Backend: Project management services and API endpoints
- Shared Services: ProjectService.ts and related utilities
- CLI Tools: Command-line interface for project operations
- Testing: Test coverage for CLI operations

### Scope

- **In scope**: Define requirements for consistent project management across all interfaces
- **Out of scope**: Specific implementation decisions and architectural patterns

### Critical Constraints

- The implementation SHALL NOT support legacy configuration formats
- All configurations must follow the new specification from CONFIG_SPECIFICATION.md regarding projects configuration
- Legacy fields are not mentioned CONFIG_SPECIFICATION.md
- Wring project configuration (.toml files) shall be done via a related class only (repository), whether it tests or
  core functionality.

## 2. Desired Outcome

### Success Conditions

- Users can manage projects consistently across CLI, Web UI, and MCP interfaces
- System provides three configuration strategies: global-only, project-first, and auto-discovery
- Test coverage exceeds 90% for CLI operations

### Out of Scope

Performance measurements is out of scope.

### Constraints

- Must integrate with existing shared services architecture
- Cannot require external services beyond current dependencies
- MUST NOT maintain backward compatibility for existing valid configurations
- MUST rid of usage ProjectConfig and use LocalProjectConfig instead (delete ProjectConfig)
- Other code places which works with project config generation code shall use API from shared code base (example: `ConfigurationGenerator.generateMdtConfig`, find other places and refactor code)

### Non-Goals as for CLI implementation

(this list may not be related to side refactoring)

- Not changing existing project data structures
- Not optimizing for non-CLI use cases
- Not implementing new project types beyond current scope

## 3. Open Questions

| Area                     | Question                                                   | Constraints                                      |
|--------------------------|------------------------------------------------------------|--------------------------------------------------|
| Testing Strategy         | What testing framework provides best CLI coverage?         | Must integrate with existing Jest infrastructure |
| Configuration Validation | How to enforce consistent configuration across interfaces? | Must use shared validation modules               |
| Error Recovery           | What transaction-style operations are needed?              | Must guarantee system consistency                |
| Service Dependencies     | How to inject dependencies while maintaining testability?  | Must support mocking in tests                    |
| Performance Optimization | What caching strategy meets <2 second target?              | Must handle concurrent operations                |

### Known Constraints

- Must use existing shared/services/ProjectService.ts as single source of truth
- Must eliminate server-side duplication (~300 lines)
- Must support all existing CLI commands
- Must preserve all functional requirements
- Must not break existing project configurations

### Decisions Deferred

- Implementation approach for three-strategy configuration
- Specific artifact structure and file organization
- Task breakdown for implementation
- Testing implementation details

## 4. Acceptance Criteria

### Functional (Outcome-focused)

- [ ] Users can create, list, update, and delete projects through CLI interface
- [ ] Project operations work consistently across CLI, Web UI, and MCP (reading)
- [ ] Configuration validation prevents invalid project creation
- [ ] System supports three configuration strategies based on deployment needs
- [ ] Error messages provide clear feedback for configuration issues

### Non-Functional

- [ ] Project operations complete in <2 seconds for single projects
- [ ] System handles multiple concurrent CLI operations
- [ ] Memory usage stays <50MB for all operations
- [ ] Test coverage >90% for CLI operations
- [ ] Configuration changes are validated before application

### Edge Cases

- [ ] Invalid configurations are rejected with clear error messages
- [ ] Project discovery handles missing configuration files gracefully
- [ ] Concurrent project operations do not corrupt data
- [ ] System recovers from interrupted operations

## 5. Verification

### How to Verify Success

- Manual verification: All CLI commands execute successfully with valid inputs
- Automated verification: CLI test suite validates all operations and edge cases
- Performance verification: Measure operation timing against baseline
- Integration verification: Confirm consistent behavior across all interfaces
- Web and MCP: Confirm consistent behavior related to changes in this ticket

## 6. References

> **Implementation Details**: See [extra-details.md](./MDT-077/extra-details.md) for extracted architectural patterns and implementation specifics

> **Related Documents**:
> - [requirements.md](./MDT-077/requirements.md) — EARS-formatted behavioral requirements
> - [architecture.md](./MDT-077/architecture.md) — Detailed architectural decisions
> - [CONFIG_SPECIFICATION.md](./../CONFIG_SPECIFICATION.md) — Detailed architectural decisions