---
code: MDT-064
title: Title Updates Don't Sync with Markdown H1 Header
status: Proposed
dateCreated: 2025-10-04T21:01:56.683Z
type: Bug Fix
priority: Medium
---

# Title Updates Don't Sync with Markdown H1 Header

## Description

When updating a ticket's title via the API (e.g., using `update_cr_attrs`), the frontmatter `title` field is updated but the markdown H1 header (`#`) in the content remains unchanged. This creates inconsistency between the metadata and the document content.

## Rationale

Tickets should maintain consistency between:
- Frontmatter `title` field (used in UI displays)
- Markdown H1 header (used in document content)

Currently these can become out of sync, leading to confusion about the actual ticket title.

## Solution Analysis

**Option 1: Auto-sync H1 when title changes**
- Pros: Automatic consistency, no manual work
- Cons: May overwrite intentional H1 differences

**Option 2: Validation warning**
- Pros: User control, awareness of inconsistency
- Cons: Manual fix required

**Option 3: Bidirectional sync**
- Pros: Changes to either update both
- Cons: More complex, potential conflicts

## Implementation

**Recommended: Option 1 with safeguards**

1. When `title` is updated via API:
   - Parse markdown content
   - Find first H1 header (`# ...`)
   - Replace with new title
   - Update file content

2. Add configuration option to disable auto-sync if needed

3. Log when sync occurs for transparency

## Acceptance Criteria

- [ ] Updating ticket title via API also updates H1 in markdown
- [ ] Original H1 formatting is preserved (spacing, etc.)
- [ ] Only first H1 is updated, subsequent H1s remain unchanged
- [ ] Configuration option to disable auto-sync
- [ ] Logging when title-H1 sync occurs
- [ ] No sync if H1 doesn't exist (don't create one)
- [ ] Works for all title update methods (API, UI, MCP)

## Test Cases

1. **Basic sync**: Update title → H1 changes
2. **No H1**: Update title when no H1 exists → no H1 created
3. **Multiple H1s**: Only first H1 updated
4. **Disabled sync**: Configuration prevents auto-sync
5. **Complex H1**: H1 with formatting preserved