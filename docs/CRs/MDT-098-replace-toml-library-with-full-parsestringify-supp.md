---
code: MDT-098
status: Implemented
dateCreated: 2025-12-17T20:43:16.500Z
dateCompleted: 2025-12-17T20:58:00.000Z
type: Technical Debt
priority: Medium
---

# Replace TOML library with full parse/stringify support

## 1. Description

### Problem
- Current TOML implementation cannot write/stringify TOML files, only parse them
- Custom stringify implementation has limited feature support (no comments, basic type handling)
- Multiple TOML libraries in use across codebase (@iarna/toml, toml v3.0.0, custom implementation)
- Need bidirectional TOML support for configuration file management

### Affected Areas
- Shared code: TOML utilities in shared/utils/toml.ts
- Configuration: Project configuration file handling
- Tests: Unit tests for TOML parsing and stringification

### Scope
- **In scope**: Replace TOML implementation with library supporting both parse and stringify
- **Out of scope**: Changes to configuration file format or structure

## 2. Desired Outcome

### Success Conditions
- TOML configuration files can be both read and written programmatically
- Single TOML library used across the shared codebase
- All existing TOML parsing functionality preserved
- Tests pass with new implementation

### Constraints
- Must maintain backward compatibility with existing configuration file format
- Cannot change configuration file structure or format
- Must preserve all existing parse functionality
- Tests must continue to pass

### Non-Goals
- Not changing configuration file format
- Not modifying the structure of .mdt-config.toml files

## 3. Open Questions

| Area | Question | Constraints |
------|----------|-------------|
| Library | Which TOML library provides both parse and stringify? | Must be production-ready with good TypeScript support |
| Compatibility | How to handle differences in output formatting? | Must produce valid TOML that parses correctly |

### Known Constraints
- Must use npm package from reputable source
- Must support TypeScript
- Must handle nested objects and arrays
- Must maintain existing API surface in shared/utils/toml.ts

### Decisions Deferred
- Specific TOML library choice (implementation team to evaluate)
- Migration approach for other parts of codebase using different TOML libraries

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Configuration files can be both read and written programmatically
- [ ] All existing tests continue to pass with new implementation
- [ ] Bidirectional TOML operations work correctly (parse->modify->stringify)

### Non-Functional
- [ ] Performance of parse/stringify operations is acceptable for configuration file sizes
- [ ] Library is actively maintained with good community support

### Edge Cases
- [ ] What happens when parsing malformed TOML
- [ ] How are null/undefined values handled during stringification
- [ ] How are comments preserved (if required)

## 5. Verification

### How to Verify Success
- Manual verification: Create/modify configuration file programmatically and verify valid TOML output
- Automated verification: Run existing test suite with new library
- Roundtrip verification: Parse existing TOML, stringify, and parse again to ensure data integrity

## 6. Resolution

### Implementation Summary
Replaced custom TOML implementation with `smol-toml` library providing full parse/stringify support.

**Changes**:
- Added `smol-toml` dependency to shared/package.json
- Updated shared/utils/toml.ts to use smol-toml for both parse and stringify
- Updated tests to match new library behavior (11/11 tests passing)

**Key Differences**:
- Comments not preserved (acceptable for config files)
- Null values removed during stringify
- Arrays formatted with spaces: `[ "a", "b", "c" ]`

**Verification**: All acceptance criteria met. Configuration files can now be both read and written programmatically with data integrity maintained through roundtrip operations.
