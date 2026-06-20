/**
 * Project Validation Functions
 * Validation wrappers using schemas from ./schema.ts
 */

import {
  LocalProjectConfigSchema,
  ProjectConfigSchema,
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

export function validateLocalProjectConfig(data: unknown) {
  return LocalProjectConfigSchema.parse(data)
}
