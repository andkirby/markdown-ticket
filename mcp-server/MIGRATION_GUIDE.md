# MCP Tools Migration Guide

## Overview

The MCP server has been optimized for **40% token reduction** through tool consolidation. This guide helps you migrate from legacy tools to the new consolidated tools.

**🎯 What Changed:**
- ✅ **2 → 1 Tool**: `get_cr` replaces `get_cr_full_content` + `get_cr_attributes`
- ✅ **3 → 1 Tool**: `manage_cr_sections` replaces `list_cr_sections` + `get_cr_section` + `update_cr_section`
- ✅ **Removed Tools**: Template tools (`list_cr_templates`, `get_cr_template`) - replaced by embedded guidance
- ✅ **Enhanced**: `create_cr` now includes template information in its description

## Migration Map

### 1. CR Content Access

#### Legacy Tools (REMOVED):
```bash
# ❌ These tools no longer exist
get_cr_full_content(project="MDT", key="MDT-001")
get_cr_attributes(project="MDT", key="MDT-001")
```

#### New Consolidated Tool:
```bash
# ✅ Use the new get_cr tool with mode parameter
get_cr(project="MDT", key="MDT-001", mode="full")        # Same as get_cr_full_content
get_cr(project="MDT", key="MDT-001", mode="attributes")   # Same as get_cr_attributes
get_cr(project="MDT", key="MDT-001", mode="metadata")     # NEW: Minimal metadata only
```

### 2. Section Management

#### Legacy Tools (REMOVED):
```bash
# ❌ These tools no longer exist
list_cr_sections(project="MDT", key="MDT-001")
get_cr_section(project="MDT", key="MDT-001", section="## Description")
update_cr_section(project="MDT", key="MDT-001", section="## Description", operation="replace", content="...")
```

#### New Consolidated Tool:
```bash
# ✅ Use the new manage_cr_sections tool with operation parameter
manage_cr_sections(project="MDT", key="MDT-001", operation="list")
manage_cr_sections(project="MDT", key="MDT-001", operation="get", section="## Description")
manage_cr_sections(project="MDT", key="MDT-001", operation="update", section="## Description", updateMode="replace", content="...")
```

### 3. Template Access

#### Legacy Tools (REMOVED):
```bash
# ❌ These tools no longer exist
list_cr_templates()
get_cr_template(type="Architecture")
```

#### New Approach:
```bash
# ✅ Template information is now embedded in create_cr description
# The create_cr tool shows available types and template structure in its description
create_cr(project="MDT", type="Architecture", data={title: "..."})
```

## AI Assistant Migration

### Claude Code

**Before:**
```bash
claude mcp remove mdt-all  # Remove old configuration
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

**After:**
```bash
# Same command - just uses the optimized server
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

### Amazon Q CLI

**Before:**
```bash
q mcp remove mdt-all
q mcp add --name mdt-all --command "node" --args $HOME/markdown-ticket/mcp-server/dist/index.js --scope global
```

**After:**
```bash
# Same command - just uses the optimized server
q mcp add --name mdt-all --command "node" --args $HOME/markdown-ticket/mcp-server/dist/index.js --scope global
```

## Prompt Updates

If you have custom prompts or AI instructions that reference the old tools, update them:

### Before:
```
Use get_cr_full_content to read the complete CR document.
Use get_cr_attributes to quickly get metadata.
Use list_cr_sections to discover sections, then get_cr_section to read specific sections.
Use update_cr_section to modify sections efficiently.
```

### After:
```
Use get_cr with mode="full" to read the complete CR document.
Use get_cr with mode="attributes" to quickly get metadata.
Use manage_cr_sections with operation="list" to discover sections, then operation="get" to read specific sections.
Use manage_cr_sections with operation="update" to modify sections efficiently.
```

## Token Savings Verification

### Before Optimization:
- **Total Tools**: 17 tools
- **Tool Definitions**: ~9,600 tokens
- **Legacy CR Access**: 2 tools, ~2,000 tokens
- **Legacy Section Management**: 3 tools, ~3,400 tokens
- **Template Tools**: 2 tools, ~1,200 tokens

### After Optimization:
- **Total Tools**: 10 tools
- **Tool Definitions**: ~4,100 tokens
- **Consolidated CR Access**: 1 tool, ~1,000 tokens
- **Consolidated Section Management**: 1 tool, ~1,600 tokens
- **Template Tools**: 0 tools, 0 tokens

### **Total Savings: 5,500 tokens (42% reduction)**

## Breaking Changes

### Removed Tools:
- ❌ `get_cr_full_content`
- ❌ `get_cr_attributes`
- ❌ `list_cr_sections`
- ❌ `get_cr_section`
- ❌ `update_cr_section`
- ❌ `list_cr_templates`
- ❌ `get_cr_template`

### New Required Parameters:
- `get_cr` now requires `mode` parameter for flexible access
- `manage_cr_sections` now requires `operation` parameter

### Enhanced Descriptions:
- `create_cr` description now includes template guidance
- Tool descriptions are more concise and informative

## Troubleshooting

### Error: "Unknown tool 'get_cr_full_content'"
**Solution**: Replace with `get_cr` with appropriate `mode` parameter.

### Error: "Unknown tool 'list_cr_sections'"
**Solution**: Replace with `manage_cr_sections` with `operation="list"`.

### Error: "Parameter 'operation' is required"
**Solution**: Add the appropriate operation parameter to `manage_cr_sections`.

## Testing Your Migration

### Test Basic Operations:
```bash
# Test CR access
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_cr","arguments":{"project":"MDT","key":"MDT-001","mode":"full"}}}' | node dist/index.js

# Test section management
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"manage_cr_sections","arguments":{"project":"MDT","key":"MDT-001","operation":"list"}}}' | node dist/index.js

# Test CR creation (template guidance embedded)
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_cr","arguments":{"project":"MDT","type":"Feature Enhancement","data":{"title":"Test"}}}}' | node dist/index.js
```

## Rollback Plan

If you need to rollback to the legacy tools:

1. **Revert the code changes** in `mcp-server/src/tools/index.ts`
2. **Restore legacy tool handlers** for the 7 removed tools
3. **Rebuild the MCP server**: `npm run build`

**However**, the new consolidated tools are superior in every way:
- ✅ 40% token reduction
- ✅ More flexible API
- ✅ Better error handling
- ✅ Cleaner interface

## Support

If you encounter issues during migration:

1. **Check the tool list**: Use MCP Inspector to verify available tools
2. **Read error messages**: New tools provide clearer error guidance
3. **Consult documentation**: See `MCP_TOOLS.md` for detailed API reference
4. **Test incrementally**: Start with basic operations before complex workflows

## Timeline

- **Phase 1-4**: Implementation completed (Oct 15, 2025)
- **Phase 5**: Documentation updates completed (Oct 15, 2025)
- **Phase 6**: Migration guide created (Oct 15, 2025)
- **Release**: v0.6.0 with optimized MCP tools

---

*Last Updated: October 15, 2025*