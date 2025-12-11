# E2E Test Development Guide

This guide explains how to write and maintain E2E tests for the MCP server, which returns **formatted strings** rather than JSON objects.

## Core Principle: Tests Should Be "Stupid"

The MCP server returns human-readable formatted strings, not structured JSON. Our tests should be simple and focus on content, not structure.

### ✅ DO: Simple Content Checks
```javascript
expect(typeof result).toBe('string');
expect(result).toContain('Created successfully');
expect(result).toContain('TEST-001');
```

### ❌ DON'T: Complex Structure Validation
```javascript
expect(result.success).toBe(true);  // This will fail - no such property
expect(result.data.key).toBe('TEST');  // This will fail - result is a string
```

## Writing New Tests

### 1. Understand the Response Format
All MCP tools return formatted strings like:
```
🎫 Created successfully: TEST-001
File: docs/CRs/TEST-001.md
```

### 2. Test the Essentials
Check for the key information that matters:
- Success/error indicators
- Identifiers (project codes, CR numbers)
- Key data points (status, type, etc.)

### 3. Be Flexible with Formatting
Don't test for exact strings including newlines, emojis, or formatting that might change.

## Test Patterns

### Success Cases
```javascript
it('should create a CR', async () => {
  const result = await client.callTool('create_cr', {
    project: 'TEST',
    type: 'Feature Enhancement',
    data: { title: 'Test Feature', priority: 'Medium' }
  });

  expect(typeof result).toBe('string');
  expect(result).toContain('Created successfully');
  expect(result).toContain('TEST-');  // Should have a CR number
  expect(result).toContain('Test Feature');
});
```

### Error Cases
```javascript
it('should handle missing project', async () => {
  const result = await client.callTool('get_project_info', {
    project: 'NONEXISTENT'
  });

  expect(typeof result).toBe('string');
  expect(result).toContain('not found');
  expect(result).toContain('NONEXISTENT');
});
```

### Extracting Data from Responses
When you need to use data from one call in another:

```javascript
// Create CR and extract its number
const createResult = await client.callTool('create_cr', {...});
const crNumberMatch = createResult.match(/TEST-(\d{3})/);
const crNumber = crNumberMatch ? crNumberMatch[0] : null;

// Use the extracted number
const getResult = await client.callTool('get_cr', {
  project: 'TEST',
  key: crNumber
});
```

## Common Mistakes to Avoid

### 1. Don't Use Array.isArray()
The MCP server never returns arrays, only formatted strings.

```javascript
// ❌ WRONG
expect(Array.isArray(result.projects)).toBe(true);

// ✅ RIGHT
expect(typeof result).toBe('string');
expect(result).toContain('Found');  // or 'No projects found'
```

### 2. Don't Access Object Properties
Responses are strings, not objects.

```javascript
// ❌ WRONG
expect(result.success).toBe(true);
expect(result.data.key).toBe('TEST');

// ✅ RIGHT
expect(result).toContain('success');
expect(result).toContain('TEST');
```

### 3. Don't Test Exact Formatting
Emojis, spacing, and exact wording might change.

```javascript
// ❌ BRITTLE
expect(result).toBe('📁 Found 1 project:\n\n• **TST** - Test');

// ✅ RESILIENT
expect(result).toContain('Found 1 project');
expect(result).toContain('TST');
expect(result).toContain('Test');
```

## When to Use OutputMatcher

For more complex validation, use the OutputMatcher helper:

```javascript
import { OutputMatcher } from './helpers/outputMatcher';

const expected = testDataLoader.getExpectedOutput('list_projects', 'single');
const matchResult = OutputMatcher.match(result, expected);

expect(matchResult.matched).toBe(true);
if (!matchResult.matched) {
  console.error('Differences:', matchResult.differences);
}

// Still do simple checks for robustness
expect(typeof result).toBe('string');
expect(result).toContain('TEST');
```

## Debugging Failed Tests

### 1. Log the Actual Response
```javascript
console.log('Actual result:', result);
```

### 2. Check Response Type First
```javascript
expect(typeof result).toBe('string');  // Add this early
```

### 3. Look for Typos in Expected Text
The text in `toContain()` must match exactly (case-sensitive).

## Test Data

Use the TestDataLoader for expected outputs:
```javascript
const expected = testDataLoader.getExpectedOutput('tool_name', 'scenario');
```

Expected outputs are stored in the test data files and can be formatted normally with newlines and text - they're normalized by OutputMatcher.

## Remember

- **MCP server = formatted strings, not JSON**
- **Simple content checks = robust tests**
- **Test what matters, ignore formatting details**
- **Be flexible, be resilient**