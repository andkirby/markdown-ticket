---
code: MDT-100
status: Proposed
dateCreated: 2025-12-18T23:53:08.504Z
type: Architecture
priority: Medium
---

# Connect missing discovery configuration options to implementation

## 1. Description

### Problem
- Configuration system defines `maxDepth` and `excludePatterns` options in interfaces but these values are not read from config files
- Project discovery uses hardcoded values (maxDepth=3) instead of respecting user configuration
- excludePatterns field exists in ProjectScanOptions but is never used in scanning logic
- Documentation in CONFIG_GLOBAL_SPECIFICATION.md is missing these configuration options

### Affected Areas
- Frontend: Project management UI configuration interface
- Backend: Project discovery and scanning service
- Configuration: Global config parsing and validation
- Shared: Type definitions and interfaces

### Scope
- **In scope**: Connect defined configuration options to actual implementation
- **Out of scope**: Adding new configuration features beyond existing defined options

## 2. Desired Outcome

### Success Conditions
- User-specified `maxDepth` value from config.toml is respected during project discovery
- User-specified `excludePatterns` array from config.toml filters out matching directories
- Configuration validation ensures both options are properly validated when present
- Documentation accurately reflects all available discovery configuration options

### Constraints
- Must maintain backward compatibility with existing configurations
- Default behavior must remain the same (maxDepth=3, no exclude patterns)- Cannot break existing project discovery functionality

### Non-Goals
- Not changing the underlying scanning algorithm
- Not adding new configuration options beyond defined ones
- Not modifying the project registry structure

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Configuration | Should scanDepth be renamed to maxDepth consistently across all interfaces? | Maintain interface compatibility |
| Validation | What validation rules should apply to excludePatterns? | Follow existing TOML validation patterns |
| Error Handling | How should invalid configurations be handled? | Must not prevent system startup |

### Known Constraints
- Must use existing configuration file structure in `~/.config/markdown-ticket/config.toml`
- Must maintain compatibility with existing ProjectScanOptions interface
- Cannot modify the core directory scanning implementation

### Decisions Deferred
- Implementation approach for connecting config to scanner (determined by `/mdt:architecture`)
- Specific validation rules and error messages (determined by `/mdt:architecture`)
- Documentation format and structure updates (determined by `/mdt:architecture`)

## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [ ] User can set maxDepth in [discovery] section and project discovery respects that value
- [ ] User can set excludePatterns in [discovery] section and matching directories are skipped
- [ ] Configuration validation provides clear error messages for invalid values
- [ ] Default values are used when options are not specified in config

### Non-Functional
- [ ] Configuration parsing completes in under 100ms
- [ ] Project discovery performance does not degrade with exclude pattern filtering
- [ ] System startup time is not impacted by additional configuration validation

### Edge Cases
- What happens when maxDepth is set to 0 or negative values
- What happens when excludePatterns contains invalid regex patterns
- What happens when configuration file is malformed or missing required sections

### Documentation
- [ ] docs/CONFIG_GLOBAL_SPECIFICATION.md includes scanDepth and excludePatterns sections
- [ ] Configuration examples show both options with valid values
- [ ] Validation rules are documented for each new option
## 5. Verification

### How to Verify Success
- Manual verification: Edit config.toml with various maxDepth and excludePatterns values, verify discovery behavior
- Automated verification: Test configuration parsing with valid/invalid inputs
- Performance verification: Measure discovery time with and without exclude patterns