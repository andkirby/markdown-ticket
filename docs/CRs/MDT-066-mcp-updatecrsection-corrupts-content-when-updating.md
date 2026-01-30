---
code: MDT-066
title: MCP update_cr_section Corrupts Content When Updating H1 Headers
status: Implemented
dateCreated: 2025-10-07T09:58:12.223Z
type: Bug Fix
priority: Critical
---

# MCP update_cr_section Corrupts Content When Updating H1 Headers

**📋 Testing Plan**: [MDT-066-Testing-Plan.md](../../MDT-066-Testing-Plan.md)

## Description

The MCP `update_cr_section` tool exhibits dangerous behavior when updating H1 headers. When replacing an H1 section with just a new header text, it silently deletes all content that belongs to that H1 section, causing data loss.

**Observed Behavior:**
- Used `update_cr_section` to replace H1 "# Old Title" with "# New Title"
- Expected: Only H1 line changes, content preserved
- Actual: All content under that H1 (until next H1) was deleted
- No warning or error was provided

## Rationale

This is a critical data loss bug that:
- Causes silent content corruption
- Confuses LLMs about tool behavior
- Violates principle of least surprise
- Makes H1 updates extremely dangerous
- Could lead to accidental loss of important documentation

## Solution Analysis

### Current Problematic Behavior
```javascript
// This silently deletes all content under H1
update_cr_section(project, key, "# Old Title", "replace", "# New Title");
// Result: Only H1 line remains, everything else gone
```

### Expected Safe Behavior
**Option 1: Preserve Content (Recommended)**
```javascript
// Should preserve all content under H1
update_cr_section(project, key, "# Old Title", "replace", "# New Title");
// Result: H1 changes, all ## sections underneath preserved
```

**Option 2: Explicit Warning**
- Detect when replacing H1 with just header text
- Warn: "This will delete all content under this H1. Use full section content or update subsections individually."
- Require confirmation or different operation

**Option 3: Header-Only Operation**
- Add new operation type: "replace_header"
- `update_cr_section(project, key, "# Old Title", "replace_header", "New Title")`
- Clearly indicates header-only change

## Implementation
## Implementation

### ✅ COMPLETED: Immediate Fix with Enhanced Safety

The fix was implemented in `/shared/services/MarkdownSectionService.ts` by enhancing the `replaceSection()` method with H1-specific logic:

#### Key Implementation Details

```typescript
// Special handling for H1 sections to prevent data loss
if (section.headerLevel === 1) {
  // Check if this is a header-only replacement (potential data corruption scenario)
  const isHeaderOnlyReplacement = newContent.trim() === ''
    || (newContent.trim().startsWith('#') && newContent.trim().split('\n').length === 1)

  if (isHeaderOnlyReplacement && section.content.trim()) {
    // WARNING: This operation would cause data loss for H1 sections
    console.warn(`⚠️  WARNING: Detected potentially destructive operation on H1 section "${section.headerText}"`)
    console.warn(`   The section contains ${section.content.length} characters of content that would be deleted.`)
    console.warn(`   Consider using 'append' or 'prepend' operations, or provide content to preserve subsections.`)

    // For H1 sections with existing content, preserve subsections when doing header-only replacement
    const subsections = this.extractSubsections(section.content)

    if (subsections.length > 0) {
      console.warn(`   Preserving ${subsections.length} existing subsection(s) to prevent data loss.`)

      // Build new content that includes preserved subsections
      const preservedContent = subsections.join('\n\n')
      const contentLines = newContent.trim()
        ? [newContent.trim(), '', preservedContent]
        : [preservedContent]

      return [...before, ...contentLines, ...after].join('\n')
    }
  }
}
```

#### New Helper Method: extractSubsections()

```typescript
/**
 * Extract subsections from H1 section content to preserve them during header updates
 */
private static extractSubsections(content: string): string[] {
  const lines = content.split('\n');
  const subsections: string[] = [];
  let currentSubsection: string[] = [];
  let inSubsection = false;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{2,6})\s+(.+)$/);

    if (headerMatch) {
      // Found a subsection header
      if (currentSubsection.length > 0) {
        subsections.push(currentSubsection.join('\n'));
      }
      currentSubsection = [line];
      inSubsection = true;
    } else if (inSubsection) {
      currentSubsection.push(line);
    } else if (line.trim()) {
      currentSubsection.push(line);
      inSubsection = true;
    }
  }

  // Add the last subsection
  if (currentSubsection.length > 0) {
    subsections.push(currentSubsection.join('\n'));
  }

  return subsections.filter(subsection => subsection.trim().length > 0);
}
```

### Enhanced Safety Features

1. **Automatic Detection**: Identifies header-only H1 replacements
2. **Warning System**: Provides clear console warnings with user guidance
3. **Content Preservation**: Automatically preserves existing subsections
4. **Backward Compatibility**: No breaking changes to existing functionality

### Fix Validation

The implementation successfully addresses all aspects of MDT-066:
- ✅ Prevents silent data loss when updating H1 headers
- ✅ Preserves all existing subsection content automatically
- ✅ Provides clear warnings for potentially destructive operations
- ✅ Maintains full backward compatibility
- ✅ Tested with comprehensive scenarios including edge cases
## Acceptance Criteria
## Acceptance Criteria

### Data Safety
- [x] H1 header updates preserve existing subsection content
- [x] No silent data loss when updating H1 sections
- [x] Clear warnings when potentially destructive operations detected
- [x] Backward compatibility with existing update patterns

### User Experience
- [x] LLMs can safely update H1 headers without data loss
- [x] Clear error messages explain expected behavior
- [x] Documentation updated with safe H1 update patterns
- [x] Examples provided for common H1 update scenarios

### Testing
- [x] Test H1 update with existing subsections (should preserve)
- [x] Test H1 update with full section content (should work as before)
- [x] Test edge cases: empty sections, multiple H1s, nested headers
- [x] Verify no regression in existing section update functionality

## Implementation Summary

**✅ COMPLETED**: The critical data corruption bug in `update_cr_section` has been fixed with the following implementation:

### Key Changes Made
1. **Enhanced MarkdownSectionService.replaceSection()** - Added special handling for H1 sections
2. **Content Preservation Logic** - Automatically preserves subsections when header-only updates detected
3. **Safety Warnings** - Console warnings for potentially destructive operations
4. **Backward Compatibility** - All existing functionality preserved

### Technical Implementation
- **Location**: `/shared/services/MarkdownSectionService.ts`
- **Method**: `replaceSection()` with H1-specific logic
- **Helper**: Added `extractSubsections()` for content preservation
- **Validation**: Detects header-only H1 replacements and warns users

### Safety Features
- ⚠️ **Warnings**: Console output when destructive operations detected
- 🛡️ **Content Preservation**: Automatic preservation of existing subsections
- 📝 **User Guidance**: Suggests alternative operations like 'append' or 'prepend'

### Test Results
- ✅ H1 header updates now preserve all subsection content
- ✅ Warnings properly issued for potentially destructive operations
- ✅ Backward compatibility maintained for all existing operations
- ✅ No regressions detected in H2+ section updates

This fix prevents the silent data loss that made H1 updates extremely dangerous and restores confidence in the MCP section update functionality.
## Priority Justification

**Critical Priority** because:
- Causes silent data loss
- Affects core MCP functionality
- Confuses AI assistants using the tool
- Could corrupt important project documentation
- No current workaround except manual file editing
