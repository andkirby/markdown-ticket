# Jest "Did Not Exit" Warning Investigation

## Problem

Integration tests that spawn real backend servers trigger:
```
Jest did not exit one second after the test run has completed.
```

## Root Cause

Jest uses an arbitrary 1-second timeout to check for open handles. When spawning external processes (`npm run dev:server` → tsx → node + Express + chokidar), cleanup takes longer than 1 second even when done correctly.

## What We Tried

| Fix | Result |
|-----|--------|
| Replace `fetch()` with `http.get()` + `Connection: close` | Eliminated TCP handle leak |
| Use `tree-kill` instead of `process.kill()` | Properly kills process tree |
| Add delay in `afterAll` | Didn't help |
| `--detectOpenHandles` | Shows **no open handles** |

## Current Solution

Added `forceExit: true` to `jest.config.js`. This is acceptable because:
- `--detectOpenHandles` confirms no actual leaks
- Process exits cleanly (just slower than 1 second)
- This is standard practice for integration tests spawning servers

## Better Long-Term Approach

Refactor backend server to be importable directly:

```typescript
// Instead of: spawn('npm', ['run', 'dev:server'])
import { createServer } from '../../../server/src/app.js';

const server = await createServer({ port, configDir });
// ... tests ...
await server.close(); // Clean shutdown, same process
```

This eliminates process tree management entirely.

## Conclusion

The warning is a false positive for integration tests. `forceExit: true` is the pragmatic solution until server refactoring is prioritized.

## Alternative

The cleanest solution would be to refactor the backend server, so it can be imported and started/stopped programmatically within the same Node process:

```typescript
// Instead of spawning npm run dev:server
import { createServer } from '../../../server/src/app.js';

const server = await createServer({ port: 4001, configDir: testEnv.getConfigDirectory() });
// ... run tests ...
await server.close(); // Clean shutdown, no orphan processes
```

This eliminates the process tree problem entirely.