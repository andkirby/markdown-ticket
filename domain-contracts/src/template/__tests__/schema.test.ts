/**
 * Template Contract Tests (MDT-101 Phase 4)
 * Testing OUR rules, not Zod's functionality
 */

import {
  SuggestionSchema,
  TemplateConfigSchema,
  TemplateSchema,
  TemplateSectionSchema,
  ValidationResultSchema,
} from '../schema.js'

const validSection = { name: 'Problem Statement', required: true, placeholder: 'Describe' }

const validConfig = {
  file: 'bug-fix.md',
  requiredFields: ['title', 'description', 'priority'],
  sections: [validSection],
}

describe('templateSectionSchema', () => {
  it('accepts a section with placeholder', () => {
    expect(TemplateSectionSchema.parse(validSection)).toEqual(validSection)
  })

  it('accepts a section without placeholder', () => {
    expect(TemplateSectionSchema.parse({ name: 'RCA', required: false })).toEqual({
      name: 'RCA',
      required: false,
    })
  })

  it('rejects empty section name', () => {
    expect(TemplateSectionSchema.safeParse({ name: '', required: true }).success).toBe(false)
  })
})

describe('templateConfigSchema', () => {
  it('accepts the real templates.json entry shape', () => {
    const result = TemplateConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  it('strips unknown keys like the redundant type field', () => {
    const parsed = TemplateConfigSchema.parse({ ...validConfig, type: 'Bug Fix' })
    expect(parsed).not.toHaveProperty('type')
    expect(parsed.file).toBe('bug-fix.md')
  })

  it('rejects missing file', () => {
    expect(TemplateConfigSchema.safeParse({ ...validConfig, file: '' }).success).toBe(false)
  })

  it('rejects empty requiredFields', () => {
    expect(TemplateConfigSchema.safeParse({ ...validConfig, requiredFields: [] }).success).toBe(false)
  })

  it('rejects sections with wrong shape', () => {
    expect(
      TemplateConfigSchema.safeParse({ ...validConfig, sections: [{ name: 'X' }] }).success,
    ).toBe(false)
  })
})

describe('templateSchema', () => {
  it('accepts normalized template with body', () => {
    const result = TemplateSchema.safeParse({
      type: 'Bug Fix',
      requiredFields: ['title'],
      template: '# Body',
      sections: [validSection],
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing body', () => {
    expect(
      TemplateSchema.safeParse({ type: 'Bug Fix', requiredFields: ['title'], sections: [] })
        .success,
    ).toBe(false)
  })
})

describe('validationResultSchema', () => {
  it('accepts result with errors and warnings', () => {
    const result = ValidationResultSchema.safeParse({
      valid: false,
      errors: [{ field: 'title', message: 'missing' }],
      warnings: [{ field: 'rca', message: 'recommended' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean valid flag', () => {
    expect(ValidationResultSchema.safeParse({ valid: 'yes', errors: [], warnings: [] }).success).toBe(false)
  })
})

describe('suggestionSchema', () => {
  it('accepts a valid suggestion', () => {
    const result = SuggestionSchema.safeParse({
      type: 'improvement',
      title: 'Add RCA',
      description: 'Consider documenting the root cause',
      priority: 'medium',
      actionable: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown suggestion type', () => {
    expect(
      SuggestionSchema.safeParse({
        type: 'misc',
        title: 'X',
        description: '',
        priority: 'low',
        actionable: false,
      }).success,
    ).toBe(false)
  })

  it('rejects unknown priority', () => {
    expect(
      SuggestionSchema.safeParse({
        type: 'related',
        title: 'X',
        description: '',
        priority: 'urgent',
        actionable: false,
      }).success,
    ).toBe(false)
  })
})
