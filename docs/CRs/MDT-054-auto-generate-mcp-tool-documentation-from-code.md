---
code: MDT-054
title: Auto-generate MCP tool documentation from code
status: Proposed
dateCreated: 2025-10-02T09:19:21.905Z
type: Feature Enhancement
priority: Medium
phaseEpic: Phase C (Developer Experience)
---


# Auto-generate MCP tool documentation from code

# Auto-generate MCP tool documentation from code

## 1. Description

### Problem Statement
MCP tool documentation (MCP_TOOLS.md) is currently maintained manually, which creates several issues:
- Documentation can drift out of sync with actual tool implementations
- Adding new tools requires updating documentation in multiple places
- Parameter changes in code don't automatically reflect in docs
- Risk of documentation errors or omissions
- Manual maintenance overhead for every tool addition or modification

### Current State
- Tool definitions exist in `mcp-server/src/tools/index.ts` with `inputSchema` containing all parameter metadata
- Documentation in `MCP_TOOLS.md` duplicates this information manually
- No automated process to keep docs in sync with code
- Recent simplification removed response payloads, but manual maintenance still required

### Desired State
- Single source of truth: tool definitions in TypeScript code
- Auto-generated documentation from `inputSchema` and tool metadata
- Documentation regenerates automatically before builds
- Custom sections (Architecture, Configuration) preserved via template
- Manual edits for special notes (like token efficiency) supported via annotations

## 2. Solution Analysis

### Approaches Considered

**Option 1: JSDoc/TSDoc Extraction**
- Pros: Familiar pattern, IDE support, good for detailed descriptions
- Cons: Requires maintaining parallel JSDoc comments, duplicates schema info
- Decision: Not chosen - adds maintenance burden

**Option 2: MCP Runtime Introspection**
- Pros: Guaranteed to match runtime behavior
- Cons: Requires server to be running, complex setup, harder to customize
- Decision: Not chosen - too complex for build-time generation

**Option 3: Schema Extraction (Chosen)**
- Pros: Uses existing `inputSchema` as source of truth, simple script, runs at build time
- Cons: Custom sections need template management
- Decision: **Selected** - minimal overhead, leverages existing metadata

**Option 4: AWS Labs MCP Documentation Generator**
- Pros: Official tooling, standardized approach
- Cons: External dependency, may not support custom formatting needs
- Decision: Worth evaluating but implement basic version first

### Technical Requirements

1. **Script**: `scripts/generate-mcp-docs.ts`
   - Import tools from `mcp-server/src/tools/index.ts`
   - Extract tool definitions via `getTools()`
   - Parse `inputSchema` for parameters
   - Generate markdown from template + extracted data

2. **Template Structure**:
   - Header with MCP Inspector link
   - Architecture section (static)
   - Tool sections organized by category
   - Configuration section (static)

3. **Build Integration**:
   - Add to `package.json` scripts: `docs:generate`
   - Hook into `prebuild` to auto-run before compilation
   - Validate docs are up-to-date in CI/CD

## 3. Implementation Specification

### File Structure
```
scripts/
  generate-mcp-docs.ts          # Main generator script
mcp-server/
  MCP_TOOLS.md                  # Generated output (auto-updated)
  MCP_TOOLS.template.md         # Optional: custom sections template
package.json                    # Add docs:generate script
```

### Script Implementation

```typescript
// scripts/generate-mcp-docs.ts
import { getTools } from '../mcp-server/src/tools/index.js';
import fs from 'fs/promises';

const HEADER = `# MCP Tools Documentation

Complete reference for all available MCP tools with input parameters and descriptions.

**Note:** For interactive testing and viewing request/response payloads, use the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector).

## Architecture

The MCP server uses the **shared core architecture** with unified types, services, and templates:
- **Types**: \`shared/models/Types.ts\` - CR, CRStatus, CRType, CRPriority, etc.
- **Services**: \`shared/services/\` - ProjectService, MarkdownService, TemplateService, CRService
- **Templates**: \`shared/templates/\` - File-based templates for all CR types
- **Configuration**: \`shared/models/Config.ts\` - Unified configuration interfaces

`;

const SECTIONS = {
  'Core Tools': ['list_projects', 'get_project_info', 'list_crs', 'get_cr'],
  'CR Management Tools': ['create_cr', 'update_cr_attrs', 'update_cr_status', 'delete_cr'],
  'Section-Based Content Tools': ['list_cr_sections', 'get_cr_section', 'update_cr_section'],
  'Template Tools': ['list_cr_templates', 'get_cr_template'],
  'Analysis Tools': ['suggest_cr_improvements']
};

const CUSTOM_NOTES = {
  'Section-Based Content Tools': '**Token Efficiency**: 84-94% savings compared to full document operations\n\n'
};

function generateToolDoc(tool: any): string {
  const params = tool.inputSchema.properties || {};
  const required = tool.inputSchema.required || [];
  
  let doc = `### \`${tool.name}\`\n`;
  doc += `**Description**: ${tool.description}\n\n`;
  
  if (Object.keys(params).length > 0) {
    doc += `**Parameters**:\n`;
    for (const [name, schema] of Object.entries(params)) {
      const req = required.includes(name) ? 'required' : 'optional';
      const typeInfo = schema.type || 'string';
      doc += `- \`${name}\` (${typeInfo}, ${req}): ${schema.description}\n`;
      
      // Handle nested properties (like filters object)
      if (schema.properties) {
        for (const [subName, subSchema] of Object.entries(schema.properties)) {
          doc += `  - \`${subName}\`: ${subSchema.description}\n`;
        }
      }
      
      // Handle enum values
      if (schema.enum) {
        doc += `    - Valid values: ${schema.enum.map(v => `"${v}"`).join(', ')}\n`;
      }
    }
  } else {
    doc += `**Parameters**: None\n`;
  }
  
  return doc + '\n';
}

async function generateDocs() {
  const tools = getTools();
  const toolMap = new Map(tools.map(t => [t.name, t]));
  
  let markdown = HEADER;
  
  for (const [section, toolNames] of Object.entries(SECTIONS)) {
    markdown += `## ${section}\n\n`;
    
    // Add custom notes if defined
    if (CUSTOM_NOTES[section]) {
      markdown += CUSTOM_NOTES[section];
    }
    
    for (const toolName of toolNames) {
      const tool = toolMap.get(toolName);
      if (tool) {
        markdown += generateToolDoc(tool);
      } else {
        console.warn(`⚠️  Tool '${toolName}' not found in getTools()`);
      }
    }
  }
  
  // Footer with configuration info
  markdown += `## Configuration\n\n`;
  markdown += `The MCP server uses shared configuration from:\n`;
  markdown += `- **Global Config**: \`~/.config/markdown-ticket/mcp-server.toml\`\n`;
  markdown += `- **Templates**: \`shared/templates/\` directory\n`;
  markdown += `- **Shared Services**: Unified project discovery, markdown parsing, and template management\n`;
  
  await fs.writeFile('mcp-server/MCP_TOOLS.md', markdown);
  console.log('✅ Generated MCP_TOOLS.md from tool definitions');
  console.log(`📊 Generated documentation for ${tools.length} tools`);
}

generateDocs().catch(err => {
  console.error('❌ Failed to generate documentation:', err);
  process.exit(1);
});
```

### Package.json Updates

```json
{
  "scripts": {
    "docs:generate": "node --loader ts-node/esm scripts/generate-mcp-docs.ts",
    "docs:check": "npm run docs:generate && git diff --exit-code mcp-server/MCP_TOOLS.md",
    "prebuild": "npm run docs:generate",
    "build": "tsc"
  }
}
```

### CI/CD Validation

```yaml
# .github/workflows/validate-docs.yml
name: Validate Documentation
on: [pull_request]
jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run docs:check
      - name: Fail if docs outdated
        if: failure()
        run: echo "::error::MCP_TOOLS.md is outdated. Run 'npm run docs:generate' and commit changes."
```

## 4. Acceptance Criteria

- [ ] Script `scripts/generate-mcp-docs.ts` successfully generates MCP_TOOLS.md from tool definitions
- [ ] Generated documentation matches current manual format (parameters, descriptions, sections)
- [ ] `npm run docs:generate` regenerates documentation without errors
- [ ] `prebuild` hook automatically updates docs before TypeScript compilation
- [ ] Custom sections (Architecture, Token Efficiency notes) are preserved
- [ ] CI/CD pipeline validates documentation is up-to-date on pull requests
- [ ] Adding a new tool only requires updating `getTools()` - docs auto-generate
- [ ] Parameter changes in `inputSchema` automatically reflect in generated docs
- [ ] README or contributor docs explain the auto-generation workflow

## 5. Implementation Plan

### Phase 1: Core Script
1. Create `scripts/generate-mcp-docs.ts`
2. Implement tool extraction from `getTools()`
3. Implement markdown generation with parameter parsing
4. Test output matches current MCP_TOOLS.md format

### Phase 2: Build Integration
1. Add `docs:generate` script to package.json
2. Add `docs:check` script for validation
3. Hook `docs:generate` into `prebuild`
4. Test full build workflow

### Phase 3: CI/CD
1. Create GitHub Actions workflow for doc validation
2. Test with intentionally outdated docs
3. Document workflow in CONTRIBUTING.md

### Phase 4: Enhancements (Optional)
1. Support custom annotations in code (e.g., `@tokenEfficiency 94%`)
2. Generate MCP_REQUEST_SAMPLES.md examples from test fixtures
3. Evaluate AWS Labs MCP documentation generator integration

## 6. Testing Strategy

### Manual Testing
1. Run `npm run docs:generate` and verify output
2. Compare generated MCP_TOOLS.md with current version (diff should be minimal/identical)
3. Modify a tool's `inputSchema` and verify docs update
4. Add a new tool and verify it appears in docs

### Automated Testing
1. CI workflow validates docs are current on every PR
2. Build process fails if docs are outdated
3. Unit tests for markdown generation functions

## 7. Migration Plan

1. **Backup current docs**: Copy MCP_TOOLS.md to MCP_TOOLS.md.backup
2. **Generate initial version**: Run script and compare output
3. **Adjust script**: Fine-tune formatting to match current style
4. **Commit generated version**: Replace manual docs with generated
5. **Update workflow**: Add prebuild hook and CI validation
6. **Document process**: Update README with new workflow

## 8. Benefits

**Developer Experience:**
- No manual doc updates needed when adding/modifying tools
- Single source of truth reduces errors
- Faster development cycle

**Documentation Quality:**
- Always in sync with code
- Consistent formatting
- No missing parameters or outdated descriptions

**Maintenance:**
- Reduced maintenance burden
- CI catches documentation drift
- Easy to regenerate entire doc set

## 9. Future Enhancements

1. **Generate MCP_REQUEST_SAMPLES.md**: Extract examples from test fixtures
2. **Custom Annotations**: Support `@example`, `@tokenEfficiency` JSDoc tags
3. **Multi-format Output**: Generate HTML, JSON schema, OpenAPI spec
4. **AWS Labs Integration**: Evaluate official MCP documentation generator
5. **Interactive Docs**: Generate searchable web documentation

## 10. References

- **MCP Inspector**: https://modelcontextprotocol.io/docs/tools/inspector
- **Current MCP_TOOLS.md**: `mcp-server/MCP_TOOLS.md`
- **Tool Definitions**: `mcp-server/src/tools/index.ts`
- **Related CR**: MDT-052 (section-based content updates with auto-generated docs discussion)