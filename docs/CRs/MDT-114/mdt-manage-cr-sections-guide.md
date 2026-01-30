# MCP mdt-all: `manage_cr_sections` Tool - Complete Guide

**Purpose**: Add, modify, or replace sections within an existing CR (Change Record).
**Critical For**: Making targeted updates to CRs without rewriting the entire document.
**Difficulty Level**: ⚠️ **Medium** - Section path syntax can be tricky.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Operations Explained](#operations-explained)
3. [Section Path Syntax](#section-path-syntax) ⚠️ **CRITICAL**
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)
6. [Real-World Examples](#real-world-examples)
7. [Pitfalls to Avoid](#pitfalls-to-avoid)

---

## Quick Reference

### Function Signature

```json
{
  "project": "TSM", // Required: Project code
  "key": "TSM-002", // Required: CR key (e.g., TSM-002)
  "operation": "list", // Required: list|get|replace|append|prepend
  "section": "## 1. Description", // Required for get/replace/append/prepend
  "content": "New content" // Required for replace/append/prepend
}
```

### Operations at a Glance

| Operation | Purpose | Requires Section? | Requires Content? | Modifies CR? |
|-----------|---------|-------------------|-------------------|--------------|
| `list` | Show all sections with hierarchy | ❌ No | ❌ No | ❌ No |
| `get` | Read a specific section | ✅ Yes | ❌ No | ❌ No |
| `replace` | Replace entire section content | ✅ Yes | ✅ Yes | ✅ Yes |
| `append` | Add content to END of section | ✅ Yes | ✅ Yes | ✅ Yes |
| `prepend` | Add content to START of section | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Operations Explained

### 1. `list` - Explore CR Structure

**Purpose**: See all sections in a CR with their hierarchy and character counts.

**When to Use**:
- Before any other operation (ALWAYS start here!)
- When you need to find the correct section path
- When you're unsure about the CR structure

**Example**:
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "list"
}
```

**Sample Output**:
```
📑 **Sections in CR TSM-002** - Fix path resolution and file discovery edge cases

Found 19 sections:

    - ### Requirements Scope (44 chars)
    - ### Problem (1055 chars)
    - ### Affected Areas (225 chars)
    - ### Scope (178 chars)
  - ## 1. Description (1571 chars)
    - ### Success Conditions (606 chars)
    - ### Constraints (320 chars)
    - ### Non-Goals (128 chars)
  - ## 2. Desired Outcome (1111 chars)
    - ### Known Constraints (340 chars)
    - ### Decisions Deferred (295 chars)
  - ## 3. Open Questions (1353 chars)
    - ### Functional (543 chars)
    - ### Non-Functional (301 chars)
    - ### Edge Cases (534 chars)
  - ## 4. Acceptance Criteria (1431 chars)
    - ### How to Verify Success (544 chars)
  - ## 5. Verification (571 chars)
- # Fix path resolution and file discovery edge cases (6154 chars)
```

**⚠️ WARNING**: The `list` output **may not show all subsections**. See [Section Path Syntax](#section-path-syntax) for how to handle this.

---

### 2. `get` - Read Section Content

**Purpose**: Read the full content of a specific section.

**When to Use**:
- Before modifying a section (see current content first)
- When you need to check section length or format
- When debugging why another operation failed

**Example**:
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "get",
  "section": "## 4. Acceptance Criteria"
}
```

**Sample Output**:
```
📖 **Section Content from CR TSM-002**

**Section:** # Fix path resolution and file discovery edge cases / ## 4. Acceptance Criteria
**Content Length:** 1431 characters

---

### Functional
- [ ] Running `tm --all` shows staged new TypeScript files in output
- [ ] Running `tm shared/models/` returns metrics for files in that directory
...

> **Requirements Specification**: [requirements.md](./TSM-002/requirements.md)

---

Use `manage_cr_sections` with operation="replace", "append", or "prepend" to modify this section.
```

**⚠️ WARNING**: If multiple sections have the same name (e.g., `### Functional`), you'll get an error. See [Troubleshooting](#troubleshooting).

---

### 3. `replace` - Replace Entire Section

**Purpose**: Completely replace the content of a section.

**Behavior**:
- **Replaces** all existing content in the section
- **Preserves** the section header (e.g., `### Problem`)
- **Does NOT affect** other sections

**When to Use**:
- You have the complete new content for a section
- You want to completely rewrite a section
- You're fixing structural issues in a section

**Example**:
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "replace",
  "section": "### Problem",
  "content": "### Problem\n\n**Issue #1**: Description here\n\n**Issue #2**: Description here\n"
}
```

**⚠️ IMPORTANT**:
- **DO NOT** include the section header in `content` if it's already in the section name
- **DO** include the section header if you want to change it
- Match the exact behavior you want

---

### 4. `append` - Add to End of Section

**Purpose**: Add content to the END of an existing section.

**Behavior**:
- **Preserves** all existing content
- **Adds** your content after the last line
- **Does NOT modify** the section header

**When to Use**:
- Adding a new item to a list
- Adding a reference note at the end
- Adding a new paragraph without changing existing content

**Example**:
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "append",
  "section": "## 4. Acceptance Criteria",
  "content": "\n> **Requirements Specification**: [requirements.md](./TSM-002/requirements.md)"
}
```

**Result**: The reference note is added to the end of the Acceptance Criteria section.

---

### 5. `prepend` - Add to Start of Section

**Purpose**: Add content to the START of an existing section (after the header).

**Behavior**:
- **Preserves** all existing content
- **Adds** your content right after the section header
- **Does NOT modify** the section header

**When to Use**:
- Adding a note at the top of a section
- Adding a preamble before existing content
- Inserting important context at the beginning

**Example**:
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "prepend",
  "section": "### Problem",
  "content": "**Note**: This section was updated on 2026-01-02\n\n"
}
```

**Result**: The note appears at the top of the Problem section, before the existing content.

---

## Section Path Syntax ⚠️ **CRITICAL**

This is the **most confusing part** of the tool. Read carefully!

### The Problem

1. `list` output **may not show all subsections**
2. Subsections can have **duplicate names** across different parents
3. The **exact path syntax** is not well documented

### Three Path Formats

#### Format 1: Simple Section Name (Use First)

```json
{
  "section": "## 4. Acceptance Criteria"
}
```

**When it works**: Unique section names, top-level sections

**Pros**: Simple, readable
**Cons**: Fails if section name appears multiple times

---

#### Format 2: Hierarchical Path with `/`

```
"section": "# H1 / ## H2 / ### H3"
```

**⚠️ EXPERIMENTAL**: This format is shown in error messages but may not work in actual calls.

**Example from error message**:
```
Multiple sections match "### Functional". Use hierarchical path:
- # Fix path resolution / ## 4. Acceptance Criteria / ### Functional
```

**But when you try it**:
```
❌ "Section not found"
```

**Current Status**: ⚠️ **Unreliable** - Use Format 1 or Format 3 instead

---

#### Format 3: Relative Path from Parent (RECOMMENDED for Subsections)

When a subsection has duplicates:
1. **Target the parent section instead** (Format 1)
2. Use `replace` on the parent with the full content including the subsection

**Example**:
```json
// Instead of trying to access "### Functional" directly
{
  "operation": "replace",
  "section": "## 4. Acceptance Criteria", // Parent
  "content": "### Functional\n\n- [ ] Item 1\n\n### Non-Functional\n\n- [ ] Item 2\n"
}
```

**Why this works**: You replace the parent with content that includes the modified subsection.

---

### Section Name Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `# Title` | H1 (document title) | `# Fix path resolution` |
| `## N. Name` | H2 (main sections) | `## 1. Description` |
| `### Name` | H3 (subsections) | `### Problem` |
| `#### Name` | H4 (nested) | `#### Introduction` |

**Rules**:
- **Space** after `#` symbols: `## 4. Acceptance Criteria` ✅
- **No leading space**: ` ### Problem` ❌
- **Exact match**: Case-sensitive, punctuation-sensitive

---

## Common Workflows

### Workflow 1: Add a Reference Note to a Section

**Scenario**: You want to add a note at the end of "Acceptance Criteria" referencing another document.

**Step 1**: List sections to find the correct name
```json
{ "operation": "list", "project": "TSM", "key": "TSM-002" }
```

**Step 2**: Get current content to see where to add
```json
{ "operation": "get", "section": "## 4. Acceptance Criteria", "project": "TSM", "key": "TSM-002" }
```

**Step 3**: Append the reference
```json
{
  "operation": "append",
  "section": "## 4. Acceptance Criteria",
  "content": "\n> **Requirements**: [requirements.md](./TSM-002/requirements.md)",
  "project": "TSM",
  "key": "TSM-002"
}
```

---

### Workflow 2: Update a Subsection with Duplicate Names

**Scenario**: You want to update `### Functional`, but it appears in multiple places.

**❌ WRONG APPROACH**:
```json
{
  "section": "### Functional", // Multiple matches!
  "operation": "replace",
  "content": "..."
}
// ERROR: Multiple sections match
```

**✅ CORRECT APPROACH**: Target the parent section
```json
{
  "section": "## 4. Acceptance Criteria", // Parent (unique)
  "operation": "replace",
  "content": "### Functional\n\n- [ ] New item 1\n- [ ] New item 2\n\n### Non-Functional\n\n[existing content]\n\n### Edge Cases\n\n[existing content]\n"
}
```

---

### Workflow 3: Rename a Section

**Scenario**: You want to change `### Problem` to `### Issues`.

**✅ CORRECT APPROACH**:
```json
{
  "section": "### Problem",
  "operation": "replace",
  "content": "### Issues\n\n[existing content with new header]"
}
```

**Key**: Include the NEW header in `content`.

---

## Troubleshooting

### Error 1: "Multiple sections match"

**Error Message**:
```
Multiple sections match "### Functional". Please use a hierarchical path:
- # CR Title / ## 4. Acceptance Criteria / ### Functional
- # CR Title / ## 3. Open Questions / ### Functional
```

**Cause**: The section name appears in multiple places.

**Solutions** (in order of preference):

1. **Target the parent section instead**:
   ```json
   { "section": "## 4. Acceptance Criteria", "operation": "replace", "content": "..." }
   ```

2. **Use `get` with hierarchical path** (if supported):
   ```json
   { "section": "# CR Title / ## 4. Acceptance Criteria / ### Functional", "operation": "get" }
   ```

3. **Be more specific in section name** (if possible):
   ```json
   {"section": "## 4. Acceptance Criteria / ### Functional", ...}
   ```

---

### Error 2: "Section not found"

**Error Message**:
```
Section "## 4 / ### Functional" not found
```

**Cause**: Incorrect section path syntax.

**Solutions**:

1. **Run `list` first** to see actual section names
2. **Copy the exact section name** from `list` output
3. **Try without subsection**:
   ```json
   // ❌ {"section": "## 4 / ### Functional", ...}
   // ✅ {"section": "## 4. Acceptance Criteria", ...}
   ```

---

### Error 3: "Section validation failed"

**Error Message**:
```
Section validation failed: Section "X" not found

Suggestions:
- Did you mean: [list of similar sections]
```

**Cause**: Section path doesn't exist or syntax is wrong.

**Debug Steps**:

1. **Run `list` to see actual structure**:
   ```json
   { "operation": "list", "project": "TSM", "key": "TSM-002" }
   ```

2. **Check for typos**:
   - Extra spaces: `##  4. Acceptance Criteria` ❌
   - Missing space: `##4. Acceptance Criteria` ❌
   - Wrong case: `## 4. acceptance criteria` ❌

3. **Try the parent section** instead of the subsection

---

### Error 4: Operation Fails Silently

**Symptom**: Call returns success but CR doesn't change.

**Possible Causes**:

1. **Content was identical to existing** - No actual change made
2. **Wrong CR key** - Modified a different CR
3. **Section path matched nothing** - No-op

**Debug Steps**:

1. **Run `get` before and after** to verify changes
2. **Check the CR key** carefully
3. **Verify section path** with `list` first

---

## Real-World Examples

### Example 1: Add Reference to Requirements Document

**Context**: Created `requirements.md` for TSM-002, need to add reference in CR.

**Attempt 1** (Failed - hierarchical path didn't work):
```json
{
  "project": "TSM",
  "key": "TSM-002",
  "operation": "append",
  "section": "## 4. Acceptance Criteria / ### Functional",
  "content": "\n> **Requirements**: [requirements.md](./TSM-002/requirements.md)"
}
// ERROR: Section not found
```

**Attempt 2** (Failed - ambiguous section):
```json
{
  "section": "### Functional",
  "operation": "append",
  "content": "\n> **Requirements**: [requirements.md](./TSM-002/requirements.md)"
}
// ERROR: Multiple sections match "### Functional"
```

**Attempt 3** (SUCCESS - targeted parent):
```json
{
  "section": "## 4. Acceptance Criteria",
  "operation": "append",
  "content": "\n> **Requirements**: [requirements.md](./TSM-002/requirements.md)"
}
// ✅ SUCCESS
```

---

### Example 2: Update Problem Section with Numbered Issues

**Context**: Want to add issue numbers (#1, #2, #3, #4) to the Problem section.

**Step 1**: Get current content
```json
{ "operation": "get", "section": "### Problem", "project": "TSM", "key": "TSM-002" }
```

**Step 2**: Replace with numbered format
```json
{
  "operation": "replace",
  "section": "### Problem",
  "content": "### Problem\n\n**Issue #1**: Staged files not discovered\nWhen `tm --all` is run...\n\n**Issue #2**: Path resolution error\nWhen `tm <path>` is run...\n\n**Issue #3**: Test file exclusion\nWhen `tm server/tests/api` is run...\n\n**Issue #4**: Relative path validation\nWhen `tm ./api/` is run...\n"
}
```

**Result**: Problem section now has numbered issues.

---

### Example 3: Reorganize Acceptance Criteria by Issue

**Context**: Want to reorganize Functional AC to group by issue number.

**Step 1**: Get current content
```json
{ "operation": "get", "section": "## 4. Acceptance Criteria", "project": "TSM", "key": "TSM-002" }
```

**Step 2**: Replace with reorganized content
```json
{
  "operation": "replace",
  "section": "## 4. Acceptance Criteria",
  "content": "### Functional\n\n**Issue #1: Staged files**\n- [ ] `tm --all` shows staged files\n\n**Issue #2: Path resolution**\n- [ ] `tm shared/models/` returns metrics\n\n**Issue #3: Test files**\n- [ ] `tm server/tests/api` returns test metrics\n\n**Issue #4: Relative paths**\n- [ ] `tm ./api/` from subdirectory works\n\n### Non-Functional\n\n[existing non-functional content]\n\n### Edge Cases\n\n[existing edge cases content]\n\n> **Requirements**: [requirements.md](./TSM-002/requirements.md)\n"
}
```

**Key**: Include ALL subsections when replacing a parent section.

---

## Pitfalls to Avoid

### ❌ Pitfall 1: Skip `list` Operation

**Wrong**:
```json
// Jump straight to replace
{ "operation": "replace", "section": "### Problem", "content": "..." }
// ERROR IF section name is wrong
```

**Right**:
```json
// Always list first
{"operation": "list", "project": "TSM", "key": "TSM-002"}
// Then use exact section name from output
{"operation": "replace", "section": "### Problem", "content": "..."}
```

---

### ❌ Pitfall 2: Assume Hierarchical Paths Work

**Wrong**:
```json
{"section": "## 4 / ### Functional", ...}
// This format is shown in errors but may not work
```

**Right**:
```json
// Use parent section instead
{"section": "## 4. Acceptance Criteria", ...}
```

---

### ❌ Pitfall 3: Forget Newlines in Content

**Wrong**:
```json
{
  "operation": "append",
  "section": "### Problem",
  "content": "> **Note**: See requirements.md" // No newline at start
}
// Result: > **Note**:... gets appended to last line, not new line
```

**Right**:
```json
{
  "operation": "append",
  "section": "### Problem",
  "content": "\n> **Note**: See requirements.md" // Leading \n
}
// Result: Note appears on new line at end
```

---

### ❌ Pitfall 4: Don't Verify with `get` First

**Wrong**:
```json
// Replace without seeing current content
{ "operation": "replace", "section": "### Problem", "content": "New content" }
// Oops, you just deleted important content!
```

**Right**:
```json
// First see what's there
{"operation": "get", "section": "### Problem", ...}
// Then replace with care
{"operation": "replace", "section": "### Problem", "content": "Old + New content"}
```

---

### ❌ Pitfall 5: Replace Parent Without Including All Subsections

**Wrong**:
```json
{
  "operation": "replace",
  "section": "## 4. Acceptance Criteria",
  "content": "### Functional\n\n- [ ] Item 1\n"
  // You just deleted Non-Functional, Edge Cases, etc!
}
```

**Right**:
```json
{
  "operation": "replace",
  "section": "## 4. Acceptance Criteria",
  "content": "### Functional\n\n- [ ] Item 1\n\n### Non-Functional\n\n[content]\n\n### Edge Cases\n\n[content]\n"
  // Include ALL subsections
}
```

---

## Best Practices

### ✅ Always Start with `list`

Before any modification, run `list` to see the structure:
```json
{ "operation": "list", "project": "XXX", "key": "XXX-000" }
```

### ✅ Use `get` Before `replace`

See current content before replacing:
```json
{"operation": "get", "section": "### Problem", ...}
// Then plan your replacement
{"operation": "replace", "section": "### Problem", "content": "..."}
```

### ✅ Target Parent Sections for Subsection Changes

When subsection has duplicates or is hard to access:
```json
// Target parent
{"section": "## 4. Acceptance Criteria", ...}
// Not subsection
// {"section": "### Functional", ...}  // May fail
```

### ✅ Include Leading Newlines in `append`/`prepend`

```json
{"content": "\nNew paragraph"}  // append
{"content": "New note\n\n"}     // prepend
```

### ✅ Preserve All Subsections When Replacing Parent

```json
{
  "section": "## Parent",
  "content": "### Child 1\n\n[content]\n\n### Child 2\n\n[content]\n\n"
  // Include all children
}
```

---

## Quick Decision Tree

```
Need to modify a CR section?
│
├─ What do you want to do?
│  ├─ See structure → RUN: list operation
│  ├─ Read content → RUN: get operation
│  ├─ Add to end → RUN: append operation
│  ├─ Add to start → RUN: prepend operation
│  └─ Replace all → RUN: replace operation
│
├─ Is section name unique?
│  ├─ Yes → Use section name directly
│  └─ No → Target parent section instead
│
└─ Did you include all subsections when replacing parent?
   ├─ Yes → Good to go
   └─ No → STOP! Include all subsections or use get first
```

---

## Summary: The Golden Rules

1. **ALWAYS run `list` first** - See the structure before modifying
2. **Use `get` before `replace`** - Know what you're replacing
3. **Target parents, not deep subsections** - Avoids ambiguity
4. **Include all content when replacing parents** - Don't lose subsections
5. **Add newlines in `append`/`prepend`** - `\n` at start (append) or end (prepend)
6. **Use exact section names from `list`** - Copy-paste to avoid typos

---

**Last Updated**: 2026-01-02
**For**: MCP mdt-all v2+
**Author**: Claude (with lessons learned from painful debugging)
