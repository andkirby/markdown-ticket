---
code: MDT-032
title: MCP server missing relationship attributes in YAML frontmatter generation
status: Implemented
dateCreated: 2025-09-08T20:33:31.090Z
type: Bug Fix
priority: Medium
---

# MCP server missing relationship attributes in YAML frontmatter generation

## 1. Description

### Problem Statement
When creating CRs via MCP, dependsOn and blocks fields are not written to YAML frontmatter, only relatedTickets is included

### Current State
*To be filled*

### Desired State
*To be filled*

### Rationale
Relationship attributes are essential for ticket dependency tracking and UI display

## 2. Solution Analysis
*To be filled during implementation*

## 3. Implementation Specification
*To be filled during implementation*

## 4. Acceptance Criteria
*To be filled during implementation*

## 5. Implementation Notes

### 2025-09-19: YAML Frontmatter Validation Issue Discovered
**Problem**: LLMs are putting multi-line markdown content with `\n` characters into YAML frontmatter attributes like `description`, causing formatting issues.

**Example Issue**: SEB-002 ticket update attempted to put entire markdown content into `description` frontmatter field instead of ticket body.

**Root Cause**: 
- `description` field documented as "Problem statement or description" - should be brief single-line text
- No validation exists to prevent multi-line content in frontmatter attributes
- LLMs confuse frontmatter attributes with markdown body content

**Required Validation**:
- Add validation for plain-text-only attributes: `description`, `title`, `rationale`, `assignee`, `phaseEpic`
- Return error when `\n` characters detected in these fields
- Provide clear error message explaining frontmatter vs body content distinction

## 6. References
*To be filled during implementation*