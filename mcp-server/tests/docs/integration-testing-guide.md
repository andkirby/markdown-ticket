# MCP Server Integration Testing Guide

**Comprehensive guide for writing integration tests for the MCP server.**

## Table of Contents

- [Overview](#overview)
- [Integration vs E2E Tests](#integration-vs-e2e-tests)
- [Architecture](#architecture)
- [Test Categories](#test-categories)
- [Getting Started](#getting-started)
- [Writing Integration Tests](#writing-integration-tests)
- [Mock Patterns](#mock-patterns)
- [Service Delegation Testing](#service-delegation-testing)
- [Backend Consistency Testing](#backend-consistency-testing)
- [Best Practices](#best-practices)
- [Running Tests](#running-tests)

---

## Overview

Integration tests for the MCP server verify that components work correctly together without requiring a full server process. These tests:

- Mock external dependencies (file system, network)
- Verify service delegation patterns
- Ensure MCP and backend API consistency
- Run faster than E2E tests
- Test at the handler/service layer

### When to Use Integration Tests

| Scenario | Test Type |
|----------|-----------|
| Tool calls handler, handler calls service | Integration |
| Verify MCP tools delegate to shared services | Integration |
| MCP and backend API return same results | Integration |
| Full server process with real I/O | E2E |
| Protocol compliance (JSON-RPC) | E2E |

---

## Integration vs E2E Tests

```
┌───────────────────────────────────────────────────────────────┐
│                        E2E Tests                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ Test    │───▶│ MCP     │───▶│ Server  │───▶│ File    │   │
│  │ Client  │    │ Client  │    │ Process │    │ System  │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│                                                               │
│  • Spawns real server process                                 │
│  • Uses JSON-RPC protocol                                     │
│  • Real file system operations                                │
│  • Slower, but tests full stack                               │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                     Integration Tests                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐                   │
│  │ Test    │───▶│ Handler │───▶│ Mocked  │                   │
│  │ Code    │    │ Layer   │    │ Services│                   │
│  └─────────┘    └─────────┘    └─────────┘                   │
│                                                               │
│  • No server process                                          │
│  • Direct handler/function calls                              │
│  • Mocked dependencies                                        │
│  • Faster, focused testing                                    │
└───────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Test Structure

```
mcp-server/tests/integration/
├── mcp-backend-consistency.test.ts      # Full consistency tests
├── mcp-backend-consistency-simple.test.ts # Simplified with mocks
└── service-delegation.test.ts           # Service delegation verification
```

### Layer Responsibilities

```
┌───────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                         │
│  (Validates input, formats output)                        │
└──────────────────────┬────────────────────────────────────┘
                       │ delegates to
                       ▼
┌───────────────────────────────────────────────────────────┐
│                   Handler Layer                           │
│  (CRHandlers, ProjectHandlers, SectionHandlers)           │
└──────────────────────┬────────────────────────────────────┘
                       │ delegates to
                       ▼
┌───────────────────────────────────────────────────────────┐
│                  Service Layer                            │
│  (CRService, ProjectService, MarkdownService - shared)    │
└───────────────────────────────────────────────────────────┘
```

---

## Test Categories

### 1. Service Delegation Tests

Verify that MCP tools properly delegate to shared services without duplicating logic.

**Purpose:** Ensure the handler layer is a thin wrapper around shared services.

```typescript
describe('MCP Tools Service Delegation', () => {
  it('should delegate list_crs to CRService.listCRs', () => {
    const tool = 'list_crs'
    const handler = 'CRHandlers.handleListCRs'
    const service = 'CRService.listCRs'

    // Verify delegation pattern
    expect(handler).toDelegateTo(service, {
      parameters: ['project', 'filters'],
      businessLogicLocation: 'CRService',
    })
  })
})
```

### 2. Backend Consistency Tests

Verify that MCP tools produce identical results to backend API endpoints.

**Purpose:** Ensure data consistency across different access methods.

```typescript
describe('MCP-Backend Consistency', () => {
  it('should return identical results for list_crs', async () => {
    // Call MCP tool
    const mcpResult = await callMCPTool('list_crs', { project: 'TEST' })

    // Call backend API
    const apiResult = await callAPI('/api/projects/TEST/crs')

    // Verify consistency
    expect(mcpResult).toEqual(apiResult)
  })
})
```

---

## Getting Started

### Prerequisites

1. Read the [E2E Testing Guide](./e2e-testing-guide.md) first for context
2. Understand the MCP server architecture
3. Familiarity with Jest mocking

### Create a New Integration Test

```bash
# Create a new integration test file
touch mcp-server/tests/integration/my-integration.test.ts
```

### Basic Integration Test Template

```typescript
/**
 * My Integration Test
 *
 * Tests that [component] correctly integrates with [dependencies]
 */

import { CRHandlers } from '../../src/tools/handlers/crHandlers'
import { ProjectService } from '@mdt/shared/services/ProjectService'
import { CRService } from '@mdt/shared/services/CRService'

// Mock shared services
jest.mock('@mdt/shared/services/ProjectService')
jest.mock('@mdt/shared/services/CRService')
jest.mock('@mdt/shared/services/MarkdownService')
jest.mock('@mdt/shared/services/TemplateService')

describe('My Integration Test', () => {
  let mockProjectService: jest.Mocked<ProjectService>
  let mockCRService: jest.Mocked<CRService>

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Get mocked instances
    mockProjectService = new ProjectService() as jest.Mocked<ProjectService>
    mockCRService = new CRService() as jest.Mocked<CRService>
  })

  describe('when calling handler', () => {
    it('should delegate to service correctly', async () => {
      // Arrange
      const mockProjects = [{ code: 'TEST', name: 'Test Project' }]
      mockProjectService.listProjects.mockResolvedValue(mockProjects)

      // Act
      const result = await ProjectHandlers.handleListProjects()

      // Assert
      expect(mockProjectService.listProjects).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockProjects)
    })
  })
})
```

---

## Writing Integration Tests

### Service Delegation Pattern

Test that handlers correctly delegate to services:

```typescript
describe('Service Delegation: list_crs', () => {
  it('should call CRService.listCRs with correct parameters', async () => {
    // Arrange
    const mockCRs = [
      { code: 'TEST-001', title: 'First CR' },
      { code: 'TEST-002', title: 'Second CR' },
    ]
    mockCRService.listCRs.mockResolvedValue(mockCRs)

    // Act
    await CRHandlers.handleListCRs({
      project: 'TEST',
      filters: { status: 'Proposed' },
    })

    // Assert
    expect(mockCRService.listCRs).toHaveBeenCalledWith(
      'TEST',
      { status: 'Proposed' }
    )
  })

  it('should not duplicate business logic in handler', () => {
    // Handler should only do input validation and formatting
    const handlerCode = fs.readFileSync(
      'src/tools/handlers/crHandlers.ts',
      'utf-8'
    )

    // Verify handler doesn't contain business logic
    expect(handlerCode).not.toContain('function validateCR')
    expect(handlerCode).not.toContain('class CRValidator')
  })
})
```

### Backend Consistency Pattern

Test that MCP tools match backend API behavior:

```typescript
describe('Backend Consistency: list_crs', () => {
  it('should return same data structure as backend API', async () => {
    // Arrange
    const mockCRs = [
      {
        code: 'TEST-001',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      },
    ]
    mockCRService.listCRs.mockResolvedValue(mockCRs)

    // Act - MCP Tool
    const mcpResult = await CRHandlers.handleListCRs({
      project: 'TEST',
    })

    // Act - Backend API (simulated)
    const apiResult = await backendAPI.getCRs('TEST')

    // Assert - Same structure
    expect(mcpResult).toEqual(apiResult)
  })

  it('should handle errors consistently', async () => {
    // Arrange
    mockCRService.listCRs.mockRejectedValue(
      new Error('Project not found')
    )

    // Act & Assert - Both should handle errors the same way
    await expect(CRHandlers.handleListCRs({ project: 'INVALID' }))
      .rejects.toThrow('Project not found')

    await expect(backendAPI.getCRs('INVALID'))
      .rejects.toThrow('Project not found')
  })
})
```

### Error Handling Pattern

Test consistent error handling across layers:

```typescript
describe('Error Handling: update_cr_status', () => {
  it('should propagate service errors correctly', async () => {
    // Arrange
    mockCRService.updateCRStatus.mockRejectedValue(
      new Error('CR not found')
    )

    // Act & Assert
    await expect(
      CRHandlers.handleUpdateCRStatus({
        project: 'TEST',
        key: 'TEST-999',
        status: 'Approved',
      })
    ).rejects.toThrow('CR not found')
  })

  it('should validate input before calling service', async () => {
    // Act & Assert
    await expect(
      CRHandlers.handleUpdateCRStatus({
        project: '',
        key: 'TEST-001',
        status: 'Approved',
      })
    ).rejects.toThrow('Project key is required')

    // Service should not be called
    expect(mockCRService.updateCRStatus).not.toHaveBeenCalled()
  })
})
```

---

## Mock Patterns

### Mocking Shared Services

```typescript
// Mock at the top of the file
jest.mock('@mdt/shared/services/ProjectService')
jest.mock('@mdt/shared/services/CRService')
jest.mock('@mdt/shared/services/MarkdownService')
jest.mock('@mdt/shared/services/TemplateService')

// In your test
describe('With Mocked Services', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should use mocked service', async () => {
    // Setup mock behavior
    const mockProject = { code: 'TEST', name: 'Test Project' }
    ;(ProjectService.prototype.getProject as jest.Mock).mockResolvedValue(mockProject)

    // Call handler
    const result = await ProjectHandlers.handleGetProjectInfo({ project: 'TEST' })

    // Verify
    expect(ProjectService.prototype.getProject).toHaveBeenCalledWith('TEST')
    expect(result).toEqual(mockProject)
  })
})
```

### Mock Configuration

The jest.config.mjs includes module name mapping for mocks:

```javascript
moduleNameMapper: {
  // Map shared services to mocks
  '^@mdt/shared/services/ProjectService$': '<rootDir>/src/__mocks__/@mdt/shared/services/ProjectService.ts',
  '^@mdt/shared/services/CRService$': '<rootDir>/src/__mocks__/@mdt/shared/services/CRService.ts',
  // ... more mappings
}
```

### Creating Custom Mocks

Create mocks in `src/__mocks__/@mdt/shared/services/`:

```typescript
// src/__mocks__/@mdt/shared/services/ProjectService.ts
export class ProjectService {
  async getProject(projectKey: string) {
    return {
      code: projectKey,
      name: `Mock Project ${projectKey}`,
      active: true,
    }
  }

  async listProjects() {
    return [
      { code: 'TEST', name: 'Test Project', active: true },
    ]
  }
}
```

---

## Service Delegation Testing

### What to Verify

1. **Parameters are passed correctly**: Handler → Service
2. **Return values are formatted correctly**: Service → Handler
3. **No business logic in handlers**: Logic lives in services
4. **Error propagation**: Errors from services are handled correctly

### Example Test

```typescript
describe('Service Delegation Verification', () => {
  describe('create_cr tool', () => {
    const delegationPattern = {
      tool: 'create_cr',
      handler: 'CRHandlers.handleCreateCR',
      service: 'CRService.createCR',
      expectedParameters: ['project', 'type', 'data'],
    }

    it('should delegate to CRService.createCR', async () => {
      // Arrange
      const inputData = {
        project: 'TEST',
        type: 'Feature Enhancement',
        data: { title: 'Test CR', priority: 'High' },
      }
      const mockCR = { code: 'TEST-001', ...inputData.data }
      mockCRService.createCR.mockResolvedValue(mockCR)

      // Act
      await CRHandlers.handleCreateCR(inputData)

      // Assert
      expect(mockCRService.createCR).toHaveBeenCalledWith(
        'TEST',
        'Feature Enhancement',
        expect.objectContaining({
          title: 'Test CR',
          priority: 'High',
        })
      )
    })

    it('should not contain business logic in handler', () => {
      const handlerSource = fs.readFileSync(
        'src/tools/handlers/crHandlers.ts',
        'utf-8'
      )

      // Business logic indicators that should NOT be in handlers
      const businessLogicPatterns = [
        /class.*Validator/,
        /function validate/,
        /enum.*Status/,
        /const.*VALID_STATUSES/,
      ]

      businessLogicPatterns.forEach(pattern => {
        expect(handlerSource).not.toMatch(pattern)
      })
    })
  })
})
```

---

## Backend Consistency Testing

### Full Consistency Test

Tests that MCP and backend return identical results:

```typescript
describe('MCP-Backend Full Consistency', () => {
  let backendApp: Express
  let mockProjectRegistry: Map<string, Project>

  beforeAll(() => {
    // Setup backend Express app
    backendApp = createTestBackendApp()
    mockProjectRegistry = new Map()
  })

  describe('list_projects consistency', () => {
    it('should return identical project lists', async () => {
      // Arrange
      const testProjects = [
        { code: 'TEST', name: 'Test Project', active: true },
        { code: 'DEMO', name: 'Demo Project', active: true },
      ]
      testProjects.forEach(p => mockProjectRegistry.set(p.code, p))

      // Act - MCP Tool
      const mcpResult = await ProjectHandlers.handleListProjects()

      // Act - Backend API
      const apiResponse = await request(backendApp).get('/api/projects')
      const apiResult = apiResponse.body

      // Assert - Identical results
      expect(mcpResult).toEqual(apiResult)
    })
  })
})
```

### Simplified Consistency Test

Uses mocks to test behavior without real backend:

```typescript
describe('MCP-Backend Simplified Consistency', () => {
  describe('list_crs', () => {
    it('should return consistent response format', async () => {
      // Arrange
      const mockCRs = [
        {
          code: 'TEST-001',
          title: 'Test CR',
          status: 'Proposed',
          type: 'Feature Enhancement',
          priority: 'Medium',
          dateCreated: '2025-01-01T00:00:00.000Z',
          dateModified: '2025-01-01T00:00:00.000Z',
        },
      ]
      mockCRService.listCRs.mockResolvedValue(mockCRs)

      // Act
      const result = await CRHandlers.handleListCRs({ project: 'TEST' })

      // Assert - Verify structure
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toMatchObject({
        code: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        type: expect.any(String),
        priority: expect.any(String),
        dateCreated: expect.any(String),
        dateModified: expect.any(String),
      })
    })

    it('should handle errors consistently', async () => {
      // Arrange
      mockCRService.listCRs.mockRejectedValue(
        new Error('Project not found')
      )

      // Act & Assert
      await expect(
        CRHandlers.handleListCRs({ project: 'INVALID' })
      ).rejects.toThrow('Project not found')
    })
  })
})
```

---

## Best Practices

### DO

1. **Mock external dependencies**
   ```typescript
   jest.mock('@mdt/shared/services/ProjectService')
   ```

2. **Test delegation, not implementation**
   ```typescript
   expect(service.method).toHaveBeenCalledWith(expectedArgs)
   ```

3. **Verify consistency across access methods**
   ```typescript
   expect(mcpResult).toEqual(apiResult)
   ```

4. **Test error handling**
   ```typescript
   await expect(handler()).rejects.toThrow('expected error')
   ```

5. **Reset mocks between tests**
   ```typescript
   beforeEach(() => {
     jest.clearAllMocks()
   })
   ```

### DON'T

1. **Don't test private methods**
   ```typescript
   // ❌ WRONG
   expect(handler.privateMethod()).toBe(true)

   // ✅ RIGHT - test public interface
   expect(handler.publicMethod()).toBe(true)
   ```

2. **Don't duplicate implementation in tests**
   ```typescript
   // ❌ WRONG - re-implementing logic
   const result = handler.calculate(input)
   expect(result).toBe(complexCalculation(input))

   // ✅ RIGHT - use expected value
   expect(result).toBe(expectedValue)
   ```

3. **Don't test mocked services**
   ```typescript
   // ❌ WRONG - testing the mock, not the code
   expect(mockService.method).toHaveBeenCalled()

   // ✅ RIGHT - verify handler behavior
   const result = await handler()
   expect(result).toEqual(expected)
   ```

4. **Don't share state between tests**
   ```typescript
   // ❌ WRONG
   let sharedState: any
   beforeEach(() => { sharedState = {} })

   // ✅ RIGHT
   beforeEach(() => { /* isolated setup */ })
   ```

---

## Running Tests

### Run All Integration Tests

```bash
cd mcp-server
npm test -- tests/integration/
```

### Run Specific Test File

```bash
npm test -- tests/integration/service-delegation.test.ts
```

### Run with Coverage

```bash
npm test -- tests/integration/ --coverage
```

### Run with Verbose Output

```bash
npm test -- tests/integration/ --verbose
```

### Debug Mode

```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/integration/
```

---

## Test Checklist

When writing integration tests, ensure you cover:

- [ ] Service delegation (handler calls correct service method)
- [ ] Parameter passing (correct arguments to service)
- [ ] Return value formatting (service output → handler output)
- [ ] Error handling (service errors → handler errors)
- [ ] Input validation (before service call)
- [ ] Backend consistency (MCP = API results)
- [ ] No business logic in handlers (logic lives in services)
- [ ] Mock cleanup (reset between tests)

---

## References

- [E2E Testing Guide](./e2e-testing-guide.md)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Jest Mocking Guide](https://jestjs.io/docs/mock-functions)
- [tests/CLAUDE.md](../CLAUDE.md) - Main testing documentation index
