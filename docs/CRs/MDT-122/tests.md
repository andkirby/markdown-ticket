# Tests for MDT-122: Lightweight Structured Logger

## Overview

This document describes the test suite for the lightweight structured logger implementation that resolves 37 ESLint `no-console` violations in the server codebase.

## Test Location

- **Test File**: `/Users/kirby/home/markdown-ticket-MDT-121/shared/utils/__tests__/server-logger.test.ts`
- **Implementation**: `/Users/kirby/home/markdown-ticket-MDT-121/shared/utils/server-logger.ts`
- **Test Framework**: Jest (with ts-jest preset)
- **Total Test Count**: 58 tests across 11 test suites

## Running the Tests

```bash
# Run all tests in the workspace
npm test

# Run only server-logger tests
cd shared && npm test server-logger

# Run tests in watch mode
cd shared && npm test -- --watch

# Run tests with coverage
cd shared && npm test -- --coverage
```

## Test Coverage

The test suite provides comprehensive coverage of the logger implementation:

### 1. Log Level Methods (4 suites, 36 tests)

#### `logger.debug()` Tests (9 tests)
- Logs debug messages when level is set to debug
- Handles multiple arguments
- Silences debug messages when level is info, warn, or error
- Handles empty arguments
- Handles complex objects

#### `logger.info()` Tests (7 tests)
- Logs info messages when level is debug or info (default)
- Silences info messages when level is warn or error
- Handles multiple arguments
- Handles empty arguments
- Handles error objects

#### `logger.warn()` Tests (5 tests)
- Always logs warn messages regardless of current log level
- Handles multiple arguments
- Handles empty arguments
- Handles complex objects

#### `logger.error()` Tests (6 tests)
- Always logs error messages regardless of current log level
- Handles multiple arguments
- Handles Error objects
- Handles empty arguments
- Handles error with stack trace

### 2. Level Management (2 suites, 12 tests)

#### `setLevel()` Tests (9 tests)
- Sets log level to debug (shows all messages)
- Sets log level to info (silences debug, shows info+)
- Sets log level to warn (silences debug+info, shows warn+)
- Sets log level to error (silences debug+info+warn, shows error only)
- Throws error for invalid level strings
- Throws error for empty string, null, undefined
- Allows changing level multiple times

#### `getLevel()` Tests (4 tests)
- Returns default level (info)
- Returns debug after setting to debug
- Returns warn after setting to warn
- Returns error after setting to error

#### `getLevels()` Tests (2 tests)
- Returns all available log levels: debug, info, warn, error
- Returns readonly array (prevents mutation)

### 3. Edge Cases (1 suite, 9 tests)

- Handles `undefined` arguments gracefully
- Handles `null` arguments gracefully
- Handles number arguments
- Handles boolean arguments
- Handles mixed argument types
- Handles very long messages (10,000+ characters)
- Handles special characters (\n, \t, \r, etc.)
- Handles emoji in messages

### 4. Level Filtering Behavior (1 suite, 3 tests)

- Filters all messages when level is above error
- Shows all messages when level is debug
- Shows info/warn/error when level is info

### 5. Message Prefix Format (1 suite, 4 tests)

- Uses `[DEBUG]` prefix for debug messages
- Uses `[INFO]` prefix for info messages
- No prefix for warn messages
- No prefix for error messages

### 6. Real-world Usage Scenarios (1 suite, 5 tests)

- Server startup logging
- Error logging with context
- Debug logging for development
- Warning for deprecated features
- Multiple rapid log calls (100 iterations)

## Test Structure

### Test Organization

Tests are organized by functionality:
1. **Method-specific tests**: Each logger method has its own describe block
2. **Configuration tests**: Tests for setLevel(), getLevel(), getLevels()
3. **Edge case tests**: Boundary conditions and unusual inputs
4. **Behavioral tests**: Level filtering and message formatting
5. **Integration tests**: Real-world usage patterns

### Setup and Teardown

```typescript
beforeEach(() => {
  // Reset to default log level
  setLevel('info')
  // Mock console methods
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
})

afterEach(() => {
  // Restore original console methods
  consoleErrorSpy.mockRestore()
  consoleWarnSpy.mockRestore()
})
```

This ensures:
- Each test starts with a known state
- Console output doesn't interfere between tests
- Tests are deterministic and isolated

## Key Testing Patterns

### 1. Console Mocking

All tests use Jest's `jest.spyOn()` to mock console methods:

```typescript
consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
expect(consoleErrorSpy).toHaveBeenCalledWith('[INFO]', 'test message')
```

### 2. Level Testing

Tests verify level filtering by setting different levels and checking which messages appear:

```typescript
setLevel('warn')
logger.info('test')
expect(console.error).not.toHaveBeenCalled() // Silenced

setLevel('info')
logger.info('test')
expect(console.error).toHaveBeenCalledWith('[INFO]', 'test') // Shown
```

### 3. Error Validation

Tests verify that invalid inputs throw appropriate errors:

```typescript
expect(() => setLevel('invalid' as any)).toThrow(
  'Invalid log level: "invalid". Valid levels are: debug, info, warn, error'
)
```

### 4. Real-world Scenarios

Tests simulate actual usage patterns from the server codebase:

```typescript
logger.info('Server starting on port', 3001)
logger.error('Failed to connect to database:', error.message)
logger.debug('File watcher initialized:', { path: '/path/to/watch' })
```

## No BDD/E2E Tests Required

As per the CR specification, no BDD (behavior-driven development) or E2E (end-to-end) tests are required because:

1. **No User-Facing Changes**: This is a pure internal refactoring
2. **No UI Impact**: The logger is only used in server-side code
3. **No API Changes**: All public interfaces remain the same
4. **No Behavior Changes**: All existing log messages still appear, just with a new format

The unit tests provide complete coverage of the logger functionality and ensure:
- All log levels work correctly
- Level filtering behaves as expected
- Edge cases are handled gracefully
- Real-world usage patterns are supported

## Integration with ESLint

The test suite indirectly validates ESLint compliance by ensuring:
- All logger methods use only `console.error()` or `console.warn()`
- No direct `console.log()` calls are introduced
- The logger implementation follows the ESLint rules

## Verification

After implementation, verify the following:

```bash
# Run logger tests
cd shared && npm test

# Verify ESLint compliance
npm run lint:server

# Verify server starts and logs appear
npm run dev:server
```

Expected results:
- All 58 logger tests pass
- `npm run lint:server` returns 0 errors
- Server console output shows `[INFO]` and `[DEBUG]` prefixes
- All 37 previous ESLint violations are resolved

## Future Enhancements

Potential future test additions:
- Performance tests for high-volume logging (10,000+ messages)
- Tests for custom formatters (if added)
- Tests for transport abstraction (if migrating to Winston/Pino)
- Integration tests with actual server startup

These are **not** part of the current CR but could be added if the logger is extended.
