# Testing Infrastructure

## Isolation Contract

- `CONFIG_DIR` → temp directory, set before backend imports load
- `createTestApp()` → lazy-imported in `e2e-context.ts` after `CONFIG_DIR` is set
- **Never** import `createTestApp` at the top of a file — always lazy-load it

Violating this order causes the backend to read from your real config directory.

## Test Environment Lifecycle

1. **Startup**: `CONFIG_DIR` set → test server starts → temp projects created
2. **Per-test**: Fresh `page` object (clean localStorage)
3. **Shared state**: `e2eContext` singleton persists across tests (no teardown)
4. **Shutdown**: Temp directory cleaned up

## Singleton Behavior

Projects created by any test remain visible to all subsequent tests. Always navigate directly to your target project to avoid cross-test contamination.
