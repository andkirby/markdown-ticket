# End-to-End Testing

This directory contains end-to-end (E2E) tests for the md-ticket-board application using Playwright.

## Test Structure

```
tests/
├── e2e/
│   ├── setup.ts              # Test setup and teardown utilities
│   ├── ticket-move.spec.ts   # Ticket move functionality tests
│   └── board-loading.spec.ts # Board loading and display tests
├── README.md                 # This file
└── playwright.config.ts      # Playwright configuration
```

## Test Coverage

### 1. Ticket Move Tests (`ticket-move.spec.ts`)

These tests cover the most critical user interaction - moving tickets between columns:

- **Move ticket from Proposed to In Progress**: Verifies drag-and-drop functionality works correctly
- **Move ticket from In Progress to Implemented**: Tests status change and implementation date automation
- **Visual feedback during drag-and-drop**: Ensures proper UI feedback during interactions

### 2. Board Loading Tests (`board-loading.spec.ts`)

These tests cover the core application functionality:

- **Board loading with columns and tickets**: Verifies the board loads correctly with all expected elements
- **Ticket details display**: Checks that ticket information is rendered properly
- **Error handling**: Tests graceful handling of API errors
- **Dynamic updates**: Verifies board updates when tickets change
- **Responsive layout**: Tests different viewport sizes

## Running Tests

### Prerequisites

Make sure you have the development servers running:

```bash
# Start both frontend and backend
npm run dev:full
```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode (visible browser)
npm run test:e2e:ui

# Run tests with headed browser (visible)
npm run test:e2e:headed

# Run tests and generate HTML report
npm run test:e2e:report

# Update test snapshots
npm run test:e2e:update
```

### Test Configuration

The tests are configured to:

- **Auto-start servers**: Automatically starts the frontend and backend servers
- **Parallel execution**: Runs tests in parallel for faster execution
- **Multiple browsers**: Tests on Chrome, Firefox, and Safari
- **Mobile testing**: Tests on mobile viewports
- **Error screenshots**: Takes screenshots on test failure
- **Video recording**: Records videos on test failure
- **Trace viewer**: Collects traces for debugging

## Test Environment

### Setup Process

1. **Server Management**: Tests automatically start and stop the backend server
2. **Frontend Management**: Tests start the frontend development server
3. **Browser Management**: Tests launch and manage browser instances
4. **Cleanup**: Tests automatically clean up resources after execution

### Test Data

Tests use the existing sample tickets created by the backend server:

- CR-A001: User authentication system
- CR-A002: Copy-paste icons
- CR-A003: Expand/collapse popup width
- CR-B001: Direct API translation

## Debugging Tests

### Common Issues

1. **Port Conflicts**: Make sure ports 5173 and 3001 are available
2. **Server Startup**: Allow time for servers to start (tests have timeouts)
3. **Network Issues**: Ensure stable internet connection for API calls

### Debug Commands

```bash
# Run specific test file
npx playwright test tests/e2e/ticket-move.spec.ts

# Run specific test
npx playwright test tests/e2e/ticket-move.spec.ts --grep "should move a ticket"

# Run tests with debugging
npx playwright test --debug

# Run tests with trace
npx playwright test --trace on
```

### Test Reports

After running tests, you can view:

- **HTML Report**: `test-results/index.html`
- **Trace Viewer**: `test-results/trace/`
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`

## Best Practices

### Writing Tests

1. **Use descriptive test names**: Clearly describe what the test is verifying
2. **Wait for elements**: Use `waitForSelector` instead of hardcoded delays
3. **Handle flakiness**: Use retries and proper waiting strategies
4. **Test real user scenarios**: Focus on actual user workflows
5. **Maintain test independence**: Each test should be able to run independently

### Test Maintenance

1. **Update selectors**: Update CSS selectors when components change
2. **Add new tests**: Add tests for new features and critical paths
3. **Review flaky tests**: Investigate and fix tests that fail intermittently
4. **Update test data**: Update test data when application data changes

## Continuous Integration

These tests are designed to run in CI/CD environments:

- **Headless mode**: Tests run without visible browser in CI
- **Parallel execution**: Multiple tests run simultaneously
- **Retry mechanism**: Failed tests are retried automatically
- **Artifact generation**: Reports and screenshots are saved for analysis

## Future Enhancements

Planned improvements to the test suite:

1. **More test scenarios**: Add tests for additional user workflows
2. **Performance testing**: Add performance and load testing
3. **Accessibility testing**: Test for accessibility compliance
4. **Visual regression testing**: Add visual regression tests
5. **API testing**: Add more comprehensive API testing

## Troubleshooting

### Common Error Messages

- **"Server not ready"**: Increase timeout in setup.ts
- **"Element not found"**: Update CSS selectors or add waits
- **"Port already in use"**: Kill processes on ports 5173 and 3001
- **"Network error"**: Check server status and network connectivity

### Getting Help

If you encounter issues with the tests:

1. Check the test logs for detailed error messages
2. Use the UI mode to see what's happening in the browser
3. Use the trace viewer to debug test execution
4. Check the Playwright documentation for best practices