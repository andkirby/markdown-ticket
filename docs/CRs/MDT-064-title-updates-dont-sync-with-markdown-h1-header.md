---
code: MDT-064
title: Standardize Ticket Title Management - H1 as Single Source of Truth
status: Implemented
dateCreated: 2025-10-04T21:01:56.683Z
type: Feature Enhancement
priority: High
---

# Standardize Ticket Title Management - H1 as Single Source of Truth
## Description

Currently the system has inconsistent title management with duplication between YAML frontmatter `title` attribute and markdown H1 headers. LLMs creating tickets via MCP often duplicate titles, creating data inconsistency. This CR establishes H1 as the single source of truth while maintaining backward compatibility.

**Current Problems:**
- YAML `title` and H1 header can become out of sync
- LLMs duplicate titles when creating via MCP (e.g., DEB-031)
- Unclear which source is authoritative
- Violates Single Responsibility Principle

## Rationale

The current dual-title system creates:
- Data duplication and inconsistency
- LLM confusion during ticket creation
- Maintenance overhead
- Unclear data hierarchy

Establishing H1 as authoritative source provides:
- Single source of truth for titles
- Clear document structure for ToC and section tools
- Consistent LLM interaction patterns
- Preserved backward compatibility

## Solution Analysis

### Current State
- YAML frontmatter contains `title` attribute
- Markdown content may have H1 header
- LLMs duplicate titles when creating via MCP
- UI displays YAML title in cards

### Target State
- H1 header is authoritative title source
- System extracts H1 → populates `title` attribute (compatibility)
- UI shows extracted title, hides H1 in content
- ToC includes H1 linking to document top
- MCP generates H1 from title parameter

## Implementation

### Phase 1: Server-Side H1 Processing

**File Processing Logic:**
```javascript
// Extract title from H1, fallback to filename
const extractTitle = (content, filename) => {
  const h1Match = content.match(/^# (.+)$/m);
  if (h1Match) return h1Match[1].trim();

  // Fallback: extract from filename
  const titlePart = filename.replace(/^[A-Z]+-\d+-/, '').replace(/\.md$/, '');
  return titlePart.replace(/-/g, ' ');
};

// Strip additional H1s
const normalizeH1s = (content) => {
  const lines = content.split('\n');
  let foundFirst = false;
  return lines.filter(line => {
    if (line.startsWith('# ')) {
      if (foundFirst) return false; // Remove additional H1s
      foundFirst = true;
    }
    return true;
  }).join('\n');
};
```

**Caching Implementation:**
- Memory cache with key: `${project}:${filepath}`
- Cache final ticket data (with extracted titles)
- Invalidation: API request + TTL + file watcher
- TTL from existing configuration (1-hour)

**Error Handling:**
- `console.error` when no H1 found
- Use filename fallback for title extraction
- Validate H1 format: strict `^# ` pattern

### Phase 2: MCP Integration

**Update create_cr:**
```javascript
// Auto-generate H1 from title parameter
if (data.title && data.content) {
  data.content = `# ${data.title}\n\n${data.content}`;
}
```

### Phase 3: Frontend Updates

**Content Rendering:**
- Hide H1 in ticket content view
- Show extracted title at top (existing behavior)
- Ensure cards use `ticket.title` attribute

**ToC Integration:**
- Include H1 in table of contents
- Link H1 to document top (`#`)
- Maintain existing section navigation

## Acceptance Criteria

### Server-Side Processing
- [ ] Extract H1 text → populate `title` attribute
- [ ] Strip additional H1 headers (remove entirely)
- [ ] Fallback to filename when no H1 exists
- [ ] Log console.error for missing H1
- [ ] Implement memory caching with proper invalidation

### MCP Integration
- [ ] Accept `title` parameter in create_cr
- [ ] Auto-generate H1 in content from title
- [ ] Maintain existing MCP tool functionality

### Frontend Behavior
- [ ] Hide H1 in content display
- [ ] Show extracted title at top of ticket view
- [ ] Include H1 in ToC linking to document start
- [ ] Preserve existing card title display

### Backward Compatibility
- [ ] Existing YAML titles overwritten by H1 extraction
- [ ] No migration required for existing tickets
- [ ] Section tools continue working with H1 structure
- [ ] Cache invalidation works with file watcher

### Validation Requirements
- [ ] Strict H1 detection: `^# ` pattern only
- [ ] Filename extraction: `DEB-031-testing-ticket.md` → `"testing-ticket"`
- [ ] Cache key format: `${project}:${filepath}`
- [ ] ToC H1 links to `#` (document top)
