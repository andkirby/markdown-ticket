# Domain Contracts Testing Guide

## Test Location

```
domain-contracts/
  src/
    project/
      schema.ts
      validation.ts
      __tests__/
        schema.test.ts           ← Schema business rules
        validation.test.ts       ← Validation function behavior

    testing/
      project.fixtures.ts        ← Test builders (not tested themselves)
```

## What to Test

### Schema Business Rules

Test **your rules**, not Zod:

| Test | Why |
|------|-----|
| Key regex `/^[A-Z]{2,5}$/` | Your rule - could be wrong |
| Name min/max length | Your decision |
| Field optionality | Your design choice |
| Custom refinements | Your logic |

```typescript
// src/project/__tests__/schema.test.ts
import { CreateProjectInputSchema, ProjectSchema } from '../schema'

describe('ProjectSchema', () => {
  describe('key', () => {
    it('accepts 2-5 uppercase letters', () => {
      expect(() => ProjectSchema.parse({
        key: 'MDT',
        name: 'Project',
        rootPath: '/path',
      })).not.toThrow()
    })

    it('rejects lowercase', () => {
      expect(() => ProjectSchema.parse({
        key: 'mdt',
        name: 'Project',
        rootPath: '/path',
      })).toThrow(/uppercase/)
    })

    it('rejects too short (1 char)', () => {
      expect(() => ProjectSchema.parse({
        key: 'M',
        name: 'Project',
        rootPath: '/path',
      })).toThrow()
    })

    it('rejects too long (6+ chars)', () => {
      expect(() => ProjectSchema.parse({
        key: 'TOOLONG',
        name: 'Project',
        rootPath: '/path',
      })).toThrow()
    })
  })

  describe('name', () => {
    it('rejects empty string', () => {
      expect(() => ProjectSchema.parse({
        key: 'MDT',
        name: '',
        rootPath: '/path',
      })).toThrow(/required/)
    })
  })

  describe('optional fields', () => {
    it('accepts missing description', () => {
      const result = ProjectSchema.parse({
        key: 'MDT',
        name: 'Project',
        rootPath: '/path',
      })
      expect(result.description).toBeUndefined()
    })
  })
})
```

### Validation Functions

Test behavior, especially safe variants:

```typescript
// src/project/__tests__/validation.test.ts
import {
  safeValidateCreateProjectInput,
  validateCreateProjectInput,
  validateProject,
} from '../validation'

describe('validateProject', () => {
  it('returns typed project on valid input', () => {
    const result = validateProject({
      key: 'MDT',
      name: 'Project',
      rootPath: '/path',
    })

    expect(result.key).toBe('MDT')
  })

  it('throws on invalid input', () => {
    expect(() => validateProject({ key: 'bad' })).toThrow()
  })
})

describe('safeValidateCreateProjectInput', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateCreateProjectInput({
      key: 'MDT',
      name: 'Project',
      rootPath: '/path',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.key).toBe('MDT')
    }
  })

  it('returns success: false on invalid input', () => {
    const result = safeValidateCreateProjectInput({ key: 'bad' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
```

### Input Schema Derivation

Test that input schemas correctly derive from entity:

```typescript
describe('CreateProjectInputSchema', () => {
  it('requires key, name, rootPath', () => {
    expect(() => CreateProjectInputSchema.parse({
      key: 'MDT',
      name: 'Project',
      // missing rootPath
    })).toThrow()
  })

  it('allows optional description', () => {
    const result = CreateProjectInputSchema.parse({
      key: 'MDT',
      name: 'Project',
      rootPath: '/path',
      description: 'Optional desc',
    })
    expect(result.description).toBe('Optional desc')
  })
})
```

## What NOT to Test

### ❌ Zod Itself

```typescript
// Don't test that Zod works
it('rejects missing required field', () => {
  expect(() => ProjectSchema.parse({})).toThrow()
})

// Don't test basic type checking
it('rejects number for string field', () => {
  expect(() => ProjectSchema.parse({ key: 123 })).toThrow()
})
```

### ❌ Fixtures

Fixtures are test utilities - testing them is circular:

```typescript
// Don't do this
it('buildProject returns valid project', () => {
  expect(() => ProjectSchema.parse(buildProject())).not.toThrow()
})
```

If fixtures break, other tests will fail.

## Test Organization

### Pattern: Valid + Boundary + Invalid

For each business rule:

```typescript
describe('key format', () => {
  // Valid cases
  it('accepts MIN boundary (2 chars)', () => { ... });
  it('accepts MAX boundary (5 chars)', () => { ... });
  it('accepts middle range (3 chars)', () => { ... });

  // Invalid cases
  it('rejects below MIN (1 char)', () => { ... });
  it('rejects above MAX (6 chars)', () => { ... });
  it('rejects wrong format (lowercase)', () => { ... });
});
```

### Pattern: Error Messages

If error messages matter to users:

```typescript
it('provides helpful error for invalid key', () => {
  const result = safeValidateCreateProjectInput({
    key: 'bad',
    name: 'Project',
    rootPath: '/path',
  })

  expect(result.success).toBe(false)
  if (!result.success) {
    const keyError = result.error.issues.find(i => i.path[0] === 'key')
    expect(keyError?.message).toContain('uppercase')
  }
})
```

## Summary

| Test | Don't Test |
|------|------------|
| Your regex patterns | Zod's type coercion |
| Your length limits | That required fields are required |
| Your custom refinements | Fixture validity |
| Safe/throwing behavior | Basic Zod functionality |
| Error messages (if user-facing) | Internal Zod errors |
