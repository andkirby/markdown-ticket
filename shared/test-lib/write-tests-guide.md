# Layered Manual: Using shared/test-lib

A concise guide for using the MDT-092 isolated test environment library with 3 progressive levels.

## Quick Overview

```typescript
import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib';
```

## Level 1: Basic Isolated Environment

Setup isolated test environments with unique temporary directories and dedicated ports.

```typescript
import { test } from '@playwright/test';
import { TestEnvironment } from '@mdt/shared/test-lib';

test.describe('Level 1: Isolation', () => {
  let testEnv: TestEnvironment;

  test.beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();

    console.log('Temp dir:', testEnv.getTempDirectory());
    console.log('Ports:', testEnv.getPortConfig());
  });

  test.afterAll(async () => {
    await testEnv.cleanup();
  });

  test('should have isolated environment', () => {
    expect(testEnv.getTempDirectory()).toContain('/mdt-test-');

    const ports = testEnv.getPortConfig();
    expect(ports.frontend).toBe(6173);  // Test ports
    expect(ports.backend).toBe(4001);   // Not dev ports
    expect(ports.mcp).toBe(4002);
  });
});
```

### Key Methods

```typescript
class TestEnvironment {
  async setup(): Promise<void>           // Initialize environment
  async cleanup(): Promise<void>         // Remove all temp files
  getTempDirectory(): string             // Unique temp directory path
  getPortConfig(): PortConfig            // Test port configuration
  createSubdir(name: string): string     // Create subdirectory
}
```

### Environment Features

- **Unique temp directory**: `/tmp/mdt-test-{uuid}/`
- **Port isolation**: 6173 (frontend), 4001 (backend), 4002 (mcp)
- **Auto cleanup**: Removes all files on cleanup
- **Process safety**: Cleanup runs even if tests crash

### Custom Global Configuration

TestEnvironment creates an empty config directory for MCP server use. You can add custom global config:

```typescript
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

test.beforeAll(async () => {
  testEnv = new TestEnvironment();
  await testEnv.setup();

  const configDir = testEnv.getConfigDirectory();

  // Create projects subdirectory
  mkdirSync(join(configDir, 'projects'), { recursive: true });

  // Create custom global config with discovery settings
  const globalConfig = `[discovery]
autoDiscover = true
searchPaths = [
    "/Users/username/home",
    "/Users/username/projects"
]
`;

  writeFileSync(join(configDir, 'config.toml'), globalConfig);

  // Create project registry entry
  const projectRegistry = `[project]
name = "Test Project"
path = "${testEnv.getTempDirectory()}/projects/TEST"
code = "TEST"
`;

  writeFileSync(join(configDir, 'projects', 'test-project.toml'), projectRegistry);
});
```

**Note**: TestEnvironment only creates the config directory structure. Global config files are not created automatically - you must create them manually if needed for specific test scenarios.

---

## Level 2: Project Creation in Isolation

Create test projects with proper directory structure in the isolated environment.

```typescript
import { test } from '@playwright/test';
import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib';

test.describe('Level 2: Projects', () => {
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

  test('should create empty project', async () => {
    const project = await projectFactory.createProject('empty', {
      name: 'Test Project',
      code: 'TEST',
      description: 'A test project',
      ticketsPath: 'docs/CRs',
      repository: 'test-repo'
    });

    expect(project.key).toBe('TEST');
    expect(project.path).toContain('/projects/TEST');
  });

  test('should create pre-configured project', async () => {
    const scenario = await projectFactory.createTestScenario('standard-project');

    expect(scenario.projectCode).toMatch(/^T[A-Z0-9]{3}$/);
    expect(scenario.crs).toHaveLength(3); // Pre-created CRs
  });
});
```

### ProjectFactory Methods

```typescript
class ProjectFactory {
  constructor(testEnv: TestEnvironment)

  // Create project
  async createProject(type?: 'empty', config?: ProjectConfig): Promise<ProjectData>

  // Create with pre-configured CRs
  async createTestScenario(type?: 'standard-project' | 'complex-project'): Promise<TestScenario>
}
```

### Project Configuration

```typescript
interface ProjectConfig {
  name?: string;              // Project display name
  code?: string;              // Project code (auto-generated if omitted)
  description?: string;
  ticketsPath?: string;            // Path for CRs (default: 'docs/CRs')
  repository?: string;
  documentPaths?: string[];   // Document scan paths (default: ['docs'])
  excludeFolders?: string[];  // Excluded folders (default: ['node_modules', '.git'])
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
import { test } from '@playwright/test';
import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib';

test.describe('Level 3: Complete Scenario', () => {
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

  test('should create CR with dependencies', async () => {
    // Create project
    const project = await projectFactory.createProject('empty', {
      name: 'Full Test Project',
      code: 'FULL'
    });

    // Create architecture CR
    const archCR = await projectFactory.createTestCR('FULL', {
      title: 'System Architecture',
      type: 'Architecture',
      priority: 'Critical',
      content: 'Design microservices architecture'
    });

    // Create implementation CR depending on architecture
    const implCR = await projectFactory.createTestCR('FULL', {
      title: 'Implement User Service',
      type: 'Feature Enhancement',
      priority: 'High',
      dependsOn: archCR.crCode,
      content: 'Create user management service'
    });

    expect(archCR.success).toBe(true);
    expect(archCR.crCode).toBe('FULL-001');
    expect(implCR.success).toBe(true);
    expect(implCR.crCode).toBe('FULL-002');
  });

  test('should create multiple CRs', async () => {
    const project = await projectFactory.createProject('empty', { code: 'MULTI' });

    const crData = [
      { title: 'User Login', type: 'Feature Enhancement', content: 'Login page' },
      { title: 'Fix Bug', type: 'Bug Fix', content: 'Fix navigation' },
      { title: 'API Docs', type: 'Documentation', content: 'Document API' }
    ];

    const results = await projectFactory.createMultipleCRs('MULTI', crData);

    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
    expect(results[0].crCode).toBe('MULTI-001');
  });
});
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
  title: string;                    // Required
  type: CRType;                     // Required: 'Feature Enhancement', 'Bug Fix', etc.
  status?: CRStatus;                // Optional: Defaults to 'Proposed'
  priority?: CRPriority;            // Optional: Defaults to 'Medium'
  phaseEpic?: string;
  assignee?: string;
  dependsOn?: string;               // CR code this depends on
  blocks?: string;                  // CR code this blocks
  content: string;                  // Required: CR description
}

interface TestCRResult {
  success: boolean;
  crCode?: string;      // e.g., 'FULL-001'
  filePath?: string;    // Full path to CR file
  error?: string;
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

1. **Always cleanup** - Use `test.afterAll` to call `testEnv.cleanup()`
2. **Use unique codes** - Let system generate project codes or add timestamps
3. **Check results** - Verify `success` property of CR creation results
4. **Port isolation** - Tests use 6173/4001/4002, development uses 5173/3001/3002

## Quick Reference

```typescript
// All imports
import {
  TestEnvironment,
  ProjectFactory,
  type PortConfig,
  type ProjectConfig,
  type TestCRData,
  type TestCRResult
} from '@mdt/shared/test-lib';

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