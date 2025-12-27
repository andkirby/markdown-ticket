# MDT-104 Status

## Current Status: IN PROGRESS

**Last Updated**: 2025-12-27

## Summary

Integration tests have been created for `shared/test-lib` at `shared/test-lib/__tests__/integration.test.ts`. The tests verify:
- TestEnvironment creates isolated directories (CONFIG_DIR, temp dirs)
- ProjectFactory creates projects within created env
- Ticket/CR creation within created projects
- TestServer starts backend with CONFIG_DIR
- Backend server health checks

## Test Status

| Test Case | Status | Notes |
|-----------|--------|-------|
| Environment creation | ✅ PASS | Temp dirs and CONFIG_DIR created correctly |
| Project creation | ✅ PASS | Project structure and config files created |
| CR creation | ✅ PASS | CR files created with correct naming |
| Registry file creation | ✅ PASS | TEST.toml created in CONFIG_DIR/projects/ |
| Server startup | ✅ PASS | Health check passes on port 4001 |
| Server discovers test projects | ❌ FAIL | Returns 0 projects (caching issue) |
| Server discovers test CRs | ❌ FAIL | Blocked by project discovery failure |

## Root Cause Analysis

**Issue**: Backend `/api/projects` returns empty array despite registry files existing.

**Root Cause**: Server-side caching in `ProjectService.getAllProjects()`:

```typescript
// shared/services/ProjectService.ts:85
async getAllProjects(): Promise<Project[]> {
  const cached = await this.cache.getAllProjectsFromCache();
  if (cached) return cached;  // ← Returns cached 0 projects
  const registered = this.getRegisteredProjects();
  // ...
}
```

The server initializes cache at startup when registry doesn't exist yet, caching `[]`. Later API calls return this cached result without re-scanning.

**Evidence**:
- Registry files confirmed created: `Registry files: [ 'TEST.toml' ]`
- Server has correct CONFIG_DIR: `[SERVER] PROJECTS_REGISTRY` matches test temp dir
- Health check passes: Server is running and responding
- But `/api/projects` returns `[]`

## Test Coverage Achieved

### ✅ Working Components
- `TestEnvironment.setup()` - Creates isolated temp directory structure
- `TestEnvironment.getConfigDirectory()` - Returns correct CONFIG_DIR path
- `ProjectFactory.createProject()` - Creates project with `.mdt-config.toml`
- `ProjectFactory.createTestCR()` - Creates CR files with correct naming
- `TestServer.start()` - Spawns backend process with custom port
- Health check - Server responds to `/api/status`

### ❌ Blocked By Caching Issue
- Server discovery of test-created projects via `/api/projects`
- Server discovery of test-created CRs via `/api/projects/{key}/crs`

## Next Steps

To complete MDT-104, the caching issue must be resolved. Options:

1. **Add cache clear endpoint**: Call after creating test projects
2. **Disable caching for test mode**: Pass flag to disable cache
3. **Re-scan on every `/api/projects` call**: Don't rely on cache in tests

## Files Modified

- `shared/test-lib/__tests__/integration.test.ts` - Created (144 lines)
- `shared/test-lib/core/test-server.ts` - Added debug logging
- `shared/test-lib/utils/process-helper.ts` - Added `findProjectRoot()` function
- `server/server.ts` - Added debug logging for CONFIG_DIR
- `shared/services/project/ProjectRegistry.ts` - Added debug logging
