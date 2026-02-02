# CLAUDE.md - Server

Guidance for Claude Code working with the `server` workspace.

## Architecture

**See**: `docs/ARCHITECTURE.md` for layered architecture, request flow, SOLID principles.

## Development Commands

- `npm run dev` - Dev server with nodemon (localhost:3001)
- `npm run server` - Production mode
- `npm test` - Run Jest tests
- `npm run lint` - ESLint

## Testing

API tests use `shared/test-lib` for isolation:

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

- **Layers**: Routes → Controllers → Services → Data
- **Error handling**: Proper HTTP status codes (400, 404, 500)
- **OpenAPI**: Endpoints must satisfy `openapi.yaml` contract
