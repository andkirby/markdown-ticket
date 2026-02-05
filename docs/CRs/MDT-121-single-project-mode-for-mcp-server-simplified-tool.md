---
code: MDT-121
status: Proposed
dateCreated: 2026-02-05T11:58:06.350Z
type: Research
priority: Medium
---

# Single-Project Mode for MCP Server - Simplified Tool Interface

## 1. Description
### Problem Statement
When working with the MCP server via Claude Code, users must specify the project key for every tool call, even when the MCP server is started from within a specific project directory:

**Current (verbose):**
```javascript
get_cr(key="SUML-005", project="SUML")
list_crs(project="SUML")
create_cr(project="SUML", type="Bug Fix", data={...})
```

**Desired (simple):**
```javascript
get_cr(key=5)        // Auto-resolves to SUML-005
list_crs()           // Uses detected project
create_cr(type="Bug Fix", data={...})
```

### Background Context
- Claude Code starts MCP servers as subprocesses with a specific working directory (`cwd`)
- The working directory often contains `.mdt-config.toml` which defines the project code
- Currently this context is ignored - every tool call requires explicit project specification
- This creates friction and redundancy in the developer experience

### Current State vs Desired State

| Aspect | Current | Desired |
|--------|---------|---------|
| Project parameter | Always required | Optional (auto-detected) |
| Key format | Must be full key (e.g., "SUML-005") | Numeric shorthand supported (e.g., 5) |
| Multi-project support | Yes | Yes (explicit project overrides default) |
| Single-project UX | Verbose | Streamlined |
## 2. Research Questions
### Primary Questions
1. **Transport Compatibility**: Does single-project mode work consistently across STDIO and HTTP transports?
2. **State Management**: Where should the "active project" state be stored - server instance level or per-request?
3. **Key Normalization**: What's the best UX for supporting both `key=5` and `key="SUML-005"` formats?
4. **Override Behavior**: How should explicit `project` parameter interact with auto-detected default?

### Secondary Questions
1. Should there be a `set_active_project` tool for runtime project switching?
2. How should errors be reported when no project context is available?
3. Should the server expose its current mode (single vs multi-project) via a tool or metadata?

### Research Method
- Code analysis of current MCP server startup and tool handling
- Prototype implementation testing both transports
- Review MCP protocol specification for session state patterns

### Data Sources
- `mcp-server/src/index.ts` - Server initialization
- `mcp-server/src/transports/stdio.ts` - STDIO transport implementation
- `mcp-server/src/tools/config/allTools.ts` - Tool schema definitions
- MCP SDK documentation for session handling patterns

### Success Metrics
- Clear recommendation for implementation approach
- Identified edge cases and their handling
- Prototype demonstrating key=5 → SUML-005 resolution
## 3. Validation Approach
### Research Completion
- [ ] Analyzed STDIO transport startup flow and `process.cwd()` availability
- [ ] Analyzed HTTP transport session handling capabilities  
- [ ] Prototyped project auto-detection from `.mdt-config.toml`
- [ ] Tested key normalization (numeric → full key)
- [ ] Documented backward compatibility guarantees

### Decision Outcomes
Research should produce clear recommendations on:
1. **Implementation approach**: Startup detection vs runtime tool vs hybrid
2. **Schema changes**: How to make `project` optional without breaking clients
3. **Key format handling**: Normalization strategy and edge cases

### Artifacts Produced
- [ ] Technical design document (can be added to this CR)
- [ ] Prototype branch demonstrating the approach
- [ ] Updated tool schema proposals
- [ ] Migration/compatibility notes
## 4. Acceptance Criteria
### Research Complete When
- [ ] Primary research questions answered with evidence
- [ ] Implementation approach selected with trade-off analysis
- [ ] Edge cases documented (no config file, multi-project override, invalid keys)
- [ ] Backward compatibility strategy defined
- [ ] Follow-up implementation CR(s) created if proceeding

### Minimum Viable Research
1. Confirm `process.cwd()` is reliable for detecting project context in STDIO transport
2. Define schema changes needed for optional `project` parameter
3. Define key normalization logic (`5` → `SUML-005`)

### Out of Scope
- Actual implementation (separate Feature Enhancement CR)
- HTTP transport session management (can be follow-up research)
- UI/frontend changes
## 5. Dependencies & Next Steps
### Prerequisites
- Understanding of MCP protocol session model
- Access to Claude Code for testing STDIO transport behavior

### Blocked By
None - this is foundational research

### Related Work
- Existing SessionStart hook (`mdt-project-vars.sh`) shows similar project detection pattern
- Current `validateProject()` in `projectHandlers.ts` is the integration point

### Next Steps After Research
1. If approved: Create Feature Enhancement CR for implementation
2. Update tool documentation to reflect optional parameters
3. Consider: Add `get_project_context` tool to expose current mode

### Implementation Sketch (Preliminary)

**1. Server initialization (`index.ts`):**
```typescript
private defaultProject?: string

private detectProjectContext(): void {
  const configPath = path.join(process.cwd(), '.mdt-config.toml')
  if (existsSync(configPath)) {
    const config = toml.parse(readFileSync(configPath, 'utf-8'))
    this.defaultProject = config.project?.code
    this.log(`📍 Single-project mode: ${this.defaultProject}`)
  }
}
```

**2. Tool schema (`allTools.ts`):**
```typescript
// Remove 'project' from required arrays
required: ['key'],  // was: ['project', 'key']
```

**3. Key normalization:**
```typescript
function normalizeKey(key: string, projectCode: string): string {
  // "5" or "005" → "SUML-005"
  if (/^\d+$/.test(key)) {
    return `${projectCode}-${key.padStart(3, '0')}`
  }
  return key // Already full format
}
```
## 6. References
### Files to Analyze
- `mcp-server/src/index.ts` - Server class and initialization
- `mcp-server/src/transports/stdio.ts` - STDIO transport
- `mcp-server/src/transports/http.ts` - HTTP transport  
- `mcp-server/src/tools/index.ts` - Tool routing and default handling
- `mcp-server/src/tools/config/allTools.ts` - Tool schemas
- `mcp-server/src/tools/handlers/projectHandlers.ts` - Project validation
- `shared/services/ProjectService.ts` - Project resolution logic

### External References
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- Claude Code MCP integration documentation

### Related CRs
- MDT-028: MCP Configuration Changes (prior MCP config work)
- MDT-070: Optimize MCP Tool Definitions (tool schema optimization)