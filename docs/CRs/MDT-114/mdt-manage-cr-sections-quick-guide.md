# MCP mdt-all: `manage_cr_sections` - LLM Quick Guide

**Purpose**: Add, modify, or replace sections within an existing CR.
**Critical Issue**: Section path resolution fails with hierarchical syntax.
**For**: LLMs using this tool (concise, actionable)

---

## Quick Reference

| Operation | Purpose | Requires Section | Requires Content | Modifies CR |
|-----------|---------|------------------|------------------|-------------|
| `list` | See all sections | No | No | No |
| `get` | Read section content | Yes | No | No |
| `replace` | Replace entire section | Yes | Yes | Yes |
| `append` | Add to end of section | Yes | Yes | Yes |
| `prepend` | Add to start of section | Yes | Yes | Yes |

**Function Signature**:
```json
{ "project": "MDT", "key": "MDT-114", "operation": "list|get|replace|append|prepend", "section": "## Section Name", "content": "New content" }
```

---

## Critical Operations

### 1. `list` - ALWAYS START HERE

**Why**: `list` output may NOT show all subsections. You must see structure before modifying.

```json
{ "project": "MDT", "key": "MDT-114", "operation": "list" }
```

**Sample Output**:
```
    - ### Functional (543 chars)
    - ### Non-Functional (301 chars)
  - ## 1. Description (1571 chars)
    - ### Problem (1055 chars)
```

---

### 2. `get` - Read Before Replace

**Why**: Avoid losing content when replacing.

```json
{ "project": "MDT", "key": "MDT-114", "operation": "get", "section": "## 1. Description" }
```

---

### 3. `replace` - Complete Section Replacement

**Behavior**: Replaces all content, preserves header.

```json
{ "project": "MDT", "key": "MDT-114", "operation": "replace", "section": "### Problem", "content": "### Problem\n\nNew content here\n" }
```

**append**: Add to end, `prepend`: Add to start (after header).

---

## Section Path Syntax - CRITICAL

### The Problem

1. `list` may not show all subsections
2. Hierarchical paths (`# H1 / ## H2 / ### H3`) appear in error messages but **may not work**
3. Duplicate subsection names cause ambiguity

### Three Path Formats

| Format | Example | Works? | Use When |
|--------|---------|--------|----------|
| Simple | `"## 4. Acceptance Criteria"` | Yes | Unique section names |
| Hierarchical | `"# Title / ## 4 / ### Sub"` | No | ⚠️ Unreliable, avoid |
| Parent-target | Parent section | Yes | Duplicate subsections |

### Section Name Rules

```
# Title           → H1 (document title)
## N. Name        → H2 (main sections)
### Name          → H3 (subsections)
#### Name         → H4 (nested)

✅ "## 4. Acceptance Criteria"  (space after ##)
❌ "##4. Acceptance Criteria"   (no space)
❌ "  ## 4. Acceptance Criteria" (leading space)
```

---

## The #1 Failure: Duplicate Subsections

**Error**:
```
Multiple sections match "### Functional". Use hierarchical path:
- # CR Title / ## 4. Acceptance Criteria / ### Functional
- # CR Title / ## 3. Open Questions / ### Functional
```

### Wrong Approach
```json
{"section": "### Functional", "operation": "replace", "content": "..."}
// ERROR: Multiple sections match

{"section": "# CR Title / ## 4 / ### Functional", ...}
// ERROR: Section not found (hierarchical paths unreliable)
```

### Correct Approach: Target Parent
```json
{
  "section": "## 4. Acceptance Criteria", // Parent (unique)
  "operation": "replace",
  "content": "### Functional\n\n- [ ] New item\n\n### Non-Functional\n\n[existing content]\n\n### Edge Cases\n\n[existing content]\n"
}
// Include ALL subsections when replacing parent
```

---

## Quick Decision Tree

```
Need to modify CR section?
│
├─ Step 1: ALWAYS run `list` first
│  → See structure, find exact section names
│
├─ Step 2: Use `get` before `replace`
│  → Know what you're replacing
│
├─ Step 3: Choose operation
│  ├─ Read content → get
│  ├─ Add to end → append
│  ├─ Add to start → prepend
│  └─ Replace all → replace
│
└─ Step 4: Handle duplicates
   ├─ Section name unique? → Use directly
   └─ Multiple matches? → Target parent section, include all subsections
```

---

## Essential Workflows

### Workflow: Add Reference to Section

```json
// Step 1: List to find section name
{"operation": "list", "project": "MDT", "key": "MDT-114"}

// Step 2: Get to see current content
{"operation": "get", "section": "## 4. Acceptance Criteria", "project": "MDT", "key": "MDT-114"}

// Step 3: Append the reference
{"operation": "append", "section": "## 4. Acceptance Criteria", "content": "\n> **Reference**: [doc.md](./path)", "project": "MDT", "key": "MDT-114"}
```

### Workflow: Rename Section

```json
{ "section": "### Problem", "operation": "replace", "content": "### Issues\n\n[existing content]" }
// Include NEW header in content
```

---

## Golden Rules (5 Rules)

1. **ALWAYS run `list` first** - See structure before modifying
2. **Use `get` before `replace`** - Know what you're replacing
3. **Target parents for duplicate subsections** - Avoid ambiguity
4. **Include all subsections when replacing parent** - Don't lose content
5. **Add newlines**: `\n` at start (append) or end (prepend)

---

## Common Errors + Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Multiple sections match" | Duplicate subsection names | Target parent section instead |
| "Section not found" | Wrong path syntax | Use simple format: `"## Section Name"` |
| "Silent failure" | Wrong CR key or no change | Verify with `get` before/after |

---

**Last Updated**: 2026-01-02
**Full Guide**: See `mdt-manage-cr-sections-guide.md` for detailed examples
