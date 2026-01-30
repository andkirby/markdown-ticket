/**
 * Validation Function Behavior Tests
 * Testing function behavior, not schema validation
 */

import {
  safeValidateProject,
  safeValidateProjectConfig,
  validateProject,
  validateProjectConfig,
} from '../validation.js'

describe('validateProject', () => {
  it('returns typed project on valid input', () => {
    const result = validateProject({
      code: 'MDT',
      name: 'Test Project',
      id: 'test-id',
      ticketsPath: './docs/CRs',
    })

    expect(result.code).toBe('MDT')
    expect(result.name).toBe('Test Project')
    expect(typeof result).toBe('object')
  })

  it('throws on invalid input', () => {
    expect(() => validateProject({
      code: 'invalid-code',
      name: 'Test',
      id: 'test',
      ticketsPath: 'path',
    })).toThrow()
  })
})

describe('validateProjectConfig', () => {
  it('returns typed config on valid input', () => {
    const result = validateProjectConfig({
      'project': {
        code: 'MDT',
        name: 'Test Project',
        id: 'test-id',
        ticketsPath: './docs/CRs',
      },
      'project.document': {
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 3,
      },
    })

    expect(result.project.code).toBe('MDT')
    expect(result['project.document']?.paths).toEqual(['docs/**/*.md'])
    expect(typeof result).toBe('object')
  })

  it('throws on invalid input', () => {
    expect(() => validateProjectConfig({
      project: {
        code: 'invalid',
        name: 'Test',
        id: 'test',
        ticketsPath: 'path',
      },
    })).toThrow()
  })
})

describe('safeValidateProject', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateProject({
      code: 'MDT',
      name: 'Test Project',
      id: 'test-id',
      ticketsPath: './docs/CRs',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe('MDT')
    }
  })

  it('returns success: false on invalid input', () => {
    const result = safeValidateProject({
      code: 'invalid-code',
      name: 'Test',
      id: 'test',
      ticketsPath: 'path',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  // Test error structure if user-facing
  it('provides helpful error for invalid code', () => {
    const result = safeValidateProject({
      code: 'mdt', // lowercase - should fail our rule
      name: 'Test Project',
      id: 'test-id',
      ticketsPath: './docs/CRs',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const codeError = result.error.issues.find(i => i.path[0] === 'code')
      expect(codeError?.message).toMatch(/uppercase|format/)
    }
  })
})

describe('safeValidateProjectConfig', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateProjectConfig({
      'project': {
        code: 'MDT',
        name: 'Test Project',
        id: 'test-id',
        ticketsPath: './docs/CRs',
      },
      'project.document': {
        paths: ['docs/**/*.md'],
        excludeFolders: ['node_modules'],
        maxDepth: 3,
      },
    })

    expect(result.success).toBe(true)
  })

  it('returns success: false on invalid input', () => {
    const result = safeValidateProjectConfig({
      project: {
        code: 'invalid',
        name: 'Test',
        id: 'test',
        ticketsPath: 'path',
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
