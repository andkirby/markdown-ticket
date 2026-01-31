# TypeScript/Node.js Reference

Language-specific patterns for MDT workflows. Load when project uses TypeScript or JavaScript.

## Detection

Project is TypeScript/Node.js if any of:
- `package.json` exists
- `tsconfig.json` exists
- `.ts`, `.tsx`, `.js`, `.jsx` files in source directory

## Test Frameworks

| Framework | Type | Config File | Command |
|-----------|------|-------------|---------|
| Vitest | Unit/Integration | `vitest.config.ts` | `npx vitest run` |
| Jest | Unit/Integration | `jest.config.js` | `npx jest` |
| Playwright | E2E | `playwright.config.ts` | `npx playwright test` |
| Cypress | E2E | `cypress.config.ts` | `npx cypress run` |
| Mocha | Unit | `.mocharc.json` | `npx mocha` |

## Test File Naming

| Convention | Example | Framework |
|------------|---------|-----------|
| `*.test.ts` | `user.test.ts` | Vitest, Jest |
| `*.spec.ts` | `user.spec.ts` | Vitest, Jest, Playwright |
| `*.e2e.ts` | `auth.e2e.ts` | Playwright (E2E) |
| `*.cy.ts` | `login.cy.ts` | Cypress |

**Directory patterns**:
```
src/__tests__/           # Jest default
src/**/*.test.ts         # Co-located tests
tests/                   # Separate test directory
tests/e2e/               # E2E tests
tests/unit/              # Unit tests
```

## BDD/Gherkin Examples

**Playwright (E2E)**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature: User Login', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    // Given I am on the login page
    await page.goto('/login');

    // When I enter valid credentials
    await page.getByTestId('email').fill('user@example.com');
    await page.getByTestId('password').fill('password123');
    await page.getByTestId('submit').click();

    // Then I should see the dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByTestId('welcome-message')).toBeVisible();
  });

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email').fill('user@example.com');
    await page.getByTestId('password').fill('wrong');
    await page.getByTestId('submit').click();

    await expect(page.getByTestId('error-message')).toContainText('Invalid credentials');
  });
});
```

**Vitest (Unit/Integration)**:
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('ModuleName', () => {
  describe('methodName', () => {
    it('returns expected value for valid input', () => {
      const result = methodName('valid');
      expect(result).toBe('expected');
    });

    it('throws for invalid input', () => {
      expect(() => methodName(null)).toThrow('Invalid input');
    });
  });

  describe('boundary handling', () => {
    it('accepts at limit (N)', () => {
      expect(processItems(Array(100))).toBeTruthy();
    });

    it('rejects above limit (N+1)', () => {
      expect(() => processItems(Array(101))).toThrow();
    });
  });
});
```

## Selector Patterns

**Preferred (stable)**:
```typescript
page.getByTestId('submit')           // data-testid attribute
page.getByRole('button', { name: 'Submit' })  // ARIA role
page.getByLabel('Email')             // Form label
page.getByText('Welcome')            // Visible text
```

**Avoid (brittle)**:
```typescript
page.locator('.btn.btn-primary')     // CSS classes change
page.locator('div > form > button')  // DOM structure changes
page.locator('#submit-btn-123')      // Generated IDs
```

## Environment Variables

```typescript
// Reading env vars
const value = process.env.MY_VAR;

// Testing with env vars (Vitest)
vi.stubEnv('MY_VAR', 'test-value');

// Testing with env vars (Jest)
process.env.MY_VAR = 'test-value';
```

## Common Assertions

```typescript
// Vitest/Jest
expect(value).toBe(expected);
expect(value).toEqual(expected);      // Deep equality
expect(fn).toThrow('message');
expect(fn).toHaveBeenCalledWith(arg);
expect(array).toContain(item);
expect(object).toHaveProperty('key');

// Playwright
await expect(page).toHaveURL('/path');
await expect(locator).toBeVisible();
await expect(locator).toContainText('text');
await expect(locator).toHaveCount(3);
```

## Filter Commands

```bash
# Vitest - filter by pattern
npx vitest run --grep="SUML-015"
npx vitest run src/__tests__/specific.test.ts

# Jest - filter by pattern
npx jest --testNamePattern="CR-KEY"
npx jest path/to/test.ts

# Playwright - filter by grep or file
npx playwright test --grep="@requirement:BR-1"
npx playwright test tests/e2e/login.spec.ts
```
