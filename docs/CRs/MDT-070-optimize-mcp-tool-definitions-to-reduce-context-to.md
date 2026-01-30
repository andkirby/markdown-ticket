---
code: MDT-070
title: Optimize MCP tool definitions to reduce context token usage by 40%
status: Implemented
dateCreated: 2025-10-15T00:31:47.054Z
type: Technical Debt
priority: Medium
implementationDate: 2025-10-18T11:59:30.179Z
implementationNotes: Status changed to Implemented on 10/18/2025
---

# Optimize MCP tool definitions to reduce context token usage by 40%

## 1. Description

The MCP server tools currently consume 14,000 tokens in Claude Code's context window. This represents 7% of the total context budget, limiting space for actual code analysis and task execution. Through consolidation and description optimization, we can reduce this to ~8,500 tokens (39% reduction) while maintaining full functionality.

## 2. Rationale

**Problem**: High MCP tool token usage impacts developer experience:
- 14k tokens consumed by 20 MCP tools (7% of 200k context)
- Verbose parameter descriptions with redundant examples
- 6 separate logging tools that are rarely used together
- Duplicate functionality across `get_cr_full_content` and `get_cr_attributes`
- 3 separate section management tools that share 80% of their schema

**Impact**: Every token used by tool definitions is unavailable for:
- Reading source code files
- Analyzing stack traces
- Processing conversation history
- Understanding complex architectural contexts

**Benefit**: 5,500 token savings = ~4-5 additional medium-sized source files in context per conversation.

## 3. Solution Analysis

### Option A: Consolidate Tools (Recommended)
**Pros**:
- Largest token savings (5.5k tokens)
- Cleaner API surface (13 tools vs 20)
- Maintains backward compatibility via parameter modes
- Groups related operations logically

**Cons**:
- Breaking change for existing tool consumers
- Requires updating all 8 documentation files
- Migration path needed for legacy tool names

### Option B: Description Optimization Only
**Pros**:
- Non-breaking change
- Quick implementation (~2-3k token savings)
- No consumer migration needed

**Cons**:
- Limited savings
- Doesn't address tool proliferation
- Still have 20 tools in context

### Option C: Lazy-Load Logging Tools
**Pros**:
- Removes 3-4k tokens from default context
- Logging tools available when explicitly needed

**Cons**:
- Requires MCP protocol changes
- May not be supported by all clients
- Complex implementation

**Decision**: Proceed with Option A (consolidation) + description optimization for maximum impact.

## 4. Implementation Specification

### 4.1 Tool Consolidation Map

**CR Content Access** (2 tools → 1):
```typescript
// Before
get_cr_full_content(project, key)
get_cr_attributes(project, key)

// After
get_cr(project, key, mode?: "full" | "attributes" | "metadata")
// Default: "full" for backward compatibility
```

**Section Management** (3 tools → 1):
```typescript
// Before
list_cr_sections(project, key)
get_cr_section(project, key, section)
update_cr_section(project, key, section, operation, content)

// After
manage_cr_sections(project, key, operation: "list" | "get" | "update", section?, updateMode?, content?)
```

**Logging** (6 tools → 2):
```typescript
// Before
get_logs(lines, filter)
get_frontend_logs(frontend_host, lines, filter)
get_frontend_session_status(frontend_host)
stream_url(filter)
stream_frontend_url(frontend_host, filter)
stop_frontend_logging(frontend_host)

// After
get_logs(target: "backend" | "frontend", lines?, filter?, frontend_host?)
manage_log_streams(target: "backend" | "frontend", action: "get_url" | "stop", frontend_host?)
```

**Template Access** (2 tools → 1):
```typescript
// Before
list_cr_templates()
get_cr_template(type)

// After
get_cr_template(type?: string)  // Omit type to list all
```

### 4.2 Description Optimization Guidelines

**Before**:
```typescript
"description": "Comma-separated list of CR keys this blocks (e.g., \"MDT-010,MDT-015\")"
```

**After**:
```typescript
"description": "Blocked CR keys (comma-separated)"
```

**Rules**:
1. Remove examples from descriptions (move to tool-level docs)
2. Remove redundant default value documentation
3. Use abbreviations: "Number" → "#", "description" → "desc"
4. Remove "optional" keyword (already indicated by schema)
5. Consolidate enum documentation

### 4.3 File Changes

**Core Implementation**:
- `mcp-server/src/index.ts` - Update tool definitions and handlers
- `mcp-server/src/tools/*.ts` - Refactor tool handlers to support consolidated operations

**Documentation Updates** (per mcp_update_docs.md):
1. `README.md` - Update MCP tools list
2. `CLAUDE.md` - Update available tools in project instructions
3. `mcp-server/MCP_TOOLS.md` - Update tool reference
4. `generated-docs/MCP_TOOLS_REFERENCE.md` - Regenerate comprehensive reference
5. `docs/MCP_SERVER_GUIDE.md` - Update summary and detailed descriptions
6. `docs/AI_MCP_instruction.md` - Update AI usage instructions
7. `generated-docs/MCP_INTEGRATION.md` - Update integration docs
8. `mcp-server/MCP_REQUEST_SAMPLES.md` - Update request samples

**Migration Support**:
- `mcp-server/MIGRATION.md` - New file documenting tool name changes
- Add deprecation warnings to old tool names (if maintaining backward compatibility)

### 4.4 Testing Requirements

**Unit Tests**:
- Test all consolidated tools with different operation modes
- Verify parameter validation for new combined signatures
- Test backward compatibility if maintaining old tool names

**Integration Tests**:
- Verify Claude Code can invoke all consolidated tools
- Test token counting to confirm savings
- Validate all 8 documentation files reference correct tool names

**E2E Tests**:
- Update Playwright tests that may hardcode tool names
- Test MCP server registration with new tool list

## 5. Acceptance Criteria

- [ ] MCP tool token usage reduced from 14k to ≤9k tokens (≥35% reduction)
- [ ] Tool count reduced from 20 to ≤13 tools
- [ ] All consolidated tools support their legacy operations via mode parameters
- [ ] All 8 documentation files updated with new tool signatures
- [ ] `MIGRATION.md` created documenting breaking changes
- [ ] All existing MCP integration tests pass with updated tool names
- [ ] Token usage measured and documented in PR description
- [ ] No functionality regression - all previous operations still possible

## 6. Implementation Notes

**Token Measurement**:
```bash
# Before optimization
node -e "console.log(JSON.stringify(require('./mcp-server/src/index.ts').tools).length)"

# After optimization
# Compare output to verify ≥5k character reduction (roughly proportional to tokens)
```

**Backward Compatibility Strategy**:
If maintaining compatibility:
1. Keep old tool names as aliases that internally call new consolidated tools
2. Add deprecation warnings in tool responses
3. Document sunset timeline (e.g., remove in v2.0.0)

**Phased Rollout**:
1. Phase 1: Implement description optimization only (non-breaking)
2. Phase 2: Add new consolidated tools alongside old ones
3. Phase 3: Deprecate old tools with warnings
4. Phase 4: Remove deprecated tools in major version bump

### Measurements from the Claude Code

#### Before
```
⛁ MCP tools: 14.0k tokens (7.0%)

     MCP tools · /mcp
     └ mcp__mdt-logging__get_logs (mdt-logging): 610 tokens
     └ mcp__mdt-logging__stream_url (mdt-logging): 576 tokens
     └ mcp__mdt-logging__stop_frontend_logging (mdt-logging): 595 tokens
     └ mcp__mdt-logging__get_frontend_session_status (mdt-logging): 597 tokens
     └ mcp__mdt-logging__get_frontend_logs (mdt-logging): 660 tokens
     └ mcp__mdt-logging__stream_frontend_url (mdt-logging): 621 tokens
     └ mcp__mdt-all__list_projects (mdt-all): 558 tokens
     └ mcp__mdt-all__get_project_info (mdt-all): 588 tokens
     └ mcp__mdt-all__list_crs (mdt-all): 849 tokens
     └ mcp__mdt-all__get_cr_full_content (mdt-all): 612 tokens
     └ mcp__mdt-all__get_cr_attributes (mdt-all): 621 tokens
     └ mcp__mdt-all__create_cr (mdt-all): 978 tokens
     └ mcp__mdt-all__update_cr_status (mdt-all): 646 tokens
     └ mcp__mdt-all__update_cr_attrs (mdt-all): 801 tokens
     └ mcp__mdt-all__delete_cr (mdt-all): 597 tokens
     └ mcp__mdt-all__list_cr_sections (mdt-all): 651 tokens
     └ mcp__mdt-all__get_cr_section (mdt-all): 755 tokens
     └ mcp__mdt-all__update_cr_section (mdt-all): 883 tokens
     └ mcp__mdt-all__list_cr_templates (mdt-all): 558 tokens
     └ mcp__mdt-all__get_cr_template (mdt-all): 604 tokens
     └ mcp__mdt-all__suggest_cr_improvements (mdt-all): 668 tokens
```

#### After

```
⛁ MCP tools: 10.8k tokens (5.4%)

     MCP tools · /mcp
     └ mcp__mdt-all__list_projects (mdt-all): 554 tokens
     └ mcp__mdt-all__get_project_info (mdt-all): 585 tokens
     └ mcp__mdt-all__list_crs (mdt-all): 831 tokens
     └ mcp__mdt-all__create_cr (mdt-all): 1.1k tokens
     └ mcp__mdt-all__update_cr_status (mdt-all): 640 tokens
     └ mcp__mdt-all__update_cr_attrs (mdt-all): 764 tokens
     └ mcp__mdt-all__delete_cr (mdt-all): 594 tokens
     └ mcp__mdt-all__get_cr (mdt-all): 673 tokens
     └ mcp__mdt-all__manage_cr_sections (mdt-all): 767 tokens
     └ mcp__mdt-all__suggest_cr_improvements (mdt-all): 626 tokens
     └ mcp__mdt-logging__get_logs (mdt-logging): 610 tokens
     └ mcp__mdt-logging__get_frontend_logs (mdt-logging): 660 tokens
     └ mcp__mdt-logging__stream_url (mdt-logging): 576 tokens
     └ mcp__mdt-logging__stop_frontend_logging (mdt-logging): 595 tokens
     └ mcp__mdt-logging__get_frontend_session_status (mdt-logging): 597 tokens
     └ mcp__mdt-logging__stream_frontend_url (mdt-logging): 621 tokens
```
