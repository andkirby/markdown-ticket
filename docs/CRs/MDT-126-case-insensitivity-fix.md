---
code: MDT-126
status: Implemented
dateCreated: 2026-02-15T08:45:00.000Z
type: Bug Fix
priority: Low
---

# Make project ID and directory name comparisons case-insensitive on macOS

## 1. Description

On macOS, directory names can be typed in any case, but the filesystem stores them exactly as entered. The project management system was performing case-sensitive comparisons between project IDs (from `.mdt-config.toml`) and directory names during:

- Project auto-discovery (ProjectScanner)
- Registry validation (ProjectDiscoveryService)

This caused projects to be incorrectly skipped when the project ID and directory name had different cases, even though they should be treated as the same directory.

**Example**: If a user navigates to `~/home/MArkdown-TIcket` but the config has `project.id = "markdown-ticket"`, the project would be incorrectly skipped.

## 2. Rationale

Case-insensitive filesystems like macOS require case-insensitive comparisons for proper project detection. This bug prevented projects from being discovered when users navigated directories using different case variations.

## 3. Solution Analysis

**Selected Approach**: Convert both project ID and directory name to lowercase (or uppercase) before comparing.

**Justification**:
- Simple and predictable behavior
- Works consistently across all platforms
- No impact on existing valid configurations
- Minimal code changes (3 locations)

**Rejected Options**:
- Store all directory names in lowercase: Would require normalization at discovery time, impacting performance
- Case-fold complex unicode: Overkill for this use case, no unicode project names expected

## 4. Implementation Specification

### Files Modified

1. **`shared/services/project/ProjectScanner.ts`** (line 71)
   - Changed: `config.project.id !== directoryName`
   - To: `config.project.id.toLowerCase() !== directoryName.toLowerCase()`

2. **`shared/services/project/ProjectDiscoveryService.ts`** (lines 65 and 113)
   - Changed: `registryData.project.id !== directoryName`
   - Changed: `localConfig?.project?.id !== directoryName`
   - To: `registryData.project.id.toLowerCase() !== directoryName.toLowerCase()`
   - To: `localConfig?.project?.id.toLowerCase() !== directoryName.toLowerCase()`

### Implementation Steps

1. Locate the validation checks in ProjectScanner.ts (line 71)
2. Convert both project ID and directory name to lowercase using `.toLowerCase()` before comparison
3. Apply the same fix to both validation checks in ProjectDiscoveryService.ts (lines 65 and 113)
4. Run existing tests to ensure no regression
5. Verify the fix resolves the macOS case-sensitivity issue

### Testing Requirements

- [x] All existing tests pass (ProjectScanner.test.ts: 7 tests, ProjectDiscoveryService.test.ts: 5 tests)
- [ ] Manual verification on macOS with mixed-case directory names
- [ ] Test with various case combinations:
  - Lowercase directory + lowercase ID
  - Mixed case directory + mixed case ID
  - Mixed case directory + lowercase ID
  - Lowercase directory + mixed case ID

## 5. Acceptance Criteria

**Definition of Done**:
- [x] Code changes applied to both ProjectScanner and ProjectDiscoveryService
- [x] Comparisons are now case-insensitive using `.toLowerCase()`
- [x] All existing tests pass
- [ ] Case-insensitive comparisons verified on macOS with mixed-case directory names
- [ ] Projects with mismatched case (directory vs. project ID) are correctly discovered

**Success Metrics**:
- Projects are successfully discovered regardless of case used in directory path
- No regression in existing project discovery functionality
- Error messages remain accurate (if any validation failures occur)

## 6. Technical Debt Note

**⚠️ Quick Fix Applied - Refactoring Required**

This fix was applied as a targeted bug fix to resolve the immediate issue. However, the implementation revealed deeper architectural concerns:

- **Duplicate Validation Logic**: The case-insensitive comparison logic exists in both `ProjectScanner.ts` (line 71-75) and `ProjectDiscoveryService.ts` (lines 65-69, 115-118)
- **Mixed Responsibilities**: Both classes perform project construction with similar but slightly different logic
- **No Central Validation**: Project-related validation rules are scattered across multiple files

**See**: [MDT-127](docs/CRs/MDT-127-project-discovery-refactoring.md) for the refactoring ticket that addresses these architectural issues.

**See also**: [refactor.md](docs/CRs/MDT-126/refactor.md) for detailed analysis and options.

**Related CRs**: MDT-127

**Blocking**: None

**Depends On**: None