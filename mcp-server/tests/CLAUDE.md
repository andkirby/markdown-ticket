# MCP Server Testing Documentation

**Comprehensive guide for testing the MCP server.**

## Quick Links

- [E2E Testing Guide](./docs/e2e-testing-guide.md) - End-to-end testing with real server process
- [Integration Testing Guide](./docs/integration-testing-guide.md) - Integration testing with mocked dependencies
- [Legacy Documentation](./e2e/docs/) - Older documentation (being migrated)

## Overview

The MCP server has three layers of testing:

```
┌─────────────────────────────────────────────────────────────┐
│                         E2E Tests                           │
│  tests/e2e/tools/*.spec.ts                                  │
│  • Real server process                                      │
│  • JSON-RPC protocol                                        │
│  • Real file system                                         │
│  • Slowest, most comprehensive                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Integration Tests                       │
│  tests/integration/*.test.ts                                │
│  • Mocked dependencies                                      │
│  • Handler/service layer                                    │
│  • No server process                                        │
│  • Fast, focused testing                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Unit Tests                            │
│  tests/unit/*.spec.ts, src/**/__tests__/*.test.ts          │
│  • Individual functions/classes                             │
│  • Fully mocked                                             │
│  • Fastest, most isolated                                   │
└─────────────────────────────────────────────────────────────┘
```

## When to Write Which Test

| Scenario | Test Type | Location |
|----------|-----------|----------|
| New MCP tool from client perspective | E2E | `tests/e2e/tools/` |
| Verify service delegation | Integration | `tests/integration/` |
| MCP = Backend API consistency | Integration | `tests/integration/` |
| Handler logic with mocks | Integration | `tests/integration/` |
| Utility function | Unit | `tests/unit/` or `src/**/__tests__/` |

## Test Structure

```
mcp-server/tests/
├── docs/                           # Comprehensive testing guides (NEW)
│   ├── e2e-testing-guide.md
│   └── integration-testing-guide.md
├── e2e/                            # End-to-end tests
│   ├── helpers/                    # Test utilities
│   │   ├── core/                   # Core helpers
│   │   ├── config/                 # Configuration generators
│   │   ├── types/                  # Type definitions
│   │   ├── mcp-client.ts           # MCP client wrapper
│   │   ├── mcp-transports.ts       # Stdio/HTTP transports
│   │   ├── project-factory.ts      # Project factory
│   │   └── test-environment.ts     # Test environment
│   ├── tools/                      # Tool-specific E2E tests
│   │   ├── create-cr.spec.ts
│   │   ├── delete-cr.spec.ts
│   │   ├── get-cr.spec.ts
│   │   ├── list-crs.spec.ts
│   │   ├── manage-cr-sections.spec.ts
│   │   ├── suggest-cr-improvements.spec.ts
│   │   ├── update-cr-attrs.spec.ts
│   │   ├── update-cr-status.spec.ts
│   │   ├── error-handling.spec.ts
│   │   ├── output-sanitization.spec.ts
│   │   └── rate-limiting.spec.ts
│   └── docs/                       # Legacy docs (see /docs instead)
├── integration/                    # Integration tests
│   ├── mcp-backend-consistency.test.ts
│   ├── mcp-backend-consistency-simple.test.ts
│   └── service-delegation.test.ts
├── unit/                           # Unit tests
│   └── mdt-120-research-type.spec.ts
└── CLAUDE.md                       # This file

src/
└── **/__tests__/                   # Co-located unit tests
    └── toolConfiguration.test.ts
```

## Key Testing Concepts

### MCP Server Returns Formatted Strings

**Important:** The MCP server returns human-readable formatted strings (markdown), not JSON objects.

```typescript
// ✅ CORRECT - Test content
expect(typeof response.data).toBe('string')
expect(response.data).toContain('Created successfully')
expect(response.data).toMatch(/TEST-\d{3}/)

// ❌ WRONG - Treats response as object
expect(response.data.key).toBe('TEST-001')
expect(response.data.success).toBe(true)
```

### Test Environment Isolation

Each test gets an isolated temporary directory:

```typescript
let testEnv: TestEnvironment

beforeEach(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()
})

afterEach(async () => {
  await testEnv.cleanup()
})
```

### Transport Support

Tests can run with both stdio and HTTP transports:

```typescript
// Stdio (default)
const client = new MCPClient(testEnv, { transport: 'stdio' })

// HTTP
const client = new MCPClient(testEnv, { transport: 'http' })
```

## Running Tests

```bash
# All tests
npm test

# E2E tests only
npm test -- tests/e2e/

# Integration tests only
npm test -- tests/integration/

# Unit tests only
npm test -- tests/unit/

# Specific test file
npm test -- tests/e2e/tools/create-cr.spec.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Helpers

### TestEnvironment

Creates isolated temporary directories.

```typescript
import { TestEnvironment } from '../helpers/test-environment'

const testEnv = new TestEnvironment()
await testEnv.setup()
const tempDir = testEnv.getTempDir()
const configDir = testEnv.getConfigDir()
await testEnv.cleanup()
```

### MCPClient

Communicates with MCP server via JSON-RPC.

```typescript
import { MCPClient } from '../helpers/mcp-client'

const client = new MCPClient(testEnv, { transport: 'stdio' })
await client.start()
const response = await client.callTool('tool_name', { param: 'value' })
await client.stop()
```

### ProjectSetup

Creates test project structures.

```typescript
import { ProjectSetup } from '../helpers/core/project-setup'

const projectSetup = new ProjectSetup({ testEnv })
await projectSetup.createProjectStructure('TEST', 'Test Project')
```

### ProjectFactory

Creates test projects and CRs.

```typescript
import { ProjectFactory } from '../helpers/project-factory'

const factory = new ProjectFactory(testEnv, mcpClient)
const project = await factory.createProject({ name: 'Test Project' })
const cr = await factory.createTestCR('TEST-001', { title: 'Test CR' })
```

## Common Test Patterns

### BDD Naming Convention

```typescript
describe('tool_name', () => {
  describe('valid Operation', () => {
    it('Given valid input WHEN calling THEN returns result', async () => {
      // Test implementation
    })
  })

  describe('error Handling', () => {
    it('Given invalid input WHEN calling THEN returns error', async () => {
      // Test implementation
    })
  })
})
```

### Helper Functions

```typescript
describe('list_crs', () => {
  async function callListCRs(project: string, filters?: any) {
    return await mcpClient.callTool('list_crs', { project, filters })
  }

  function parseCRList(markdown: string) {
    // Parse logic
  }

  it('should list all CRs', async () => {
    const response = await callListCRs('TEST')
    const crs = parseCRList(response.data)
    expect(crs.length).toBeGreaterThan(0)
  })
})
```

## Best Practices

### DO

1. Use isolated test environments
2. Clean up in `afterEach`
3. Create reusable helper functions
4. Use BDD naming (GIVEN-WHEN-THEN)
5. Validate content, not structure
6. Test both success and error cases

### DON'T

1. Don't test exact formatting (brittle)
2. Don't access object properties on string responses
3. Don't skip cleanup
4. Don't share state between tests
5. Don't test private methods
6. Don't duplicate implementation in tests

## Common Error Codes

| Code | Meaning |
|------|---------|
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params (validation error) |
| `-32000` | Server error (tool execution failed) |
| `-32001` | Rate limit exceeded |

## Debugging

```bash
# Run single test
npm test -- --testNamePattern="should do something"

# Verbose output
npm test -- --verbose

# No cache
npm test -- --no-cache

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Further Reading

- [E2E Testing Guide](./docs/e2e-testing-guide.md) - Complete E2E testing documentation
- [Integration Testing Guide](./docs/integration-testing-guide.md) - Complete integration testing documentation
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
