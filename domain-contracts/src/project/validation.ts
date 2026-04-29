/**
 * MDT-101 Phase 1: Project Validation Functions
 * Validation wrapper functions using schemas from ./schema.ts
 */

import {
  DocumentConfigSchema,
  LocalProjectConfigSchema,
  ProjectConfigSchema,
  ProjectRegistryEntrySchema,
  ProjectSchema,
} from './schema'

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

export function validateLocalProjectConfig(data: unknown) {
  return LocalProjectConfigSchema.parse(data)
}

export function safeValidateLocalProjectConfig(data: unknown) {
  return LocalProjectConfigSchema.safeParse(data)
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

export function validateProjectRegistryEntry(data: unknown) {
  return ProjectRegistryEntrySchema.parse(data)
}

export function safeValidateProjectRegistryEntry(data: unknown) {
  return ProjectRegistryEntrySchema.safeParse(data)
}
