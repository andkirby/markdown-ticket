# Architecture: MDT-121

**Source**: [MDT-121](./MDT-121-single-project-mode-for-mcp-server-simplified-tool.md)
**Generated**: 2026-02-05
**Based on**: [PoC Findings](./poc.md)

## Overview

Auto-detect project context from `.mdt-config.toml` at server startup, making the `project` parameter optional for MCP tool calls. Key constraint: preserve backward compatibility for multi-project scenarios. Design philosophy: explicit parameters override defaults, defaults never override explicit intent.

## Pattern

**Default Parameter with Fallback Chain** — Auto-detect at startup, resolve at runtime using explicit → default → error chain. Fits because MCP server is a short-lived subprocess in Claude Code, static configuration matches process lifecycle.

## Alternatives

| Approach | Trade-off |
|----------|-----------|
| Runtime `set_active_project` tool | Adds complexity for no benefit — server restart is cheap |
| Dynamic schema generation | Complex implementation, unclear UX benefit |
| Environment variable detection | Less discoverable than config file |

**Decision Needed**: None — PoC validated static schemas with runtime resolution.

## Key Dependencies

| Capability | Decision | Rationale |
|------------|----------|-----------|
| TOML parsing | Use existing `@iarna/toml` | Already dependency for config loading |

## Runtime Prerequisites

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `.mdt-config.toml` | Config file | No | Multi-project mode: `project` parameter required for all calls |
| `project.code` in config | Config value | No | Multi-project mode: treated as no config present |

## Structure

```
mcp-server/src/
  ├── index.ts                           # Add detectDefaultProject() method
  ├── config/
  │   └── index.ts                       # Add discovery.mdtConfigSearchDepth config option
  ├── tools/
  │   ├── index.ts                       # Pass defaultProject to handlers
  │   ├── config/
  │   │   └── allTools.ts                # Remove 'project' from required arrays
  │   ├── handlers/
  │   │   ├── projectHandlers.ts         # Add resolveProject() method
  │   │   └── crHandlers.ts              # Add normalizeKey() function
  │   └── utils/
  │       ├── keyNormalizer.ts           # NEW: Key normalization logic
  │       └── projectDetector.ts         # NEW: Parent directory search logic
  └── types/
      └── server.ts                      # NEW: Server state interface
```

### Configuration Addition

Add to `~/.config/mcp-server/config.toml` (optional):

```toml
[discovery]
# Maximum parent directories to search for .mdt-config.toml
# Set to 0 to only check current directory (no parent search)
mdtConfigSearchDepth = 3
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `MCPCRServer` | Detecting default project at startup via `projectDetector` | Implement directory walking logic |
| `projectDetector.ts` | Walking parent directories to find `.mdt-config.toml` | Know about MCP tools or handlers |
| `keyNormalizer.ts` | Key format validation, normalization, uppercase conversion | Know about project detection or file system |
| `ProjectHandlers` | Project resolution (explicit → default → error) | Parse `.mdt-config.toml` directly |
| `ConfigService` | Loading `mdtConfigSearchDepth` from config.toml | Implement directory walking logic |
| `MCPTools` | Routing with default project context | Store server state |

### Project Detection Logic

```typescript
// Format: detectDefaultProject(cwd, searchDepth) -> projectCode | null
// Behavior:
// 1. Check cwd/.mdt-config.toml -> use project.code if found
// 2. Check ../.mdt-config.toml -> use project.code if found
// 3. Check ../../.mdt-config.toml -> use project.code if found
// 4. Continue up to searchDepth levels
// 5. Return null if no config found
//
// Example: cwd="/project/frontend/src", searchDepth=3
// - Checks: /project/frontend/src/.mdt-config.toml
// - Then:   /project/frontend/.mdt-config.toml
// - Then:   /project/.mdt-config.toml (FOUND! -> returns "MDT")
// - Stops (uses closest config)
```

### Key Normalization Logic

```typescript
// Format: normalizeKey(key, defaultProject?) -> normalizedKey
// Rules:
// 1. Full format (contains dash): uppercase project, preserve number
//    "abc-12" -> "ABC-12"
//    "ABC-012" -> "ABC-012"
// 2. Numeric only: add default project, strip leading zeros
//    "12" + default "MDT" -> "MDT-12"
//    "012" + default "MDT" -> "MDT-12"
// 3. Invalid format: throw error
```

## Error Philosophy

Missing project context returns a clear error message directing users to either start server from a project directory or provide the `project` parameter explicitly. Numeric keys without project context fail early with "No project context available" rather than producing ambiguous results.

### Supported Key Formats

| Input Format | Example | Normalized To |
|--------------|---------|---------------|
| `{PROJECT}-{NUM}` | `ABC-12`, `ABC-012` | `ABC-12` (preserve input) |
| `{NUM}` only | `12`, `012` | `{DEFAULT}-12` (add default project) |
| Lowercase | `abc-12` | `ABC-12` (uppercase project) |

**Normalization rules**:
1. Full format (`{LETTERS}-{NUM}`): Preserve as-is, uppercase project code
2. Numeric only (`12`, `012`): Add default project prefix, strip leading zeros from number
3. Mixed case (`abc-12`): Uppercase project code, preserve number format

### Error Messages

| Scenario | Message |
|----------|---------|
| No default + no explicit project | "No project context available. Either start MCP server from a project directory with `.mdt-config.toml`, or provide the `project` parameter explicitly." |
| Invalid key format | "Invalid key format '{key}'. Use numeric shorthand (e.g., 12) or full format (e.g., ABC-12)." |

## Extension Rule

To add HTTP transport support for runtime project switching: Add session-scoped project state in `transports/http.ts`, inject into `MCPTools` per-request rather than server initialization. Do not modify STDIO transport — static default is correct for subprocess lifecycle.

---

*Generated by /mdt:architecture*
