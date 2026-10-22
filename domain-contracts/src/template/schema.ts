/**
 * Template Contracts (MDT-101 Phase 4)
 * Canonical schemas for CR templates loaded from templates.json,
 * and the suggestion/validation result shapes produced by TemplateService.
 */

import { z } from 'zod'

/**
 * One section definition inside a template config.
 */
export const TemplateSectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  required: z.boolean(),
  placeholder: z.string().optional(),
})

/**
 * Boundary shape of one templates.json entry (file-input contract).
 * Unknown keys (e.g. the redundant `type` entry) are stripped by the parse.
 */
export const TemplateConfigSchema = z.object({
  file: z.string().min(1, 'Template file is required'),
  requiredFields: z.array(z.string().min(1)).min(1, 'At least one required field'),
  sections: z.array(TemplateSectionSchema),
})

/**
 * Normalized in-memory template: config + resolved body content.
 */
export const TemplateSchema = z.object({
  type: z.string().min(1, 'Template type is required'),
  requiredFields: z.array(z.string().min(1)),
  template: z.string(),
  sections: z.array(TemplateSectionSchema),
})

export const ValidationErrorSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  message: z.string().min(1, 'Message is required'),
})

export const ValidationWarningSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  message: z.string().min(1, 'Message is required'),
})

/**
 * Result of validating a ticket against its template's required sections.
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
})

/**
 * Improvement suggestion returned by TemplateService (MCP suggest_cr_improvements).
 */
export const SuggestionSchema = z.object({
  type: z.enum(['improvement', 'related', 'validation']),
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  actionable: z.boolean(),
})

export type TemplateSection = z.infer<typeof TemplateSectionSchema>
export type TemplateConfig = z.infer<typeof TemplateConfigSchema>
export type Template = z.infer<typeof TemplateSchema>
export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ValidationWarning = z.infer<typeof ValidationWarningSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>
export type Suggestion = z.infer<typeof SuggestionSchema>

// Only the root is checked here; each entry retains its independent skip policy.
export const TemplatesFileSchema = z.record(z.string(), z.unknown())
