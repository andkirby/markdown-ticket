---
code: MDT-052
title: Add section-based content updates for efficient CR editing
status: Implemented
dateCreated: 2025-10-01T23:06:26.696Z
type: Feature Enhancement
priority: High
phaseEpic: Phase B (Enhancement)
---

# Add section-based content updates for efficient CR editing

## 1. Description
### Problem

- LLMs waste 90-98% tokens updating CR documents due to full-document replacement
- Current MCP tools require sending entire document for single-section changes
- No efficient mechanism for incremental document building or targeted edits

### Current Implementation

**MCP tools:**
- `create_cr()` - Requires full content upfront
- `update_cr_attrs()` - Replaces entire document content
- No section-level operations available

**Example token waste:**
- Fix typo in "Problem Statement": 3750 tokens (read + modify + write)
- Add acceptance criteria item: 2500 tokens
- Update implementation notes: 2500 tokens

### Affected Artifacts

- `mcp-server/src/tools/index.ts` - MCP tool definitions
- `shared/services/MarkdownSectionService.ts` - Section parsing service
- `docs/CRs/MDT-052.md` - This ticket

### Scope

**Changes:**
- Add section-based MCP tools for targeted updates
- Implement markdown section parsing and manipulation
- Maintain backwards compatibility with existing tools

**Unchanged:**
- Existing MCP tools remain functional
- Frontend UI and workflows
- Document storage format
## 2. Solution Analysis
### Approaches Considered

| Approach | Description | Token Savings | Complexity | LLM-Friendly |
|----------|-------------|---------------|------------|--------------|
| **Section Replacement** | Replace entire sections by header name | 95% | Low | Yes |
| Line-Based Patching | Apply unified diff format patches | 97% | High | No (diff generation) |
| Section-Specific Tools | Separate tool per section type | 95% | Medium | Partial |

### Chosen Approach: Section Replacement

**Why:**
- Optimal token efficiency (no "read current content" overhead)
- Simple for LLMs (write new content, no diff generation)
- Low error rate (no diff parsing failures)
- Flexible (works with any section structure)
- CR sections are typically small (200-800 chars)

### Rejected Alternatives

**Line-Based Patching:**
- Requires reading current content first (defeats token savings)
- LLMs struggle to generate correct diff format
- Complex implementation with conflict resolution

**Section-Specific Tools:**
- Too rigid (can't add custom sections)
- Tool explosion (1 tool per section type)
- Template changes break the API
## 3. Implementation Specification
### Core Components

#### 1. MarkdownSectionService

**File:** `shared/services/MarkdownSectionService.ts`

**Key Methods:**
```typescript
findSection(content: string, sectionPath: string): SectionMatch[]
replaceSection(content: string, section: SectionMatch, newContent: string): string
appendToSection(content: string, section: SectionMatch, additionalContent: string): string
prependToSection(content: string, section: SectionMatch, additionalContent: string): string
```

**Features:**
- Parse markdown structure (identify sections by ##, ###, ####)
- Support simple names, hierarchical paths ("## Parent / ### Child")
- Duplicate section detection with helpful error messages
- Section boundary detection (ends at next header of same/higher level)

#### 2. MCP Tools

**Tool 1: `list_cr_sections`**
- Returns document structure as tree
- Enables section discovery

**Tool 2: `get_cr_section`**
- Read individual sections efficiently
- No full document load required

**Tool 3: `update_cr_section`**
- Operations: replace, append, prepend
- Supports section renaming via content headers
- Updates lastModified timestamp

### Integration Points

| From | To | Interface |
|------|----|-----------|
| MCP Tools | MarkdownSectionService | Method calls |
| MarkdownSectionService | File System | File I/O |
| update_cr_section | YAML Frontmatter | Timestamp updates |
## 4. Acceptance Criteria
### Functional Requirements

- [ ] MarkdownSectionService correctly identifies sections by simple name, header, or hierarchical path
- [ ] Section operations work: replace, append, prepend with proper boundary detection
- [ ] Duplicate section handling returns helpful error messages with hierarchical paths
- [ ] Flexible section matching accepts "Description" → finds "## 1. Description"
- [ ] Intelligent header renaming when content starts with header

### Error Handling

- [ ] Clear error messages for section not found (with suggestions)
- [ ] Hierarchical paths listed when multiple sections match
- [ ] Validation for invalid operations

### Performance

- [ ] Token savings >90% for single section updates
- [ ] Operations complete in <500ms for typical CR documents
- [ ] No degradation for documents with 20+ sections

### Testing

- [ ] Unit tests for MarkdownSectionService edge cases
- [ ] Integration tests for end-to-end workflows
- [ ] Comprehensive test coverage for all three MCP tools

### Documentation

- [ ] Update workflow examples in create_ticket.md
- [ ] Add hierarchical path syntax documentation
- [ ] Include token savings comparisons
## 5. Implementation Notes
### Status: IMPLEMENTED ✅

**Completion Date:** 2025-10-02

### Key Components Delivered

1. **MarkdownSectionService** (`shared/services/MarkdownSectionService.ts`)
   - Section parsing with hierarchical context
   - Support for simple names and hierarchical paths
   - Three operations: replace, append, prepend

2. **Three MCP Tools**
   - `list_cr_sections` - Document structure discovery
   - `get_cr_section` - Efficient section reading
   - `update_cr_section` - Section content updates

### Enhancements Added

- **Flexible Section Matching:** Accepts "Description" → finds "## 1. Description"
- **Intelligent Header Renaming:** Content with header → section restructuring
- **Duplicate Section Detection:** Helpful hierarchical path suggestions

### Test Validation

✅ **DEB-908** comprehensive testing passed:
- All operations verified (list, get, update)
- Data integrity maintained
- Token efficiency confirmed
## 6. References
**Related Documents:**
- **MCP Tools Reference**: `mcp-server/MCP_TOOLS.md` - Complete tool documentation with parameters and examples
- **MCP Request Samples**: `mcp-server/MCP_REQUEST_SAMPLES.md` - JSON-RPC request/response examples
- **MCP Server Guide**: `docs/MCP_SERVER_GUIDE.md` - User guide with integration setup and workflow examples
- **MCP Inspector**: https://modelcontextprotocol.io/docs/tools/inspector - Interactive tool for testing MCP tools and viewing payloads

**Related CRs:**
- **MDT-050**: Removed description/rationale fields, enabling cleaner section-based workflows

**Implementation:**
- **Core Service**: `shared/services/MarkdownSectionService.ts` - Section parsing and manipulation logic
- **MCP Tools**: `mcp-server/src/tools/index.ts` - MCP tool definitions and handlers