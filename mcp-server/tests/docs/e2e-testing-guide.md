# MCP Server E2E Testing Guide

**Comprehensive guide for writing end-to-end tests for the MCP server.**

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Testing Patterns](#testing-patterns)
- [Helpers and Utilities](#helpers-and-utilities)
- [Transports](#transports)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Debugging](#debugging)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

E2E tests for the MCP server verify that the entire system works correctly from the client's perspective. These tests:

- Spawn a real MCP server process
- Communicate via actual MCP protocol (JSON-RPC 2.0)
- Test against real file system operations
- Use isolated test environments
- Can run with both stdio and HTTP transports

### Key Principle: Tests Should Be "Stupid"

The MCP server returns **formatted strings** (markdown), not structured JSON. Your tests should focus on **content validation**, not structure parsing.

```typescript
// ✅ DO: Simple content checks
expect(typeof result).toBe('string')
expect(result).toContain('Created successfully')
expect(result).toMatch(/TEST-\d{3}/)

// ❌ DON'T: Treat responses as objects
expect(result.success).toBe(true)  // Will fail - result is a string
expect(result.data.key).toBe('TEST-001')  // Will fail
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Test File                           │
│  (.spec.ts in tests/e2e/tools/)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCPClient                               │
│  - Sends JSON-RPC requests                                   │
│  - Handles retries                                           │
│  - Parses responses                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌────────────────────┐    ┌────────────────────────┐
│  StdioTransport    │    │   HttpTransport        │
│  (spawns process)  │    │   (HTTP endpoint)      │
└────────────────────┘    └────────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │   MCP Server Process  │
         │   (dist/index.js)     │
         └───────────────────────┘
```

---

## Getting Started

### Prerequisites

1. Build the MCP server: `cd mcp-server && npm run build`
2. Ensure test dependencies are installed: `npm install`

### Create a New Test File

```bash
# Create a new test file in the appropriate directory
touch mcp-server/tests/e2e/tools/my-tool.spec.ts
```

### Basic Test Template

```typescript
/**
 * my_tool Tool E2E Tests
 *
 * BDD Scenarios:
 * - GIVEN valid input WHEN calling THEN success
 * - GIVEN invalid input WHEN calling THEN error
 */

import { ProjectSetup } from '../helpers/core/project-setup'
import { MCPClient } from '../helpers/mcp-client'
import { TestEnvironment } from '../helpers/test-environment'

describe('my_tool', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // Create project structure BEFORE starting MCP client
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')

    // Start MCP client (server discovers project from registry)
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
  })

  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  describe('valid Operation', () => {
    it('Given valid input WHEN calling THEN returns expected result', async () => {
      const response = await mcpClient.callTool('my_tool', {
        project: 'TEST',
        // ... other params
      })

      expect(response.success).toBe(true)
      expect(typeof response.data).toBe('string')
      expect(response.data).toContain('expected content')
    })
  })

  describe('error Handling', () => {
    it('Given invalid input WHEN calling THEN returns error', async () => {
      const response = await mcpClient.callTool('my_tool', {
        project: 'INVALID',
      })

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
    })
  })
})
```

---

## Test Structure

### Directory Layout

```
mcp-server/tests/e2e/
├── helpers/              # Test utilities
│   ├── core/            # Core helpers (ProjectSetup, etc.)
│   ├── config/          # Configuration generators
│   ├── types/           # Type definitions
│   ├── mcp-client.ts    # MCP client wrapper
│   ├── mcp-transports.ts # Transport implementations
│   ├── mcp-logger.ts    # Logging utility
│   ├── project-factory.ts # Project factory
│   └── test-environment.ts # Test environment
├── tools/               # Tool-specific tests
│   ├── create-cr.spec.ts
│   ├── delete-cr.spec.ts
│   ├── list-crs.spec.ts
│   └── ...
└── docs/                # Documentation (legacy - see tests/docs/)
```

### File Naming

- Test files: `{tool-name}.spec.ts` (lowercase, hyphenated)
- Test descriptions: BDD format `Given ... WHEN ... THEN ...`

---

## Writing Tests

### Test Lifecycle

```typescript
describe('tool_name', () => {
  let testEnv: TestEnvironment
  let mcpClient: MCPClient

  // 1. Setup: Create isolated environment
  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()

    // Create test project
    const projectSetup = new ProjectSetup({ testEnv })
    await projectSetup.createProjectStructure('TEST', 'Test Project')

    // Start MCP client
    mcpClient = new MCPClient(testEnv, { transport: 'stdio' })
    await mcpClient.start()
  })

  // 2. Teardown: Clean up resources
  afterEach(async () => {
    await mcpClient.stop()
    await testEnv.cleanup()
  })

  // 3. Tests: Your test cases here
  it('should do something', async () => {
    // ...
  })
})
```

### BDD Naming Convention

Tests use the Given-When-Then pattern from BDD (Behavior-Driven Development), following standard Gherkin syntax.

**Pattern:** `it('Given <context> When <action> Then <outcome>', async () => {})`

**Important:** Use sentence case (`Given`, `When`, `Then`) - this follows standard Gherkin convention and reads naturally.

```typescript
describe('create_cr', () => {
  describe('valid Creation', () => {
    it('Given valid project and data When creating Then success with proper CR key', async () => {
      // Test implementation
    })
  })

  describe('required Fields', () => {
    it('Given missing project When creating Then return validation error', async () => {
      // Test implementation
    })
  })
})
```

**Structure:**
- `Given` - Preconditions or context (sentence case)
- `When` - Action being tested (sentence case)
- `Then` - Expected outcome (sentence case)

**Examples:**
- `Given valid project When listing Then returns all CRs`
- `Given invalid project When creating Then returns error`
- `Given CR exists When updating Then saves changes`

---

### Helper Functions

Create reusable helper functions to reduce duplication:

```typescript
describe('list_crs', () => {
  // Helper function for calling the tool
  async function callListCRs(projectKey: string, filters?: any) {
    return await mcpClient.callTool('list_crs', {
      project: projectKey,
      ...(filters && { filters }),
    })
  }

  // Helper function for parsing responses
  function parseCRList(markdown: string): Array<{ code: string, title: string }> {
    const crs: any[] = []
    // Parse logic here
    return crs
  }

  // Helper function for assertions
  function expectCRStructure(cr: any) {
    expect(cr.code).toBeDefined()
    expect(cr.title).toBeDefined()
    expect(cr.status).toBeDefined()
  }

  it('Given project exists WHEN listing THEN returns all CRs', async () => {
    const response = await callListCRs('TEST')
    const crs = parseCRList(response.data)

    expect(crs.length).toBeGreaterThan(0)
    expectCRStructure(crs[0])
  })
})
```

---

## Testing Patterns

### Pattern 1: String Response Validation

Most MCP tools return formatted strings. Validate content, not structure:

```typescript
it('should return success message', async () => {
  const response = await mcpClient.callTool('create_cr', {
    project: 'TEST',
    type: 'Feature Enhancement',
    data: { title: 'Test CR' },
  })

  expect(response.success).toBe(true)
  expect(typeof response.data).toBe('string')
  expect(response.data).toContain('Created successfully')
  expect(response.data).toMatch(/TEST-\d{3}/) // CR key format
})
```

### Pattern 2: Extracting Data from Responses

When you need to use data from one call in another:

```typescript
it('should create and then retrieve CR', async () => {
  // Create CR
  const createResponse = await mcpClient.callTool('create_cr', {
    project: 'TEST',
    type: 'Feature Enhancement',
    data: { title: 'Test CR' },
  })

  expect(createResponse.success).toBe(true)

  // Extract CR key from response
  const keyMatch = createResponse.data?.match(/TEST-(\d{3})/)
  const crKey = keyMatch ? keyMatch[0] : null
  expect(crKey).toBeTruthy()

  // Use the extracted key
  const getResponse = await mcpClient.callTool('get_cr', {
    project: 'TEST',
    key: crKey!,
  })

  expect(getResponse.success).toBe(true)
  expect(getResponse.data).toContain('Test CR')
})
```

### Pattern 3: Testing All Enum Values

```typescript
const crTypes = [
  'Architecture',
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Documentation',
]

describe('CR Types', () => {
  crTypes.forEach((type) => {
    it(`GIVEN ${type} type WHEN creating THEN create successfully`, async () => {
      const response = await mcpClient.callTool('create_cr', {
        project: 'TEST',
        type,
        data: { title: `${type} Test CR` },
      })

      expect(response.success).toBe(true)
      expect(response.data).toContain(type)
    })
  })
})
```

### Pattern 4: Error Code Validation

MCP uses JSON-RPC error codes:

```typescript
it('should return validation error for missing required field', async () => {
  const response = await mcpClient.callTool('create_cr', {
    project: undefined as any,
    type: 'Feature Enhancement',
    data: { title: 'Test' },
  })

  expect(response.success).toBe(false)
  expect(response.error?.code).toBe(-32602) // Invalid params
  expect(response.error?.message).toContain('Project key is required')
})
```

**Common Error Codes:**
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params (validation errors)
- `-32000`: Server error (tool execution errors)
- `-32001`: Rate limit error (custom)

---

## Helpers and Utilities

### TestEnvironment

Creates isolated temporary directories for each test run.

```typescript
import { TestEnvironment } from '../helpers/test-environment'

const testEnv = new TestEnvironment()
await testEnv.setup()

// Get paths
const tempDir = testEnv.getTempDir()
const configDir = testEnv.getConfigDir()

// Create project structure
testEnv.createProjectStructure('TEST', {
  'docs/CRs': true,                    // Directory
  '.mdt-config.toml': 'code = TEST',   // File with content
})

// Clean up
await testEnv.cleanup()
```

### ProjectSetup

Convenience wrapper for creating test projects.

```typescript
import { ProjectSetup } from '../helpers/core/project-setup'

const projectSetup = new ProjectSetup({ testEnv })

// Create minimal project structure
await projectSetup.createProjectStructure('TEST', 'Test Project')

// Create with custom config
await projectSetup.createProjectStructure('TEST', 'Test Project', {
  config: { customField: 'value' },
})
```

### ProjectFactory

Creates test projects and CRs with sensible defaults.

```typescript
import { ProjectFactory } from '../helpers/project-factory'

const factory = new ProjectFactory(testEnv, mcpClient)

// Create a test project
const project = await factory.createProject({
  name: 'My Test Project',
  code: 'TEST',
})

// Create a test CR
const cr = await factory.createTestCR('TEST-001', {
  title: 'Test CR',
  type: 'Feature Enhancement',
  priority: 'High',
})
```

### MCPClient

Unified interface for MCP server communication.

```typescript
import { MCPClient } from '../helpers/mcp-client'

const client = new MCPClient(testEnv, {
  transport: 'stdio',  // or 'http'
  timeout: 10000,      // 10 seconds
  retries: 3,          // Retry on failure
})

await client.start()

// List available tools
const tools = await client.listTools()

// Call a tool
const response = await client.callTool('tool_name', {
  param1: 'value1',
})

// Check connection
const connected = await client.isConnected()

await client.stop()
```

---

## Transports

The MCP server supports two transports for testing:

### Stdio Transport (Default)

Spawns the server as a child process and communicates via stdin/stdout.

```typescript
const client = new MCPClient(testEnv, { transport: 'stdio' })
```

**Pros:**
- Most common MCP deployment mode
- Tests the actual communication protocol
- No network dependencies

**Cons:**
- Slower startup
- More complex debugging

### HTTP Transport

Communicates via HTTP endpoint (useful for containerized deployments).

```typescript
const client = new MCPClient(testEnv, { transport: 'http' })
```

**Pros:**
- Easier debugging (can use curl/browser)
- Better for testing HTTP-specific features

**Cons:**
- Additional network layer
- Not the primary MCP deployment mode

### Testing Both Transports

To ensure compatibility, test critical functionality with both transports:

```typescript
const transports = ['stdio', 'http'] as const

describe.each(transports)('create_cr (%s)', (transport) => {
  // Same tests run for both transports
})
```

---

## Error Handling

### Expected Errors

Tools that return errors as formatted content (success=true, but error message in content):

```typescript
// Some tools return errors as content
const toolsWithContentErrors = [
  'get_cr',
  'update_cr_status',
  'create_cr',
  'delete_cr',
]

if (toolsWithContentErrors.includes(toolName)) {
  // These tools return success=true even for errors
  expect(response.success).toBe(true)
  expect(response.data).toContain('Error')
} else {
  // Most tools return success=false for errors
  expect(response.success).toBe(false)
}
```

### Retry Logic

The MCPClient automatically retries on transient errors:

```typescript
const client = new MCPClient(testEnv, {
  retries: 3,  // Will retry up to 3 times
})

// Retryable errors:
// - Connection errors (code: -1)
// - Server errors (code: -32000)
//
// Non-retryable errors:
// - Rate limit errors (code: -32001)
// - Invalid params (code: -32602)
```

### Rate Limiting

Tests can verify rate limiting behavior:

```typescript
it('should enforce rate limits', async () => {
  const promises = Array(20).fill(null).map(() =>
    mcpClient.callTool('list_projects', {})
  )

  // Some requests should hit rate limits
  const results = await Promise.allSettled(promises)
  const rateLimited = results.filter(
    r => r.status === 'rejected' ||
    (r.status === 'fulfilled' && !r.value.success)
  )

  expect(rateLimited.length).toBeGreaterThan(0)
})
```

---

## Best Practices

### DO

1. **Use isolated test environments**
   ```typescript
   beforeEach(async () => {
     testEnv = new TestEnvironment()
     await testEnv.setup()
   })
   ```

2. **Clean up after tests**
   ```typescript
   afterEach(async () => {
     await mcpClient.stop()
     await testEnv.cleanup()
   })
   ```

3. **Create helper functions**
   ```typescript
   async function callListCRs(project: string, filters?: any) {
     return await mcpClient.callTool('list_crs', { project, filters })
   }
   ```

4. **Use BDD naming**
   ```typescript
   it('Given valid input WHEN calling THEN returns result', async () => {})
   ```

5. **Validate content, not structure**
   ```typescript
   expect(response.data).toContain('expected')
   ```

6. **Test success AND error cases**
   ```typescript
   describe('valid Cases', () => { /* ... */ })
   describe('error Cases', () => { /* ... */ })
   ```

### DON'T

1. **Don't test exact formatting**
   ```typescript
   // ❌ BRITTLE
   expect(response.data).toBe('✅ Created: TEST-001\n\nFile: ...')

   // ✅ RESILIENT
   expect(response.data).toContain('Created')
   expect(response.data).toMatch(/TEST-\d{3}/)
   ```

2. **Don't access object properties on string responses**
   ```typescript
   // ❌ WRONG - response.data is a string
   expect(response.data.key).toBe('TEST-001')

   // ✅ RIGHT - validate string content
   expect(response.data).toContain('TEST-001')
   ```

3. **Don't skip cleanup**
   ```typescript
   // ❌ DON'T - leaves temp files
   afterEach(() => {
     // no cleanup
   })

   // ✅ DO - always clean up
   afterEach(async () => {
     await testEnv.cleanup()
   })
   ```

4. **Don't use shared state between tests**
   ```typescript
   // ❌ WRONG - tests depend on order
   let sharedCrKey: string
   it('creates CR', () => { sharedCrKey = ... })
   it('uses CR', () => { use(sharedCrKey) })

   // ✅ RIGHT - each test is independent
   it('creates and uses CR', async () => {
     const crKey = await createCR()
     await useCR(crKey)
   })
   ```

---

## Debugging

### Enable Verbose Logging

```typescript
const client = new MCPClient(testEnv, {
  transport: 'stdio',
})

// The MCPLogger will output debug information
```

### Run Single Test

```bash
npm test -- --testNamePattern="should do something"
```

### Run with Debug Output

```bash
npm test -- --verbose --no-cache
```

### Inspect Server Output

The server's stderr can be inspected for debugging (uncomment in `mcp-transports.ts`):

```typescript
this.process.stderr?.on('data', (data) => {
  console.error('[SERVER STDERR]:', data.toString())
})
```

### Common Debugging Commands

```bash
# Run all E2E tests
npm test -- tests/e2e/

# Run specific test file
npm test -- tests/e2e/tools/create-cr.spec.ts

# Run with coverage
npm test -- tests/e2e/ --coverage

# Run with verbose output
npm test -- tests/e2e/ --verbose
```

---

## Common Pitfalls

### 1. Not Waiting for Server Start

**Problem:** Tests fail because server isn't ready.

```typescript
// ❌ WRONG
mcpClient = new MCPClient(testEnv)
await mcpClient.callTool(...) // Server not ready!

// ✅ RIGHT
mcpClient = new MCPClient(testEnv)
await mcpClient.start()
await mcpClient.callTool(...)
```

### 2. Creating Project After Client Start

**Problem:** MCP server won't discover projects created after it starts.

```typescript
// ❌ WRONG
await mcpClient.start()
await projectSetup.createProjectStructure('TEST', 'Test')
// Server won't see this project!

// ✅ RIGHT
await projectSetup.createProjectStructure('TEST', 'Test')
await mcpClient.start()
```

### 3. Forgetting to Parse Markdown

**Problem:** Trying to access properties on string responses.

```typescript
// ❌ WRONG
expect(response.data.key).toBe('TEST-001')

// ✅ RIGHT
expect(response.data).toContain('TEST-001')
```

### 4. Not Cleaning Up

**Problem:** Temp files accumulate, causing conflicts.

```typescript
// ❌ WRONG
afterEach(() => {}) // No cleanup

// ✅ RIGHT
afterEach(async () => {
  await mcpClient.stop()
  await testEnv.cleanup()
})
```

### 5. Brittle String Matching

**Problem:** Tests break when formatting changes.

```typescript
// ❌ WRONG
expect(response.data).toBe('✅ Success\n\nDetails here')

// ✅ RIGHT
expect(response.data).toContain('Success')
```

---

## Running Tests

```bash
# Run all E2E tests
cd mcp-server && npm test

# Run specific test file
npm test -- tests/e2e/tools/create-cr.spec.ts

# Run tests matching a pattern
npm test -- --testNamePattern="valid Creation"

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

---

## References

- [Integration Testing Guide](./integration-testing-guide.md)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [tests/CLAUDE.md](../CLAUDE.md) - Main testing documentation index
