# E2E Test Helpers

This directory contains helper utilities for E2E testing of the MCP server.

## TestEnvironment

The `TestEnvironment` class provides isolated temporary directories for E2E testing with proper cleanup mechanisms.

### Usage Example

```typescript
import { TestEnvironment } from './test-environment'

describe('My E2E Test', () => {
  let testEnv: TestEnvironment

  beforeEach(async () => {
    testEnv = new TestEnvironment()
    await testEnv.setup()
  })

  afterEach(async () => {
    await testEnv.cleanup()
  })

  it('should create isolated test environment', async () => {
    const tempDir = testEnv.getTempDir()
    const configDir = testEnv.getConfigDir()

    // Create a test project structure
    const projectDir = testEnv.createProjectDir('test-project')

    testEnv.createProjectStructure('test-project', {
      'docs/CRs': true, // Directory
      '.mdt-config.toml': 'code = TEST', // File with content
      'README.md': '# Test Project' // File with content
    })
  })
})
```

### Features

- **Isolated Directories**: Creates unique temporary directories for each test run
- **Config Directory**: Provides dedicated config directory for MCP server testing
- **Project Structures**: Supports creating complex project directory trees
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Safety Checks**: Prevents accidental deletion outside temp directories
- **Error Handling**: Provides clear error messages for debugging
- **Automatic Cleanup**: Removes all temporary files after tests

### API Reference

#### `TestEnvironment`

- `setup()`: Initialize the test environment
- `getTempDir()`: Get temporary directory path
- `getConfigDir()`: Get config directory path
- `createProjectDir(name)`: Create a project directory
- `createProjectStructure(name, structure)`: Create directories and files
- `cleanup()`: Remove all temporary files
- `isInitialized()`: Check if environment is setup

#### `ProjectStructure`

Object defining directory structure:
- `{ 'path/to/dir': true }` - Creates a directory
- `{ 'path/to/file': 'content' }` - Creates a file with content

#### `TestEnvironmentError`

Custom error type thrown when test environment operations fail.
