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
      id: 'test-id',
      project: {
        id: 'test-id',
        code: 'MDT',
        name: 'Test Project',
        path: '/tmp/project',
        configFile: '/tmp/project/.mdt-config.toml',
        active: true,
        description: '',
        repository: '',
        ticketsPath: 'docs/CRs',
      },
      metadata: {
        dateRegistered: '2026-03-26',
        lastAccessed: '2026-03-26',
        version: '1.0.0',
      },
    })

    expect(result.project.code).toBe('MDT')
    expect(result.project.name).toBe('Test Project')
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
        code: '', // empty code fails .min(1)
      },
    })).toThrow()
  })
})

describe('safeValidateProject', () => {
  it('returns success: true on valid input', () => {
    const result = safeValidateProject({
      id: 'test-id',
      project: {
        id: 'test-id',
        code: 'MDT',
        name: 'Test Project',
        path: '/tmp/project',
        configFile: '/tmp/project/.mdt-config.toml',
        active: true,
        description: '',
        repository: '',
        ticketsPath: 'docs/CRs',
      },
      metadata: {
        dateRegistered: '2026-03-26',
        lastAccessed: '2026-03-26',
        version: '1.0.0',
      },
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.project.code).toBe('MDT')
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

  it('provides helpful error for missing runtime fields', () => {
    const result = safeValidateProject({
      code: 'mdt', // lowercase - should fail our rule
      name: 'Test Project',
      id: 'test-id',
      ticketsPath: './docs/CRs',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const projectError = result.error.issues.find(i => i.path[0] === 'project')
      expect(projectError?.message).toMatch(/Required/)
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
        code: '', // empty code fails .min(1)
      },
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
