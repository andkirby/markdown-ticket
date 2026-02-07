---
code: MDT-121
status: Implemented
dateCreated: 2026-02-05T22:42:31.277Z
type: Feature Enhancement
priority: Medium
implementationDate: 2026-02-06
implementationNotes: |
  - Implemented project auto-detection via parent directory search with configurable depth
  - Created keyNormalizer.ts for numeric key shorthand support (5 → MDT-5)
  - Made project parameter optional in all tool schemas
  - Added resolveProject() method with explicit → detected → error chain
  - Integrated with ConfigService for mdtConfigSearchDepth from global config
  - Added comprehensive unit tests for keyNormalizer, projectDetector, and projectHandlers
  - Added 4 E2E test suites for single-project mode, optional param, numeric shorthand, and backward compatibility
  - Fixed scope breach: separated file parsing from file search
  - Fixed undefined variable bug in error messages (10 locations)
---

# Implement single-project mode for MCP server

## 1. Description

### Requirements Scope
`full`

### Problem

- **Verbose tool calls**: Every MCP tool requires explicit `project` parameter even when server started from project directory (`mcp-server/src/tools/handlers/projectHandlers.ts:51-75`)
- **Missing shorthand support**: Cannot use numeric keys like `5` instead of full `MDT-005` format
- **Redundant context**: Claude Code starts MCP server as subprocess with known working directory, but this context is ignored

### Affected Artifacts

- `mcp-server/src/index.ts` - Server initialization, needs `detectDefaultProject()` method
- `mcp-server/src/tools/index.ts` - Tool routing, needs default project context
- `mcp-server/src/tools/handlers/projectHandlers.ts` - Project validation, needs `resolveProject()` method
- `mcp-server/src/tools/config/allTools.ts` - Tool schemas, remove `project` from required arrays
- `mcp-server/src/tools/handlers/crHandlers.ts` - CR handlers, use `resolveProject()` and key normalization

### Scope

**Changes:**
- Add project detection at server startup from `.mdt-config.toml`
- Create `keyNormalizer.ts` and `projectDetector.ts` utilities
- Make `project` parameter optional in tool schemas
- Add `resolveProject()` method with explicit → default → error chain
- Support numeric key shorthand (e.g., `5` → `MDT-005`)

**Unchanged:**
- Multi-project mode behavior when no config detected
- Explicit `project` parameter always overrides default
- HTTP transport session handling
- Existing tool functionality

## 2. Decision

### Chosen Approach

Detect project at startup via parent directory search, resolve at runtime with fallback chain.

### Rationale

- **Startup detection matches process lifecycle**: MCP server is short-lived subprocess in Claude Code, static config appropriate
- **Explicit overrides default**: Backward compatible, existing code with explicit `project` unchanged
- **Parent directory search**: Works when server started from subdirectories (e.g., `mcp-server/src/`)
- **No schema changes needed**: Static schemas with runtime resolution simpler than dynamic generation

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Startup detection + runtime resolution | **ACCEPTED** - Simple, backward compatible, validated by PoC |
| Runtime `set_active_project` tool | Add tool for project switching | Adds complexity for no benefit — server restart is cheap |
| Dynamic schema generation | Generate schemas based on detected mode | Complex implementation, unclear UX benefit |
| Environment variable detection | Use env var for default project | Less discoverable than config file |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `mcp-server/src/tools/utils/projectDetector.ts` | Utility | Parent directory search for `.mdt-config.toml` |
| `mcp-server/src/tools/utils/keyNormalizer.ts` | Utility | Key format validation and normalization |
| `mcp-server/src/types/server.ts` | Type | Server state interface with `defaultProject?` |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/index.ts` | Method added | `detectDefaultProject(): string | null` |
| `mcp-server/src/config/index.ts` | Config option added | `discovery.mdtConfigSearchDepth` (default: 3) |
| `mcp-server/src/tools/index.ts` | Constructor parameter added | `defaultProject?: string` passed to handlers |
| `mcp-server/src/tools/config/allTools.ts` | Required array modified | Remove `project` from required arrays |
| `mcp-server/src/tools/handlers/projectHandlers.ts` | Method added | `resolveProject(argsProject?: string): Project` |
| `mcp-server/src/tools/handlers/crHandlers.ts` | Method calls updated | Use `resolveProject()` instead of `validateProject()` |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| `MCPCRServer` | `projectDetector` | `detectDefaultProject(cwd, searchDepth) -> string | null` |
| `MCPCRServer` | `MCPTools` | Constructor parameter `defaultProject?` |
| `ProjectHandlers` | `keyNormalizer` | `normalizeKey(key, defaultProject?) -> string` |
| `ProjectHandlers` | `ProjectService` | `validateProject(projectKey) -> Project` |

### Key Patterns

- **Default Parameter with Fallback Chain**: Explicit `project` → detected default → error
- **Parent Directory Search**: Walk up directory tree to find `.mdt-config.toml` (configurable depth)
- **Uppercase Normalization**: Key project codes always uppercase (`abc-12` → `ABC-12`)
- **Strip Leading Zeros**: Numeric keys strip zeros before adding project prefix (`005` → `MDT-5`)

## 5. Acceptance Criteria

### Functional

- [x] `mcp-server/src/tools/utils/projectDetector.ts` exports `find()` (project detection function)
- [x] `mcp-server/src/tools/utils/keyNormalizer.ts` exports `normalizeKey()`
- [x] `MCPCRServer` calls `startupProjectDetection()` at startup and logs mode
- [x] `MCPTools` constructor accepts `defaultProject?` parameter
- [x] `ProjectHandlers.resolveProject()` implements explicit → default → error chain
- [x] Tool schemas in `allTools.ts` have `project` removed from required arrays
- [x] `get_cr(key=5)` resolves to `MDT-005` when server started from MDT project directory
- [x] `get_cr(key="SUML-123", project="SUML")` works from any directory
- [x] Error message shown when no project context and numeric key used

### Non-Functional

- [x] All existing tests pass with explicit `project` parameter (backward compatibility)
- [x] Parent directory search respects `mdtConfigSearchDepth` config option
- [x] Server startup time impact < 50ms for project detection
- [x] Tool schema remains static (no dynamic generation)

### Testing

- [x] Unit: Test `projectDetector.ts` with various directory structures and search depths
- [x] Unit: Test `keyNormalizer.ts` with all input formats (numeric, full, lowercase, invalid)
- [x] Integration: Test `ProjectHandlers.resolveProject()` with explicit, default, and missing project
- [x] Integration: Test tool calls with and without `project` parameter
- [x] E2E: Start server from project directory, call `get_cr(key=5)`, verify `MDT-005` returned
- [x] E2E: Start server from `/tmp`, verify `project` parameter required

## 6. Verification

### By CR Type

**Feature**: Artifact X exists and test Y passes

- `mcp-server/src/tools/utils/projectDetector.ts` exists and exports `detectDefaultProject()`
- `mcp-server/src/tools/utils/keyNormalizer.ts` exists and exports `normalizeKey()`
- Server logs `📍 Single-project mode: MDT` or `Multi-project mode` on startup
- E2E test: `get_cr(key=5)` returns `MDT-005` when started from MDT directory
- E2E test: `get_cr(key=5, project="SUML")` returns `SUML-005` from any directory
- All existing MCP server tests pass

### Metrics

None applicable — no performance targets specified in research.

## 7. Deployment

### Configuration Changes

Add optional configuration to `~/.config/mcp-server/config.toml`:

```toml
[discovery]
# Maximum parent directories to search for .mdt-config.toml
# Set to 0 to only check current directory (no parent search)
mdtConfigSearchDepth = 3
```

### Build and Deploy

```bash
# Build shared code
cd shared && npm run build

# Build MCP server
cd mcp-server && npm run build

# Restart Claude Code MCP server connection
```

### Rollback

Revert commits for:
- `mcp-server/src/index.ts` (detectDefaultProject call)
- `mcp-server/src/tools/index.ts` (defaultProject parameter)
- `mcp-server/src/tools/handlers/projectHandlers.ts` (resolveProject method)
- Delete `mcp-server/src/tools/utils/projectDetector.ts`
- Delete `mcp-server/src/tools/utils/keyNormalizer.ts`
- Restore `mcp-server/src/tools/config/allTools.ts` (add `project` back to required arrays)

## 8. References

- **Research CR**: [MDT-121](./MDT-121-single-project-mode-for-mcp-server-simplified-tool.md)
- **Architecture**: [MDT-121/architecture.md](./MDT-121/architecture.md)
- **PoC**: `docs/CRs/MDT-121/poc/project-auto-detection/` and `docs/CRs/MDT-121/poc/key-normalization/`
- **HTTP Research**: [MDT-121/http-transport-project-context-research.md](./MDT-121/http-transport-project-context-research.md)
- **Related**: MDT-070 (MCP Tool Optimization)

## 9. Smoke Testing

### Quick Verification Command

After building the MCP server, you can verify single-project mode from a project directory:

```bash
# Build the MCP server
cd mcp-server && npm run build

# From the project directory (contains .mdt-config.toml)
cd /Users/kirby/home/markdown-ticket-MDT-121

# Test single-project mode: call get_cr with numeric key only (no project parameter)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_cr","arguments":{"key":"121"}}}' | \
node mcp-server/dist/index.js
```

**Expected Result**: The server should detect the MDT project and return MDT-121 (this CR).

### Multi-Project Mode Test

From a directory without `.mdt-config.toml`, the server requires explicit project parameter:

```bash
# From /tmp (no project config)
cd /tmp

# Should fail with "No project context available" error
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_cr","arguments":{"key":"121"}}}' | \
node /Users/kirby/home/markdown-ticket-MDT-121/mcp-server/dist/index.js

# Should succeed with explicit project parameter
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_cr","arguments":{"key":"121","project":"MDT"}}}' | \
node /Users/kirby/home/markdown-ticket-MDT-121/mcp-server/dist/index.js
```
