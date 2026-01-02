---
code: MDT-114
status: Proposed
dateCreated: 2026-01-02T12:53:55.868Z
type: Bug Fix
priority: High
---

# Fix manage_cr_sections tool section path resolution and ambiguous subsection handling

## 1. Description
### Problem

- Section path syntax is unreliable - hierarchical path format (`# H1 / ## H2 / ### H3`) shown in error messages may not work in actual MCP calls
- `list` operation output may not show all subsections, making it difficult to discover correct section paths for `get`/`replace`/`append`/`prepend` operations
- Duplicate subsection names (e.g., `### Functional` appearing in multiple sections) cause "Multiple sections match" errors with unclear resolution paths
- Error messages suggest hierarchical paths that fail when actually used, creating poor user experience

### Affected Artifacts

- `mcp-server/src/tools/manage-cr-sections.ts` - Section path resolution logic
- `mcp-server/src/tools/manage-cr-sections.ts` - Section listing and parsing logic
- `mcp-server/src/tools/index.ts` - MCP tool registration for `manage_cr_sections`

### Scope

- **Changes**: Fix section path parsing to support hierarchical paths; improve `list` to show all subsections; enhance error messages; clarify documentation
- **Unchanged**: Existing operation behaviors (`list`, `get`, `replace`, `append`, `prepend`); YAML frontmatter handling

### Prep Architecture

> **Prep Required**: Complexity refactoring needed before feature implementation
> 
> Detailed preparatory refactoring design: [prep/architecture.md](./MDT-114/prep/architecture.md)
> 
> **Summary**: Extract `SectionHandlers` (410 lines, CC: 40, MI: 19.97%) into strategy pattern + utilities to reduce complexity and enable hierarchical path parsing. Refactoring preserves all 23 behavioral tests and reduces CC by 50%.
## 2. Decision

### Chosen Approach

Implement robust hierarchical path parsing and improve error messages to guide users to working solutions.

### Rationale

- Current implementation suggests hierarchical paths in errors but fails to parse them correctly
- Users must resort to workarounds (targeting parent sections) that are not documented
- Incomplete `list` output prevents users from discovering the correct section structure
- Better error handling will reduce debugging time and improve adoption

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Implement hierarchical path parsing + improve errors | **ACCEPTED** - Fixes root cause and improves UX |
| Document workarounds only | Add docs showing parent-targeting workaround | Doesn't fix the broken path parsing; users still encounter errors |
| Remove hierarchical paths | Remove feature, require unique section names | Breaking change; limits CR structure flexibility |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `mcp-server/src/utils/section-path-parser.ts` | Utility | Parse and validate hierarchical section paths |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/tools/manage-cr-sections.ts` | Logic updated | Add hierarchical path parsing support |
| `mcp-server/src/tools/manage-cr-sections.ts` | Output enhanced | Show all subsections in `list` operation |
| `mcp-server/src/tools/manage-cr-sections.ts` | Errors improved | Provide working solutions in error messages |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| MCP tool calls | `manage_cr_sections` | Section path string |
| `manage_cr_sections` | `section-path-parser.ts` | Parse result with resolved path |

### Key Patterns

- Path normalization: Convert user input to canonical section path
- Fallback resolution: Try hierarchical path, then parent section
- Error suggestion: Show working alternatives when path resolution fails

## 5. Acceptance Criteria

### Functional

- [ ] Hierarchical paths like `# CR Title / ## 4. Acceptance Criteria / ### Functional` resolve correctly in all operations
- [ ] `list` operation shows all subsections in the output with full hierarchy
- [ ] Error messages for duplicate sections provide working resolution examples
- [ ] Section path parser handles edge cases (extra spaces, missing spaces, case sensitivity)

### Non-Functional

- [ ] Section path resolution completes in < 50ms for typical CR documents
- [ ] Error messages are clear and actionable (no "Section not found" without suggestions)
- [ ] Backward compatibility maintained - existing simple section paths still work

### Testing

- Unit: `section-path-parser.ts` - valid paths, invalid paths, edge cases
- Unit: `manage_cr_sections.ts` - `list` shows all subsections
- Integration: MCP tool calls with hierarchical paths resolve correctly
- Integration: Error messages provide working suggestions for ambiguous sections
- Manual: Test with CRs containing duplicate subsection names

## 6. Verification

### By CR Type

- **Bug Fix**: Hierarchical paths resolve correctly; `list` shows all subsections; error messages guide to working solutions

## 7. Deployment

- Build MCP server: `cd mcp-server && npm run build`
- Restart MCP server to load updated `manage_cr_sections` tool
- Test with existing CRs containing duplicate subsections

> **Defect Report**: [mdt-manage-cr-sections-guide.md](./MDT-114/mdt-manage-cr-sections-guide.md)