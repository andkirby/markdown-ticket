/**
 * Template Validation Functions
 * Validation wrappers using schemas from ./schema.ts
 */

import {
  SuggestionSchema,
  TemplateConfigSchema,
  TemplateSchema,
  ValidationResultSchema,
} from './schema'

/**
 * Validate a templates.json entry using TemplateConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateTemplateConfig(data: unknown) {
  return TemplateConfigSchema.parse(data)
}

/**
 * Safely validate a templates.json entry using TemplateConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateTemplateConfig(data: unknown) {
  return TemplateConfigSchema.safeParse(data)
}

/**
 * Validate a normalized template using TemplateSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateTemplate(data: unknown) {
  return TemplateSchema.parse(data)
}

/**
 * Validate a ValidationResult payload using ValidationResultSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateValidationResult(data: unknown) {
  return ValidationResultSchema.parse(data)
}

/**
 * Validate a Suggestion payload using SuggestionSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateSuggestion(data: unknown) {
  return SuggestionSchema.parse(data)
}
