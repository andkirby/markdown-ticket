/**
 * MDT-101 Phase 1: Project Validation Functions
 * Validation wrapper functions using schemas from ./schema.ts
 */

import {
  CreateProjectInputSchema,
  DocumentConfigSchema,
  ProjectConfigSchema,
  ProjectSchema,
  UpdateProjectInputSchema,
} from './schema.js'

/**
 * Validate project data using ProjectSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateProject(data: unknown) {
  return ProjectSchema.parse(data)
}

/**
 * Safely validate project data using ProjectSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateProject(data: unknown) {
  return ProjectSchema.safeParse(data)
}

/**
 * Validate project configuration using ProjectConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateProjectConfig(data: unknown) {
  return ProjectConfigSchema.parse(data)
}

/**
 * Safely validate project configuration using ProjectConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateProjectConfig(data: unknown) {
  return ProjectConfigSchema.safeParse(data)
}

/**
 * Validate document configuration using DocumentConfigSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateDocumentConfig(data: unknown) {
  return DocumentConfigSchema.parse(data)
}

/**
 * Safely validate document configuration using DocumentConfigSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateDocumentConfig(data: unknown) {
  return DocumentConfigSchema.safeParse(data)
}

/**
 * Validate create project input using CreateProjectInputSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateCreateProjectInput(data: unknown) {
  return CreateProjectInputSchema.parse(data)
}

/**
 * Safely validate create project input using CreateProjectInputSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateCreateProjectInput(data: unknown) {
  return CreateProjectInputSchema.safeParse(data)
}

/**
 * Validate update project input using UpdateProjectInputSchema.parse()
 * Throws ZodError on validation failure
 */
export function validateUpdateProjectInput(data: unknown) {
  return UpdateProjectInputSchema.parse(data)
}

/**
 * Safely validate update project input using UpdateProjectInputSchema.safeParse()
 * Returns result object with success boolean
 */
export function safeValidateUpdateProjectInput(data: unknown) {
  return UpdateProjectInputSchema.safeParse(data)
}
