# Issues: shared/test-lib Bug Discovery

**CR**: MDT-104
**Date**: 2025-12-25
**Source**: E2E test specification discussion
**Impact**: Tests will fail until these bugs are fixed

---

## Issue 1: Hardcoded ticketsPath in CR File Creation

### Location
`shared/test-lib/core/project-factory.ts:311`

### Current Code
```typescript
// Line 311 - HARDCODED PATH
const crPath = join(projectPath, 'docs/CRs', `${crCode}.md`);
```

### Problem
When creating a project with custom `ticketsPath`, the directory is created correctly and the config file reflects the custom path, **but CR files are still written to the hardcoded `docs/CRs/` directory**.

### Flow Analysis

| Step | Code Location | Uses `config.ticketsPath`? |
|------|---------------|----------------------------|
| Default value | Line 142 | ✅ `crPath: 'docs/CRs'` |
| Directory creation | Line 199 | ✅ `join(projectPath, config.crPath \|\| 'docs/CRs')` |
| Config file write | Line 276 | ✅ `ticketsPath = "${config.crPath \|\| 'docs/CRs'}"` |
| **CR file write** | **Line 311** | ❌ **Hardcoded `'docs/CRs'`** |

### Reproduction
```typescript
// Create project with custom path
const project = await projectFactory.createProject('empty', {
  ticketsPath: 'some-dir/specs'  // Custom path
});

// Expected: some-dir/specs/TEST-001.md created
// Actual: docs/CRs/TEST-001.md created (wrong location!)
```

### Fix Required

**Change line 311 from:**
```typescript
const crPath = join(projectPath, 'docs/CRs', `${crCode}.md`);
```

**To:**
```typescript
// Read the project config to get ticketsPath, or pass it through
const configPath = join(projectPath, '.mdt-config.toml');
const configContent = readFileSync(configPath, 'utf-8');
// Parse TOML to extract ticketsPath, then:
const crPath = join(projectPath, ticketsPathFromConfig, `${crCode}.md`);
```

**Better approach - Store ticketsPath in instance:**
```typescript
export class ProjectFactory {
  private testEnv: TestEnvironment;
  private projectsDir: string;
  private retryHelper: RetryHelper;
  private projectConfigs: Map<string, ProjectConfig> = new Map();  // ADD THIS

  // In createProject(), store the config:
  async createProject(type: 'empty' = 'empty', config: ProjectConfig = {}): Promise<ProjectData> {
    // ... existing code ...
    this.projectConfigs.set(projectCode, finalConfig);  // STORE IT
    return { key: projectCode, path: projectPath, config: finalConfig };
  }

  // In createTestCR(), use stored config:
  async createTestCR(projectCode: string, crData: TestCRData): Promise<TestCRResult> {
    const projectConfig = this.projectConfigs.get(projectCode);
    if (!projectConfig) {
      return { success: false, error: `Project ${projectCode} not found` };
    }
    const ticketsDir = join(projectPath, projectConfig.crPath || 'docs/CRs');
    const crPath = join(ticketsDir, `${crCode}.md`);
    // ... rest of code ...
  }
}
```

---

## Issue 2: Missing Title Slug in CR Filename

### Location
`shared/test-lib/core/project-factory.ts:310-311`

### Current Code
```typescript
const crCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
const crPath = join(projectPath, 'docs/CRs', `${crCode}.md`);
// Filename is just: TEST-001.md
```

### Problem
The real system (`shared/services/TicketService.ts`) uses **title-based slugs** in filenames, but `test-lib` only uses the CR code.

### Expected Filename Format

| System | Format | Example |
|--------|--------|---------|
| **Real system** | `{CODE}-{title-slug}.md` | `TEST-001-add-user-authentication.md` |
| **Test-lib (current)** | `{CODE}.md` | `TEST-001.md` ❌ |

### Real System Implementation

**File**: `shared/services/TicketService.ts:129-131`

```typescript
// Create filename slug from title
const titleSlug = this.createSlug(data.title);
const filename = `${crKey}-${titleSlug}.md`;
```

**Slug function** (`shared/services/TicketService.ts:493-501`):

```typescript
private createSlug(title: string): string {
  return title
    .toLowerCase()                    // "Add User Auth" → "add user auth"
    .replace(/[^a-z0-9\s-]/g, '')     // Remove special chars
    .replace(/\s+/g, '-')             // Spaces → hyphens
    .replace(/-+/g, '-')              // Collapse multiple hyphens
    .replace(/^-|-$/g, '')            // Trim leading/trailing
    .substring(0, 50);                // Max 50 chars
}
```

### Slug Transformation Examples

| Title | Slug |
|-------|------|
| `"Add User Authentication"` | `add-user-authentication` |
| `"Fix Navigation Bug"` | `fix-navigation-bug` |
| `"API: GET /users"` | `api-get-users` |
| `"Multiple   Spaces---Here"` | `multiple-spaces-here` |

### Fix Required

**Add slug function to `project-factory.ts`:**

```typescript
/**
 * Create URL-safe slug from title (matches TicketService behavior)
 */
private createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}
```

**Update `createTestCR()` around line 310-311:**

```typescript
// Before:
const crCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
const crPath = join(projectPath, 'docs/CRs', `${crCode}.md`);

// After:
const crCode = `${projectCode}-${String(nextNumber).padStart(3, '0')}`;
const titleSlug = this.createSlug(crData.title);
const filename = `${crCode}-${titleSlug}.md`;
const crPath = join(projectPath, projectConfig.crPath || 'docs/CRs', filename);
```

---

## Issue 3: Naming Inconsistency - `crPath` vs `ticketsPath`

### Locations
- `shared/test-lib/core/project-factory.ts:39` - Interface definition
- `shared/test-lib/core/project-factory.ts:142` - Default value
- `shared/test-lib/core/project-factory.ts:199` - Directory creation
- `shared/test-lib/core/project-factory.ts:276` - Config file write

### Current Code
```typescript
// Line 39 - Interface uses "crPath"
export interface ProjectConfig {
  crPath?: string;  // ← Should be "ticketsPath"
  // ...
}

// Line 142 - Default value
const finalConfig: ProjectConfig = {
  crPath: 'docs/CRs',  // ← Should be "ticketsPath"
  // ...
};

// Line 276 - Written to config file
ticketsPath = "${config.crPath || 'docs/CRs'}"
//            ^^^^^^^^^^^^
//            Inconsistent naming!
```

### Problem
- Interface property is `crPath`
- Config file field is `ticketsPath`
- This creates confusion and doesn't match the real system naming

### Real System Naming

**File**: `shared/models/Project.ts`

```typescript
export interface LocalProjectConfig {
  ticketsPath?: string;  // ← Uses "ticketsPath"
  // ...
}
```

**Config file format** (`.mdt-config.toml`):

```toml
[project]
ticketsPath = "docs/CRs"  # ← Config file uses "ticketsPath"
```

### Fix Required

**Rename `crPath` to `ticketsPath` throughout `project-factory.ts`:**

```typescript
// Interface (line ~39)
export interface ProjectConfig {
  ticketsPath?: string;  // ← Was: crPath
  // ...
}

// Default value (line ~142)
const finalConfig: ProjectConfig = {
  ticketsPath: 'docs/CRs',  // ← Was: crPath
  // ...
};

// Directory creation (line ~199)
const crsPath = join(projectPath, config.ticketsPath || 'docs/CRs');  // ← Was: config.crPath

// Config file generation (line ~276)
ticketsPath = "${config.ticketsPath || 'docs/CRs'}"  // ← Was: config.crPath
```

**Also update `write-tests-guide.md` documentation** to use `ticketsPath`.

---

## Issue 4: MCP Server Missing `CONFIG_DIR` Environment Variable

### Location
`shared/test-lib/core/test-server.ts:165`

### Current Code
```typescript
case 'mcp':
  return { ...base, type: 'mcp', args: ['run', 'dev'], env: {
    MCP_HTTP_ENABLED: 'true',
    MCP_HTTP_PORT: port.toString(),
    MCP_BIND_ADDRESS: '127.0.0.1'
  }, url: `http://localhost:${port}/mcp`, healthEndpoint: '/health' };
```

### Problem
Both backend and MCP servers use `process.env.CONFIG_DIR` for project discovery (see `shared/utils/constants.ts:52`), but only the backend server receives this environment variable. The MCP server in isolated test environments cannot discover projects created during tests.

### CONFIG_DIR Usage in Real System

**File**: `shared/utils/constants.ts:50-52`

```typescript
function getOrCreateConfigDir(): string {
  // Try environment variable first
  let configDir = process.env.CONFIG_DIR;
  // ...
}
```

Both servers read this to discover projects in the global config registry.

### Current Test Server CONFIG_DIR Handling

| Server | Passes `CONFIG_DIR`? | Code Location |
|--------|---------------------|---------------|
| Backend | ✅ Yes | Line 159: `...(configDir && { CONFIG_DIR: configDir })` |
| **MCP** | ❌ **No** | **Line 165 - Missing** |

### Impact

When running E2E tests that create projects via `ProjectFactory`:
1. `TestEnvironment.setup()` sets `process.env.CONFIG_DIR` to isolated temp directory
2. Backend server receives `CONFIG_DIR` via child process env → ✅ Can discover test projects
3. MCP server does **not** receive `CONFIG_DIR` → ❌ Falls back to user's home directory → Cannot discover test projects

### Fix Required

**Change line 165 from:**
```typescript
case 'mcp':
  return { ...base, type: 'mcp', args: ['run', 'dev'], env: {
    MCP_HTTP_ENABLED: 'true',
    MCP_HTTP_PORT: port.toString(),
    MCP_BIND_ADDRESS: '127.0.0.1'
  }, url: `http://localhost:${port}/mcp`, healthEndpoint: '/health' };
```

**To:**
```typescript
case 'mcp':
  return {
    ...base,
    type: 'mcp',
    args: ['run', 'dev'],
    env: {
      MCP_HTTP_ENABLED: 'true',
      MCP_HTTP_PORT: port.toString(),
      MCP_BIND_ADDRESS: '127.0.0.1',
      ...(configDir && { CONFIG_DIR: configDir }) // ADD THIS - Pass CONFIG_DIR to MCP server
    },
    url: `http://localhost:${port}/mcp`,
    healthEndpoint: '/health'
  };
```

### Reference

The MCP server tests already correctly pass `CONFIG_DIR`:
- `mcp-server/tests/e2e/helpers/mcp-client-sim.ts:115`
- `mcp-server/tests/e2e/helpers/mcp-transports.ts:44`
- `mcp-server/tests/e2e/helpers/mcp-transports.ts:118`

```typescript
env: {
  // ...
  CONFIG_DIR: this.testEnv.getConfigDir()  // ← Correct pattern
}
```

---

## Summary of Required Changes

### File: `shared/test-lib/core/project-factory.ts`

| Line | Change | Type |
|------|--------|------|
| 39 | `crPath` → `ticketsPath` | Rename |
| 142 | `crPath: 'docs/CRs'` → `ticketsPath: 'docs/CRs'` | Rename |
| 199 | `config.crPath` → `config.ticketsPath` | Rename |
| 276 | `config.crPath` → `config.ticketsPath` | Rename |
| ~100 | Add `private projectConfigs: Map<string, ProjectConfig>` | Add field |
| ~140 | Store config in map: `this.projectConfigs.set(projectCode, finalConfig)` | Add statement |
| ~495 | Add `createSlug()` method | Add method |
| 310-311 | Add title slug to filename, use stored config | Replace |

### File: `shared/test-lib/core/test-server.ts`

| Line | Change | Type |
|------|--------|------|
| 165 | Add `...(configDir && { CONFIG_DIR: configDir })` to MCP env | Add |

### File: `shared/test-lib/write-tests-guide.md`

| Section | Change |
|---------|--------|
| All references | `crPath` → `ticketsPath` |
| Examples | Update to show title-slug filenames |

---

## Testing After Fixes

After applying fixes, verify with:

```typescript
// Test 1: Custom ticketsPath
const project = await projectFactory.createProject('empty', {
  ticketsPath: 'some-dir/specs'
});
await projectFactory.createTestCR(project.key, {
  title: 'Add User Auth',
  type: 'Feature Enhancement',
  content: 'Test'
});

// Verify:
// 1. Directory some-dir/specs/ exists
// 2. File: some-dir/specs/TEST-001-add-user-auth.md
// 3. Config file has: ticketsPath = "some-dir/specs"

// Test 2: Default ticketsPath
const project2 = await projectFactory.createProject('empty');
await projectFactory.createTestCR(project2.key, {
  title: 'Fix Bug',
  type: 'Bug Fix',
  content: 'Test'
});

// Verify:
// 1. Directory docs/CRs/ exists
// 2. File: docs/CRs/TEST-001-fix-bug.md

// Test 3: MCP server discovers test projects
const testEnv = new TestEnvironment();
await testEnv.setup();

const project = await projectFactory.createProject('empty', { name: 'MCP Test' });
await projectFactory.createTestCR(project.key, {
  title: 'MCP Discovery Test',
  type: 'Feature Enhancement',
  content: 'Test'
});

const testServer = new TestServer(testEnv.getPortConfig());
await testServer.start('mcp', testEnv.getTempDirectory());

// MCP server should be able to discover and list the created project
// via MCP tools (verify by calling mcp__mdt-all__list_projects)
```

---

## Priority

| Issue | Priority | Reason |
|-------|----------|--------|
| #3 Naming | Low | Cosmetic inconsistency, doesn't break functionality |
| #1 Hardcoded path | **High** | Breaks custom path feature completely |
| #2 Missing slug | **High** | Filename format doesn't match real system |
| #4 MCP CONFIG_DIR | **High** | MCP server cannot discover test projects in isolated environments |

**Recommended fix order**: #3 → #1 → #2 → #4 (do naming first to avoid confusion, then fix the functional bugs, finally fix MCP discovery)
