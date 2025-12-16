# TestServer Usage Documentation

The `TestServer` class provides lifecycle management for frontend, backend, and MCP servers in isolated test environments.

## Basic Usage

```typescript
import { TestServer } from '../shared/test-lib/core/test-server';
import { TestEnvironment } from '../shared/test-lib/core/test-environment';

async function runTests() {
  // Setup test environment
  const env = new TestEnvironment();
  await env.setup();

  // Create test server with test ports
  const testServer = new TestServer(env.getPortConfig());

  try {
    // Start servers
    await testServer.start('frontend', process.cwd());
    await testServer.start('backend', process.cwd());
    await testServer.start('mcp', process.cwd());

    // Check if servers are ready
    const frontendReady = await testServer.isReady('frontend');
    const backendReady = await testServer.isReady('backend');
    const mcpReady = await testServer.isReady('mcp');

    // Get server URLs
    const frontendUrl = testServer.getUrl('frontend'); // http://localhost:6173
    const backendUrl = testServer.getUrl('backend');   // http://localhost:4001
    const mcpUrl = testServer.getUrl('mcp');           // http://localhost:4002/mcp

    // Run your tests...

  } finally {
    // Clean up all servers
    await testServer.stopAll();
    await env.cleanup();
  }
}
```

## Port Configuration

The TestServer uses static test ports to avoid conflicts with development servers:

- Frontend: 6173 (dev server uses 5173)
- Backend: 4001 (dev server uses 3001)
- MCP: 4002 (dev server uses 3002)

These can be overridden with environment variables:
- `TEST_FRONTEND_PORT`
- `TEST_BACKEND_PORT`
- `TEST_MCP_PORT`

## Health Checks

Each server type has a specific health check endpoint:

- Frontend: GET `/` (returns 200)
- Backend: GET `/api/health` (returns 200)
- MCP: GET `/health` (returns 200)

The health check uses exponential backoff retry logic:
- Initial delay: 100ms
- Max attempts: 30
- Max delay: 2000ms
- Backoff multiplier: 1.5

## Server Configurations

### Frontend Server
- Command: `npm run dev`
- Environment: `PORT={port}`
- URL: `http://localhost:{port}`

### Backend Server
- Command: `npm run dev:server`
- Environment: `PORT={port}`
- URL: `http://localhost:{port}`

### MCP Server
- Command: `npm run dev`
- Environment:
  - `MCP_HTTP_ENABLED=true`
  - `MCP_HTTP_PORT={port}`
  - `MCP_BIND_ADDRESS=127.0.0.1`
- URL: `http://localhost:{port}/mcp`

## Error Handling

The TestServer provides specific error types:

- `ServerStartupError`: When a server fails to start
- `TestFrameworkError`: For configuration or state issues

Example error handling:

```typescript
try {
  await testServer.start('backend', process.cwd());
} catch (error) {
  if (error instanceof ServerStartupError) {
    console.error(`Backend server failed: ${error.message}`);
    // Check backend logs or dependencies
  }
}
```

## Graceful Shutdown

The `stop()` method implements graceful shutdown:

1. Sends SIGTERM signal
2. Waits up to 5 seconds
3. Sends SIGKILL if still running
4. Cleans up process references

Always call `stopAll()` or `stop()` to ensure proper cleanup:

```typescript
// Good: Clean shutdown
await testServer.stopAll();

// Or stop specific servers
await testServer.stop('frontend');
await testServer.stop('backend');
```

## Server State Tracking

You can check the current state of each server:

```typescript
const config = testServer.getConfig('backend');
console.log(`Backend state: ${config?.state}`); // 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

// Check if ready
const isReady = await testServer.isReady('backend');
console.log(`Backend ready: ${isReady}`);
```

## Best Practices

1. **Always cleanup**: Use try/finally to ensure servers are stopped
2. **Check readiness**: Wait for `isReady()` before making requests
3. **Monitor logs**: Server output is logged to console for debugging
4. **Use test ports**: Never use development ports for tests
5. **Isolate tests**: Each test should use a fresh TestEnvironment