# Layered Manual: Using shared/test-lib

A concise guide for using the MDT isolated test environment library with 3 progressive levels.

## Quick Overview

```typescript
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
```

## Level 1: Basic Isolated Environment

Setup isolated test environments with unique temporary directories and dedicated ports.

```typescript
import { TestEnvironment } from '@mdt/shared/test-lib'
import { test } from '@playwright/test'

test.describe('Level 1: Isolation', () => {
  let testEnv: TestEnvironment

  test.beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()

    console.log('Temp dir:', testEnv.getTempDirectory())
    console.log('Config dir:', testEnv.getConfigDirectory())
    console.log('Session ID:', testEnv.getId())
    console.log('Ports:', testEnv.getPortConfig())
  })

  test.afterAll(async () => {
    await testEnv.cleanup()
  })

  test('should have isolated environment', () => {
    expect(testEnv.getTempDirectory()).toContain('/mdt-test-')

    const ports = testEnv.getPortConfig()
    expect(ports.frontend).toBe(6173) // Test ports
    expect(ports.backend).toBe(4001) // Not dev ports
    expect(ports.mcp).toBe(4002)

    // Check if initialized
    expect(testEnv.isInitialized()).toBe(true)
  })
})
```

### Key Methods

```typescript
class TestEnvironment {
  async setup(): Promise<void>              // Initialize environment
  async cleanup(): Promise<void>            // Remove all temp files
  getTempDirectory(): string                // Unique temp directory path
  getConfigDirectory(): string              // Config directory path (sets CONFIG_DIR env var)
  getPortConfig(): PortConfig               // Test port configuration
  getId(): string                           // Unique test session ID
  isInitialized(): boolean                  // Check if environment is ready
  registerCleanupHandler(handler): void    // Register custom cleanup callback
}
```

### Environment Features

- **Unique temp directory**: `/tmp/mdt-test-{uuid}/`
- **Port isolation**: 6173 (frontend), 4001 (backend), 4002 (mcp)
- **Auto cleanup**: Removes all files on cleanup
- **Process safety**: Cleanup runs even if tests crash (SIGINT, SIGTERM, etc.)
- **Auto CONFIG_DIR**: Sets `process.env.CONFIG_DIR` to isolated config directory

### Custom Global Configuration

TestEnvironment creates an empty config directory. The `CONFIG_DIR` environment variable is automatically set for MCP server use. You can add custom global config:

```typescript
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

test.beforeAll(async () => {
  testEnv = new TestEnvironment()
  await testEnv.setup()

  const configDir = testEnv.getConfigDirectory()  // Already created by setup()

  // Create projects subdirectory
  mkdirSync(join(configDir, 'projects'), { recursive: true })

  // Create custom global config with discovery settings
  const globalConfig = `[discovery]
autoDiscover = true
searchPaths = [
    "/Users/username/home",
    "/Users/username/projects"
]
`

  writeFileSync(join(configDir, 'config.toml'), globalConfig)

  // Create project registry entry
  const projectRegistry = `[project]
name = "Test Project"
path = "${testEnv.getTempDirectory()}/projects/TEST"
code = "TEST"
`

  writeFileSync(join(configDir, 'projects', 'test-project.toml'), projectRegistry)
})
```

**Note**: TestEnvironment only creates the empty config directory structure. Global config files must be created manually if needed for specific test scenarios.

---

## Level 2: Project Creation in Isolation

Create test projects with proper directory structure in the isolated environment.

```typescript
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { test } from '@playwright/test'

test.describe('Level 2: Projects', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory

  test.beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)
  })

  test.afterAll(async () => {
    await projectFactory.cleanup()  // Clean up factory resources
    await testEnv.cleanup()         // Then clean up environment
  })

  test('should create empty project', async () => {
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project',
      code: 'TEST',
      description: 'A test project',
      ticketsPath: 'docs/CRs',
      repository: 'test-repo'
    })

    expect(project.key).toBe('TEST')
    expect(project.path).toContain('/projects/TEST')
  })

  test('should create pre-configured project', async () => {
    const scenario = await projectFactory.createTestScenario('standard-project')

    expect(scenario.projectCode).toMatch(/^T[A-Z0-9]{3}$/)
    expect(scenario.crs).toHaveLength(3) // Pre-created CRs
  })
})
```

### ProjectFactory Methods

```typescript
class ProjectFactory {
  constructor(testEnv: TestEnvironment)

  // Create project
  async createProject(type?: 'empty', config?: ProjectConfig): Promise<ProjectData>

  // Create with pre-configured CRs
  async createTestScenario(type?: 'standard-project' | 'complex-project'): Promise<TestScenario>

  // Clean up factory resources
  async cleanup(): Promise<void>
}
```

### Project Configuration

```typescript
interface ProjectConfig {
  name?: string         // Project display name
  code?: string         // Project code (auto-generated if omitted)
  description?: string
  ticketsPath?: string  // Path for CRs (default: 'docs/CRs')
  repository?: string
  documentPaths?: string[]       // Document scan paths (default: ['docs'])
  excludeFolders?: string[]      // Excluded folders (default: ['node_modules', '.git'])
}
```

### Created Structure

```
/tmp/mdt-test-{uuid}/projects/TEST/
├── .mdt-config.toml    # Project configuration
├── .mdt-next          # Next CR number counter
└── docs/CRs/          # CR directory
```

---

## Level 3: Ticket/CR Creation in Isolation

Create CRs with proper YAML frontmatter and markdown content in isolated projects.

```typescript
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { test } from '@playwright/test'

test.describe('Level 3: Complete Scenario', () => {
  let testEnv: TestEnvironment
  let projectFactory: ProjectFactory

  test.beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
    projectFactory = new ProjectFactory(testEnv)
  })

  test.afterAll(async () => {
    await projectFactory.cleanup()
    await testEnv.cleanup()
  })

  test('should create CR with dependencies', async () => {
    // Create project
    const project = await projectFactory.createProject('empty', {
      name: 'Full Test Project',
      code: 'FULL'
    })

    // Create architecture CR
    const archCR = await projectFactory.createTestCR('FULL', {
      title: 'System Architecture',
      type: 'Architecture',
      priority: 'Critical',
      content: 'Design microservices architecture'
    })

    // Create implementation CR depending on architecture
    const implCR = await projectFactory.createTestCR('FULL', {
      title: 'Implement User Service',
      type: 'Feature Enhancement',
      priority: 'High',
      dependsOn: archCR.crCode,
      content: 'Create user management service'
    })

    expect(archCR.success).toBe(true)
    expect(archCR.crCode).toBe('FULL-001')
    expect(implCR.success).toBe(true)
    expect(implCR.crCode).toBe('FULL-002')
  })

  test('should create multiple CRs', async () => {
    const project = await projectFactory.createProject('empty', { code: 'MULTI' })

    const crData = [
      { title: 'User Login', type: 'Feature Enhancement', content: 'Login page' },
      { title: 'Fix Bug', type: 'Bug Fix', content: 'Fix navigation' },
      { title: 'API Docs', type: 'Documentation', content: 'Document API' }
    ]

    const results = await projectFactory.createMultipleCRs('MULTI', crData)

    expect(results).toHaveLength(3)
    expect(results.every(r => r.success)).toBe(true)
    expect(results[0].crCode).toBe('MULTI-001')
  })
})
```

### CR Creation Methods

```typescript
// Single CR
async createTestCR(projectCode: string, crData: TestCRData): Promise<TestCRResult>

// Multiple CRs
async createMultipleCRs(projectCode: string, crsData: TestCRData[]): Promise<TestCRResult[]>
```

### CR Data Structure

```typescript
interface TestCRData {
  title: string              // Required
  type: CRType               // Required: 'Feature Enhancement', 'Bug Fix', etc.
  status?: CRStatus          // Optional: Defaults to 'Proposed'
  priority?: CRPriority      // Optional: Defaults to 'Medium'
  phaseEpic?: string
  assignee?: string
  dependsOn?: string         // CR code this depends on
  blocks?: string            // CR code this blocks
  content: string            // Required: CR description
}

interface TestCRResult {
  success: boolean
  crCode?: string            // e.g., 'FULL-001'
  filePath?: string          // Full path to CR file
  error?: string
}
```

### Generated CR Format

```markdown
---
code: FULL-001
title: System Architecture
status: Proposed
type: Architecture
priority: Critical
---

# System Architecture

## 1. Description
Design microservices architecture

## 2. Rationale
To be filled...

## 3. Solution Analysis
To be filled...

## 4. Implementation Specification
To be filled...

## 5. Acceptance Criteria
To be filled...
```

## Best Practices

1. **Always cleanup** - Use `test.afterAll` to call both `projectFactory.cleanup()` and `testEnv.cleanup()`
2. **Use unique codes** - Let system generate project codes or add timestamps
3. **Check results** - Verify `success` property of CR creation results
4. **Port isolation** - Tests use 6173/4001/4002, development uses 5173/3001/3002
5. **Cleanup order** - Stop servers, then cleanup factory, then cleanup environment

## Quick Reference

```typescript
import type {
  PortConfig,
  ProjectConfig,
  TestCRData,
  TestCRResult,
} from '@mdt/shared/test-lib'

import {
  ProjectFactory,
  TestEnvironment,
} from '@mdt/shared/test-lib'

// Environment variables (optional)
// TEST_FRONTEND_PORT=6173
// TEST_BACKEND_PORT=4001
// TEST_MCP_PORT=4002
```

## File Structure

```
shared/test-lib/
├── core/
│   ├── test-environment.ts    # TestEnvironment class
│   └── project-factory.ts     # ProjectFactory class
├── types.ts                   # All type definitions
└── index.ts                   # Main exports
```

## CLI Testing Pattern (Alternative)

For CLI integration tests, you can also use the pattern from `shared/tools/__tests__/project-management/`:

```typescript
import { TestEnvironment } from '@mdt/shared/test-lib'

describe('CLI Tests', () => {
  let testEnv: TestEnvironment

  beforeAll(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
  })

  // Use testEnv.getConfigDirectory() to set CONFIG_DIR env var
  // This isolates CLI commands from your actual project config
})
```

The `CONFIG_DIR` environment variable is automatically set by `TestEnvironment.setup()`, ensuring your CLI commands use the isolated test configuration instead of your actual project configuration.
