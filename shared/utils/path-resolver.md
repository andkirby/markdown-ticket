# Path Resolver Utility

The `path-resolver.ts` utility provides centralized path operations for the markdown-ticket project. It extracts common path manipulation logic from services and provides a consistent API for path operations.

## Purpose

- Centralizes path manipulation logic
- Reduces code duplication across services
- Provides a consistent API for path operations
- Makes it easier to replace path operations if needed

## Key Functions

### Basic Path Operations
- `joinPaths(...segments: string[])` - Join path segments
- `resolvePath(basePath: string, targetPath?: string)` - Resolve to absolute path
- `getBaseName(pathString: string)` - Get file/directory name
- `getBaseNameWithoutExtension(pathString: string, extension?: string)` - Get name without extension
- `getDirName(pathString: string)` - Get parent directory
- `getRelativePath(from: string, to: string)` - Get relative path between directories
- `isAbsolutePath(pathString: string)` - Check if path is absolute
- `normalizePath(pathString: string)` - Normalize path segments

### Project-specific Operations
- `buildRegistryFilePath(registryDir: string, projectId: string)` - Build registry file path (e.g., `projects/MDT.toml`)
- `buildConfigFilePath(projectPath: string, configFileName: string)` - Build config file path within a project
- `buildProjectPath(projectPath: string, relativePath: string)` - Build a full path within a project
- `resolveProjectRelativePath(projectPath: string, targetPath: string)` - Resolve path relative to project root

## Usage Example

```typescript
import {
  buildConfigFilePath,
  buildProjectPath,
  getBaseName,
  joinPaths,
  resolvePath
} from '../utils/path-resolver.js'

// Instead of: path.join(dir, 'config.toml')
const configPath = buildConfigFilePath(projectPath, 'config.toml')

// Instead of: path.join(projectPath, 'docs', 'CRs')
const crPath = buildProjectPath(projectPath, joinPaths('docs', 'CRs'))

// Instead of: path.basename(filePath)
const fileName = getBaseName(filePath)
```

## Migration Notes

This utility was extracted from `ProjectService.ts` to centralize path operations. When adding new path operations:

1. Check if the operation already exists in the utility
2. If not, consider adding it to the utility if it's a general-purpose operation
3. Import from the utility rather than using Node.js `path` module directly

## Benefits

- **Consistency**: All services use the same path operations
- **Maintainability**: Changes to path logic only need to be made in one place
- **Readability**: Project-specific operations have descriptive names
- **Testability**: Path operations can be tested independently
