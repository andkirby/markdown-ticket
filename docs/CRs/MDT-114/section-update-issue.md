# Bug Report: MCP mdt-all manage_cr_sections Path Resolution Issues

**Reported By**: Claude (QA Analysis)
**Date**: 2026-01-02
**Component**: `mcp__mdt-all__manage_cr_sections`
**Severity**: Medium - User can complete task but requires multiple attempts and workarounds
**Affected Version**: mdt-all MCP server

---

## Executive Summary

The `manage_cr_sections` tool has inconsistent path resolution behavior between `list`, `get`, and `replace` operations. Error messages suggest path formats that don't actually work, requiring users to use trial-and-error to find the correct format.

---

## Bug #1: Hierarchical Path Format Not Accepted by Replace Operation

### Description
The `list` operation displays sections using hierarchical path notation with spaces and forward slashes (e.g., `# Title / ## Section / ### Subsection`), but the `replace` operation does not accept this format despite error messages suggesting it.

### Steps to Reproduce

1. Run `manage_cr_sections` with `operation="list"` on a CR
2. Observe output showing hierarchical paths like:
   ```
   # Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria / ### Functional
   ```
3. Attempt to replace using that exact path:
   ```json
   {
     "operation": "replace",
     "section": "# Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria / ### Functional"
   }
   ```
4. Receive error: `Section "..." not found`

### Expected Behavior
If `list` shows a path in a certain format, `replace` should accept that same format.

### Actual Behavior
The `replace` operation rejects the hierarchical path format shown by `list`.

### Error Message
```
❌ Section validation failed

Errors:
- Section "# Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria / ### Functional" not found

Suggestions:
- Did you mean one of:
  - "# Fix path resolution and file discovery edge cases"
  - "## 4. Acceptance Criteria"
  - "### Functional"
```

**Issue**: The suggestions don't include the hierarchical format that was just shown in `list` output.

---

## Bug #2: Ambiguous Section Names Without Clear Resolution Path

### Description
When multiple sections share the same name (e.g., `### Functional` appears in different contexts), the error message suggests using a hierarchical path but doesn't provide the exact format to use.

### Steps to Reproduce

1. Attempt to `get` or `replace` a section with a non-unique name:
   ```json
   {"section": "### Functional"}
   ```
2. Receive error:
   ```
   Multiple sections match "### Functional". Please use a hierarchical path:
   - # Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria / ### Functional
   - # Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria / ### Non-Functional
   ```
3. Attempt to use the exact path shown in the error message
4. Operation fails with "Section not found"

### Expected Behavior
Either:
- Accept the hierarchical path format shown in the error message, OR
- Provide a different format that actually works

### Actual Behavior
The error shows a format that doesn't work with `replace` or `get` operations.

---

## Bug #3: Inconsistent Path Format Requirements Across Operations

### Description
Different operations (`list`, `get`, `replace`) appear to expect different path formats, but this is not documented.

### Observed Behavior

| Operation | Path Format That Works |
|-----------|------------------------|
| `list` | N/A (returns all sections) |
| `get` | Parent section names like `## 4. Acceptance Criteria` |
| `replace` | Parent section names like `## 4. Acceptance Criteria` |

### Attempted Formats That Failed

```json
// Format 1: Hierarchical with slashes (shown in list output)
{"section": "# Title / ## Section / ### Subsection"}  // FAILED

// Format 2: Hierarchical path notation
{"section": "# Title / ## Section / ### Subsection"}  // FAILED

// Format 3: Subsection name only (ambiguous)
{"section": "### Functional"}  // FAILED (multiple matches)
```

### Successful Workaround

```json
// Had to operate on parent section instead
{"section": "## 4. Acceptance Criteria"}  // SUCCESS
```

---

## Bug #4: Error Message Suggestions Include Non-Working Formats

### Description
When section lookup fails, the error message shows "suggestions" that include formats the operation doesn't actually accept.

### Example Error Message

```
Suggestions:
- Did you mean one of:
  - "# Fix path resolution and file discovery edge cases"
  - "## 4. Acceptance Criteria"
  - "### Functional"
```

### Issue
- `### Functional` is shown as a suggestion even though it has multiple matches
- The hierarchical format (which appears in `list` output) is not shown as an option
- User must try each suggestion to find which one works

---

## Root Cause Analysis

### Hypothesis 1: Path Parsing Inconsistency
The `list` operation formats paths for **display purposes** (human-readable with ` / ` separators), but `get` and `replace` operations use a different **internal path format**.

**Evidence**:
- `list` output: `# Title / ## Section / ### Subsection`
- `replace` requires: Simple section name without hierarchy

### Hypothesis 2: Section Lookup Logic
The `get` and `replace` operations may:
1. First lookup by section name
2. If ambiguous, check hierarchy
3. But the hierarchy format expected differs from what `list` displays

### Hypothesis 3: Section Identifier Mismatch
The `list` operation may show **display paths** while `get`/`replace` expect **section identifiers** that are not the same.

---

## Recommended Fixes

### Fix #1: Standardize Path Format (High Priority)

Make all operations accept the same path format. Choose one:

**Option A**: Use hierarchical notation everywhere
```json
{"section": "# Title / ## Section / ### Subsection"}
```

**Option B**: Use simple section names (requires parent to be unique)
```json
{"section": "### Subsection"}  // Error if multiple, show parent options
```

**Option C**: Use structured format
```json
{
  "section": "### Subsection",
  "parent": "## Section",
  "root": "# Title"
}
```

### Fix #2: Improve Error Messages (High Priority)

When suggesting sections, show:
1. **Only working formats** for the current operation
2. **Example usage** for each suggestion
3. **Why** each suggestion is valid/invalid

**Example improved error**:
```
Multiple sections match "### Functional".

For this operation, use one of these parent sections:
- "## 4. Acceptance Criteria" (contains ### Functional)
- "## 2. Another Section" (contains ### Functional)

Then update the entire section and specify subsection in content.
```

### Fix #3: Add Operation Format Documentation (Medium Priority)

Document expected path formats for each operation:
- `list`: No section parameter needed
- `get`: Accepts parent section names or unique subsection names
- `replace`: Accepts parent section names only (subsection must be unique)
- `append`/`prepend`: Accepts parent section names

### Fix #4: Add Unique Section IDs (Low Priority)

Give each section a unique ID that can be used regardless of hierarchy:

```json
{"sectionId": "acc-functional"}  // Unique, unambiguous
```

---

## Workarounds for Users

### Current Workaround #1: Use Parent Sections
Instead of targeting a subsection:
```json
// Instead of:
{"section": "### Functional", "operation": "replace"}

// Use:
{"section": "## 4. Acceptance Criteria", "operation": "replace"}
// Then include subsections in replacement content
```

### Current Workaround #2: Use Get First
1. Use `operation="get"` on parent section
2. Copy content
3. Modify content as needed
4. Use `operation="replace"` on parent section

### Current Workaround #3: Trial and Error
Try each suggestion from error message until one works.

---

## Impact Assessment

### User Impact
- **Confusion**: Error messages suggest non-working formats
- **Time Wasted**: Requires multiple attempts to find working format
- **Frustration**: `list` output doesn't match `replace` input format

### Developer Impact
- **Support burden**: Users will report this as confusing
- **Documentation complexity**: Must explain the difference between display paths and operation paths

---

## Test Cases for Verification

### TC1: List Shows Valid Replace Paths
1. Run `manage_cr_sections` with `operation="list"`
2. Take any displayed hierarchical path
3. Use it with `operation="replace"`
4. **Expected**: Should work
5. **Actual**: Fails

### TC2: Unique Subsection Direct Access
1. Attempt to replace a subsection with unique name
2. **Expected**: Should work with subsection name only
3. **Actual**: Requires parent section name

### TC3: Ambiguous Subsection Error Quality
1. Attempt to replace an ambiguous subsection
2. **Expected**: Error shows working formats only
3. **Actual**: Shows hierarchical format that doesn't work

### TC4: Cross-Operation Consistency
1. Use path format from `list` in `get`
2. Use path format from `get` in `replace`
3. **Expected**: All formats work across operations
4. **Actual**: Formats don't transfer between operations

---

## Related Issues

- **Error message quality**: Suggestions include non-options
- **Documentation gap**: No clear specification of path formats per operation
- **UX inconsistency**: Display format ≠ input format

---

## Priority Assessment

| Issue | Priority | Reason |
|-------|----------|--------|
| Path format standardization | **High** | Core functionality confusion |
| Error message improvements | **High** | Direct user impact |
| Documentation | **Medium** | Workaround exists |
| Unique section IDs | **Low** | Nice to have, not blocking |

---

## Conclusion

The `manage_cr_sections` tool is functional but suffers from UX inconsistencies that make it harder to use than necessary. The primary issue is that **display formats** (what `list` shows) don't match **input formats** (what `replace` accepts), and error messages don't bridge this gap effectively.

**Recommended action**: Prioritize Fix #1 (standardize formats) and Fix #2 (improve error messages) for immediate user experience improvement.
