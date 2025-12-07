# API Test Suite

This directory contains tests for the markdown-ticket server API endpoints.

## Structure

```
tests/
├── unit/                   # Unit tests for individual classes/methods
│   └── ProjectController.test.ts
├── integration/            # Integration tests for API endpoints
│   └── api.test.ts
├── fixtures/              # Test data and mock files
├── utils/                 # Test utilities and helpers
│   └── setupTests.ts
└── README.md
```

## Running Tests

From the `server/` directory:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- ProjectController.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="getCR"
```

## Test Coverage

The test suite covers:

- **ProjectController CRUD operations**:
  - `getCR()` - Fetch individual CRs
  - `createCR()` - Create new CRs
  - `updateCR()` - Update existing CRs
  - `deleteCR()` - Delete CRs

- **API Endpoints**:
  - `GET /api/projects/:id/crs/:code`
  - `POST /api/projects/:id/crs`
  - `PATCH /api/projects/:id/crs/:code`
  - `PUT /api/projects/:id/crs/:code`
  - `DELETE /api/projects/:id/crs/:code`

- **Error Handling**:
  - Missing required parameters (400)
  - Resource not found (404)
  - Invalid status transitions (400)
  - Service unavailable (501)
  - Internal server errors (500)

## Writing New Tests

### Unit Tests

```typescript
import { createMockReqRes, mockProject } from '../utils/setupTests.js';

describe('SomeClass', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should do something', async () => {
    const { req, res } = createMockReqRes();
    // Arrange, Act, Assert
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import { app } from '../utils/testApp.js';

describe('API Endpoint', () => {
  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);

    expect(response.body).toEqual(expectedData);
  });
});
```

## Mocking

The test utilities provide helpers for mocking:

- `createMockProjectService()` - Mock project service
- `createMockTicketService()` - Mock ticket service
- `createMockReqRes()` - Mock Express request/response
- `mockProject`, `mockCR` - Sample test data

## Best Practices

1. **Test one thing at a time** - Each test should verify a single behavior
2. **Use descriptive test names** - "should return 400 when projectId is missing"
3. **Mock external dependencies** - Don't actually touch the file system
4. **Test error cases** - Verify proper error responses
5. **Keep tests isolated** - Use `beforeEach`/`afterEach` to clean up
6. **Use meaningful data** - Create realistic test fixtures

## Coverage Goals

- **Lines**: >80%
- **Functions**: >90%
- **Branches**: >80%
- **Statements**: >80%

Run `npm run test:coverage` to see the current coverage report.