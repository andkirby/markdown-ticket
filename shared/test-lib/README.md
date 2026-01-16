# shared/test-lib

Isolated test environment library for markdown-ticket E2E testing. Provides a clean, isolated environment for creating test projects, CRs, and managing server lifecycles without conflicts with development servers.

## Overview

`shared/test-lib` enables testing of markdown-ticket projects by:

- Creating isolated temporary directories for each test session
- Using dedicated test ports (6173/4001/4002) that don't conflict with dev servers (5173/3001/3002)
- Managing server lifecycles (frontend, backend, MCP) with health checks
- Creating test projects with proper directory structure and configuration
- Generating CRs with YAML frontmatter and markdown content

## Installation

The library is part of the `@mdt/shared` workspace package:

```typescript
import {
  ProjectFactory,
  TestEnvironment,
  TestServer,
} from '@mdt/shared/test-lib'
```

## Quick Start

```typescript
import {
  ProjectFactory,
  TestEnvironment,
  TestServer,
} from '@mdt/shared/test-lib'
import { expect, test } from '@playwright/test'

let testEnv: TestEnvironment
let projectFactory: ProjectFactory
let testServer: TestServer

test.beforeAll(async () => {
  // 1. Set up isolated environment
  testEnv = new TestEnvironment()
  await testEnv.setup()

  // 2. Initialize project factory
  projectFactory = new ProjectFactory(testEnv)

  // 3. Start backend server with isolated ports
  testServer = new TestServer(testEnv.getPortConfig())
  await testServer.start('backend', testEnv.getTempDirectory())
})

test('should create test project and CR', async () => {
  // Create test project
  const project = await projectFactory.createProject('empty', {
    code: 'TEST',
    name: 'Test Project',
  })

  // Create CR
  const cr = await projectFactory.createTestCR(project.key, {
    title: 'Add User Authentication',
    type: 'Feature Enhancement',
    content: 'Implement login functionality',
  })

  expect(cr.success).toBe(true)
  expect(cr.crCode).toBe('TEST-001')
})

test.afterAll(async () => {
  await testServer.stopAll()
  await testEnv.cleanup()
})
```

## Core Components

### TestEnvironment

Manages isolated test sessions with unique temporary directories and port allocation.

```typescript
const testEnv = new TestEnvironment()
await testEnv.setup()

// Get paths
const tempDir = testEnv.getTempDirectory() // /tmp/mdt-test-{uuid}/
const configDir = testEnv.getConfigDirectory() // /tmp/mdt-test-{uuid}/config/

// Get port configuration
const ports = testEnv.getPortConfig()
// { frontend: 6173, backend: 4001, mcp: 4002 }

// Cleanup
await testEnv.cleanup()
```

**Key Features:**

- Unique temp directory: `/tmp/mdt-test-{uuid}/`
- Isolated ports to avoid conflicts
- Auto-cleanup on process termination (SIGINT, SIGTERM, etc.)
- Sets `process.env.CONFIG_DIR` for MCP server use

### ProjectFactory

Creates test projects with proper directory structure, configuration files, and CRs.

```typescript
const projectFactory = new ProjectFactory(testEnv)

// Create empty project
const project = await projectFactory.createProject('empty', {
  code: 'TEST',
  name: 'Test Project',
  ticketsPath: 'docs/CRs',
  documentPaths: ['docs'],
  excludeFolders: ['node_modules', '.git'],
})

// Create CR
const cr = await projectFactory.createTestCR('TEST', {
  title: 'Add User Authentication',
  type: 'Feature Enhancement',
  status: 'Proposed',
  priority: 'High',
  content: 'Implement login and registration',
})
// Result: { success: true, crCode: 'TEST-001', filePath: '/path/to/TEST-001-add-user-authentication.md' }

// Create multiple CRs
const crs = await projectFactory.createMultipleCRs('TEST', [
  { title: 'CR One', type: 'Feature Enhancement', content: '...' },
  { title: 'CR Two', type: 'Bug Fix', content: '...' },
])

// Create pre-configured test scenario
const scenario = await projectFactory.createTestScenario('standard-project')
// Creates project with 3 pre-created CRs
```

**Generated Structure:**

```
/tmp/mdt-test-{uuid}/projects/TEST/
├── .mdt-config.toml    # Project configuration
├── .mdt-next          # Next CR number counter
└── docs/CRs/          # CR directory
    └── TEST-001-add-user-authentication.md
```

**Project Configuration:**

```typescript
interface ProjectConfig {
  name?: string // Project display name
  code?: string // Project code (auto-generated if omitted)
  description?: string
  ticketsPath?: string // Path for CRs (default: 'docs/CRs')
  repository?: string
  documentPaths?: string[] // Document scan paths (default: ['docs'])
  excludeFolders?: string[] // Excluded folders (default: ['node_modules', '.git'])
}
```

**CR Data Structure:**

```typescript
interface TestCRData {
  title: string // Required
  type: CRType // Required: 'Feature Enhancement', 'Bug Fix', etc.
  status?: CRStatus // Optional: Defaults to 'Proposed'
  priority?: CRPriority // Optional: Defaults to 'Medium'
  phaseEpic?: string
  dependsOn?: string // CR code this depends on
  blocks?: string // CR code this blocks
  assignee?: string
  content: string // Required: CR description
}
```

### TestServer

Manages frontend, backend, and MCP server lifecycles with health checks.

```typescript
const testServer = new TestServer(testEnv.getPortConfig())

// Start backend server
await testServer.start('backend', testEnv.getTempDirectory())

// Check if server is ready
const isReady = await testServer.isReady('backend')

// Get server configuration
const config = testServer.getConfig('backend')

// Stop server
await testServer.stop('backend')

// Stop all servers
await testServer.stopAll()
```

**Server Types:**

- `frontend`: Vite dev server (port 6173)
- `backend`: Express API server (port 4001)
- `mcp`: MCP server with HTTP transport (port 4002)

## Usage Patterns

### Pattern 1: Basic Isolation

Create isolated environment without servers:

```typescript
let testEnv: TestEnvironment

test.beforeAll(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()
})

test('should have isolated environment', () => {
  const tempDir = testEnv.getTempDirectory()
  expect(tempDir).toMatch(/\/mdt-test-[a-f0-9-]{36}$/)

  const ports = testEnv.getPortConfig()
  expect(ports.frontend).toBe(6173)
  expect(ports.backend).toBe(4001)
})

test.afterAll(async () => {
  await testEnv.cleanup()
})
```

### Pattern 2: Project Creation

Create test projects in isolated environment:

```typescript
let testEnv: TestEnvironment
let projectFactory: ProjectFactory

test.beforeAll(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()
  projectFactory = new ProjectFactory(testEnv)
})

test('should create project with custom ticketsPath', async () => {
  const project = await projectFactory.createProject('empty', {
    code: 'TEST',
    ticketsPath: 'custom/specs',
  })

  expect(project.key).toBe('TEST')
  expect(project.path).toContain('/projects/TEST')
})

test.afterAll(async () => {
  await projectFactory.cleanup()
  await testEnv.cleanup()
})
```

### Pattern 3: Full Stack Testing

Complete integration with servers:

```typescript
import http from 'node:http'

let testEnv: TestEnvironment
let projectFactory: ProjectFactory
let testServer: TestServer

async function httpRequest(options: http.RequestOptions) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () =>
        resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') }),)
    })
    req.on('error', reject)
    req.end()
  })
}

test.beforeAll(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()

  projectFactory = new ProjectFactory(testEnv)
  testServer = new TestServer(testEnv.getPortConfig())

  // Start backend server
  await testServer.start('backend', testEnv.getTempDirectory())
})

test('backend discovers test project', async () => {
  // Create test project
  const project = await projectFactory.createProject('empty', {
    code: 'TEST',
    name: 'Test Project',
  })

  // Wait for backend discovery
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Query backend API
  const ports = testEnv.getPortConfig()
  const response = await httpRequest({
    hostname: 'localhost',
    port: ports.backend,
    path: '/api/projects',
    method: 'GET',
  })

  expect(response.statusCode).toBe(200)
  const testProject = response.data.find((p: any) => p.key === 'TEST')
  expect(testProject).toBeDefined()
  expect(testProject.name).toBe('Test Project')
})

test.afterAll(async () => {
  await testServer.stopAll()
  await projectFactory.cleanup()
  await testEnv.cleanup()
})
```

### Pattern 4: CR Dependencies

Create CRs with dependency chains:

```typescript
test('should create CRs with dependencies', async () => {
  const project = await projectFactory.createProject('empty', {
    code: 'DEP',
  })

  // Create architecture CR
  const archCR = await projectFactory.createTestCR('DEP', {
    title: 'System Architecture',
    type: 'Architecture',
    priority: 'Critical',
    content: 'Design microservices architecture',
  })

  // Create implementation CR depending on architecture
  const implCR = await projectFactory.createTestCR('DEP', {
    title: 'Implement User Service',
    type: 'Feature Enhancement',
    priority: 'High',
    dependsOn: archCR.crCode,
    content: 'Create user management service',
  })

  expect(archCR.success).toBe(true)
  expect(archCR.crCode).toBe('DEP-001')
  expect(implCR.success).toBe(true)
  expect(implCR.crCode).toBe('DEP-002')
})
```

## Best Practices

### 1. Always Clean Up

```typescript
test.afterAll(async () => {
  if (testServer)
    await testServer.stopAll()
  if (projectFactory)
    await projectFactory.cleanup()
  if (testEnv && testEnv.isInitialized())
    await testEnv.cleanup()
})
```

### 2. Use Unique Project Codes

```typescript
// Good - let system generate unique code
const project = await projectFactory.createProject('empty', {
  name: 'Test Project',
})

// Good - use timestamp for uniqueness
const code = `TEST${Date.now()}`
const project = await projectFactory.createProject('empty', { code })
```

### 3. Verify Results

```typescript
const result = await projectFactory.createTestCR('TEST', crData)
expect(result.success).toBe(true)
expect(result.crCode).toBe('TEST-001')

if (!result.success) {
  console.error('CR creation failed:', result.error)
}
```

### 4. Wait for Backend Discovery

```typescript
// Create project
await projectFactory.createProject('empty', { code: 'TEST' });

// Wait for backend to discover changes
await new Promise(resolve => setTimeout(resolve, 1000));

// Now query API
const response = await httpRequest({ ... });
```

### 5. Use Isolated Ports

```typescript
// Always use test environment ports, not hardcoded dev ports
const ports = testEnv.getPortConfig()
const response = await httpRequest({
  hostname: 'localhost',
  port: ports.backend, // Use this, not 3001
  path: '/api/health',
  method: 'GET',
})
```

## Port Configuration

**Test Ports** (isolated from development):

- Frontend: `6173` (vs dev: `5173`)
- Backend: `4001` (vs dev: `3001`)
- MCP: `4002` (vs dev: `3002`)

**Custom Ports** (via environment variables):

```bash
TEST_FRONTEND_PORT=8000
TEST_BACKEND_PORT=8001
TEST_MCP_PORT=8002
```

## Environment Variables

| Variable             | Description           | Default                |
| -------------------- | --------------------- | ---------------------- |
| `TEST_FRONTEND_PORT` | Frontend test port    | `6173`                 |
| `TEST_BACKEND_PORT`  | Backend test port     | `4001`                 |
| `TEST_MCP_PORT`      | MCP test port         | `4002`                 |
| `CONFIG_DIR`         | Config directory path | Set by TestEnvironment |

## Troubleshooting

### Port Already in Use

**Error:** `Server backend is already running`

**Solution:** Ensure `testEnv.cleanup()` is called in `test.afterAll` or use unique ports:

```bash
TEST_BACKEND_PORT=5001 npm run test:e2e
```

### Temp Directory Not Created

**Error:** `Test environment not initialized`

**Solution:** Always call `await testEnv.setup()` before using the environment:

```typescript
test.beforeAll(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup() // Don't forget this!
})
```

### CR Creation Fails

**Error:** `Project TEST not found`

**Solution:** Ensure project is created before attempting to create CRs:

```typescript
const project = await projectFactory.createProject('empty', { code: 'TEST' });
const cr = await projectFactory.createTestCR(project.key, { ... });  // Use project.key
```

### Server Health Check Fails

**Error:** `Health check failed for backend`

**Solutions:**

1. Ensure `npm run build:shared` has been run
2. Check server logs: `child.stdout?.on('data', console.log)`
3. Increase health check timeout in TestServer configuration
4. Verify project root path: `testEnv.getTempDirectory()`

### Cleanup Leaves Files

**Error:** Temp directories not removed

**Solution:** Cleanup runs on SIGINT/SIGTERM, but ensure explicit cleanup:

```typescript
test.afterAll(async () => {
  await testServer.stopAll() // Stop servers first
  await projectFactory.cleanup()
  await testEnv.cleanup() // Then cleanup environment
})
```

## Example: Complete Test Suite

See `tests/e2e/test-lib-e2e.spec.ts` for comprehensive examples covering:

- TestEnvironment isolation and cleanup
- ProjectFactory with custom ticketsPath
- CR creation with title slugification
- TestServer lifecycle management
- Integration with backend API
- Full resource cleanup

## API Reference

### TestEnvironment

| Method                            | Returns         | Description                                  |
| --------------------------------- | --------------- | -------------------------------------------- |
| `setup()`                         | `Promise<void>` | Initialize environment with temp directories |
| `cleanup()`                       | `Promise<void>` | Remove all temporary files                   |
| `getTempDirectory()`              | `string`        | Get temporary directory path                 |
| `getConfigDirectory()`            | `string`        | Get config directory path                    |
| `getPortConfig()`                 | `PortConfig`    | Get port configuration                       |
| `getId()`                         | `string`        | Get unique test session ID                   |
| `isInitialized()`                 | `boolean`       | Check if environment is initialized          |
| `registerCleanupHandler(handler)` | `void`          | Register custom cleanup handler              |

### ProjectFactory

| Method                                    | Returns                   | Description                    |
| ----------------------------------------- | ------------------------- | ------------------------------ |
| `createProject(type?, config?)`           | `Promise<ProjectData>`    | Create test project            |
| `createTestCR(projectCode, crData)`       | `Promise<TestCRResult>`   | Create single CR               |
| `createMultipleCRs(projectCode, crsData)` | `Promise<TestCRResult[]>` | Create multiple CRs            |
| `createTestScenario(scenarioType?)`       | `Promise<TestScenario>`   | Create pre-configured scenario |
| `cleanup()`                               | `Promise<void>`           | Clean up resources             |

### TestServer

| Method                           | Returns                     | Description                    |
| -------------------------------- | --------------------------- | ------------------------------ |
| `start(serverType, projectRoot)` | `Promise<void>`             | Start server with health check |
| `stop(serverType)`               | `Promise<void>`             | Stop server gracefully         |
| `stopAll()`                      | `Promise<void>`             | Stop all running servers       |
| `isReady(serverType)`            | `Promise<boolean>`          | Check if server is ready       |
| `getConfig(serverType)`          | `ServerConfig \| undefined` | Get server configuration       |
| `getUrl(serverType)`             | `string`                    | Get server URL                 |

## Related Documentation

- [Playwright Configuration](../../playwright.config.ts)
- [E2E Testing Guide](../../tests/e2e/README.md)
- [write-tests-guide.md](./write-tests-guide.md) - Progressive usage guide
- [Backend API Documentation](../../docs/API.md)

## License

Part of the markdown-ticket project.
