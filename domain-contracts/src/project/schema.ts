/**
 * MDT-101 Phase 1: Project Schema Validation
 * Core entity schemas with field-level validation only
 */

import { z } from 'zod'

/**
 * Project code pattern for validation
 * Format: 2-5 characters, uppercase letter followed by alphanumeric
 */
export const PROJECT_CODE_PATTERN = /^[A-Z][A-Z0-9]{1,4}$/
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/u
const TICKETS_PATH_INVALID_CHARS_PATTERN = /[<>"|?*]/u

function normalizeTicketsPath(path: string): string {
  return path
    .replace(/\\/gu, '/')
    .replace(/^\.\/+/u, '')
    .replace(/\/+$/u, '')
}

/**
 * Tickets path schema with field-level validation only.
 * Must remain a project-root-relative path.
 */
export const TicketsPathSchema = z.string()
  .trim()
  .min(1, 'Tickets path is required')
  .refine(
    path => !path.startsWith('/') && !WINDOWS_ABSOLUTE_PATH_PATTERN.test(path),
    'Tickets path must be relative to project root',
  )
  .refine(
    path => !TICKETS_PATH_INVALID_CHARS_PATTERN.test(path),
    'Tickets path contains invalid path characters',
  )
  .refine(
    (path) => {
      const segments = path.split(/[\\/]+/u)
      return segments.every(segment => segment !== '..')
    },
    'Tickets path cannot leave the project root',
  )
  .transform(normalizeTicketsPath)
  .refine(path => path.length > 0, 'Tickets path is required')

/**
 * Document configuration schema for project
 * Defines how documents are discovered and processed
 */
export const DocumentConfigSchema = z.object({
  /** Array of glob patterns for document discovery */
  paths: z.array(z.string()).default([]),
  /** Folder names to exclude (not paths) */
  excludeFolders: z.array(z.string()).default([]),
  /** Maximum depth for recursive search (1-10) */
  maxDepth: z.number().int().min(1).max(10).default(3),
}).refine(
  (data) => {
    // Validate paths don't contain parent directory references
    const hasParentRef = data.paths.some(path => path.includes('..'))
    return !hasParentRef
  },
  {
    message: 'Parent directory references (..) are not allowed in paths',
    path: ['paths'],
  },
).refine(
  (data) => {
    // Validate paths are relative (not absolute)
    const hasAbsolutePath = data.paths.some(path => path.startsWith('/'))
    return !hasAbsolutePath
  },
  {
    message: 'Absolute paths are not allowed, use relative paths only',
    path: ['paths'],
  },
).refine(
  (data) => {
    // Validate excludeFolders are folder names only (no path separators)
    const hasPathSeparator = data.excludeFolders.some(folder =>
      folder.includes('/') || folder.includes('\\'),
    )
    return !hasPathSeparator
  },
  {
    message: 'excludeFolders should contain folder names, not paths',
    path: ['excludeFolders'],
  },
)

/**
 * Project schema with field validation
 * Core project entity with required and optional fields
 */
export const ProjectSchema = z.object({
  /** Project code: 2-5 characters, uppercase letter followed by alphanumeric */
  code: z.string()
    .min(2, 'Project code must be 2-5 chars')
    .max(5, 'Project code must be 2-5 chars')
    .regex(PROJECT_CODE_PATTERN, 'Project code must be 2-5 chars, start with uppercase letter, and contain only alphanumeric characters'),
  /** Project name: minimum 3 characters */
  name: z.string()
    .refine(
      name => name.trim().length >= 3,
      'Project name must have at least 3 characters',
    )
    .refine(
      name => name.trim().length > 0,
      'Project name cannot be empty or whitespace-only',
    )
    .transform(name => name.trim()),
  /** Project identifier: required non-empty string */
  id: z.string()
    .min(1, 'Required'),
  /** Path to tickets directory relative to project root */
  ticketsPath: TicketsPathSchema,
  /** Optional project description */
  description: z.string().optional(),
  /** Optional repository URL */
  repository: z.string().optional(),
  /** Whether project is active: defaults to true */
  active: z.boolean().default(true),
})

/**
 * Project configuration project section.
 * Mirrors the nested TOML shape used by project config parsing.
 */
export const ProjectConfigProjectSchema = ProjectSchema.extend({
  document: DocumentConfigSchema.optional().default({}),
})

/**
 * Complete project configuration schema
 * Combines project with document configuration
 */
export const ProjectConfigSchema = z.object({
  /** Core project configuration */
  project: ProjectConfigProjectSchema,
})

/**
 * Input schema for creating projects
 * Only required fields, no default values applied
 */
export const CreateProjectInputSchema = z.object({
  /** Project code: 2-5 characters, uppercase letter followed by alphanumeric */
  code: z.string()
    .regex(PROJECT_CODE_PATTERN, 'Project code must be 2-5 characters, start with uppercase letter, and contain only alphanumeric characters'),
  /** Project name: minimum 3 characters */
  name: z.string()
    .min(3, 'Project name must have at least 3 characters')
    .trim(),
  /** Project identifier: required non-empty string */
  id: z.string()
    .min(1, 'Project ID is required'),
  /** Path to tickets directory relative to project root */
  ticketsPath: TicketsPathSchema,
  /** Optional project description */
  description: z.string().optional(),
  /** Optional repository URL */
  repository: z.string().optional(),
})

/**
 * Input schema for updating projects
 * Partial update with at least one field required
 */
export const UpdateProjectInputSchema = z.object({
  /** Project code: 2-5 characters, uppercase letter followed by alphanumeric */
  code: z.string()
    .regex(PROJECT_CODE_PATTERN, 'Project code must be 2-5 characters, start with uppercase letter, and contain only alphanumeric characters')
    .optional(),
  /** Project name: minimum 3 characters */
  name: z.string()
    .min(3, 'Project name must have at least 3 characters')
    .trim()
    .optional(),
  /** Path to tickets directory relative to project root */
  ticketsPath: TicketsPathSchema.optional(),
  /** Optional project description */
  description: z.string().optional(),
  /** Optional repository URL */
  repository: z.string().optional(),
  /** Whether project is active */
  active: z.boolean().optional(),
}).refine(
  (data) => {
    // At least one field must be provided for update
    return Object.keys(data).length > 0
  },
  {
    message: 'At least one field must be provided for update',
  },
)

// TypeScript types inferred from schemas
export type Project = z.infer<typeof ProjectSchema>
export type ProjectConfigProject = z.infer<typeof ProjectConfigProjectSchema>
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>
export type DocumentConfig = z.infer<typeof DocumentConfigSchema>
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>
export type TicketsPath = z.infer<typeof TicketsPathSchema>

/**
 * Export all schemas for use in other modules
 */
export const ProjectSchemas = {
  project: ProjectSchema,
  projectConfigProject: ProjectConfigProjectSchema,
  projectConfig: ProjectConfigSchema,
  documentConfig: DocumentConfigSchema,
  createProjectInput: CreateProjectInputSchema,
  updateProjectInput: UpdateProjectInputSchema,
  ticketsPath: TicketsPathSchema,
} as const
