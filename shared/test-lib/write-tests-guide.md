# Complete Guide: Writing Tests with shared/test-lib

This guide explains how to write tests using the MDT-092 isolated test environment library (`@mdt/shared/test-lib`).

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core Concepts](#core-concepts)
3. [Test Environment Setup](#test-environment-setup)
4. [Creating Test Projects](#creating-test-projects)
5. [Creating Test Tickets/CRs](#creating-test-ticketscrs)
6. [Server Management](#server-management)
7. [Best Practices](#best-practices)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)
10. [Examples](#examples)

## Quick Start

```typescript
import { test, expect } from '@playwright/test';
import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib';

test.describe('My Feature Tests', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;

  test.beforeAll(async () => {
    // Create isolated test environment
    testEnv = new TestEnvironment();
    await testEnv.setup();

    // Create project factory
    projectFactory = new ProjectFactory(testEnv);
  });

  test.afterAll(async () => {
    // Clean up test environment
    await testEnv.cleanup();
  });

  test('should create a test project', async () => {
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project',
      code: 'TEST'
    });

    expect(project.key).toBe('TEST');
    expect(project.path).toBeDefined();
  });
});
```

## Core Concepts

### Test Environment
- **Purpose**: Provides isolated execution environment with unique temporary directories
- **Ports**: Uses static ports (frontend: 6173, backend: 4001, mcp: 4002) to avoid conflicts
- **Cleanup**: Automatically removes all temporary files

### Project Factory
- **Purpose**: Creates test projects and CRs using file I/O (no MCP server required)
- **Location**: Creates projects in temporary directory
- **Auto-numbering**: Generates sequential CR numbers (e.g., TEST-001, TEST-002)

### Port Isolation
```
Development:  Frontend: 5173, Backend: 3001, MCP: 3002
Tests:         Frontend: 6173, Backend: 4001, MCP: 4002
```

## Test Environment Setup

### Basic Setup

```typescript
import { TestEnvironment } from '@mdt/shared/test-lib';

const testEnv = new TestEnvironment();
await testEnv.setup();

// Get configuration
const portConfig = testEnv.getPortConfig();
const tempDir = testEnv.getTempDirectory();

// Use environment...
await testEnv.cleanup();
```

### Available Methods

```typescript
class TestEnvironment {
  // Setup isolated environment
  async setup(): Promise<void>

  // Clean up all temporary files
  async cleanup(): Promise<void>

  // Get temporary directory path
  getTempDirectory(): string

  // Get port configuration
  getPortConfig(): PortConfig

  // Create subdirectory within temp dir
  createSubdir(name: string): string
}
```

### Port Configuration

```typescript
interface PortConfig {
  frontend: number;  // 6173
  backend: number;   // 4001
  mcp: number;       // 4002
}
```

## Creating Test Projects

### Empty Project

```typescript
const project = await projectFactory.createProject('empty', {
  name: 'Test Project',
  code: 'TEST',
  description: 'A test project',
  crPath: 'docs/CRs',
  repository: 'test-repo'
});

// Returns:
interface ProjectData {
  key: string;       // 'TEST'
  path: string;      // '/tmp/mdt-test-uuid/projects/TEST'
  config: ProjectConfig;
}
```

### Pre-configured Project

```typescript
const project = await projectFactory.createProject('standard-project');
```

### Complex Project

```typescript
const project = await projectFactory.createProject('complex-project');
```

### Project Configuration Options

```typescript
interface ProjectConfig {
  name?: string;
  code?: string;              // Auto-generated if not provided
  description?: string;
  crPath?: string;            // Default: 'docs/CRs'
  repository?: string;
  documentPaths?: string[];   // Default: ['docs']
  excludeFolders?: string[];  // Default: ['node_modules', '.git']
}
```

## Creating Test Tickets/CRs

### Simple CR Creation

```typescript
const crResult = await projectFactory.createTestCR('TEST', {
  title: 'Feature: Add search functionality',
  type: 'Feature Enhancement',
  priority: 'High',
  status: 'Proposed',
  content: 'Add search bar to main page with filters'
});

// Returns:
interface TestCRResult {
  success: boolean;
  crCode: string;       // 'TEST-001'
  filePath: string;     // Path to CR file
  error?: string;       // On failure
}
```

### Full CR Content

```typescript
const crResult = await projectFactory.createTestCR('TEST', {
  title: 'Bug: Fix login issue',
  type: 'Bug Fix',
  priority: 'Critical',
  status: 'In Progress',
  phaseEpic: 'Phase 1',
  assignee: 'developer@example.com',
  content: 'Users cannot login with valid credentials'
});
```

### CR Data Structure

```typescript
interface TestCRData {
  title: string;
  type: CRType;                    // 'Feature Enhancement', 'Bug Fix', etc.
  priority?: CRPriority;            // 'Low', 'Medium', 'High', 'Critical'
  status?: CRStatus;                // 'Proposed', 'Approved', etc.
  phaseEpic?: string;
  assignee?: string;
  content: string;                  // Simple string content
}
```

### Generated CR File Format

```markdown
---
code: TEST-001
title: Feature: Add search functionality
type: Feature Enhancement
priority: High
status: Proposed
---

# Feature: Add search functionality

## 1. Description
Add search bar to main page with filters

## 2. Rationale
To be filled...

## 3. Solution Analysis
To be filled...

## 4. Implementation Specification
To be filled...

## 5. Acceptance Criteria
To be filled...
```

## Server Management

### Starting Servers

```typescript
import { TestServer } from '@mdt/shared/test-lib';

const testServer = new TestServer(portConfig);

// Start backend server
await testServer.start('backend', testEnv.getTempDirectory());

// Start frontend server
await testServer.start('frontend', testEnv.getTempDirectory());

// Start MCP server (optional)
await testServer.start('mcp', testEnv.getTempDirectory());

// Stop all servers
await testServer.stopAll();
```

### Server Configuration

```typescript
interface ServerConfig {
  command: string;    // Command to run
  args: string[];     // Command arguments
  env: Record<string, string>;  // Environment variables
  url: string;        // Server URL
  port: number;       // Server port
  healthEndpoint?: string;  // Health check endpoint
}
```

### Health Checks

Servers are automatically health-checked before the start method returns. The test will fail if a server doesn't become healthy within the timeout period.

## Best Practices

### 1. Always Clean Up

```typescript
test.afterEach(async () => {
  // Clean up after each test
  await testEnv.cleanup();
});

// Or use test.afterAll for suite-level cleanup
test.afterAll(async () => {
  await testEnv.cleanup();
});
```

### 2. Use Unique Project Codes

```typescript
// Good: Unique per test
const projectCode = `TEST${Date.now()}`;
const project = await projectFactory.createProject('empty', {
  code: projectCode
});

// Bad: Fixed code can cause conflicts
const project = await projectFactory.createProject('empty', {
  code: 'TEST'  // Multiple tests with same code can conflict
});
```

### 3. Verify File Creation

```typescript
import { promises as fs } from 'fs';
import path from 'path';

// Verify project was created
const configPath = path.join(project.path, '.mdt-config.toml');
await fs.access(configPath);

// Verify CR was created
const crPath = path.join(project.path, 'docs', 'CRs', `${crCode}.md`);
await fs.access(crPath);
```

### 4. Check Port Configuration

```typescript
const portConfig = testEnv.getPortConfig();

// Ensure test ports don't conflict with dev ports
expect(portConfig.frontend).not.toBe(5173);
expect(portConfig.backend).not.toBe(3001);

// Use correct URLs
const frontendUrl = `http://localhost:${portConfig.frontend}`;
const backendUrl = `http://localhost:${portConfig.backend}`;
```

### 5. Handle Errors Gracefully

```typescript
try {
  const result = await projectFactory.createTestCR('TEST', crData);
  expect(result.success).toBe(true);
} catch (error) {
  console.error('Failed to create CR:', error);
  throw error;
}
```

## Common Patterns

### Pattern 1: E2E Test with Servers

```typescript
test.describe('Feature E2E Tests', () => {
  let testEnv: TestEnvironment;
  let testServer: TestServer;
  let projectFactory: ProjectFactory;
  let frontendUrl: string;
  let backendUrl: string;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();

    const portConfig = testEnv.getPortConfig();
    frontendUrl = `http://localhost:${portConfig.frontend}`;
    backendUrl = `http://localhost:${portConfig.backend}`;

    testServer = new TestServer(portConfig);
    await testServer.start('backend', testEnv.getTempDirectory());
    await testServer.start('frontend', testEnv.getTempDirectory());

    projectFactory = new ProjectFactory(testEnv);
  });

  test.afterAll(async () => {
    await testServer.stopAll();
    await testEnv.cleanup();
  });

  test('should display tickets on board', async ({ page }) => {
    // Create test data
    const project = await projectFactory.createProject('empty');
    await projectFactory.createTestCR(project.key, {
      title: 'Test Ticket',
      type: 'Feature Enhancement',
      content: 'Test content'
    });

    // Test UI
    await page.goto(frontendUrl);
    // ... test implementation
  });
});
```

### Pattern 2: Unit Tests for Test Library

```typescript
test.describe('TestEnvironment Unit Tests', () => {
  test('should create unique temp directories', async () => {
    const env1 = new TestEnvironment();
    const env2 = new TestEnvironment();

    await env1.setup();
    await env2.setup();

    const dir1 = env1.getTempDirectory();
    const dir2 = env2.getTempDirectory();

    expect(dir1).not.toBe(dir2);

    await env1.cleanup();
    await env2.cleanup();
  });
});
```

### Pattern 3: Data-Driven Tests

```typescript
const testCases = [
  { type: 'Feature Enhancement', expected: true },
  { type: 'Bug Fix', expected: true },
  { type: 'Documentation', expected: true }
];

test.describe('CR Creation', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    projectFactory = new ProjectFactory(testEnv);
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test.each(testCases)('should create $type CR', async ({ type, expected }) => {
    const project = await projectFactory.createProject('empty');
    const result = await projectFactory.createTestCR(project.key, {
      title: `Test ${type}`,
      type: type as CRType,
      content: 'Test content'
    });

    expect(result.success).toBe(expected);
  });
});
```

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```typescript
   // ❌ Wrong import
   import { TestEnvironment } from '../../shared/test-lib';

   // ✅ Correct import
   import { TestEnvironment } from '@mdt/shared/test-lib';
   ```

2. **Port Conflicts**
   ```typescript
   // Check if dev servers are running
   // Tests use ports 6173, 4001, 4002
   // Dev servers use ports 5173, 3001, 3002

   // Stop dev servers or use test ports
   ```

3. **File Not Found**
   ```typescript
   // Verify file paths
   const fs = await import('fs/promises');
   const path = await import('path');

   const crPath = path.join(project.path, 'docs', 'CRs', `${crCode}.md`);
   const exists = await fs.access(crPath).then(() => true).catch(() => false);
   console.log(`CR exists: ${exists}, path: ${crPath}`);
   ```

4. **Cleanup Issues**
   ```typescript
   // Always use try/finally for cleanup
   try {
     // Test code
   } finally {
     await testEnv.cleanup();
   }
   ```

### Debug Tips

1. **Enable Debug Logging**
   ```typescript
   // Add console.log to see file paths
   console.log('Temp directory:', testEnv.getTempDirectory());
   console.log('Project path:', project.path);
   ```

2. **Check File Contents**
   ```typescript
   const content = await fs.readFile(crPath, 'utf8');
   console.log('CR content:', content);
   ```

3. **Verify Server Status**
   ```bash
   # Check if ports are in use
   lsof -i :6173
   lsof -i :4001
   lsof -i :4002
   ```

## Examples

### Example 1: API Testing

```typescript
test.describe('Ticket API Tests', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;
  let project: ProjectData;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    projectFactory = new ProjectFactory(testEnv);
    project = await projectFactory.createProject('empty', {
      name: 'API Test Project',
      code: 'API'
    });
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test('should create ticket via API', async ({ request }) => {
    const response = await request.post('/api/tickets', {
      data: {
        title: 'API Test Ticket',
        type: 'Feature Enhancement',
        content: 'Created via API'
      }
    });

    expect(response.ok()).toBeTruthy();
    const ticket = await response.json();
    expect(ticket.code).toMatch(/^API-\d+$/);
  });
});
```

### Example 2: Database Testing

```typescript
test.describe('Database Tests with Test Data', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    projectFactory = new ProjectFactory(testEnv);

    // Create test data
    const project = await projectFactory.createProject('empty', {
      name: 'DB Test Project',
      code: 'DB'
    });

    // Create multiple CRs
    for (let i = 1; i <= 10; i++) {
      await projectFactory.createTestCR('DB', {
        title: `Test Ticket ${i}`,
        type: 'Feature Enhancement',
        content: `Test content ${i}`
      });
    }
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test('should query tickets with pagination', async ({ request }) => {
    const response = await request.get('/api/tickets?page=1&limit=5');
    const tickets = await response.json();

    expect(tickets).toHaveLength(5);
    expect(tickets[0].code).toBe('DB-001');
  });
});
```

### Example 3: Performance Testing

```typescript
test.describe('Performance Tests', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    projectFactory = new ProjectFactory(testEnv);
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test('should create 100 tickets quickly', async () => {
    const project = await projectFactory.createProject('empty', {
      code: 'PERF'
    });

    const start = Date.now();

    // Create 100 tickets
    const promises = [];
    for (let i = 1; i <= 100; i++) {
      promises.push(
        projectFactory.createTestCR('PERF', {
          title: `Ticket ${i}`,
          type: 'Feature Enhancement',
          content: `Content ${i}`
        })
      );
    }

    await Promise.all(promises);
    const duration = Date.now() - start;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
    console.log(`Created 100 tickets in ${duration}ms`);
  });
});
```

## Reference

### All Imports

```typescript
import {
  // Core classes
  TestEnvironment,
  TestServer,
  ProjectFactory,
  FileTicketCreator,

  // Configuration
  DEFAULT_TEST_PORTS,
  getPortConfig,

  // Types
  type PortConfig,
  type ProjectConfig,
  type TestCRData,
  type TestCRResult,

  // Errors
  TestFrameworkError,
  ServerStartupError,
  ProjectFactoryError,

  // Utilities
  TempDirectoryManager,
  ProcessHelper,
  RetryHelper
} from '@mdt/shared/test-lib';
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_FRONTEND_PORT` | 6173 | Override frontend test port |
| `TEST_BACKEND_PORT` | 4001 | Override backend test port |
| `TEST_MCP_PORT` | 4002 | Override MCP test port |
| `PWTEST_SKIP_WEB_SERVER` | undefined | Skip Playwright server management |

### File Paths

- Test library source: `shared/test-lib/`
- Compiled output: `shared/dist/test-lib/`
- Test files: `tests/e2e/`
- Documentation: `docs/testing-guide.md`