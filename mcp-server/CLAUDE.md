# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Build (required after code changes - transpiles TypeScript to dist/)
npm run build

# Development
npm run dev              # Stdio transport (uses tsx for direct TS execution)
MCP_HTTP_ENABLED=true npm run dev  # Stdio + HTTP transports (port 3002)

# Testing
npm test                # All tests (unit + integration + e2e)
npm test -- tests/e2e/  # E2E tests only
npm test -- tests/integration/  # Integration tests only
npm test -- tests/unit/  # Unit tests only

# Run specific test file
npm test -- tests/e2e/tools/create-cr.spec.ts

# Watch mode
npm test -- --watch

# Linting
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
```

## MCP Server Architecture

This is a Model Context Protocol (MCP) server for managing CR (Change Request) tickets stored as markdown files with YAML frontmatter.

### How MCP Works

**MCP (Model Context Protocol)** is a standardized protocol for LLMs to interact with external tools through JSON-RPC 2.0. This server implements two transports:

1. **Stdio Transport** (default): Spawns as child process, communicates via stdin/stdout
2. **HTTP Transport** (optional): REST-like endpoint at `/mcp` for containerized deployments

Both transports share the same tool implementations in `src/tools/index.ts`.

**Request Flow:**
```
Client → JSON-RPC Request → Transport Layer → MCPTools.handleToolCall() → Handlers → Services → File System
```

**Response Format:** All tools return human-readable formatted strings (markdown), not JSON objects. This is intentional for LLM consumption.

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Transports (src/transports/)                                │
│  - stdio.ts: StdioServerTransport via MCP SDK               │
│  - http.ts: Express server with JSON-RPC endpoints          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  MCPTools (src/tools/index.ts)                              │
│  - Tool call routing to handlers                            │
│  - Service injection and handler initialization             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Handlers (src/tools/handlers/)                             │
│  - ProjectHandlers: project discovery/validation            │
│  - CRHandlers: CR CRUD operations                           │
│  - SectionHandlers: markdown section management             │
└──────────────────────┬──────────────────────────────────────┘
                       │ delegates to
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Services (shared layer)                                    │
│  - CRService: thin wrapper around TicketService             │
│  - ProjectService: multi-project management                 │
│  - MarkdownService: markdown parsing/formatting             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  File System (markdown files in docs/CRs/)                  │
└─────────────────────────────────────────────────────────────┘
```

### Available MCP Tools

- `list_projects` - List all discovered projects
- `get_project_info` - Get project metadata
- `list_crs` - List CRs with optional filters
- `get_cr` - Retrieve CR by key
- `create_cr` - Create new CR
- `update_cr_status` - Change CR status
- `update_cr_attrs` - Update CR attributes
- `delete_cr` - Delete CR file
- `manage_cr_sections` - Add/replace/append/remove markdown sections
- `suggest_cr_improvements` - Analyze CR for completeness

All tools defined in `src/tools/config/allTools.js`.

### Project Discovery

The server discovers projects by scanning:
1. Global registry: `~/.config/markdown-ticket/projects/{project-dir}.toml`
2. Local config: `{project}/.mdt-config.toml`

**Single-project mode:** When started within a project directory, auto-detects project code from `.mdt-config.toml` (no `project` param needed).

**Multi-project mode:** When started outside projects, requires `project` parameter for all CR operations.

## Testing in Isolated Environments

### Test Isolation Strategy

All tests use **temporary isolated directories** that are created during setup and destroyed during cleanup. This ensures tests don't interfere with each other or the real project files.

### How Test Isolation Works

1. **TestEnvironment** creates temp directories via `@mdt/shared/test-lib`
2. **ProjectSetup** creates test project structures in temp dir
3. **MCPClient** spawns server with `CONFIG_DIR` pointing to temp config
4. Each test gets its own isolated environment
5. `afterEach` cleanup deletes all temp files

```typescript
// Standard test pattern
beforeEach(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()  // Creates temp dirs

  const projectSetup = new ProjectSetup({ testEnv })
  await projectSetup.createProjectStructure('TEST', 'Test Project')

  mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
  await mcpClient.start()  // Server discovers from temp registry
})

afterEach(async () => {
  await mcpClient.stop()
  await testEnv.cleanup()  // Deletes all temp files
})
```

### Test Categories

**E2E Tests** (`tests/e2e/`): Real server process, JSON-RPC protocol, real file I/O
- Spawns `node dist/index.js` as child process
- Uses MCPClient to send JSON-RPC requests
- Tests against actual file system in temp directories
- Both stdio and HTTP transports

**Integration Tests** (`tests/integration/`): Mocked dependencies, handler/service layer
- No server process
- Direct handler calls with mocked shared services
- Verifies service delegation patterns
- Tests MCP = backend API consistency

**Unit Tests** (`tests/unit/`, `src/**/__tests__/`): Individual functions/classes
- Fully mocked
- Fastest, most isolated

### Key Testing Principles

1. **Validate content, not structure** - MCP returns strings, not objects
   ```typescript
   // ✅ DO: Simple content checks
   expect(typeof response.data).toBe('string')
   expect(response.data).toContain('Created successfully')
   expect(response.data).toMatch(/TEST-\d{3}/)

   // ❌ DON'T: Treat responses as objects
   expect(response.data.key).toBe('TEST-001')  // Will fail - data is string
   ```

2. **Create project BEFORE starting client** - Server discovers projects at startup
   ```typescript
   // ✅ RIGHT: Project exists when server starts
   await projectSetup.createProjectStructure('TEST', 'Test')
   await mcpClient.start()

   // ❌ WRONG: Server won't see project created after startup
   await mcpClient.start()
   await projectSetup.createProjectStructure('TEST', 'Test')
   ```

3. **Always cleanup** - Prevent temp file accumulation
   ```typescript
   afterEach(async () => {
     await mcpClient.stop()
     await testEnv.cleanup()
   })
   ```

## Conventions

- **Build before running**: Run `npm run build` after code changes
- **No AI attribution in commits**: No "Co-Authored-By:" tags
- **Path aliases**: `@mdt/shared/*` → `../shared/dist/*`
- **Mock location**: `src/__mocks__/@mdt/shared/services/`
- **Test naming**: BDD format `Given <context> When <action> Then <outcome>`

## Configuration

- **Stdio mode**: `MCP_HTTP_ENABLED` unset or `false`
- **HTTP mode**: `MCP_HTTP_ENABLED=true`, port via `MCP_HTTP_PORT` (default 3002)
- **Config directory**: `~/.config/mcp-server/` for global settings
- **Projects root**: `~/.config/markdown-ticket/projects/` for project registry

## Common Issues

- **Module not found**: Run `npm run build` to transpile TypeScript
- **Tests fail sporadically**: Check temp dir cleanup in `afterEach`
- **Server doesn't discover projects**: Ensure project created before `mcpClient.start()`
- **E2E tests timeout**: Server may not be starting - check `waitForStart()` in transports
