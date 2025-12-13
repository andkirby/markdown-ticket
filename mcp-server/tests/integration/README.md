# MCP-Backend Consistency Integration Tests

This directory contains integration tests that verify the consistency between MCP tools and backend API endpoints.

## Overview

The integration tests ensure that all MCP tools produce identical results to their corresponding backend endpoints, maintaining data consistency across different access methods.

## Test Coverage

### Project Tools
- **list_projects** ↔ GET `/api/projects`
- **get_project_info** ↔ GET `/api/projects/:id/config`

### CR (Change Request) Tools
- **list_crs** ↔ GET `/api/projects/:id/crs`
- **get_cr** ↔ GET `/api/projects/:id/crs/:crId`
- **create_cr** ↔ POST `/api/projects/:id/crs`
- **update_cr_status** ↔ PATCH `/api/projects/:id/crs/:crId`
- **update_cr_attrs** ↔ PATCH `/api/projects/:id/crs/:crId`
- **delete_cr** ↔ DELETE `/api/projects/:id/crs/:crId`

### Section Management Tools
- **manage_cr_sections** (no direct backend equivalent - MCP-only feature)

### Analysis Tools
- **suggest_cr_improvements** (no direct backend equivalent - MCP-only feature)

## Test Files

### 1. `mcp-backend-consistency-simple.test.ts`
A simplified version that mocks all external dependencies and focuses on:
- API endpoint behavior
- Response format validation
- Error handling consistency
- Data structure validation

This test runs independently of the actual MCP server implementation and provides fast feedback on backend API behavior.

## Running the Tests

```bash
# Run all integration tests
npm test -- tests/integration/

# Run just the simplified test
npm test -- tests/integration/mcp-backend-consistency-simple.test.ts

# Run with verbose output
npm test -- tests/integration/ --verbose

# Run with coverage
npm test -- tests/integration/ --coverage
```

## Test Structure

### Test Data
- Uses standardized test project (`test-project` with code `TEST`)
- Creates a sample CR (`TEST-001`) with complete data
- Validates all required CR fields and enum values

### Test Categories

1. **Basic CRUD Operations**
   - Create, Read, Update, Delete operations
   - List operations with filtering
   - Partial updates (status and attributes)

2. **Error Handling**
   - Missing required parameters
   - Invalid project codes
   - Non-existent resources
   - Malformed requests

3. **Data Structure Validation**
   - Required field presence
   - Enum value validation
   - Date serialization consistency
   - Nested object structure

## Key Assertions

### Response Format
- All arrays should be properly typed
- Objects should contain required fields
- Date fields should be ISO strings
- Error responses should have consistent format

### Data Consistency
- CR codes should follow pattern (e.g., `TEST-001`)
- Status values should be from allowed enum
- Type values should be from allowed enum
- Priority values should be from allowed enum

### Error Handling
- 404 for missing resources
- 400 for invalid requests
- 500 for server errors
- Error messages should be descriptive

## Future Enhancements

1. **Full MCP Integration Test**
   - Implement actual MCP server connection
   - Test HTTP transport endpoint
   - Verify identical responses between MCP and API

2. **Performance Tests**
   - Measure response times
   - Compare performance between MCP and direct API
   - Load testing scenarios

3. **Advanced Scenarios**
   - Cross-project operations
   - Complex filtering
   - Bulk operations
   - Concurrent access

## Debugging

To debug test failures:

1. Enable verbose logging:
   ```bash
   npm test -- tests/integration/ --verbose --no-cache
   ```

2. Add console logs to test file for debugging
3. Check mock call history:
   ```javascript
   console.log(mockTicketService.getCR.mock.calls);
   ```

4. Inspect response bodies in failed tests

## Anti-Duplication Notes

- Tests use shared test data structures
- Mock services are reused across tests
- Common assertions are grouped into shared functions
- Test utilities extend existing backend test setup

## Dependencies

- Jest for test framework
- Supertest for HTTP assertions
- Express for mock server setup
- All tests mock external services to avoid dependencies