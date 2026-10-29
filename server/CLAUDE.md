# CLAUDE.md - Server

Guidance for Claude Code working with the `server` workspace.

## Architecture

**See**: `docs/ARCHITECTURE.md` for capability ownership, request flow and lifecycle.

## Development Commands

- `bun run dev` - Dev server with nodemon (localhost:3001)
- `bun run server` - Production mode
- `jest` - Run Jest tests
- `bun run lint` - ESLint

## Testing

API tests use `shared/test-lib` for isolation and the common application builder through `tests/api/test-app-factory.ts`. Construction is inactive; callers enable and await runtime start when watcher behavior is needed, then await runtime stop during teardown:

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from './tests/api/setup'

describe('API endpoint', () => {
  beforeAll(async () => {
    const context = await setupTestEnvironment()
    app = context.app
    projectFactory = context.projectFactory
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })
})
```

**Test-lib docs**: `../shared/test-lib/README.md` | `write-tests-guide.md`

### Test Folder

Server uses `tests/` (not `__tests__/`) for API integration tests requiring full Express app.

### Helpers & OpenAPI

```typescript
// Response assertions
import { assertSuccess, assertBadRequest, assertNotFound } from './tests/api/helpers'

// OpenAPI contract validation
expect(res).toSatisfyApiSpec()
```

## Conventions

- **Ownership**: HTTP routers/controllers live in `modules/<capability>/` and expose `index.ts`. Reusable operations belong in shared services. Internal callers use capability entrypoints; former controller/route compatibility paths are retired.
- **Composition**: `app.ts` constructs the common graph; `bootstrap/createRuntime.ts` owns explicit start/stop. The shared project catalog is injected directly. Tests must await disposal. Listening and process signals belong to `server.ts`.
- **Error handling**: Proper HTTP status codes (400, 404, 500)
- **OpenAPI**: Endpoints must satisfy `openapi.yaml` contract
