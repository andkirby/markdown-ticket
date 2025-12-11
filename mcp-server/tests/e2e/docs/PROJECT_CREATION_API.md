# Simple Project Creation API for E2E Tests

This guide shows how to use the simple project creation API for E2E tests.

## Overview

The project creation API provides a simple way to create test projects in E2E tests.

**Important:** This creates minimal test-specific configuration, not production-ready projects. The helper creates just enough configuration for MCP tools to discover and work with projects during testing. For production project creation, use the shared services directly.

## Usage

### 1. Using the Test Environment Helper

The simplest way to create projects is using the `createProject` method available in the test environment:

```typescript
import { createTestEnvironment, cleanupTestEnvironment } from './helpers/testEnvironment';

describe('My Test Suite', () => {
  let testEnv: any;

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
  });

  afterEach(async () => {
    await cleanupTestEnvironment(testEnv);
  });

  test('should create project', async () => {
    // Create a project with default settings
    const project = await testEnv.createProject('My Test Project');

    expect(project.project.name).toBe('My Test Project');
    expect(project.project.code).toBe('MTP'); // Auto-generated
  });
});
```

### 2. Creating Projects with Custom Options

```typescript
// Create project with custom configuration
const project = await testEnv.createProject('Custom Project', {
  code: 'CUST',                    // Custom project code
  description: 'A custom project',  // Project description
  repository: 'https://github.com/user/repo', // Repository URL
  ticketsPath: 'tickets',          // Custom tickets path (default: docs/CRs)
  globalOnly: false,               // Create local config file
  createProjectPath: true          // Auto-create project directory
});
```

### 3. Using the ProjectCreationHelper Directly

For more control, you can use the `ProjectCreationHelper` class directly:

```typescript
import { ProjectCreationHelper } from './helpers/projectCreationHelper';

const helper = new ProjectCreationHelper();

// Create a single project
const project = await helper.createProject({
  name: 'My Project',
  code: 'MY',
  path: '/path/to/project',
  description: 'Test project',
  createProjectPath: true
});

// Create a test project with sensible defaults
const testProject = await helper.createTestProject('Test Project');

// Create multiple projects
const projects = await helper.createTestProjects([
  'Project One',
  'Project Two',
  { name: 'Project Three', code: 'P3' }
]);
```

## API Reference

### ProjectCreationHelper

#### Methods

- `createProject(options: CreateProjectOptions)`: Create a project with full options
- `createTestProject(name: string, overrides?: Partial<CreateProjectOptions>)`: Create a test project with defaults
- `createTestProjects(projects: Array<string | CreateProjectOptions>)`: Create multiple projects

### CreateProjectOptions

```typescript
interface CreateProjectOptions {
  name: string;                // Required: Project name
  code?: string;              // Optional: Project code (auto-generated if not provided)
  path: string;               // Required: Project file system path
  description?: string;       // Optional: Project description
  repository?: string;        // Optional: Repository URL
  globalOnly?: boolean;       // Optional: Global-only mode (default: false)
  createProjectPath?: boolean; // Optional: Auto-create directory (default: false)
  ticketsPath?: string;       // Optional: Tickets path (default: docs/CRs)
}
```

### TestEnvironment Extension

The test environment now includes a `createProject` method:

```typescript
interface TestEnvironment {
  // ... existing methods ...
  createProject(name: string, overrides?: any): Promise<any>;
}
```

## Examples

### Example 1: Basic Project Creation

```typescript
test('should create and verify project', async () => {
  // Create project
  const project = await testEnv.createProject('Example Project');

  // Verify project properties
  expect(project.project.name).toBe('Example Project');
  expect(project.project.active).toBe(true);

  // Verify it appears in project list
  const listResult = await client.callTool('list_projects');
  expect(listResult.content).toContain('EXAMPLE');
});
```

### Example 2: Project with CRs

```typescript
test('should create project with CRs', async () => {
  // Create project
  await testEnv.createProject('CR Test Project', {
    code: 'CRTEST'
  });

  // Register for CR creation
  await testEnv.registerProject('CRTEST', {
    name: 'CR Test Project',
    code: 'CRTEST',
    crPath: 'docs/CRs'
  });

  // Create CR
  await testEnv.createCR('CRTEST-001', {
    title: 'Test CR',
    type: 'Feature Enhancement'
  });

  // Verify CR exists
  const crList = await client.callTool('list_crs', { project: 'CRTEST' });
  expect(crList.content).toContain('CRTEST-001');
});
```

### Example 3: Multiple Projects

```typescript
test('should handle multiple projects', async () => {
  // Create multiple projects
  const projects = await Promise.all([
    testEnv.createProject('Project A'),
    testEnv.createProject('Project B'),
    testEnv.createProject('Project C')
  ]);

  // Verify all exist
  const listResult = await client.callTool('list_projects');
  expect(listResult.content).toContain('PROJECT');
  expect(listResult.content).toMatch(/PROJECT[ABC]/g);
});
```

## Integration with Existing Tests

The project creation API integrates seamlessly with existing E2E test patterns:

1. **Automatic Cleanup**: Projects are automatically cleaned up when the test environment is cleaned up
2. **Isolated Config**: Each test gets its own CONFIG_DIR to avoid conflicts
3. **MCP Integration**: Created projects are immediately available to MCP tools
4. **Validation**: Full validation through ProjectManager ensures realistic test data

## Best Practices

1. **Use Descriptive Names**: Project names should be descriptive for better test readability
2. **Leverage Defaults**: Use `createTestProject()` for most cases to avoid boilerplate
3. **Test Isolation**: Each test should create its own projects to avoid cross-test dependencies
4. **Verify Creation**: Always verify projects were created successfully before using them
5. **Clean Paths**: Use the temp directory provided by the test environment for project paths

## Migration from Manual Setup

Before (manual setup):
```typescript
// Create temp directory manually
const projectDir = await createTempDir();
await mkdir(join(projectDir, 'docs/CRs'), { recursive: true });

// Create config file manually
const configContent = `[project]
name = "Test Project"
code = "TEST"
cr_path = "docs/CRs"
`;
await writeFile(join(projectDir, '.mdt-config.toml'), configContent);

// Register manually
await registerTestProject(projectDir, 'TEST');
```

After (using API):
```typescript
// Single line
const project = await testEnv.createProject('Test Project', { code: 'TEST' });
```

The API handles all the boilerplate while providing the same functionality with better error handling and validation.